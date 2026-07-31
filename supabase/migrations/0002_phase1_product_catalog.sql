-- Phase 1 Migration: Stock Notifications, Seed Categories, Additional RLS Policies

-- Stock Notifications table
CREATE TABLE IF NOT EXISTS public.stock_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Policies for stock notifications
CREATE POLICY "Stock notifications insertable by everyone" 
  ON public.stock_notifications FOR INSERT WITH CHECK (true);

CREATE POLICY "Stock notifications viewable by staff/admin" 
  ON public.stock_notifications FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- Additional RLS for admin/staff category & product management
CREATE POLICY "Admin/Staff can insert categories"
  ON public.categories FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin/Staff can update categories"
  ON public.categories FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin/Staff can delete categories"
  ON public.categories FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin/Staff can manage products"
  ON public.products FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

CREATE POLICY "Admin/Staff can manage product images"
  ON public.product_images FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff')
    )
  );

-- Seed Categories
INSERT INTO public.categories (name, slug) VALUES
  ('Rings', 'rings'),
  ('Necklaces', 'necklaces'),
  ('Earrings', 'earrings'),
  ('Bracelets', 'bracelets'),
  ('Bangles', 'bangles'),
  ('Pendants', 'pendants'),
  ('Chains', 'chains'),
  ('Anklets', 'anklets'),
  ('Nose Pins', 'nose-pins'),
  ('Mangalsutra', 'mangalsutra'),
  ('Bridal Jewellery', 'bridal'),
  ('Men''s Jewellery', 'mens'),
  ('Kids'' Jewellery', 'kids')
ON CONFLICT (slug) DO NOTHING;
