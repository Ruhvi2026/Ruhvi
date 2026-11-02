-- =============================================================================
-- Migration: 0122_accounts_system_core.sql
-- Description: Core Accounting & Tax Compliance Database Schema
-- Tables: accounts_invoices, accounts_purchases, accounts_vouchers, accounts_ledger
-- Supporting: Worker 14 (worker_accounts_tax) and Indian GST Rule 46 compliance
-- =============================================================================

-- 1. Table: accounts_invoices (Custom GST Invoices, Quotations, Proformas, Credit Notes)
CREATE TABLE IF NOT EXISTS public.accounts_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  invoice_type text NOT NULL CHECK (invoice_type IN ('tax_invoice', 'proforma', 'quotation', 'credit_note', 'debit_note')),
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  customer_name text NOT NULL,
  customer_email text,
  customer_phone text,
  customer_gstin text,
  customer_address text,
  place_of_supply text NOT NULL DEFAULT 'West Bengal',
  is_inter_state boolean NOT NULL DEFAULT false,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  taxable_value numeric(14,2) NOT NULL DEFAULT 0.00,
  cgst_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  sgst_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  igst_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  total_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid', 'refunded', 'cancelled')),
  payment_method text,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  notes text,
  terms text,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Table: accounts_purchases (Vendor Purchase Bills & Input Tax Credit Tracking)
CREATE TABLE IF NOT EXISTS public.accounts_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL,
  bill_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name text NOT NULL,
  vendor_gstin text,
  category text NOT NULL CHECK (category IN (
    'Bullion (Gold/Silver)',
    'Gemstones',
    'Making & Jobwork',
    'Hallmarking',
    'Packaging',
    'Tools & Machinery',
    'Office & Utilities',
    'Other'
  )),
  item_description text NOT NULL,
  hsn_code text DEFAULT '7113',
  quantity numeric(12,4),
  unit text DEFAULT 'grams',
  taxable_value numeric(14,2) NOT NULL DEFAULT 0.00,
  gst_rate numeric(5,2) NOT NULL DEFAULT 3.00,
  cgst_input numeric(14,2) NOT NULL DEFAULT 0.00,
  sgst_input numeric(14,2) NOT NULL DEFAULT 0.00,
  igst_input numeric(14,2) NOT NULL DEFAULT 0.00,
  total_amount numeric(14,2) NOT NULL DEFAULT 0.00,
  itc_eligible boolean NOT NULL DEFAULT true,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'partially_paid', 'paid')),
  payment_method text,
  ocr_source text,
  notes text,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Table: accounts_vouchers (Receipt, Payment, Journal, Contra Vouchers)
CREATE TABLE IF NOT EXISTS public.accounts_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_number text UNIQUE NOT NULL,
  voucher_type text NOT NULL CHECK (voucher_type IN ('receipt', 'payment', 'journal', 'contra')),
  voucher_date date NOT NULL DEFAULT CURRENT_DATE,
  description text NOT NULL,
  amount numeric(14,2) NOT NULL,
  debit_account text NOT NULL,
  credit_account text NOT NULL,
  payment_mode text NOT NULL DEFAULT 'bank_transfer' CHECK (payment_mode IN (
    'cash',
    'upi',
    'bank_transfer',
    'cheque',
    'card',
    'journal_adjustment'
  )),
  reference_number text,
  related_invoice_id uuid REFERENCES public.accounts_invoices(id) ON DELETE SET NULL,
  related_purchase_id uuid REFERENCES public.accounts_purchases(id) ON DELETE SET NULL,
  created_by text DEFAULT 'system',
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Table: accounts_ledger (Double-Entry Bookkeeping Ledger)
CREATE TABLE IF NOT EXISTS public.accounts_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ledger_date date NOT NULL DEFAULT CURRENT_DATE,
  account_name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN (
    'income',
    'expense',
    'asset',
    'liability',
    'equity',
    'tax_output',
    'tax_input'
  )),
  debit numeric(14,2) NOT NULL DEFAULT 0.00,
  credit numeric(14,2) NOT NULL DEFAULT 0.00,
  balance numeric(14,2) NOT NULL DEFAULT 0.00,
  voucher_id uuid REFERENCES public.accounts_vouchers(id) ON DELETE CASCADE,
  narration text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes for performant lookup & aggregation
