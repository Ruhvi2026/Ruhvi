-- Phase 3: Referral Program
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- Create function to auto-generate referral code for new users
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS trigger AS $$
DECLARE
  new_code text;
  done bool;
BEGIN
  -- Generate a random referral code if not provided
  IF NEW.referral_code IS NULL THEN
    done := false;
    WHILE NOT done LOOP
      -- Generate RHV-XXXXXX where X is uppercase alphanumeric
      new_code := 'RHV-' || upper(substring(md5(random()::text) from 1 for 6));
      
      -- Check if it already exists
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = new_code) THEN
        NEW.referral_code := new_code;
        done := true;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to execute before insert on public.users
DROP TRIGGER IF EXISTS on_user_insert_generate_referral ON public.users;
CREATE TRIGGER on_user_insert_generate_referral
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_referral_code();

-- Update existing users with a referral code if they don't have one
DO $$
DECLARE
  u RECORD;
  new_code text;
  done bool;
BEGIN
  FOR u IN SELECT id FROM public.users WHERE referral_code IS NULL LOOP
    done := false;
    WHILE NOT done LOOP
      new_code := 'RHV-' || upper(substring(md5(random()::text) from 1 for 6));
      IF NOT EXISTS (SELECT 1 FROM public.users WHERE referral_code = new_code) THEN
        UPDATE public.users SET referral_code = new_code WHERE id = u.id;
        done := true;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Add trigger to award coins when order is delivered
CREATE OR REPLACE FUNCTION public.check_referral_on_delivery()
RETURNS trigger AS $$
DECLARE
  ref RECORD;
BEGIN
  -- If order status changes to delivered
  IF NEW.status = 'delivered' AND OLD.status != 'delivered' THEN
    -- Check if this user was referred and the referral is pending
    SELECT * INTO ref FROM public.referrals 
    WHERE referred_user_id = NEW.user_id AND status = 'pending'
    LIMIT 1;
    
    IF FOUND THEN
      -- Mark as completed and award coins
      UPDATE public.referrals 
      SET status = 'completed', coins_awarded = 500 
      WHERE id = ref.id;
      
      -- Add coins to referrer's ledger
      INSERT INTO public.reward_coin_ledger (user_id, order_id, amount, type)
      VALUES (ref.referrer_user_id, NEW.id, 500, 'earned');
      
      -- Update referrer's total coins balance
      UPDATE public.users 
      SET reward_coins = reward_coins + 500 
      WHERE id = ref.referrer_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_on_delivery();
