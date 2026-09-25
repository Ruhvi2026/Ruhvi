import { createClient } from '@supabase/supabase-js';
import { getTokensForUsers, sendFcmToTokens } from '@/lib/fcm-admin';

export type NotificationCategory =
  'ORDERS' | 'WALLET' | 'OFFERS' | 'UPDATES' | 'SYSTEM' | 'CHAT';

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  category: NotificationCategory;
  type?: string;
  link?: string;
  referenceType?: string;
  referenceId?: string;
  imageUrl?: string;
  idempotencyKey?: string;
}

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
    console.error('[NotificationService] Expo push error:', err);
  }
  return 0;
}

export async function createAndSendNotification(
  params: CreateNotificationParams
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. Insert DB Notification
  const { data: dbNotif, error: dbError } = await supabase
    .from('notifications')
    .insert({
      user_id: params.userId,
      title: params.title,
      message: params.message,
      category: params.category,
      type: params.type || 'system',
      link: params.link || null,
      reference_type: params.referenceType || null,
      reference_id: params.referenceId || null,
      image_url: params.imageUrl || null,
      idempotency_key: params.idempotencyKey || null,
    })
    .select()
    .single();

  if (dbError) {
    // If unique constraint violation on idempotency_key, we can ignore the error
    if (dbError.code === '23505' && params.idempotencyKey) {
      console.log(
        `[NotificationService] Idempotency key hit for ${params.idempotencyKey}`
      );
      return { success: true, dbNotification: null, pushSent: false };
    }
    console.error('[NotificationService] Database insert error:', dbError);
    return { success: false, error: dbError };
  }

  // 2. Fetch Push Tokens for User (FCM + Expo)
  const tokens = await getTokensForUsers([params.userId]);
  if (tokens.length === 0) {
    return { success: true, dbNotification: dbNotif, pushSent: false };
  }

  // 3. Partition tokens between Expo Push and FCM Native
  const expoTokens = tokens.filter(
    (t) => t.startsWith('ExponentPushToken[') || t.startsWith('ExpoPushToken[')
  );
  const fcmTokens = tokens.filter(
    (t) =>
      !t.startsWith('ExponentPushToken[') && !t.startsWith('ExpoPushToken[')
  );

  let pushSent = false;

  // Send via Expo Push (100% Free)
  if (expoTokens.length > 0) {
    const expoCount = await sendExpoPush(
      expoTokens,
      params.title,
      params.message,
      {
        category: params.category,
        reference_type: params.referenceType || '',
        reference_id: params.referenceId || '',
        notification_id: dbNotif.id,
      }
    );
    if (expoCount > 0) pushSent = true;
  }

  // Send via FCM HTTP v1 (100% Free)
  if (fcmTokens.length > 0) {
    try {
      const fcmPayload = {
        title: params.title,
        body: params.message,
        url: params.link,
        imageUrl: params.imageUrl,
        data: {
          category: params.category,
          reference_type: params.referenceType || '',
          reference_id: params.referenceId || '',
          notification_id: dbNotif.id,
        },
      };

      const pushResult = await sendFcmToTokens(fcmTokens, fcmPayload);
      if (pushResult.sent > 0) pushSent = true;
    } catch (pushErr) {
      console.error('[NotificationService] FCM push delivery error:', pushErr);
    }
  }

  return {
    success: true,
    dbNotification: dbNotif,
    pushSent,
  };
}
