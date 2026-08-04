-- Phase 2: Targeted Coupons
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS target_users text[];
