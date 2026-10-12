'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export default function PostHogProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const uid = user?.id ?? null;

    if (uid && uid !== prevUserId.current) {
      import('posthog-js/dist/module.slim').then(({ default: posthog }) => {
        posthog.identify(uid, {
          email: user?.email ?? profile?.email ?? undefined,
          role: profile?.role,
        });
      });
    } else if (!uid && prevUserId.current) {
      import('posthog-js/dist/module.slim').then(({ default: posthog }) => {
        posthog.reset();
      });
    }
    prevUserId.current = uid;
  }, [user?.id, user?.email, profile?.email, profile?.role]);

  return <>{children}</>;
}