CREATE INDEX IF NOT EXISTS idx_accounts_invoices_number ON public.accounts_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_accounts_invoices_date ON public.accounts_invoices(invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_invoices_order_id ON public.accounts_invoices(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_accounts_invoices_status ON public.accounts_invoices(payment_status);

CREATE INDEX IF NOT EXISTS idx_accounts_purchases_bill_number ON public.accounts_purchases(bill_number);
CREATE INDEX IF NOT EXISTS idx_accounts_purchases_date ON public.accounts_purchases(bill_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_purchases_vendor ON public.accounts_purchases(vendor_name);
CREATE INDEX IF NOT EXISTS idx_accounts_purchases_category ON public.accounts_purchases(category);

CREATE INDEX IF NOT EXISTS idx_accounts_vouchers_number ON public.accounts_vouchers(voucher_number);
CREATE INDEX IF NOT EXISTS idx_accounts_vouchers_date ON public.accounts_vouchers(voucher_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_vouchers_type ON public.accounts_vouchers(voucher_type);

CREATE INDEX IF NOT EXISTS idx_accounts_ledger_account ON public.accounts_ledger(account_name);
CREATE INDEX IF NOT EXISTS idx_accounts_ledger_date ON public.accounts_ledger(ledger_date DESC);
CREATE INDEX IF NOT EXISTS idx_accounts_ledger_voucher ON public.accounts_ledger(voucher_id) WHERE voucher_id IS NOT NULL;

-- Enable Row Level Security (RLS)
ALTER TABLE public.accounts_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accounts_ledger ENABLE ROW LEVEL SECURITY;

-- Helper function for checking admin/staff role if not exists
CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND lower(users.role::text) IN ('admin', 'super_admin', 'manager', 'staff')
  );
$$;

-- RLS Policies for accounts_invoices
DROP POLICY IF EXISTS "Staff and Admin can select accounts_invoices" ON public.accounts_invoices;
CREATE POLICY "Staff and Admin can select accounts_invoices"
  ON public.accounts_invoices FOR SELECT
  USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can insert accounts_invoices" ON public.accounts_invoices;
CREATE POLICY "Staff and Admin can insert accounts_invoices"
  ON public.accounts_invoices FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can update accounts_invoices" ON public.accounts_invoices;
CREATE POLICY "Staff and Admin can update accounts_invoices"
  ON public.accounts_invoices FOR UPDATE
  USING (public.is_admin_or_staff());

-- RLS Policies for accounts_purchases
DROP POLICY IF EXISTS "Staff and Admin can select accounts_purchases" ON public.accounts_purchases;
CREATE POLICY "Staff and Admin can select accounts_purchases"
  ON public.accounts_purchases FOR SELECT
  USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can insert accounts_purchases" ON public.accounts_purchases;
CREATE POLICY "Staff and Admin can insert accounts_purchases"
  ON public.accounts_purchases FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can update accounts_purchases" ON public.accounts_purchases;
CREATE POLICY "Staff and Admin can update accounts_purchases"
  ON public.accounts_purchases FOR UPDATE
  USING (public.is_admin_or_staff());

-- RLS Policies for accounts_vouchers
DROP POLICY IF EXISTS "Staff and Admin can select accounts_vouchers" ON public.accounts_vouchers;
CREATE POLICY "Staff and Admin can select accounts_vouchers"
  ON public.accounts_vouchers FOR SELECT
  USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can insert accounts_vouchers" ON public.accounts_vouchers;
CREATE POLICY "Staff and Admin can insert accounts_vouchers"
  ON public.accounts_vouchers FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

-- RLS Policies for accounts_ledger
DROP POLICY IF EXISTS "Staff and Admin can select accounts_ledger" ON public.accounts_ledger;
CREATE POLICY "Staff and Admin can select accounts_ledger"
  ON public.accounts_ledger FOR SELECT
  USING (public.is_admin_or_staff());

DROP POLICY IF EXISTS "Staff and Admin can insert accounts_ledger" ON public.accounts_ledger;
CREATE POLICY "Staff and Admin can insert accounts_ledger"
  ON public.accounts_ledger FOR INSERT
  WITH CHECK (public.is_admin_or_staff());

