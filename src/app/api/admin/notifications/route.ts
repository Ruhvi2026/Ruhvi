import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is logged in
    const { user } = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an admin or staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { title, message, url, imageUrl, audience } = body;

    if (!title || !message) {
      return NextResponse.json({ error: 'Title and message are required' }, { status: 400 });
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
        'Authorization': `Basic ${restApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal API Error:', result);
      return NextResponse.json({ error: 'Failed to send notification via OneSignal' }, { status: 500 });
    }

    // Insert into history
    const { error: dbError } = await supabase
      .from('push_campaigns')
      .insert({
        title,
        message,
        target_url: url || null,
        image_url: imageUrl || null,
        audience: audience || 'Subscribed Users',
        sent_by: user.id,
        onesignal_id: result.id,
      });

    if (dbError) {
      console.error('Failed to log campaign to database:', dbError);
      // We don't fail the request since the push was actually sent
    }

    return NextResponse.json({ success: true, id: result.id });
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
