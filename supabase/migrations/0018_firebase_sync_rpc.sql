-- Phase 4 Extensions: Firebase User Sync RPC
-- Secure RPC to allow Firebase users to upsert their initial profile data, bypassing RLS
CREATE OR REPLACE FUNCTION public.sync_firebase_user(
  p_uid text,
  p_email text,
  p_name text,
  p_phone text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple upsert by firebase_uid
  INSERT INTO public.users (firebase_uid, email, full_name, phone, role, wallet_balance, reward_coins)
  VALUES (p_uid, p_email, p_name, p_phone, 'customer', 0, 0)
  ON CONFLICT (firebase_uid) DO UPDATE
  SET 
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone;
END;
$$;
