-- Migration 0070: User push tokens table for Firebase Cloud Messaging
-- ---------------------------------------------------------------------------
-- Stores FCM device tokens per user so the server can send targeted push
-- notifications to specific users via the FCM HTTP v1 API.
-- Idempotent: safe to run regardless of whether the table already exists.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_push_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    token TEXT NOT NULL,
    platform TEXT NOT NULL DEFAULT 'web',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, token)
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_user_push_tokens_user_id
    ON public.user_push_tokens(user_id);

CREATE INDEX IF NOT EXISTS idx_user_push_tokens_token
    ON public.user_push_tokens(token);

-- Enable RLS
ALTER TABLE public.user_push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can manage their own tokens
CREATE POLICY "Users can manage own push tokens"
    ON public.user_push_tokens
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Staff can view tokens for sending notifications
CREATE POLICY "Staff can view push tokens"
    ON public.user_push_tokens
    FOR SELECT
    TO authenticated
    USING (public.is_admin_or_staff());

-- Setup realtime (optional — useful for dashboard showing live tokens)
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_push_tokens;