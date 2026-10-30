# Content Security Policy (CSP) Hardening & Nonce Migration Plan (P2.3)

## 1. Current CSP Policy Analysis
The HTTP Content-Security-Policy header is generated in `src/lib/middleware/security-headers.ts`:

```http
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https: blob:; font-src 'self' data: https:; connect-src 'self' https: wss:; frame-src 'self' https://*.firebaseapp.com https://accounts.google.com https://*.google.com https://www.facebook.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests;
```

### Essential Constraints & Why `'unsafe-inline'` / `'unsafe-eval'` are currently required:
1. **Next.js 15 App Router Streaming & Hydration**: React 19 RSC streaming emits dynamic inline script chunks for promise resolution and suspense boundaries.
2. **Firebase Auth & Google Identity Services**: Firebase Auth popup/redirect handlers (`firebase/auth`) and Google Sign-in iframes require dynamic script execution.
3. **Turnstile Captcha & PostHog Analytics**: Turnstile injects challenges, and PostHog session replay uses dynamic workers.
4. **Zero Functional Breakage**: Abruptly removing `'unsafe-inline'` breaks store checkout and authentication.

---

## 2. Hardening Measures Implemented
- `object-src 'none'`: Completely disables plugin/Flash execution.
- `base-uri 'self'`: Prevents attackers from altering base URLs to steal relative form submissions.
- `frame-ancestors 'none'`: Prevents embedding in unauthorized iframes (anti-clickjacking).
- `upgrade-insecure-requests`: Enforces HTTPS for all sub-resources.
- `Permissions-Policy`: Hardened with `microphone=(self)` (P0.5) to allow AI Co-Founder voice while blocking camera and geolocation.

---

## 3. Phased Nonce-Based CSP Roadmap

To transition to nonce-based CSP without breaking Next.js hydration:
1. **Phase A (Middleware Nonce Generation)**:
   In Next.js middleware, generate a cryptographic nonce per request (`crypto.randomUUID()`), inject `x-nonce` into request headers, and attach `'nonce-${nonce}'` to `script-src`.
2. **Phase B (Root Layout Nonce Injection)**:
   Read `headers().get('x-nonce')` in `src/app/layout.tsx` and pass the nonce to `<Script>` tags and Next.js `<head>`.
3. **Phase C (Provider Compatibility Verification)**:
   Verify Firebase Auth, PostHog, LiveKit, and Turnstile support the nonce.
4. **Phase D (Enforce Strict CSP)**:
   Remove `'unsafe-inline'` once all inline scripts carry verified nonces.

