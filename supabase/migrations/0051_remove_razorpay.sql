-- Migration 0051: Remove Razorpay — keep PhonePe as the primary payment gateway

-- 1. Drop legacy Razorpay tracking columns (unused since migration 0003)
ALTER TABLE public.orders
DROP COLUMN IF EXISTS razorpay_order_id,
DROP COLUMN IF EXISTS razorpay_payment_id,
DROP COLUMN IF EXISTS razorpay_signature;

-- 2. Rebuild the payment_method enum without 'razorpay' (PhonePe first).
--    Works whether or not 'phonepe' already exists in the enum, and
--    reclassifies any legacy 'razorpay' rows to 'phonepe' in the cast.
ALTER TYPE payment_method RENAME TO payment_method_legacy;
CREATE TYPE payment_method AS ENUM ('phonepe', 'cod');

ALTER TABLE public.orders
  ALTER COLUMN payment_method DROP DEFAULT,
  ALTER COLUMN payment_method TYPE payment_method
    USING (CASE payment_method::text
             WHEN 'razorpay' THEN 'phonepe'
             ELSE payment_method::text
           END)::payment_method,
  ALTER COLUMN payment_method SET DEFAULT 'phonepe';

DROP TYPE payment_method_legacy;
