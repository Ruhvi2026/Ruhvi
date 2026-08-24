-- Migration to support Partial COD (10% upfront for orders > 2000)
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS prepaid_amount NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS cod_balance NUMERIC(10, 2) DEFAULT 0;

-- Optional: Update comment to reflect this usage
COMMENT ON COLUMN orders.prepaid_amount IS 'Amount paid upfront (e.g. 10% for partial COD)';
COMMENT ON COLUMN orders.cod_balance IS 'Remaining amount to be collected on delivery (e.g. 90% + COD charges)';
