// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs';
import { beforeSendSentry } from '@/lib/sentry-ignore';
import posthog from 'posthog-js';

Sentry.init({
  dsn: 'https://eecdeac600c80b3f7838f9f38c5d3192@o4511965411606528.ingest.de.sentry.io/4511965422288976',

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 1,

  beforeSend: beforeSendSentry,

  dataCollection: {
    // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
    // https://docs.sentry.io/platforms/javascript/guides/nextjs/configuration/options/#dataCollection
    // userInfo: false,
    // httpBodies: [],
  },
});

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
    // With `defaults: '2026-01-30'` the SDK captures pageviews via the History
    // API ('history_change'), which covers Next.js App Router client-side
    // navigations automatically.
    defaults: '2026-01-30',
    person_profiles: 'identified_only',
    capture_pageview: false, // We handle it manually in PostHogPageView
    capture_pageleave: true,
    disable_session_recording: true,
    disable_surveys: true,
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

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
