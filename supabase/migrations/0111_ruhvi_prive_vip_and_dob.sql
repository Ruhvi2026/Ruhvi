-- =============================================================================
-- 0111_ruhvi_prive_vip_and_dob.sql
-- Add VIP Membership (Ruhvi Privé) and Date of Birth (DOB) fields to public.users
-- =============================================================================

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS vip_joined_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS vip_expires_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS vip_source text NULL,
  ADD COLUMN IF NOT EXISTS date_of_birth date NULL,
  ADD COLUMN IF NOT EXISTS is_dob_locked boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS dob_updated_at timestamptz NULL;

-- Add is_vip flag to orders table for priority dispatch branding and audit
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS is_vip boolean DEFAULT false NOT NULL;

-- Helpful index for checking active VIP members
CREATE INDEX IF NOT EXISTS idx_users_vip_active ON public.users (is_vip, vip_expires_at);

-- Comment annotations for documentation
COMMENT ON COLUMN public.users.is_vip IS 'Flag indicating active Ruhvi Privé VIP membership';
COMMENT ON COLUMN public.users.vip_joined_at IS 'Timestamp when the user first joined or last renewed VIP';
COMMENT ON COLUMN public.users.vip_expires_at IS 'Expiration timestamp (joined_at + 365 days)';
COMMENT ON COLUMN public.users.vip_source IS 'Origin of VIP activation: coins, wallet, gateway, or admin_grant';
COMMENT ON COLUMN public.users.date_of_birth IS 'User date of birth for birthday reward verification';
COMMENT ON COLUMN public.users.is_dob_locked IS 'Permanent lock flag preventing DOB modification after initial submission';
COMMENT ON COLUMN public.users.dob_updated_at IS 'Timestamp when DOB was first submitted and locked';
COMMENT ON COLUMN public.orders.is_vip IS 'Flag indicating order placed by an active Ruhvi Privé VIP member';
