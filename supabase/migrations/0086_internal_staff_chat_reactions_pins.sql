-- =============================================================================
-- 0086_internal_staff_chat_reactions_pins.sql
--
-- Ruhvi Internal Staff Chat — Phase 7 (Reactions & Pinned Messages)
-- =============================================================================

-- 1. Pinned Messages support
ALTER TABLE public.chat_messages
ADD COLUMN IF NOT EXISTS pinned_at timestamptz,
ADD COLUMN IF NOT EXISTS pinned_by uuid REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON public.chat_messages(conversation_id) WHERE pinned_at IS NOT NULL;

-- 2. Message Reactions table
CREATE TABLE IF NOT EXISTS public.chat_message_reactions (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  uuid        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji       text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_chat_reactions_message ON public.chat_message_reactions(message_id);

ALTER TABLE public.chat_message_reactions REPLICA IDENTITY FULL;

-- 3. RLS Policies for Reactions
ALTER TABLE public.chat_message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view reactions in their conversations" ON public.chat_message_reactions;
CREATE POLICY "Members can view reactions in their conversations"
  ON public.chat_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_message_reactions.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert reactions" ON public.chat_message_reactions;
CREATE POLICY "Staff can insert reactions"
  ON public.chat_message_reactions FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_message_reactions.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Staff can delete their own reactions" ON public.chat_message_reactions;
CREATE POLICY "Staff can delete their own reactions"
  ON public.chat_message_reactions FOR DELETE
  USING (user_id = auth.uid());
