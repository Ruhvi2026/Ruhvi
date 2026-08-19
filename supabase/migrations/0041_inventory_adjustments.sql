-- Migration 0041: Inventory Adjustments Audit Log

CREATE TYPE inventory_adjustment_reason AS ENUM ('restock', 'damage', 'return', 'audit', 'transfer', 'manual');

CREATE TABLE public.inventory_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  previous_stock integer NOT NULL,
  adjusted_by integer NOT NULL,
  new_stock integer NOT NULL,
  reason inventory_adjustment_reason NOT NULL DEFAULT 'manual',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_adjustments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Admin/Staff can view inventory adjustments"
  ON public.inventory_adjustments FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

CREATE POLICY "Admin/Staff can insert inventory adjustments"
  ON public.inventory_adjustments FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role IN ('admin', 'manager', 'staff', 'super_admin', 'SUPER_ADMIN')
    )
  );

-- Function to handle atomic stock adjustments
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
  p_product_id uuid,
  p_user_id uuid,
  p_adjustment integer,
  p_reason inventory_adjustment_reason,
  p_notes text DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_previous_stock integer;
  v_new_stock integer;
BEGIN
  -- Lock the row for update to prevent race conditions
  SELECT stock_quantity INTO v_previous_stock
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  v_new_stock := v_previous_stock + p_adjustment;

  -- Update product
  UPDATE public.products
  SET 
    stock_quantity = v_new_stock,
    updated_at = now()
  WHERE id = p_product_id;

  -- Log adjustment
  INSERT INTO public.inventory_adjustments (
    product_id,
    user_id,
    previous_stock,
    adjusted_by,
    new_stock,
    reason,
    notes
  ) VALUES (
    p_product_id,
    p_user_id,
    v_previous_stock,
    p_adjustment,
    v_new_stock,
    p_reason,
    p_notes
  );

  RETURN v_new_stock;
END;
$$;
