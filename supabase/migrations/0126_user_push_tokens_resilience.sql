-- 0126_user_push_tokens_resilience.sql
-- Ensure user_push_tokens has updated_at column, index, and robust constraints

DO $$
BEGIN
  -- Add updated_at column if not exists
  ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

  -- Add last_seen_at column if not exists (defensive)
  ALTER TABLE public.user_push_tokens ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT now();

  -- Add unique constraint on token if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_push_tokens_token_key'
  ) THEN
    BEGIN
      ALTER TABLE public.user_push_tokens ADD CONSTRAINT user_push_tokens_token_key UNIQUE (token);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not add unique constraint on token: %', SQLERRM;
    END;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in 0126_user_push_tokens_resilience: %', SQLERRM;
END $$;

