'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/context/NotificationContext';
import { requestFcmToken, onForegroundMessage } from '@/lib/fcm';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

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
  const { fetchNotifications } = useNotifications();
  const router = useRouter();
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
          // Ignore internal staff chat notifications on customer storefront
          if (
            payload.data?.category === 'CHAT' ||
            payload.data?.type === 'chat' ||
            payload.data?.conversationId
          ) {
            return;
          }

          // Refresh the global unread count and notifications context
          fetchNotifications();

          // Show clickable toast
          toast.success(
            (t) => (
              <div
                className="cursor-pointer"
                onClick={() => {
                  toast.dismiss(t.id);
                  const data = payload.data || {};
                  let targetUrl = '/account/notifications';
                  if (data.url) {
                    targetUrl = data.url;
                  } else if (data.category) {
                    switch (data.category) {
                      case 'ORDERS':
                        targetUrl = data.reference_id
                          ? `/account/orders/${data.reference_id}`
                          : '/account/orders';
                        break;
                      case 'WALLET':
                        targetUrl = '/account/wallet';
                        break;
                      case 'REWARDS':
                        targetUrl = '/account/coins';
                        break;
                      case 'OFFERS':
                      case 'UPDATES':
                      default:
                        targetUrl = '/account/notifications';
                        break;
                    }
                  }
                  router.push(targetUrl);
                }}
              >
                <div className="font-bold">
                  {payload.notification?.title || 'New Notification'}
                </div>
                <div className="text-sm">{payload.notification?.body}</div>
              </div>
            ),
            { icon: '🔔', duration: 5000 }
          );
        });
      } catch (error) {
        console.error('[FCM] Setup failed:', error);
      }
    };

    setupFcm();
  }, [user, fetchNotifications, router]);

  return null;
}
