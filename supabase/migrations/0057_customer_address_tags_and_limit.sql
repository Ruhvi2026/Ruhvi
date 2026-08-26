-- Migration 0057: Address book enhancements — custom tags & 10-address limit
-- Supports: custom tag labels, enforces max 10 addresses per user

-- The label column already supports free-form text (no schema change needed)

-- Trigger to enforce a maximum of 10 saved addresses per user
CREATE OR REPLACE FUNCTION public.enforce_max_addresses_per_user()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
BEGIN
  SELECT COUNT(*) INTO current_count
  FROM public.addresses
  WHERE user_id = NEW.user_id;

  IF current_count >= 10 THEN
    RAISE EXCEPTION 'You can save up to 10 addresses only. Please delete an existing address before adding a new one.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_max_addresses_per_user ON public.addresses;
CREATE TRIGGER trg_enforce_max_addresses_per_user
  BEFORE INSERT ON public.addresses
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_max_addresses_per_user();