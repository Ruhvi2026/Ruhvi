-- 0114_secure_wallet_topup.sql
-- Removes hardcoded secret and locks down execution via RBAC

-- 1. Drop the function so we can recreate it with a new signature or behavior if needed.
DROP FUNCTION IF EXISTS public.wallet_topup(text, numeric, text, text);

-- 2. Recreate the function without the p_secret parameter (as the backend now securely relies on service_role).
-- Wait, to prevent backend deployment race conditions, I should keep the signature for now,
-- but completely ignore the parameter and rely solely on PostgreSQL role-based access control.
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
  -- In Supabase, standard API calls via PostgREST will have session_user = 'authenticator'
  -- and we can inspect the JWT role. Service key calls have the role 'service_role'.
  -- Alternatively, backend code might connect directly using the postgres user.
  v_caller := COALESCE(
    current_setting('request.jwt.claim.role', true),
    session_user
  );

  -- Strictly allow ONLY service_role or postgres to execute this function.
  -- If v_caller is 'anon' or 'authenticated' or NULL, block it immediately.
  IF v_caller NOT IN ('service_role', 'postgres') THEN
    RAISE EXCEPTION 'Unauthorized API Call: Only internal services may top up wallets.';
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

-- 3. Explicitly revoke execute from the public schema and normal authenticated users to ensure defense in depth.
REVOKE EXECUTE ON FUNCTION public.wallet_topup(text, numeric, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.wallet_topup(text, numeric, text, text) TO service_role, postgres;
