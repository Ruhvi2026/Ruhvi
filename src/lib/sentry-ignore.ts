import type { ErrorEvent } from '@sentry/nextjs';

const IGNORE_PATTERNS = [
  /Database is closing\/hidden/,
  /An unexpected response was received from the server/,
  /^Failed to fetch$/,
  /Cannot read properties of null \(reading 'parentNode'\)/,
  /^aborted$/,
  /Supabase Client is configured with the accessToken option/,
];

export function beforeSendSentry(event: ErrorEvent) {
  const exception = event.exception?.values?.[0];
  const message = exception?.value || event.message || '';
  if (IGNORE_PATTERNS.some((p) => p.test(message))) {
    return null;
  }
  return event;
}
