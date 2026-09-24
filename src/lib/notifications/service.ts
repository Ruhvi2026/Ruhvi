import { createClient } from '@supabase/supabase-js';
import { getTokensForUsers, sendFcmToTokens } from '@/lib/fcm-admin';

export type NotificationCategory =
  'ORDERS' | 'WALLET' | 'OFFERS' | 'UPDATES' | 'SYSTEM';

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

  // 2. Fetch FCM Tokens for User
  const tokens = await getTokensForUsers([params.userId]);
  if (tokens.length === 0) {
    return { success: true, dbNotification: dbNotif, pushSent: false };
  }

  // 3. Send Push Notification via FCM
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

    const pushResult = await sendFcmToTokens(tokens, fcmPayload);
    return {
      success: true,
      dbNotification: dbNotif,
      pushSent: pushResult.sent > 0,
    };
  } catch (pushErr) {
    console.error('[NotificationService] Push delivery error:', pushErr);
    // Even if push fails, we return success because the DB record was created securely.
    return { success: true, dbNotification: dbNotif, pushSent: false };
  }
}
