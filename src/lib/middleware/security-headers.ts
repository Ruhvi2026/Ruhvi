/**
 * Security Headers Module
 *
 * Applies HTTP security headers to outgoing responses.
 * Extracted from middleware.ts for testability and maintainability.
 */

import { NextResponse } from 'next/server';

/**
 * Applies a comprehensive set of security headers to a NextResponse.
 *
 * @param res - The NextResponse to modify in-place
 * @param isPortal - When true, adds X-Robots-Tag: noindex to prevent search indexing of admin portals
 * @returns The same response with headers applied
 */
export function applySecurityHeaders(
  res: NextResponse,
  isPortal = false
): NextResponse {
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(self), geolocation=(), payment=(self)'
  );
  // CSP: strictly HTTPS for scripts (no unencrypted http:)
  // TODO: Migrate from unsafe-inline/unsafe-eval to nonce-based CSP
  //       See: https://nextjs.org/docs/app/building-your-application/configuring/content-security-policy
  res.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com https://www.facebook.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests;"
  );
  if (isPortal) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return res;
}
