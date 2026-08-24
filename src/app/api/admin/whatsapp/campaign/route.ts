import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import { sendWhatsAppMessage } from '@/lib/whatsapp';

// In-memory rate limiter (per admin + IP) to prevent broadcast abuse
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // max broadcast requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_RECIPIENTS = 500; // hard cap per request

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

    // 3. Rate limit by admin id + client IP
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    const rateKey = `${user.id}:${ip}`;
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

    // 6. Send (dedupe, then bounded sync loop)
    const uniquePhones = [...new Set(validPhones)];
    const results: any[] = [];
    const errors: any[] = [];

    for (const phone of uniquePhones) {
      try {
        const response = await sendWhatsAppMessage(
          phone,
          templateName,
          'en',
          components
        );
        results.push({ phone, status: 'success', response });
      } catch (err: any) {
        console.error(`Failed marketing broadcast to ${phone}:`, err);
        errors.push({ phone, error: err.message });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Broadcast completed. ${results.length} sent, ${errors.length} failed${invalidPhones.length ? `, ${invalidPhones.length} skipped (invalid).` : '.'}`,
      results,
      errors,
      skipped_invalid: invalidPhones,
    });
  } catch (error: any) {
    console.error('Marketing Campaign Error:', error);
    return NextResponse.json(
      { error: 'Failed to trigger marketing campaign' },
      { status: 500 }
    );
  }
}
