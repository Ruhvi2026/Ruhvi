-- 0044_fix_referral_payout.sql
-- Fix referral program payout chain:
--   1. Remove double credit — migration 0005's on_reward_coin_ledger_insert trigger
--      already updates users.reward_coins when a ledger row of type 'earned' is inserted,
--      so the old function's manual UPDATE users ... + 500 was crediting twice.
--   2. Mark referrals 'expired' (instead of stuck 'pending' forever) when the referred
--      order is cancelled or returned before delivery.
--   3. Claw back awarded coins when a delivered order is later returned/cancelled.
--   4. Run SECURITY DEFINER so ledger/balance writes succeed regardless of which user
--      (or service role) performed the order status update.

CREATE OR REPLACE FUNCTION public.check_referral_on_delivery()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ref RECORD;
BEGIN
  -- Order delivered: complete a pending referral and award 500 coins.
  -- users.reward_coins is updated automatically by the on_reward_coin_ledger_insert trigger.
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered' THEN
    SELECT * INTO ref
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'pending'
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.referrals
      SET status = 'completed', coins_awarded = 500, order_id = NEW.id
      WHERE id = ref.id;

      INSERT INTO public.reward_coin_ledger (user_id, order_id, amount, type)
      VALUES (ref.referrer_user_id, NEW.id, 500, 'earned');
    END IF;

  -- Order cancelled/returned: never pay, or claw back what was paid.
  ELSIF NEW.status IN ('cancelled', 'returned') THEN
    UPDATE public.referrals
    SET status = 'expired', coins_awarded = 0
    WHERE referred_user_id = NEW.user_id
      AND status = 'pending';

    SELECT * INTO ref
    FROM public.referrals
    WHERE referred_user_id = NEW.user_id
      AND status = 'completed'
    LIMIT 1;

    IF FOUND THEN
      UPDATE public.referrals
      SET status = 'expired', coins_awarded = 500
      WHERE id = ref.id;

      INSERT INTO public.reward_coin_ledger (user_id, order_id, amount, type)
      VALUES (ref.referrer_user_id, NEW.id, 500, 'expired');
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Recreate the trigger (fires on every orders.status transition)
DROP TRIGGER IF EXISTS on_order_delivered ON public.orders;
CREATE TRIGGER on_order_delivered
  AFTER UPDATE OF status ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_referral_on_delivery();

-- Track the order that settled the referral
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
