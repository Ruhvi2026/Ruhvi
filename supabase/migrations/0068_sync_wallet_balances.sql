-- =============================================================================
-- 0068_sync_wallet_balances.sql
-- Synchronizes user wallet_balance with the sum of their wallet_ledger entries.
-- This ensures the sign up bonus and any other credits are properly usable.
-- =============================================================================

UPDATE public.users u
SET wallet_balance = COALESCE((
  SELECT SUM(
    CASE 
      WHEN wl.type IN ('credit', 'cashback') THEN wl.amount
      WHEN wl.type = 'debit' THEN -wl.amount
      ELSE 0
    END
  )
  FROM public.wallet_ledger wl
  WHERE wl.user_id = u.id
), 0.00);

-- Ensure the trigger function exists before attaching it
CREATE OR REPLACE FUNCTION public.update_user_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.type IN ('credit', 'cashback') THEN
    UPDATE public.users 
    SET wallet_balance = COALESCE(wallet_balance, 0) + NEW.amount 
    WHERE id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.users 
    SET wallet_balance = GREATEST(0, COALESCE(wallet_balance, 0) - NEW.amount)
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply trigger to ensure future inserts automatically update the balance
DROP TRIGGER IF EXISTS on_wallet_ledger_insert ON public.wallet_ledger;
CREATE TRIGGER on_wallet_ledger_insert
  AFTER INSERT ON public.wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_user_wallet_balance();
