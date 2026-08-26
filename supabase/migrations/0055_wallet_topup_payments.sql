-- Migration 0055: Wallet Top-Up Payments (real PhonePe gateway flow)
-- Tracks wallet top-up payment sessions so money is only credited after the
-- PhonePe gateway confirms the payment (via status check or signed webhook).

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount numeric(12, 2) NOT NULL CHECK (amount > 0),
  bonus_amount numeric(12, 2) NOT NULL DEFAULT 0 CHECK (bonus_amount >= 0),
  merchant_transaction_id text NOT NULL UNIQUE,
  phonepe_transaction_id text,
  phonepe_payment_state text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_topups_user_id
  ON public.wallet_topups(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_topups_merchant_tx
  ON public.wallet_topups(merchant_transaction_id);

ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own wallet topups" ON public.wallet_topups;
CREATE POLICY "Users can view own wallet topups"
  ON public.wallet_topups FOR SELECT
  USING (auth.uid() = user_id);