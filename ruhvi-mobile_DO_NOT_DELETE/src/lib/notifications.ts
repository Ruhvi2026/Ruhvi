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
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  try {
    // Android requires an explicit Notification Channel
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

    // Get Expo Push Token
    let token: string | null = null;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: 'a57902f9-aeb4-49f6-89df-51c45a855236',
      });
      token = tokenData.data;
    } catch (tokenErr) {
      // Fallback to native device push token
      try {
        const deviceData = await Notifications.getDevicePushTokenAsync();
        token = deviceData.data;
      } catch (deviceErr) {
        console.warn('[Notifications] Could not get push token:', deviceErr);
      }
    }

    if (!token) return null;

    // Save token to Supabase user_push_tokens
    let uid = getCurrentUserId();
    if (!uid) {
      uid = await AsyncStorage.getItem('ruhvi_user_id');
    }

    if (uid && token) {
      await supabase.from('user_push_tokens').upsert(
        {
          user_id: uid,
          token: token,
          platform: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'token' }
      );
    }

    return token;
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
 * Dispatch free Expo Push Notifications to conversation members
 */
export async function dispatchChatPushNotification(
  conversationId: string,
  senderId: string,
  senderName: string,
  previewText: string
) {
  try {
    // 1. Get recipients (all other active members in this conversation)
    const { data: members, error: memErr } = await supabase
      .from('chat_conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId)
      .neq('user_id', senderId)
      .is('left_at', null);

    if (memErr || !members || members.length === 0) return;

    const recipientIds = members.map((m: any) => m.user_id);

    // 2. Fetch push tokens for those recipients
    const { data: tokenRows, error: tokErr } = await supabase
      .from('user_push_tokens')
      .select('token')
      .in('user_id', recipientIds);

    if (tokErr || !tokenRows || tokenRows.length === 0) return;

    // 3. Filter for valid Expo Push tokens
    const expoTokens = tokenRows
      .map((r: any) => r.token)
      .filter((tok: string) => tok && (tok.startsWith('ExponentPushToken[') || tok.startsWith('ExpoPushToken[')));

    if (expoTokens.length === 0) return;

    // 4. Send via Expo's free push notification API
    const messages = expoTokens.map((token: string) => ({
      to: token,
      sound: 'default',
      title: senderName || 'Staff Chat',
      body: previewText || 'Sent a message',
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

