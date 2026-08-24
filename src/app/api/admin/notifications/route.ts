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

    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    const restApiKey = process.env.ONESIGNAL_REST_API_KEY;

    if (!appId || !restApiKey) {
      return NextResponse.json(
        { error: 'OneSignal credentials are not configured on the server.' },
        { status: 500 }
      );
    }

    // Prepare OneSignal Payload
    const payload: any = {
      app_id: appId,
      included_segments: [audience || 'Subscribed Users'],
      headings: { en: title },
      contents: { en: message },
    };

    if (url) payload.url = url;
    if (imageUrl) {
      payload.big_picture = imageUrl; // For Android
      payload.chrome_web_image = imageUrl; // For Web
    }

    // Call OneSignal API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', result);
      return NextResponse.json(
        { error: 'Failed to send notification via OneSignal' },
        { status: 500 }
      );
    }

    // Insert into history
    const { error: dbError } = await supabase.from('push_campaigns').insert({
      title,
      message,
      target_url: url || null,
      image_url: imageUrl || null,
      audience: audience || 'Subscribed Users',
      sent_by: userId,
      onesignal_id: result.id,
    });

    if (dbError) {
      console.error('Failed to log campaign to database:', dbError);
      // We don't fail the request since the push was actually sent
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
