-- =============================================================================
-- 0052_ensure_is_admin_or_staff.sql
-- Policies in 0020/0021/0022/0043 reference public.is_admin_or_staff(), but the
-- function was only defined in 0045. A live DB that predates 0045 (or was
-- migrated out of order) has no such function, so every query against those
-- tables fails with "function public.is_admin_or_staff() does not exist".
-- Re-assert the definition idempotently for already-migrated databases.
-- =============================================================================

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
