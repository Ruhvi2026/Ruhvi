-- Migration 0046: Admin CRUD RLS policies for coupons
-- 0005 only granted a public SELECT policy, so the browser client could
-- never INSERT/UPDATE/DELETE coupons even with correct column names.
-- Uses public.is_admin_or_staff() defined in 0045.

CREATE POLICY "Admins can insert coupons"
  ON public.coupons FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admins can update coupons"
  ON public.coupons FOR UPDATE
  TO authenticated
  USING (public.is_admin_or_staff())
  WITH CHECK (public.is_admin_or_staff());

CREATE POLICY "Admins can delete coupons"
  ON public.coupons FOR DELETE
  TO authenticated
  USING (public.is_admin_or_staff());
