import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
});

const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    rateLimitStore.set(key, recent);
    return false;
  }
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = subscribeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!checkRateLimit(ip, 5, 60 * 60 * 1000)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const { email } = parsed.data;

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    const { error } = await supabase
      .from('newsletter_subscribers')
      .insert({ email, created_at: new Date().toISOString() });

    if (error) {
      const alreadySubscribed =
        typeof error.message === 'string' && /duplicate/i.test(error.message);
      if (!alreadySubscribed) {
        console.error('Newsletter subscribe error:', error);
        return NextResponse.json(
          { error: 'Could not save your subscription. Please try again.' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Thanks for subscribing to Ruhvi!',
    });
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
