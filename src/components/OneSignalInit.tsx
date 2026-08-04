'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export function OneSignalInit() {
  useEffect(() => {
    const initOneSignal = async () => {
      try {
        const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
        if (!appId) {
          console.warn('OneSignal App ID not found in environment variables.');
          return;
        }

        await OneSignal.init({
          appId: appId,
          allowLocalhostAsSecureOrigin: true,
          notifyButton: {
            enable: true,
          },
        });
      } catch (error) {
        console.error('Error initializing OneSignal:', error);
      }
    };
    
    // Only run on the client side
    if (typeof window !== 'undefined') {
      initOneSignal();
    }
  }, []);

  return null;
}
