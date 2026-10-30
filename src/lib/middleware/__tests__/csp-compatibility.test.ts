import { NextResponse } from 'next/server';
import { applySecurityHeaders } from '../security-headers';

describe('Security Headers & CSP Hardening Audit (P2.3)', () => {
  it('enforces essential anti-XSS and anti-clickjacking CSP directives', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res);

    const csp = res.headers.get('Content-Security-Policy');
    expect(csp).toBeDefined();

    // Must prevent embedding
    expect(csp).toContain("frame-ancestors 'none'");
    // Must block plugin execution
    expect(csp).toContain("object-src 'none'");
    // Must prevent base URI hijacking
    expect(csp).toContain("base-uri 'self'");
    // Must force HTTPS upgrade
    expect(csp).toContain('upgrade-insecure-requests');
    // Must not allow unencrypted http scripts
    expect(csp).not.toMatch(/script-src[^;]*http:/);
  });

  it('enforces Permissions-Policy with scoped microphone=(self)', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res);

    const perm = res.headers.get('Permissions-Policy');
    expect(perm).toBeDefined();
    expect(perm).toContain('microphone=(self)');
    expect(perm).toContain('camera=()');
    expect(perm).toContain('geolocation=()');
  });

  it('sets X-Robots-Tag: noindex for internal portals', () => {
    const res = NextResponse.next();
    applySecurityHeaders(res, true);

    expect(res.headers.get('X-Robots-Tag')).toBe('noindex, nofollow');
  });
});
