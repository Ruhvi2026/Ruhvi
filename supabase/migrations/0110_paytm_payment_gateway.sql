-- Migration 0110: Paytm Payment Gateway Integration

-- 1. Add 'paytm' value to payment_method enum if not exists
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'paytm';

-- 2. Add Paytm tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS paytm_order_id text,
ADD COLUMN IF NOT EXISTS paytm_transaction_id text,
ADD COLUMN IF NOT EXISTS paytm_payment_state text;
