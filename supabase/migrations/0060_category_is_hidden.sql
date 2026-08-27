-- Migration: Add is_hidden column to categories table
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;
