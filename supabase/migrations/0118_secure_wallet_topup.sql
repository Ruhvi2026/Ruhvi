-- ============================================================================
-- 0118_secure_wallet_topup.sql
-- ============================================================================
-- Hardens the wallet_topup RPC function:
-- 1. Removes reliance on a hardcoded shared secret in database/source.
-- 2. Strictly enforces database Role-Based Access Control (RBAC):
--    Only 'service_role' and 'postgres' may execute this sensitive crediting RPC.
-- 3. Adds amount boundaries (must be positive, capped at 100,000 INR per txn)
--    and transaction type whitelisting.
-- 4. Revokes execution privileges from public, anon, and authenticated roles.
-- ============================================================================

-- 1. Drop existing functions with matching signatures to avoid ambiguity
DROP FUNCTION IF EXISTS public.wallet_topup(text, numeric, text, text);
DROP FUNCTION IF EXISTS public.wallet_topup(text, numeric, text);

-- 2. Recreate the hardened wallet_topup function
CREATE OR REPLACE FUNCTION public.wallet_topup(
  p_user_id text,
  p_amount numeric,
  p_type text,
  p_secret text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_real_user_id uuid;
  v_caller text;
BEGIN
  -- Determine who is invoking this function.
  -- In Supabase, PostgREST calls with the service role key have claim.role = 'service_role'.
  -- Backend code connecting directly as postgres user has session_user = 'postgres'.
  v_caller := COALESCE(
    current_setting('request.jwt.claim.role', true),
    session_user
  );

  -- Strictly allow ONLY service_role or postgres to execute this function.
  -- If v_caller is 'anon', 'authenticated', or any untrusted role, block immediately.
  IF v_caller NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized API Call: Only internal service role may execute wallet top-ups.';
  END IF;

  -- Validate amount constraints: must be strictly positive and capped at realistic limits
  IF p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Invalid top-up amount: must be positive and <= 100000 (observed: %)', p_amount;
  END IF;

  -- Validate transaction type: must be credit or cashback/referral/refund
  IF p_type NOT IN ('credit', 'cashback', 'referral', 'refund') THEN
    RAISE EXCEPTION 'Invalid transaction type for wallet top-up: %', p_type;
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
    RAISE EXCEPTION 'User not found: %', p_user_id;
  END IF;

  -- Insert the ledger record. The trigger on_wallet_ledger_insert auto-updates user wallet_balance.
  INSERT INTO public.wallet_ledger (user_id, amount, type)
  VALUES (v_real_user_id, p_amount, p_type::wallet_txn_type);
END;
$$;

-- 3. Explicitly revoke execute from public, anon, and authenticated roles
REVOKE EXECUTE ON FUNCTION public.wallet_topup(text, numeric, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_topup(text, numeric, text, text) TO service_role, postgres;

