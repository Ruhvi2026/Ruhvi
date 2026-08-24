import { NextResponse, after } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// In-memory rate limiter (per admin + IP) to prevent broadcast abuse
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // max broadcast requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RECIPIENTS = 500; // hard cap per request

// Per-recipient cooldown: Meta only allows one business-initiated message per
// user per 24h window, so never re-queue the same number twice in a day.
// Persisted in whatsapp_recipient_log so it survives restarts and works
// across serverless instances.
const RECIPIENT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// Outbound pacing: cap concurrent HTTP calls and stagger send starts so the
// burst stays well under Meta's per-number rate ceiling.
const CONCURRENCY = 10;
const SEND_DELAY_MS = 120; // >= ~8 messages/sec

// Runs fn over items with a bounded worker pool.
async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  let index = 0;
  const workerCount = Math.max(1, Math.min(limit, items.length));
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const i = index++;
      if (i >= items.length) break;
      await fn(items[i]);
    }
  });
  await Promise.all(workers);
}

// Ensures at least minIntervalMs elapses between each wrapped call's start.
function createMinIntervalLimiter(minIntervalMs: number) {
  let lastRun = 0;
  return async function throttle<T>(fn: () => Promise<T>): Promise<T> {
    const now = Date.now();
    const wait = lastRun + minIntervalMs - now;
    if (wait > 0) {
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
    lastRun = Date.now();
    return fn();
  };
}

// Normalizes an Indian mobile number to E.164-ish "91XXXXXXXXXX", or null if invalid.
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('91')) {
    const rest = digits.slice(2);
    return rest.length === 10 ? `91${rest}` : null;
  }
  if (digits.startsWith('0')) {
    const rest = digits.slice(1);
    return rest.length === 10 ? `91${rest}` : null;
  }
  return digits.length === 10 ? `91${digits}` : null;
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate via the verified session cookie
    const cookieStore = await cookies();
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Authorize: only internal staff roles may broadcast
    const supabase = await getSupabaseAdminClient(cookieStore);
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 3. Rate limit by admin id (client-supplied IP headers are spoofable)
    const rateKey = user.id;
    const now = Date.now();
    const entry = rateLimitMap.get(rateKey);
    if (!entry || entry.resetTime < now) {
      rateLimitMap.set(rateKey, { count: 1, resetTime: now + WINDOW_MS });
    } else if (entry.count >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    } else {
      entry.count++;
    }

    // 4. Validate payload
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const { templateName, phoneNumbers, components = [] } = body;

    if (
      !templateName ||
      typeof templateName !== 'string' ||
      !templateName.trim()
    ) {
      return NextResponse.json(
        { error: 'templateName is required' },
        { status: 400 }
      );
    }
    if (!Array.isArray(phoneNumbers) || phoneNumbers.length === 0) {
      return NextResponse.json(
        { error: 'phoneNumbers array is required' },
        { status: 400 }
      );
    }
    if (phoneNumbers.length > MAX_RECIPIENTS) {
      return NextResponse.json(
        {
          error: `Too many recipients. Maximum allowed is ${MAX_RECIPIENTS} per request.`,
        },
        { status: 413 }
      );
    }
    if (!Array.isArray(components)) {
      return NextResponse.json(
        { error: 'components must be an array' },
        { status: 400 }
      );
    }

    // 5. Normalize + validate phone numbers
    const invalidPhones: string[] = [];
    const validPhones: string[] = [];
    for (const phone of phoneNumbers) {
      if (typeof phone !== 'string') {
        invalidPhones.push(String(phone));
        continue;
      }
      const normalized = normalizePhone(phone);
      if (normalized) validPhones.push(normalized);
      else invalidPhones.push(phone);
    }

    if (validPhones.length === 0) {
      return NextResponse.json(
        { error: 'No valid phone numbers provided.', invalidPhones },
        { status: 400 }
      );
    }

    // 6. Queue the send and return immediately
    const uniquePhones = [...new Set(validPhones)];

    // Drop recipients already messaged within the 24h cooldown window
    // (state is read from the DB so it is shared across instances).
    const nowMs = Date.now();
    const { data: recipientLog } = await supabase
      .from('whatsapp_recipient_log')
      .select('phone, last_sent_at')
      .in('phone', uniquePhones);
    const lastSentByPhone = new Map<string, number>(
      (recipientLog || []).map((r: any) => [
        r.phone,
        new Date(r.last_sent_at).getTime(),
      ])
    );
    const cooledDown: string[] = [];
    const activePhones: string[] = [];
    for (const phone of uniquePhones) {
      const lastSent = lastSentByPhone.get(phone);
      if (lastSent && nowMs - lastSent < RECIPIENT_COOLDOWN_MS) {
        cooledDown.push(phone);
      } else {
        activePhones.push(phone);
      }
    }

    const campaignId = crypto.randomUUID();

    // Deliver after the response is sent so the request doesn't block on the
    // whole broadcast (up to MAX_RECIPIENTS sequential network calls).
    after(async () => {
      const results: { phone: string; status: string; response?: any }[] = [];
      const errors: { phone: string; error: string }[] = [];
      const throttle = createMinIntervalLimiter(SEND_DELAY_MS);

      await mapWithConcurrency(activePhones, CONCURRENCY, async (phone) => {
        try {
          const response = await throttle(() =>
            sendWhatsAppMessage(phone, templateName, 'en', components)
          );
          results.push({ phone, status: 'success', response });
        } catch (err: any) {
          console.error(`Failed marketing broadcast to ${phone}:`, err);
          errors.push({ phone, error: err.message });
        }
      });

      // Persist the last-sent timestamp so the 24h cooldown survives
      // restarts and applies across serverless instances.
      if (results.length > 0) {
        const rows = results.map((r) => ({
          phone: r.phone,
          last_sent_at: new Date().toISOString(),
        }));
        const { error: logError } = await supabase
          .from('whatsapp_recipient_log')
          .upsert(rows, { onConflict: 'phone' });
        if (logError) {
          console.error(
            `[WhatsApp Campaign ${campaignId}] failed to persist cooldown:`,
            logError
          );
        }
      }

      console.log(
        `[WhatsApp Campaign ${campaignId}] done: ${results.length} sent, ${errors.length} failed, ${cooledDown.length} skipped (cooldown), ${invalidPhones.length} skipped (invalid)`
      );
    });

    return NextResponse.json({
      success: true,
      queued: true,
      campaignId,
      message: `Broadcast queued for ${activePhones.length} recipient(s). ${invalidPhones.length} skipped (invalid).${cooledDown.length ? ` ${cooledDown.length} skipped (already messaged in the last 24h).` : ''}`,
      skipped_invalid: invalidPhones,
      skipped_cooldown: cooledDown,
    });
  } catch (error: any) {
    console.error('Marketing Campaign Error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger marketing campaign' },
      { status: 500 }
    );
  }
}
