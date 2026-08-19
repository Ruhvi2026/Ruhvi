-- 0034_wallet_signup_bonus.sql
-- Automatically awards a sign-up bonus of ₹50 to new customer accounts

CREATE OR REPLACE FUNCTION public.award_signup_bonus_fn()
RETURNS trigger AS $$
BEGIN
  -- Only award sign-up bonus to 'customer' role
  IF NEW.role = 'customer' THEN
    INSERT INTO public.wallet_ledger (user_id, amount, type)
    VALUES (NEW.id, 50.00, 'credit');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_award_signup_bonus ON public.users;
CREATE TRIGGER trg_award_signup_bonus
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.award_signup_bonus_fn();
