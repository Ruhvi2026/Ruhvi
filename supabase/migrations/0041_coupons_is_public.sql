-- Migration: Add is_public to coupons table
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT true;
