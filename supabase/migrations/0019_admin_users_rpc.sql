-- Migration: 0019_admin_users_rpc
-- Description: Adds SECURITY DEFINER functions for admins to manage users safely

CREATE OR REPLACE FUNCTION public.admin_get_all_users()
RETURNS SETOF public.users
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin, manager, or staff
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager', 'staff')
  ) THEN
    RETURN QUERY SELECT * FROM public.users ORDER BY created_at DESC;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_role(target_user_id UUID, new_role text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role = 'admin'
  ) THEN
    UPDATE public.users SET role = new_role::public.user_role, updated_at = NOW() WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_user_balance(target_user_id UUID, new_wallet NUMERIC, new_coins INTEGER)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if caller is admin or manager
  IF EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  ) THEN
    UPDATE public.users 
    SET wallet_balance = new_wallet, reward_coins = new_coins, updated_at = NOW() 
    WHERE id = target_user_id;
  ELSE
    RAISE EXCEPTION 'Unauthorized';
  END IF;
END;
$$;
