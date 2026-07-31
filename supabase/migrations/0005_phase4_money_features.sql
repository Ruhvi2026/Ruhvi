-- Migration 0005: Phase 4 Money Features (Wallet, Coins, Coupons, Referrals)

-- 1. Add referral_code to users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS referral_code text UNIQUE;

-- 2. Generate referral_code for new users (and retroactively for existing)
CREATE OR REPLACE FUNCTION generate_referral_code(id uuid) RETURNS text AS $$
BEGIN
  -- Generates a string like 'RHV-A1B2C3' based on uuid
  RETURN 'RHV-' || upper(substring(replace(id::text, '-', '') from 1 for 6));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

UPDATE public.users SET referral_code = generate_referral_code(id) WHERE referral_code IS NULL;

-- Ensure handle_new_user generates it on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, referral_code)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'customer',
    generate_referral_code(new.id)
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Triggers for wallet_balance and reward_coins synchronization
CREATE OR REPLACE FUNCTION public.update_user_wallet_balance()
RETURNS trigger AS $$
BEGIN
  IF NEW.type IN ('credit', 'cashback') THEN
    UPDATE public.users SET wallet_balance = wallet_balance + NEW.amount WHERE id = NEW.user_id;
  ELSIF NEW.type = 'debit' THEN
    UPDATE public.users SET wallet_balance = wallet_balance - NEW.amount WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_wallet_ledger_insert ON public.wallet_ledger;
CREATE TRIGGER on_wallet_ledger_insert
  AFTER INSERT ON public.wallet_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_user_wallet_balance();


CREATE OR REPLACE FUNCTION public.update_user_reward_coins()
RETURNS trigger AS $$
BEGIN
  IF NEW.type IN ('earned', 'cashback') THEN
    UPDATE public.users SET reward_coins = reward_coins + NEW.amount WHERE id = NEW.user_id;
  ELSIF NEW.type IN ('redeemed', 'expired') THEN
    UPDATE public.users SET reward_coins = reward_coins - NEW.amount WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_reward_coin_ledger_insert ON public.reward_coin_ledger;
CREATE TRIGGER on_reward_coin_ledger_insert
  AFTER INSERT ON public.reward_coin_ledger
  FOR EACH ROW EXECUTE FUNCTION public.update_user_reward_coins();


-- 4. RLS Policies for Coupons
-- Coupons are viewable by anyone so they can validate at checkout, but only admins can modify
CREATE POLICY "Public coupons are viewable by everyone"
  ON public.coupons FOR SELECT
  USING (true);


-- 5. RLS Policies for Wallet Ledger
CREATE POLICY "Users can view own wallet ledger"
  ON public.wallet_ledger FOR SELECT
  USING (auth.uid() = user_id);

-- (Inserts to wallet ledger should ideally be done via secure Server Actions / Service Role, not directly from client)
CREATE POLICY "Users can insert own wallet ledger"
  ON public.wallet_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 6. RLS Policies for Reward Coin Ledger
CREATE POLICY "Users can view own coin ledger"
  ON public.reward_coin_ledger FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own coin ledger"
  ON public.reward_coin_ledger FOR INSERT
  WITH CHECK (auth.uid() = user_id);


-- 7. RLS Policies for Referrals
CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Users can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (auth.uid() = referred_user_id);
