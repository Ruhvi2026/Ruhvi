-- =============================================================================
-- 0037_drop_automatic_signup_bonus_trigger.sql
-- Drop the automatic signup bonus trigger so it is only awarded on verification
-- =============================================================================

DROP TRIGGER IF EXISTS trg_award_signup_bonus ON public.users;
DROP FUNCTION IF EXISTS public.award_signup_bonus_fn();
