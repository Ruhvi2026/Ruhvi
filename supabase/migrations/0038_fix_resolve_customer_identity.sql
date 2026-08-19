-- Migration 0038: Fix resolve_customer_identity to match by email regardless of verification status to prevent UNIQUE constraint violation and mapping failure on login
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
  v_bonus_awarded boolean;
BEGIN
  -- 1. Check if identity already exists
  SELECT customer_id INTO v_customer_id
  FROM public.customer_identities
  WHERE firebase_uid = p_firebase_uid;

  IF v_customer_id IS NOT NULL THEN
    -- Get current bonus status
    SELECT signup_bonus_awarded INTO v_bonus_awarded FROM public.users WHERE id = v_customer_id;
    
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
    
    -- Award bonus if not already awarded and they are now fully verified
    IF NOT v_bonus_awarded THEN
      DECLARE
        v_final_email_verified boolean;
        v_final_phone_verified boolean;
      BEGIN
        SELECT email_verified, phone_verified INTO v_final_email_verified, v_final_phone_verified FROM public.users WHERE id = v_customer_id;
        IF v_final_email_verified AND v_final_phone_verified THEN
          UPDATE public.users SET signup_bonus_awarded = true WHERE id = v_customer_id;
          INSERT INTO public.wallet_ledger (user_id, amount, type) VALUES (v_customer_id, 50.00, 'credit');
        END IF;
      END;
    END IF;
    
    RETURN v_customer_id;
  END IF;

  -- 2. Link via email or verified claims
  v_matching_customer_id := NULL;

  IF p_email IS NOT NULL THEN
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
    
    -- Get current bonus status
    SELECT signup_bonus_awarded INTO v_bonus_awarded FROM public.users WHERE id = v_customer_id;
    
    IF p_email_verified THEN
      UPDATE public.users SET email_verified = true, email = COALESCE(email, p_email) WHERE id = v_customer_id;
    END IF;
    IF p_phone_verified THEN
      UPDATE public.users SET phone_verified = true, phone = COALESCE(phone, p_phone) WHERE id = v_customer_id;
    END IF;
    
    -- Award bonus if not already awarded and they are now fully verified
    IF NOT v_bonus_awarded THEN
      DECLARE
        v_final_email_verified boolean;
        v_final_phone_verified boolean;
      BEGIN
        SELECT email_verified, phone_verified INTO v_final_email_verified, v_final_phone_verified FROM public.users WHERE id = v_customer_id;
        IF v_final_email_verified AND v_final_phone_verified THEN
          UPDATE public.users SET signup_bonus_awarded = true WHERE id = v_customer_id;
          INSERT INTO public.wallet_ledger (user_id, amount, type) VALUES (v_customer_id, 50.00, 'credit');
        END IF;
      END;
    END IF;
    
  ELSE
    -- 4. Create new customer
    INSERT INTO public.users (
      email, 
      phone, 
      full_name, 
      email_verified, 
      phone_verified, 
      role, 
      wallet_balance, 
      reward_coins,
      signup_bonus_awarded
    )
    VALUES (
      p_email, 
      p_phone, 
      p_name, 
      p_email_verified, 
      p_phone_verified, 
      'customer', 
      0.00,
      0,
      (p_email_verified AND p_phone_verified)
    )
    RETURNING id INTO v_customer_id;

    -- Record signup bonus credit in ledger ONLY if fully verified
    IF p_email_verified AND p_phone_verified THEN
      INSERT INTO public.wallet_ledger (user_id, amount, type)
      VALUES (v_customer_id, 50.00, 'credit');
    END IF;
  END IF;

  -- 5. Insert new identity
  INSERT INTO public.customer_identities (customer_id, firebase_uid, provider, provider_identifier)
  VALUES (v_customer_id, p_firebase_uid, p_provider, p_provider_identifier)
  ON CONFLICT (provider, provider_identifier) DO NOTHING;

  RETURN v_customer_id;
END;
$$;
