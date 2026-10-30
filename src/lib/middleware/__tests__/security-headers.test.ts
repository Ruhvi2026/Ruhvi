import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '../security-headers';

describe('Security Headers Module (Permissions-Policy & Protection)', () => {
  it('applies secure Permissions-Policy enabling first-party microphone while denying camera', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res, false);

    const permissionsPolicy = res.headers.get('Permissions-Policy');
    expect(permissionsPolicy).toBeDefined();
    expect(permissionsPolicy).toContain('microphone=(self)');
    expect(permissionsPolicy).toContain('camera=()');
    expect(permissionsPolicy).toContain('geolocation=()');
    expect(permissionsPolicy).toContain('payment=(self)');
  });

  it('sets standard defensive security headers', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res, false);

    expect(res.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.headers.get('X-Frame-Options')).toBe('DENY');
    expect(res.headers.get('Strict-Transport-Security')).toContain(
      'max-age=31536000'
    );
    expect(res.headers.get('Referrer-Policy')).toBe(
      'strict-origin-when-cross-origin'
    );
    expect(res.headers.get('Cross-Origin-Opener-Policy')).toBe(
      'same-origin-allow-popups'
    );
  });

  it('adds noindex tag when isPortal is true', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res, true);

    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });

  it('omits noindex tag when isPortal is false for public storefront', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res, false);

    expect(res.headers.get('X-Robots-Tag')).toBeNull();
  });
});
