-- =============================================================================
-- 0035_sync_wallet_and_verification.sql
-- Fix wallet balance sync and ensure accurate email verification state
-- =============================================================================

-- 1. Ensure update_user_wallet_balance correctly handles COALESCE
CREATE OR REPLACE FUNCTION public.update_user_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.type IN ('credit', 'cashback') THEN
    UPDATE public.users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount 
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.users 
    SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - NEW.amount)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update resolve_customer_identity to initialize wallet_balance = 50 and record credit
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
  v_matching_customer_id uuid;
BEGIN
  -- 1. Check if identity already exists
  SELECT customer_id INTO v_customer_id
  FROM public.customer_identities
  WHERE firebase_uid = p_firebase_uid;

  IF v_customer_id IS NOT NULL THEN
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
    RETURN v_customer_id;
  END IF;

  -- 2. Link via verified claims
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

  -- 3. If match found, link identity
  IF v_matching_customer_id IS NOT NULL THEN
    v_customer_id := v_matching_customer_id;
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
  ELSE
    -- 4. Create new customer with 50 signup bonus
    INSERT INTO public.users (
      email, 
      phone, 
      full_name, 
      email_verified, 
      phone_verified, 
      role, 
      wallet_balance, 
      reward_coins
    )
    VALUES (
      p_email, 
      p_phone, 
      p_name, 
      p_email_verified, 
      p_phone_verified, 
      'customer', 
      50.00, 
      0
    )
    RETURNING id INTO v_customer_id;

    -- Record signup bonus credit in ledger
    INSERT INTO public.wallet_ledger (user_id, amount, type)
    VALUES (v_customer_id, 50.00, 'credit');
  END IF;

  -- 5. Insert new identity
  INSERT INTO public.customer_identities (customer_id, firebase_uid, provider, provider_identifier)
  VALUES (v_customer_id, p_firebase_uid, p_provider, p_provider_identifier)
  ON CONFLICT (provider, provider_identifier) DO NOTHING;

  RETURN v_customer_id;
END;
$$;

-- 3. Retroactively recalculate wallet balances from wallet_ledger for any existing users
UPDATE public.users u
SET wallet_balance = COALESCE((
  SELECT SUM(
    CASE 
      WHEN wl.type IN ('credit', 'cashback') THEN wl.amount
      WHEN wl.type = 'debit' THEN -wl.amount
      ELSE 0
    END
  )
  FROM public.wallet_ledger wl
  WHERE wl.user_id = u.id
), 0.00);
