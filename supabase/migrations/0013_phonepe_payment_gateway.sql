-- Migration 0013: PhonePe Payment Gateway Integration

-- 1. Add 'phonepe' value to payment_method enum if not exists
ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'phonepe';

-- 2. Add PhonePe tracking columns to orders table
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS phonepe_merchant_transaction_id text,
ADD COLUMN IF NOT EXISTS phonepe_transaction_id text,
ADD COLUMN IF NOT EXISTS phonepe_payment_state text;
