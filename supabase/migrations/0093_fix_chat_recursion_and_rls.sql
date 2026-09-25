-- =============================================================================
-- Migration 0093: Fix Chat RLS Infinite Recursion (42P17)
--
-- Replaces inline recursive subqueries on chat_conversation_members and users
-- with STABLE SECURITY DEFINER helper functions:
--   - public.get_user_role(uuid)
--   - public.is_chat_member(uuid, uuid)
--   - public.is_chat_admin_or_creator(uuid, uuid)
--   - public.can_view_user_in_chat(uuid)
--
-- This guarantees zero circular RLS evaluation between chat_conversations,
-- chat_conversation_members, and public.users.
-- =============================================================================

-- 1. Helper functions
CREATE OR REPLACE FUNCTION public.get_user_role(p_user_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role::text FROM public.users WHERE id = p_user_id LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_chat_member(p_conv_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversation_members
    WHERE conversation_id = p_conv_id
      AND user_id = p_user_id
      AND left_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.is_chat_admin_or_creator(p_conv_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_conversations cc
    WHERE cc.id = p_conv_id
      AND (
        cc.created_by = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.chat_conversation_members ccm
          WHERE ccm.conversation_id = cc.id
            AND ccm.user_id = p_user_id
            AND ccm.is_admin = true
            AND ccm.left_at IS NULL
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.can_view_user_in_chat(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.chat_conversation_members my_m
    JOIN public.chat_conversation_members their_m 
      ON my_m.conversation_id = their_m.conversation_id
    WHERE my_m.user_id = auth.uid()
      AND their_m.user_id = target_user_id
      AND my_m.left_at IS NULL
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_admin_or_creator(uuid, uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.can_view_user_in_chat(uuid) TO authenticated, service_role, anon;

-- 2. Update chat_conversation_members policies
DROP POLICY IF EXISTS "Members can view membership of their conversations" ON public.chat_conversation_members;
CREATE POLICY "Members can view membership of their conversations"
  ON public.chat_conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_member(conversation_id, auth.uid())
    OR public.get_user_role(auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert members to conversations they own/admin" ON public.chat_conversation_members;
CREATE POLICY "Staff can insert members to conversations they own/admin"
  ON public.chat_conversation_members FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) NOT IN ('customer')
    AND (
      user_id = auth.uid()
      OR public.is_chat_admin_or_creator(conversation_id, auth.uid())
      OR public.get_user_role(auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Members can update their own membership (leave)" ON public.chat_conversation_members;
CREATE POLICY "Members can update their own membership (leave)"
  ON public.chat_conversation_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_chat_admin_or_creator(conversation_id, auth.uid())
    OR public.get_user_role(auth.uid()) = 'super_admin'
  );

-- 3. Update chat_conversations policies
DROP POLICY IF EXISTS "Staff can view conversations they are members of" ON public.chat_conversations;
CREATE POLICY "Staff can view conversations they are members of"
  ON public.chat_conversations FOR SELECT
  USING (
    public.get_user_role(auth.uid()) NOT IN ('customer')
    AND (
      public.is_chat_member(id, auth.uid())
      OR public.get_user_role(auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Staff can create conversations" ON public.chat_conversations;
CREATE POLICY "Staff can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND public.get_user_role(auth.uid()) NOT IN ('customer')
  );

DROP POLICY IF EXISTS "Group admin or super_admin can update conversation" ON public.chat_conversations;
CREATE POLICY "Group admin or super_admin can update conversation"
  ON public.chat_conversations FOR UPDATE
  USING (
    public.is_chat_admin_or_creator(id, auth.uid())
    OR public.get_user_role(auth.uid()) = 'super_admin'
  );

-- 4. Update chat_messages policies
DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.chat_messages;
CREATE POLICY "Members can read messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    public.is_chat_member(conversation_id, auth.uid())
    OR public.get_user_role(auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Members can insert messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Members can insert messages to their conversations" ON public.chat_messages;
CREATE POLICY "Members can insert messages to their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND public.get_user_role(auth.uid()) NOT IN ('customer')
    AND (
      public.is_chat_member(conversation_id, auth.uid())
      OR public.get_user_role(auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Sender or admin can soft-delete messages" ON public.chat_messages;
CREATE POLICY "Sender or admin can soft-delete messages"
  ON public.chat_messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR public.is_chat_admin_or_creator(conversation_id, auth.uid())
    OR public.get_user_role(auth.uid()) = 'super_admin'
  );

-- 5. Update child chat tables
DROP POLICY IF EXISTS "Members can view attachments in their conversations" ON public.chat_attachments;
CREATE POLICY "Members can view attachments in their conversations"
  ON public.chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_attachments.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );

DROP POLICY IF EXISTS "Staff can insert attachments" ON public.chat_attachments;
CREATE POLICY "Staff can insert attachments"
  ON public.chat_attachments FOR INSERT
  WITH CHECK (
    public.get_user_role(auth.uid()) NOT IN ('customer')
    AND EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_attachments.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );

DROP POLICY IF EXISTS "Members can view mentions in their conversations" ON public.chat_message_mentions;
CREATE POLICY "Members can view mentions in their conversations"
  ON public.chat_message_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_message_mentions.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );

DROP POLICY IF EXISTS "Members can view reactions in their conversations" ON public.chat_message_reactions;
CREATE POLICY "Members can view reactions in their conversations"
  ON public.chat_message_reactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_message_reactions.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );

DROP POLICY IF EXISTS "Members can view read receipts in their conversations" ON public.chat_message_reads;
CREATE POLICY "Members can view read receipts in their conversations"
  ON public.chat_message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_message_reads.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );

DROP POLICY IF EXISTS "Members can view entity refs in their conversations" ON public.chat_entity_references;
CREATE POLICY "Members can view entity refs in their conversations"
  ON public.chat_entity_references FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      WHERE cm.id = chat_entity_references.message_id
        AND (
          public.is_chat_member(cm.conversation_id, auth.uid())
          OR public.get_user_role(auth.uid()) = 'super_admin'
        )
    )
  );
