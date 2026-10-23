import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import {
  checkApiRateLimit,
  getClientIp,
  createRateLimitResponse,
  addRateLimitHeaders,
} from '@/lib/rate-limit';

const subscribeSchema = z.object({
  email: z.string().trim().email().max(254),
});

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

    const ip = getClientIp(req);
    const rateCheck = await checkApiRateLimit(`newsletter:${ip}`, 5, 3600); // 5 subscriptions per hour
    if (!rateCheck.success) {
      return createRateLimitResponse(
        rateCheck,
        'Too many newsletter requests. Please try again later.'
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

    const res = NextResponse.json({
      success: true,
      message: 'Thanks for subscribing to Ruhvi!',
    });
    return addRateLimitHeaders(res, rateCheck);
  } catch (err) {
    console.error('Newsletter subscribe error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
