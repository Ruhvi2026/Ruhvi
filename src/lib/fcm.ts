import {
  getMessaging,
  getToken,
  onMessage,
  isSupported,
} from 'firebase/messaging';
import app from './firebase';

// Helper to request notification permission and get token
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;

    const supported = await isSupported();
    if (!supported) {
      console.log('FCM is not supported in this browser.');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      const messagingSenderId =
        process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;

      if (!vapidKey || !messagingSenderId) {
        console.warn(
          'FCM is not fully configured (missing VAPID key or Messaging Sender ID).'
        );
        return null;
      }

      const messaging = getMessaging(app);
      const token = await getToken(messaging, { vapidKey });
      return token;
    } else {
      console.log('FCM permission denied.');
      return null;
    }
  } catch (error) {
    console.error('Error getting FCM token:', error);
    return null;
  }
}

// Helper to listen for foreground messages
export async function onForegroundMessage(callback: (payload: any) => void) {
  try {
    const supported = await isSupported();
    const messagingSenderId =
      process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;

    if (!supported || !messagingSenderId) return;

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch (error) {
    console.error('Error setting up FCM foreground listener:', error);
  }
}
