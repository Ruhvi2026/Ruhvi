'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { requestFcmToken, onForegroundMessage } from '@/lib/fcm';
import toast from 'react-hot-toast';

export function FcmInit() {
  const { user } = useAuth();
  const initAttempted = useRef(false);

  useEffect(() => {
    // Only attempt to initialize if user is logged in
    if (!user || initAttempted.current) return;
    initAttempted.current = true;

    const setupFcm = async () => {
      try {
        const token = await requestFcmToken();
        if (token) {
          console.log('[FCM] Successfully got token for user:', user.id);
          // TODO: Send token to your backend (e.g., Supabase table 'user_push_tokens')
          // await saveFcmTokenToDatabase(user.id, token);
        }

        onForegroundMessage((payload) => {
          console.log('[FCM] Received foreground message:', payload);
          toast.success(payload.notification?.title || 'New Notification', {
            icon: '🔔',
          });
        });
      } catch (error) {
        console.error('[FCM] Setup failed:', error);
      }
    };

    setupFcm();
  }, [user]);

  return null;
}
