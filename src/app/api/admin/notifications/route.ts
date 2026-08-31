import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

// In-memory rate limiter (per admin + IP) to prevent broadcast abuse
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 5; // max broadcast requests per window
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    // Verify user is logged in
    const { user } = await getServerUser();
    const userId = user?.id;
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an admin, manager, or staff
    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager', 'staff'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Rate limit by admin id (client-supplied IP headers are spoofable)
    const rateKey = userId;
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

    const body = await request.json();
    const { title, message, url, imageUrl, audience } = body;

    if (!title || !message) {
      return NextResponse.json(
        { error: 'Title and message are required' },
        { status: 400 }
      );
    }

    // Fix 12: OneSignal removed — FCM is the only push provider.
    const { sendFcmToTokens } = await import('@/lib/fcm-admin');

    const { data: tokenRows, error: tokenError } = await supabase
      .from('user_push_tokens')
      .select('token');

    if (tokenError) {
      console.error('Failed to fetch FCM tokens:', tokenError);
      return NextResponse.json(
        { error: 'Failed to fetch FCM device tokens' },
        { status: 500 }
      );
    }

    const tokens = (tokenRows || []).map((row: any) => row.token);
    if (tokens.length === 0) {
      return NextResponse.json(
        { error: 'No registered devices found for FCM notifications.' },
        { status: 400 }
      );
    }

    const fcmResult = await sendFcmToTokens(tokens, {
      title,
      body: message,
      url: url || undefined,
      imageUrl: imageUrl || undefined,
    });

    console.log(
      `[FCM] Broadcast complete. Sent: ${fcmResult.sent}, Failed: ${fcmResult.failed}`
    );
    const externalId = `fcm_sent_${fcmResult.sent}_failed_${fcmResult.failed}_at_${Date.now()}`;

    // Insert into history
    const { error: dbError } = await supabase.from('push_campaigns').insert({
      title,
      message,
      target_url: url || null,
      image_url: imageUrl || null,
      audience: audience || 'All Users',
      sent_by: userId,
      onesignal_id: externalId,
      status: 'Sent (FCM)',
    });

    if (dbError) {
      console.error('Failed to log campaign to database:', dbError);
    }

    return NextResponse.json({ success: true, id: externalId });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
