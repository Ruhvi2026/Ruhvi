-- Migration 0045: Secure AI credential/model-health RLS
-- Fixes issue #4: the policies created in 0027 granted full CRUD to ANY
-- authenticated Supabase user (`USING (true)`), so any logged-in customer
-- could read/overwrite/delete stored provider API keys.
--
-- Also defines public.is_admin_or_staff(), which policies in 0020/0021/0022/0043
-- already reference but no migration ever created.

CREATE OR REPLACE FUNCTION public.is_admin_or_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'manager', 'staff')
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin_or_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_or_staff() TO authenticated;

-- Tighten ai_provider_credentials: only internal admin/staff roles may manage.
DROP POLICY IF EXISTS "Admins can manage ai credentials" ON public.ai_provider_credentials;
DROP POLICY IF EXISTS "Service role can manage ai credentials" ON public.ai_provider_credentials;
CREATE POLICY "Admins can manage ai credentials" ON public.ai_provider_credentials
    FOR ALL TO authenticated
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());

-- Tighten ai_model_health: only internal admin/staff roles may manage.
DROP POLICY IF EXISTS "Admins can manage ai model health" ON public.ai_model_health;
DROP POLICY IF EXISTS "Service role can manage ai model health" ON public.ai_model_health;
CREATE POLICY "Admins can manage ai model health" ON public.ai_model_health
    FOR ALL TO authenticated
    USING (public.is_admin_or_staff())
    WITH CHECK (public.is_admin_or_staff());
