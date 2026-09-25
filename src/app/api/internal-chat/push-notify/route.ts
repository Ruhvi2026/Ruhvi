import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getTokensForUsers, sendFcmToTokens } from '@/lib/fcm-admin';

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, any>
): Promise<number> {
  if (tokens.length === 0) return 0;
  try {
    const messages = tokens.map((token) => ({
      to: token,
      sound: 'default',
      title,
      body,
      channelId: 'chat_messages',
      data: data || {},
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
    if (res.ok) {
      return tokens.length;
    }
  } catch (err) {
    console.error('[InternalChatPush] Expo push delivery error:', err);
  }
  return 0;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { conversation_id, sender_id, sender_name, text_content } = body;

    if (!conversation_id || !sender_id) {
      return NextResponse.json(
        { error: 'conversation_id and sender_id are required' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Fetch conversation members excluding sender
    const { data: members, error: memErr } = await supabase
      .from('chat_conversation_members')
      .select('user_id')
      .eq('conversation_id', conversation_id)
      .neq('user_id', sender_id)
      .is('left_at', null);

    if (memErr || !members || members.length === 0) {
      return NextResponse.json({
        success: true,
        delivered: 0,
        reason: 'No other members',
      });
    }

    const recipientIds = members.map((m: any) => m.user_id);

    // 2. Fetch push tokens for all recipients
    const tokens = await getTokensForUsers(recipientIds);
    if (!tokens || tokens.length === 0) {
      return NextResponse.json({
        success: true,
        delivered: 0,
        reason: 'No registered tokens',
      });
    }

    // 3. Partition tokens
    const expoTokens = tokens.filter(
      (t) =>
        t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
    );
    const fcmTokens = tokens.filter(
      (t) =>
        !t.startsWith('ExponentPushToken[') && !t.startsWith('ExpoPushToken[')
    );

    let deliveredCount = 0;
    const title = sender_name || 'Staff Member';
    const preview = text_content || 'Sent a new message';

    // Send Expo push notifications (100% Free)
    if (expoTokens.length > 0) {
      const expoSent = await sendExpoPush(expoTokens, title, preview, {
        conversationId: conversation_id,
        type: 'chat',
      });
      deliveredCount += expoSent;
    }

    // Send FCM push notifications (100% Free)
    if (fcmTokens.length > 0) {
      try {
        const result = await sendFcmToTokens(fcmTokens, {
          title,
          body: preview,
          data: {
            conversationId: conversation_id,
            category: 'CHAT',
          },
        });
        deliveredCount += result.sent;
      } catch (fcmErr) {
        console.error('[InternalChatPush] FCM send error:', fcmErr);
      }
    }

    return NextResponse.json({
      success: true,
      delivered: deliveredCount,
      recipients: recipientIds.length,
    });
  } catch (error: any) {
    console.error('[InternalChatPush] Request error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
