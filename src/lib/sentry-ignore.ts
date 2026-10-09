import type { ErrorEvent } from '@sentry/nextjs';

const IGNORE_PATTERNS = [
  /Database is closing\/hidden/,
  /An unexpected response was received from the server/,
  /^Failed to fetch$/,
  /Cannot read properties of null \(reading 'parentNode'\)/,
  /^aborted$/,
  /Supabase Client is configured with the accessToken option/,
  /auth\/invalid-api-key/,
];

export function beforeSendSentry(event: ErrorEvent) {
  const exception = event.exception?.values?.[0];
  const message = exception?.value || event.message || '';
  if (IGNORE_PATTERNS.some((p) => p.test(message))) {
    return null;
  }

  // Actively Scrub PII before it leaves the server/client
  if (event.request && event.request.data) {
    let dataStr =
      typeof event.request.data === 'string'
        ? event.request.data
        : JSON.stringify(event.request.data);
    dataStr = dataStr.replace(
      /"(password|otp|token|secret)":"[^"]+"/gi,
      '"$1":"[REDACTED]"'
    );
    // Basic redaction for emails and phone numbers in payloads
    dataStr = dataStr.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[REDACTED_EMAIL]'
    );
    dataStr = dataStr.replace(
      /(?:\+?\d{1,3})?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      '[REDACTED_PHONE]'
    );

    try {
      event.request.data = JSON.parse(dataStr);
    } catch {
      event.request.data = dataStr;
    }
  }

  // Redact user context PII
  if (event.user) {
    if (event.user.email) event.user.email = '[REDACTED_EMAIL]';
    if (event.user.ip_address) delete event.user.ip_address;
  }

  return event;
}
