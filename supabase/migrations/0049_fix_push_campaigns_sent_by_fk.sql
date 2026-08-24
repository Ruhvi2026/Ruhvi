-- =============================================================================
-- 0049_fix_push_campaigns_sent_by_fk.sql
-- push_campaigns.sent_by previously referenced auth.users(id), but since
-- migration 0030 this app's Firebase users only exist in public.users (mapped
-- via customer_identities.firebase_uid). Every history insert failed the FK
-- check and was silently dropped. Point the FK at public.users instead.
-- =============================================================================

-- Guard: only fix the constraint if the table exists (migration 0022 applied).
DO $$
BEGIN
  IF to_regclass('public.push_campaigns') IS NOT NULL THEN
    -- Null out any sent_by values that don't resolve to a real user so the
    -- new constraint can be added safely.
    UPDATE public.push_campaigns pc
    SET sent_by = NULL
    WHERE pc.sent_by IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.users u WHERE u.id = pc.sent_by);

    ALTER TABLE public.push_campaigns
      DROP CONSTRAINT IF EXISTS push_campaigns_sent_by_fkey;

    ALTER TABLE public.push_campaigns
      ADD CONSTRAINT push_campaigns_sent_by_fkey
      FOREIGN KEY (sent_by) REFERENCES public.users(id) ON DELETE SET NULL;
  END IF;
END;
$$;
