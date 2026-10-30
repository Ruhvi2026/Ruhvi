'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useAuth } from '@/context/AuthContext';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;

export interface PostHogSyncResult {
  action: 'identify' | 'reset' | 'skipped_dnt' | 'skipped_no_key' | 'noop';
  uid?: string;
  properties?: Record<string, any>;
}

/**
 * Pure evaluation function for PostHog user identity sync.
 * Strictly enforces PII Minimization (Audit Finding G2).
 */
export function evaluatePostHogIdentity(params: {
  uid: string | null;
  prevUid: string | null;
  role?: string;
  doNotTrack?: boolean;
  hasKey?: boolean;
}): PostHogSyncResult {
  const { uid, prevUid, role, doNotTrack, hasKey = true } = params;

  if (!hasKey) {
    return { action: 'skipped_no_key' };
  }

  if (doNotTrack) {
    return { action: 'skipped_dnt' };
  }

  if (uid && uid !== prevUid) {
    const isStaff = ['super_admin', 'admin', 'manager', 'staff'].includes(
      role || ''
    );
    return {
      action: 'identify',
      uid,
      properties: {
        role: role || 'customer',
        is_staff: isStaff,
      },
    };
  }

  if (!uid && prevUid) {
    return { action: 'reset' };
  }

  return { action: 'noop' };
}

export default function PostHogProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    const isDnt =
      typeof navigator !== 'undefined' &&
      (navigator.doNotTrack === '1' || (window as any)?.doNotTrack === '1');

    const uid = user?.id ?? null;
    const plan = evaluatePostHogIdentity({
      uid,
      prevUid: prevUserId.current,
      role: profile?.role,
      doNotTrack: isDnt,
      hasKey: Boolean(POSTHOG_KEY),
    });

    if (plan.action === 'identify' && plan.uid && plan.properties) {
      import('posthog-js/dist/module.slim')
        .then(({ default: posthog }) => {
          posthog.identify(plan.uid!, plan.properties);
        })
        .catch((err) => {
          console.warn(
            '[PostHogProvider] Failed to identify user:',
            err?.message
          );
        });
    } else if (plan.action === 'reset') {
      import('posthog-js/dist/module.slim')
        .then(({ default: posthog }) => {
          posthog.reset();
        })
        .catch((err) => {
          console.warn('[PostHogProvider] Failed to reset user:', err?.message);
        });
    }

    prevUserId.current = uid;
  }, [user?.id, profile?.role]);

  return <>{children}</>;
}
