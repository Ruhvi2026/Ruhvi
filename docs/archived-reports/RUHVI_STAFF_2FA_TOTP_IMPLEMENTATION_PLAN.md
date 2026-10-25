# Ruhvi Staff & Super Admin Two-Factor Authentication (TOTP / 2FA) — Archived Implementation Report & Master Architecture

**Completed Date:** 2026-10-25  
**Status:** Completed & Production Verified  
**Tech Stack:** Next.js 15 App Router, Supabase PostgreSQL, Firebase Auth, Google Authenticator (RFC 6238 TOTP), Resend

---

## 1. Executive Summary & Overview
Implemented an enterprise-grade, 100% free, self-hosted Time-Based One-Time Password (TOTP) Two-Factor Authentication (2FA) system protecting all internal operational subdomains (`admin.ruhvi.in`, `orders.ruhvi.in`, `operation.ruhvi.in`, `support.ruhvi.in`, `tech.ruhvi.in`, `marketing.ruhvi.in`, `co-founder.ruhvi.in`).

The system requires zero external third-party authentication subscription costs (no Firebase Identity Platform paid upgrade, zero SMS delivery costs), runs RFC 6238 TOTP calculations natively in Node.js, encrypts secrets at rest using AES-256-GCM in PostgreSQL, issues single-use hashed backup recovery codes, enforces fail-closed Edge Middleware protection, and features an emergency recovery email fallback strictly locked to `subhasdas1996@gmail.com`.

---

## 2. Multi-Layered Recovery (No-Lockout Architecture)
To eliminate any risk of Super Admin or staff lockout due to lost or broken devices:
1. **Layer 1 (Daily Seamless):** Google Authenticator with Google Cloud Sync (automatic device sync via Google Account).
2. **Layer 2 (Offline Emergency):** 8 one-time emergency backup recovery codes (`XXXX-XXXX`) generated during enrollment and consumed atomically upon use.
3. **Layer 3 (Remote Recovery):** Secure, 15-minute cryptographically signed emergency recovery link dispatched via Resend to the master emergency inbox (`subhasdas1996@gmail.com`) with mandatory double-defense password re-verification. Destination email is masked from client responses to prevent data leaks.
4. **Layer 4 (Super Admin Reset):** Super Admins can reset 2FA for any employee directly from the Admin Portal (`src/app/admin/users/page.tsx`) with audit logging.
5. **Layer 5 (Master Backdoor):** Direct Supabase SQL query override available to the database owner.

---

## 3. Implementation Details by Phase

### Phase 1: Database Foundation & Schema Migration
- **Migration:** `supabase/migrations/0116_staff_two_factor_auth.sql`
- Added columns to `public.users`:
  - `totp_secret text`: AES-256-GCM encrypted base32 secret.
  - `totp_enabled boolean DEFAULT false`: 2FA activation status flag.
  - `totp_backup_codes text[]`: Array of SHA-256 hashed single-use emergency recovery codes.
  - `totp_enrolled_at timestamptz`: Activation timestamp.
  - Partial index `idx_users_totp_enabled` on `public.users(totp_enabled) WHERE totp_enabled = true`.

### Phase 2: Core Cryptographic & TOTP Engine Utilities
- **Implementation:** `src/lib/auth/totp.ts`
- RFC 6238 TOTP computation using Node.js `crypto` with dynamic truncation and HMAC-SHA1.
- Constant-time string comparison (`crypto.timingSafeEqual`) preventing timing side-channel attacks.
- $\pm 1$ time-step window (30-60s clock drift tolerance) for phone time discrepancies.
- `otpauth://` URI generator for Google Authenticator.
- AES-256-GCM encryption/decryption at rest (`enc:totp:v1:...`).
- 8 one-time backup recovery codes generator (`generateBackupCodes`) and single-use consumer (`verifyAndConsumeBackupCode`).

### Phase 3: TOTP Setup & Enrollment APIs
- **Implementation:**
  - `POST /api/auth/mfa/setup`: Generates unverified secret, offline QR code DataURL via `qrcode` package, and a 15-minute signed JWT `setupToken`.
  - `POST /api/auth/mfa/activate`: Verifies the first 6-digit code, activates `totp_enabled = true`, and returns 8 printable/downloadable backup codes.

### Phase 4: Login Verification & Session Minting API
- **Implementation:**
  - `POST /api/auth/mfa/challenge`: Checks user role and `totp_enabled`. If active, issues a 5-minute `mfa_pending` challenge token.
  - `POST /api/auth/mfa/verify`: Dual-mode validator verifying either a 6-digit TOTP code or an 8-character backup code (auto-consuming it from `public.users`). On success, mints the official full `__session` HTTP-only cookie with `mfa_verified: true`.

### Phase 5: Emergency Email Recovery API & Template
- **Implementation:**
  - `src/lib/resend.ts`: Luxury dark/gold branded `sendMfaEmergencyRecoveryEmail` template.
  - `POST /api/auth/mfa/recovery/request`: Dispatches 15-minute emergency recovery link strictly locked to `subhasdas1996@gmail.com`.
  - `POST /api/auth/mfa/recovery/confirm`: Verifies recovery token + validates account password via Firebase Identity Toolkit REST API before resetting 2FA, issuing a 24-hour recovery session, and recording an audit log entry.

### Phase 6: Admin Login UI Integration
- **Implementation:** `src/app/(auth)/login/AdminLogin.tsx`
- Seamless 2-step transition (Credentials -> 6-digit Code).
- Toggle between 6-digit Authenticator code and 8-character backup recovery code.
- Emergency recovery trigger link sending email to the locked inbox without displaying the email address on screen.
- Emergency recovery confirmation mode for URL `?recoveryToken=...`.

### Phase 7: Staff Enrollment & Onboarding Modal UI
- **Implementation:** `src/components/auth/MfaSetupModal.tsx`
- High-res offline QR code scanner + manual secret key copy.
- 6-digit confirmation code input.
- Printable recovery codes card with "Copy All Codes" and "Download (.txt)" buttons.

### Phase 8: Super Admin Staff 2FA Management UI
- **Implementation:** `src/app/admin/actions/auth.ts`, `src/app/admin/users/page.tsx`
- Added `resetUserMfa(userId)` server action with `requireAdmin()` check and audit log recording.
- Staff table displays `2FA Active` (green shield) or `2FA Off` (gray) badge.
- Added "Reset 2FA" action button for Super Admins to unlock locked employees.

### Phase 9: Middleware Enforcement & Full Verification
- **Implementation:** `src/middleware.ts`, `src/lib/middleware/rbac-cache.ts`
- Added `totpEnabled` to `CachedRbacProfile` and Edge RBAC JWT cache.
- Enforced `mfa_verified: true` in `__session` token for all internal portal subdomains and internal routes. Unverified sessions are redirected to `/login` (Fail-Closed).
- Storefront and customer checkout remain 100% untouched (Zero Functional Breakage).
- Documented in `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
- Full project lint check passed with 0 errors.
