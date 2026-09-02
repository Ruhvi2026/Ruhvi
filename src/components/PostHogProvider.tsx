'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import posthog from 'posthog-js/dist/module.slim';
import { PostHogProvider as PostHogProviderRaw } from 'posthog-js/react/slim';
import { useAuth } from '@/context/AuthContext';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export default function PostHogProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const uid = user?.id ?? null;

    if (uid && uid !== prevUserId.current) {
      posthog.identify(uid, {
        email: user?.email ?? profile?.email ?? undefined,
        role: profile?.role,
      });
    } else if (!uid && prevUserId.current) {
      posthog.reset();
    }
    prevUserId.current = uid;
  }, [user?.id, user?.email, profile?.email, profile?.role]);

  if (!POSTHOG_KEY) return <>{children}</>;

  return (
    <PostHogProviderRaw client={posthog as any}>{children}</PostHogProviderRaw>
  );
}
