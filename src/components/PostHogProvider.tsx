'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import posthog from 'posthog-js';
import { PostHogProvider as PostHogProviderRaw } from 'posthog-js/react';
import { useAuth } from '@/context/AuthContext';

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://eu.i.posthog.com';
const POSTHOG_UI_HOST =
  process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com';

const SENSITIVE_PROPERTY_PATTERN =
  /(?:password|passwd|pwd|secret|credential|authorization|auth_token|access_token|refresh_token|id_token|api[-_]?key|cvv|cvc|card(?:[-_]?number)?|cardNumber|otp|pan|aadhaar|adhaar|ssn|token|phone(?:[-_]?number)?|mobile|email|full[-_]?name|pin\b|security[-_]?code|billing_address|shipping_address)/i;

const URL_KEYS = new Set([
  '$current_url',
  '$pathname',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  'url',
  'pathname',
  'href',
  'referrer',
]);

function sanitizeUrl(value: string): string {
  try {
    const url = new URL(value, 'https://ruhvi.in');
    const keys = [...url.searchParams.keys()];
    for (const key of keys) {
      if (SENSITIVE_PROPERTY_PATTERN.test(key)) {
        url.searchParams.set(key, '[REDACTED]');
      }
    }
    return url.toString();
  } catch {
    return value;
  }
}

function redactValue(value: unknown, depth = 0): unknown {
  if (value == null || depth > 8) return value;
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1));
  }
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(record)) {
    if (SENSITIVE_PROPERTY_PATTERN.test(key)) {
      output[key] = '[REDACTED]';
    } else if (URL_KEYS.has(key) && typeof val === 'string') {
      output[key] = sanitizeUrl(val);
    } else {
      output[key] = redactValue(val, depth + 1);
    }
  }
  return output;
}

if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    ui_host: POSTHOG_UI_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskInputOptions: {
        password: true,
        email: true,
        tel: true,
        number: true,
        date: true,
        textarea: true,
        select: true,
      },
      maskTextFn: (text, element) => {
        if (!element) return text;
        const autocomplete =
          element.getAttribute?.('autocomplete')?.toLowerCase() ?? '';
        if (autocomplete.startsWith('cc-')) return '*'.repeat(text.length);
        if (
          element.closest?.(
            '[data-sensitive], [data-pii], [data-sensitive-text]'
          )
        ) {
          return '*'.repeat(text.length);
        }
        return text;
      },
      blockSelector: '[data-ph-block]',
      maskTextSelector: '[data-sensitive-text], [data-pii]',
    },
    before_send: (cr) => {
      if (!cr) return cr;
      if (cr.properties) {
        cr.properties = redactValue(cr.properties) as Record<string, unknown>;
      }
      if (cr.$set) {
        cr.$set = redactValue(cr.$set) as Record<string, unknown>;
      }
      if (cr.$set_once) {
        cr.$set_once = redactValue(cr.$set_once) as Record<string, unknown>;
      }
      return cr;
    },
  });
}

export default function PostHogProvider({ children }: { children: ReactNode }) {
  const { user, profile } = useAuth();
  const prevUserId = useRef<string | null>(null);

  useEffect(() => {
    if (!POSTHOG_KEY) return;
    const uid = user?.id ?? null;

    if (uid && uid !== prevUserId.current) {
      posthog.identify(uid, {
        role: profile?.role,
      });
    } else if (!uid && prevUserId.current) {
      posthog.reset();
    }
    prevUserId.current = uid;
  }, [user?.id, profile?.role]);

  if (!POSTHOG_KEY) return <>{children}</>;

  return <PostHogProviderRaw client={posthog}>{children}</PostHogProviderRaw>;
}
