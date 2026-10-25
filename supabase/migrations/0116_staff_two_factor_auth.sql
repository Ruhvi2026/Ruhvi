-- =============================================================================
-- Migration: 0116_staff_two_factor_auth.sql
-- Description: Adds schema support for Staff & Super Admin Two-Factor
--              Authentication (TOTP / Google Authenticator) and backup recovery codes.
--
-- Security:
--   * totp_secret is AES-256-GCM encrypted at rest using CREDENTIAL_ENCRYPTION_KEY.
--   * totp_backup_codes stores SHA-256 hashes of single-use recovery codes.
--   * All MFA verification is handled server-side via service-role API routes.
-- =============================================================================

-- 1. Add TOTP MFA columns to public.users safely
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS totp_secret text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS totp_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_backup_codes text[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS totp_enrolled_at timestamptz DEFAULT NULL;

-- 2. Partial index for quick filtering of MFA-enabled staff/admin accounts
CREATE INDEX IF NOT EXISTS idx_users_totp_enabled
  ON public.users(totp_enabled)
  WHERE totp_enabled = true;

-- 3. Document column definitions
COMMENT ON COLUMN public.users.totp_secret IS 'AES-256-GCM encrypted base32 secret for TOTP (RFC 6238). Never plaintext.';
COMMENT ON COLUMN public.users.totp_enabled IS 'Indicates whether TOTP 2FA is active and required during login.';
COMMENT ON COLUMN public.users.totp_backup_codes IS 'Array of SHA-256 hashed single-use emergency backup recovery codes.';
COMMENT ON COLUMN public.users.totp_enrolled_at IS 'Timestamp when TOTP 2FA was successfully verified and enabled.';
