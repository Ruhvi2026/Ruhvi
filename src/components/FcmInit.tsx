'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { requestFcmToken, onForegroundMessage } from '@/lib/fcm';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';

async function removeFcmTokenFromBackend(token: string) {
  try {
    const supabase = createClient();
    await supabase.from('user_push_tokens').delete().eq('token', token);
  } catch (error) {
    console.error('[FCM] Failed to remove token:', error);
  }
}

export function FcmInit() {
  const { user } = useAuth();
  const initAttemptedFor = useRef<string | null>(null);
  const currentToken = useRef<string | null>(null);

  useEffect(() => {
    const uid = user?.id ?? null;
    if (!uid) {
      if (initAttemptedFor.current) {
        if (currentToken.current) {
          removeFcmTokenFromBackend(currentToken.current);
        }
        initAttemptedFor.current = null;
        currentToken.current = null;
      }
      return;
    }
    if (initAttemptedFor.current === uid) return;
    initAttemptedFor.current = uid;
    const userId = uid;

    const setupFcm = async () => {
      try {
        const token = await requestFcmToken();
        if (token) {
          currentToken.current = token;
          console.log('[FCM] Successfully got token for user:', userId);

          const supabase = createClient();
          const { error } = await supabase.from('user_push_tokens').upsert(
            {
              user_id: userId,
              token,
              platform: 'web',
              last_seen_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,token' }
          );

          if (error) {
            console.error('[FCM] Failed to save token to database:', error);
          } else {
            console.log('[FCM] Token saved/updated in database.');
          }
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
