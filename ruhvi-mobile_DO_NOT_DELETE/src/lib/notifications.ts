import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, getCurrentUserId } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Configure default in-app notification behavior (WhatsApp style heads-up)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Register device for Push Notifications & save token in Supabase user_push_tokens
 * Fetches both native FCM device token and Expo push token for maximum delivery reliability
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    // Android requires an explicit Notification Channel with MAX importance for WhatsApp-style heads-up alerts
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat_messages', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#075E54',
        sound: 'default',
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: false,
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[Notifications] Permission not granted for push notifications.');
      return null;
    }

    let nativeFcmToken: string | null = null;
    let expoPushToken: string | null = null;

    // 1. Get Native Android FCM Device Token
    try {
      const deviceData = await Notifications.getDevicePushTokenAsync();
      if (deviceData?.data) {
        nativeFcmToken = typeof deviceData.data === 'string' ? deviceData.data : JSON.stringify(deviceData.data);
        console.log('[Notifications] Native FCM Token registered');
      }
    } catch (deviceErr) {
      console.warn('[Notifications] Native FCM token note:', deviceErr);
    }

    // 2. Get Expo Push Token
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'a57902f9-aeb4-49f6-89df-51c45a855236',
      });
      if (tokenData?.data) {
        expoPushToken = tokenData.data;
        console.log('[Notifications] Expo Push Token registered');
      }
    } catch (tokenErr) {
      console.warn('[Notifications] Expo push token note:', tokenErr);
    }

    const primaryToken = expoPushToken || nativeFcmToken;
    if (!primaryToken) return null;

    // 3. Save tokens to Supabase user_push_tokens (both via service-role backend API and direct Supabase client)
    let uid = getCurrentUserId();
    if (!uid) {
      uid = await AsyncStorage.getItem('ruhvi_user_id');
    }

    if (uid) {
      const tokensToSave = Array.from(
        new Set([nativeFcmToken, expoPushToken].filter((t): t is string => !!t && t.length > 5))
      );

      // 3a. Register via backend API using service role for 100% reliable persistence
      try {
        await fetch('https://admin.ruhvi.in/api/internal-chat/push-notify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'register',
            user_id: uid,
            tokens: tokensToSave,
            platform: Platform.OS,
          }),
        });
        console.log('[Notifications] Backend service registered push tokens for user:', uid);
      } catch (backendRegErr) {
        console.warn('[Notifications] Backend token registration note:', backendRegErr);
      }

      // 3b. Local client upsert fallback
      for (const t of tokensToSave) {
        try {
          await supabase.from('user_push_tokens').upsert(
            {
              user_id: uid,
              token: t,
              platform: Platform.OS,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' }
          );
        } catch (_) {}
      }
    }

    return primaryToken;
  } catch (error) {
    console.warn('[Notifications] Registration error:', error);
    return null;
  }
}

/**
 * Display a native local WhatsApp-style heads-up banner on the phone
 */
export async function triggerLocalNotification(
  title: string,
  body: string,
  data?: Record<string, any>
) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: 'default',
        vibrate: [0, 250, 250, 250],
      },
      trigger: null, // deliver immediately
    });
  } catch (err) {
    console.warn('[Notifications] Local trigger error:', err);
  }
}

/**
 * Dispatch Push Notifications to conversation members across both Expo & native FCM services
 */
export async function dispatchChatPushNotification(
  conversationId: string,
  senderId: string,
  senderName: string,
  previewText: string,
  messageId?: string
) {
  try {
    // 1. Resolve sender name if generic or missing
    let resolvedSender = senderName;
    if (!resolvedSender || resolvedSender === 'Staff Member') {
      try {
        const { data: u } = await supabase
          .from('users')
          .select('full_name, email, department')
          .eq('id', senderId)
          .single();
        if (u) {
          resolvedSender = u.full_name || u.email?.split('@')[0] || 'Staff';
          if (u.department) resolvedSender += ` (${u.department})`;
        }
      } catch (_) {}
    }

    // Check if conversation is group
    let notificationTitle = resolvedSender || 'Staff Chat';
    try {
      const { data: conv } = await supabase
        .from('chat_conversations')
        .select('type, group_name')
        .eq('id', conversationId)
        .single();
      if (conv?.type === 'group' && conv.group_name) {
        notificationTitle = `${conv.group_name}: ${resolvedSender}`;
      }
    } catch (_) {}

    const cleanBody = previewText || 'Sent a message';

    // 2. Attempt delivery via the centralized backend endpoint (sends to BOTH Expo + direct FCM v1, & inserts in-app notification)
    let backendDelivered = false;
    try {
      const res = await fetch('https://admin.ruhvi.in/api/internal-chat/push-notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation_id: conversationId,
          sender_id: senderId,
          sender_name: notificationTitle,
          text_content: cleanBody,
          message_id: messageId,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.delivered > 0) {
          backendDelivered = true;
        }
      }
    } catch (backendErr) {
      console.log('[Notifications] Centralized push-notify failed, using direct client dispatch fallback:', backendErr);
    }

    if (backendDelivered) return;

    // 3. Fallback direct client dispatch for Expo Push tokens
    const { data: members, error: memErr } = await supabase
      .from('chat_conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId)
      .is('left_at', null);

    if (memErr || !members || members.length === 0) return;

    const recipientIds = members.map((m: any) => m.user_id);

    // Fetch push tokens for those recipients
    const { data: tokenRows, error: tokErr } = await supabase
      .from('user_push_tokens')
      .select('token')
      .in('user_id', recipientIds);

    if (tokErr || !tokenRows || tokenRows.length === 0) return;

    // Filter for valid Expo Push tokens
    const expoTokens = tokenRows
      .map((r: any) => r.token)
      .filter((tok: string) => tok && (tok.startsWith('ExponentPushToken[') || tok.startsWith('ExpoPushToken[')));

    if (expoTokens.length === 0) return;

    // Send via Expo's push notification API with high priority (wakes up Android when app closed)
    const messages = expoTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      priority: 'high',
      title: notificationTitle,
      body: cleanBody,
      channelId: 'chat_messages',
      data: {
        conversationId,
        type: 'chat',
      },
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.warn('[Notifications] Background push dispatch failed:', err);
  }
}
