-- =============================================================================
-- 0030_unified_customer_identity.sql
-- Unified Customer Identity and Account Linking (v2)
-- =============================================================================

-- Add new columns to users
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Create customer_identities table
CREATE TABLE IF NOT EXISTS public.customer_identities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  firebase_uid text NOT NULL UNIQUE,
  provider text NOT NULL,
  provider_identifier text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_identifier)
);

-- RLS for customer_identities
ALTER TABLE public.customer_identities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own identities" ON public.customer_identities;
CREATE POLICY "Users can view their own identities"
ON public.customer_identities FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

-- Let's migrate existing data before dropping the column (just in case)
INSERT INTO public.customer_identities (customer_id, firebase_uid, provider, provider_identifier)
SELECT id, firebase_uid, 'password', email
FROM public.users
WHERE firebase_uid IS NOT NULL
ON CONFLICT DO NOTHING;

-- Drop the trigger that forces firebase_uid on users table
DROP TRIGGER IF EXISTS trg_set_firebase_uid ON public.users;
DROP FUNCTION IF EXISTS public.set_firebase_uid_fn();

-- Drop the old column from users table
ALTER TABLE public.users DROP COLUMN IF EXISTS firebase_uid;

-- Update RLS to prevent client from updating verification flags
CREATE OR REPLACE FUNCTION public.protect_verification_flags_fn()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- If this is not the service role, and the verification flags are being changed
  IF auth.role() != 'service_role' THEN
    IF NEW.email_verified IS DISTINCT FROM OLD.email_verified THEN
      NEW.email_verified := OLD.email_verified;
    END IF;
    IF NEW.phone_verified IS DISTINCT FROM OLD.phone_verified THEN
      NEW.phone_verified := OLD.phone_verified;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_verification_flags ON public.users;
CREATE TRIGGER trg_protect_verification_flags
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.protect_verification_flags_fn();

-- Drop old RPC functions
DROP FUNCTION IF EXISTS public.upsert_firebase_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.sync_firebase_user(text, text, text, text);
DROP FUNCTION IF EXISTS public.sync_firebase_uids();

-- Create new resolve_customer_identity RPC function (Path B resolution)
-- We'll accept the new UID, and verified claims
CREATE OR REPLACE FUNCTION public.resolve_customer_identity(
  p_firebase_uid text,
  p_provider text,
  p_provider_identifier text,
  p_email text DEFAULT NULL,
  p_email_verified boolean DEFAULT false,
  p_phone text DEFAULT NULL,
  p_phone_verified boolean DEFAULT false,
  p_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id uuid;
  v_existing_identity_id uuid;
  v_matching_customer_id uuid;
BEGIN
  -- 1. Check if identity already exists (Path A / existing user login)
  SELECT customer_id INTO v_customer_id
  FROM public.customer_identities
  WHERE firebase_uid = p_firebase_uid;

  IF v_customer_id IS NOT NULL THEN
    -- Update verification flags if they have become verified
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
    RETURN v_customer_id;
  END IF;

  -- 2. Identity does not exist. Check if we can link via verified email or phone (Path B)
  v_matching_customer_id := NULL;

  IF p_email_verified AND p_email IS NOT NULL THEN
    SELECT id INTO v_matching_customer_id
    FROM public.users
    WHERE email = p_email
    LIMIT 1;
  END IF;

  IF v_matching_customer_id IS NULL AND p_phone_verified AND p_phone IS NOT NULL THEN
    SELECT id INTO v_matching_customer_id
    FROM public.users
    WHERE phone = p_phone
    LIMIT 1;
  END IF;

  -- 3. If match found, link to existing customer
  IF v_matching_customer_id IS NOT NULL THEN
    v_customer_id := v_matching_customer_id;
    -- Update flags and email/phone if missing
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
  ELSE
    -- 4. No match found, create new customer
    INSERT INTO public.users (email, phone, full_name, email_verified, phone_verified, role, wallet_balance, reward_coins)
    VALUES (p_email, p_phone, p_name, p_email_verified, p_phone_verified, 'customer', 0, 0)
    RETURNING id INTO v_customer_id;
  END IF;

  -- 5. Insert new identity
  INSERT INTO public.customer_identities (customer_id, firebase_uid, provider, provider_identifier)
  VALUES (v_customer_id, p_firebase_uid, p_provider, p_provider_identifier);

  RETURN v_customer_id;
END;
$$;
