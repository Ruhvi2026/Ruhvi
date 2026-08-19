-- 0031_fix_firebase_uid_rpcs.sql
-- Fixes RPCs that broke when firebase_uid was moved to customer_identities

-- 1. Secure RPC to fetch user profile
CREATE OR REPLACE FUNCTION public.get_user_profile(p_user_id text)
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_real_user_id uuid;
BEGIN
  -- We allow matching by uuid (for native Supabase users) or text (for Firebase users via customer_identities)
  SELECT id INTO v_real_user_id FROM public.users 
  WHERE id::text = p_user_id
  LIMIT 1;

  IF v_real_user_id IS NULL THEN
    SELECT customer_id INTO v_real_user_id FROM public.customer_identities
    WHERE firebase_uid = p_user_id
    LIMIT 1;
  END IF;

  IF v_real_user_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT * FROM public.users 
    WHERE id = v_real_user_id;
  END IF;
END;
$$;

-- 2. Secure RPC to fetch wallet transactions
CREATE OR REPLACE FUNCTION public.get_wallet_transactions(p_user_id text)
RETURNS SETOF public.wallet_ledger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_real_user_id uuid;
BEGIN
  -- Resolve the true Supabase UUID
  SELECT id INTO v_real_user_id FROM public.users 
  WHERE id::text = p_user_id
  LIMIT 1;

  IF v_real_user_id IS NULL THEN
    SELECT customer_id INTO v_real_user_id FROM public.customer_identities
    WHERE firebase_uid = p_user_id
    LIMIT 1;
  END IF;

  IF v_real_user_id IS NOT NULL THEN
    RETURN QUERY 
    SELECT * FROM public.wallet_ledger 
    WHERE user_id = v_real_user_id 
    ORDER BY created_at DESC;
  END IF;
END;
$$;

-- 3. Secure RPC to add money to wallet
CREATE OR REPLACE FUNCTION public.wallet_topup(
  p_user_id text,
  p_amount numeric,
  p_type text,
  p_secret text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_real_user_id uuid;
  v_internal_secret text := 'ruhvi_wallet_secret_2026';
BEGIN
  -- Validate the secret to ensure this is only called from our trusted API route
  IF p_secret != v_internal_secret THEN
    RAISE EXCEPTION 'Unauthorized API Call';
  END IF;

  -- Resolve the true Supabase UUID
  SELECT id INTO v_real_user_id FROM public.users 
  WHERE id::text = p_user_id
  LIMIT 1;

  IF v_real_user_id IS NULL THEN
    SELECT customer_id INTO v_real_user_id FROM public.customer_identities
    WHERE firebase_uid = p_user_id
    LIMIT 1;
  END IF;

  IF v_real_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Insert the ledger record. The trigger `on_wallet_ledger_insert` will auto-update the user's wallet_balance.
  INSERT INTO public.wallet_ledger (user_id, amount, type)
  VALUES (v_real_user_id, p_amount, p_type::wallet_txn_type);
END;
$$;
