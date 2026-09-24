-- =============================================================================
-- 0085_internal_staff_chat.sql
--
-- Ruhvi Internal Staff Chat — Phase 1 Foundation
--
-- Safety contract:
--   * No DROP TABLE, no column renames, no enum value renames.
--   * All ADD COLUMN IF NOT EXISTS / CREATE TABLE IF NOT EXISTS.
--   * All RLS policies use DROP IF EXISTS before CREATE (idempotent).
--   * All indexes use CREATE INDEX IF NOT EXISTS.
--   * Does NOT modify auth, orders, products, support, notifications tables.
-- =============================================================================

-- ============================================================================
-- SECTION 1: chat_conversations
-- Stores 1-to-1 and group conversations
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  type          text        NOT NULL DEFAULT 'direct' CHECK (type IN ('direct', 'group')),
  group_name    text,
  group_topic   text,
  created_by    uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  archived_at   timestamptz,       -- soft archive
  deleted_at    timestamptz,       -- soft delete (admin/owner only)
  group_avatar_url text,
  CONSTRAINT direct_no_name CHECK (type = 'group' OR group_name IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_chat_conversations_type ON public.chat_conversations(type);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_created_by ON public.chat_conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_chat_conversations_updated_at ON public.chat_conversations(updated_at DESC);

-- ============================================================================
-- SECTION 2: chat_conversation_members
-- Tracks who is in each conversation
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_conversation_members (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  joined_at       timestamptz NOT NULL DEFAULT now(),
  left_at         timestamptz,
  is_admin        boolean     NOT NULL DEFAULT false, -- group admin flag
  last_read_at    timestamptz, -- for unread count calculation
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_members_conversation ON public.chat_conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user ON public.chat_conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_active ON public.chat_conversation_members(user_id, left_at)
  WHERE left_at IS NULL;

-- ============================================================================
-- SECTION 3: chat_messages
-- Stores all messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  sender_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  message_type    text        NOT NULL DEFAULT 'text'
                    CHECK (message_type IN ('text', 'attachment', 'system', 'entity_ref')),
  text_content    text,
  reply_to_id     uuid        REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz,       -- soft delete
  is_edited       boolean     NOT NULL DEFAULT false,
  system_action   text        -- for system messages: 'member_added', 'member_removed', 'group_renamed', etc.
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON public.chat_messages(conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON public.chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to ON public.chat_messages(reply_to_id)
  WHERE reply_to_id IS NOT NULL;
-- Full-text search index on message content
CREATE INDEX IF NOT EXISTS idx_chat_messages_fts ON public.chat_messages
  USING gin(to_tsvector('english', coalesce(text_content, '')));

-- ============================================================================
-- SECTION 4: chat_attachments
-- Cloudinary-stored file metadata linked to messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          uuid        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  cloudinary_public_id text       NOT NULL,
  cloudinary_url      text        NOT NULL,
  resource_type       text        NOT NULL DEFAULT 'image'
                        CHECK (resource_type IN ('image', 'video', 'raw')),
  file_name           text        NOT NULL,
  mime_type           text,
  file_size           bigint,     -- bytes
  width               integer,
  height              integer,
  duration            numeric,    -- seconds (for video/audio)
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_attachments(message_id);

-- ============================================================================
-- SECTION 5: chat_message_reads
-- Per-user read receipts
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_message_reads (
  message_id  uuid        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id     uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_reads_user ON public.chat_message_reads(user_id, read_at);

-- ============================================================================
-- SECTION 6: chat_message_mentions
-- Structured @mention tracking
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_message_mentions (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id          uuid        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  mentioned_user_id   uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE(message_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_mentions_user ON public.chat_message_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_mentions_message ON public.chat_message_mentions(message_id);

-- ============================================================================
-- SECTION 7: chat_entity_references
-- Clickable Order/Ticket/Product references inside messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_entity_references (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id    uuid        NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  entity_type   text        NOT NULL CHECK (entity_type IN ('order', 'support_ticket', 'product')),
  entity_id     text        NOT NULL, -- order number (RUH...), ticket ID, product ID/slug
  display_label text,                 -- e.g. "RUH12345", "TKT5678"
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_entity_refs_message ON public.chat_entity_references(message_id);
CREATE INDEX IF NOT EXISTS idx_chat_entity_refs_entity ON public.chat_entity_references(entity_type, entity_id);

-- ============================================================================
-- SECTION 8: chat_admin_audit_logs
-- Records Master Admin actions for accountability
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_admin_audit_logs (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id       uuid        NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  action              text        NOT NULL, -- 'viewed_conversation', 'searched', 'deleted_message', etc.
  conversation_id     uuid        REFERENCES public.chat_conversations(id) ON DELETE SET NULL,
  target_message_id   uuid        REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  metadata            jsonb,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_audit_admin ON public.chat_admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_audit_conversation ON public.chat_admin_audit_logs(conversation_id)
  WHERE conversation_id IS NOT NULL;

-- ============================================================================
-- SECTION 9: Enable Realtime on chat tables
-- ============================================================================
ALTER TABLE public.chat_messages        REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversations   REPLICA IDENTITY FULL;
ALTER TABLE public.chat_conversation_members REPLICA IDENTITY FULL;

-- ============================================================================
-- SECTION 10: Row Level Security
-- ============================================================================

-- --- chat_conversations ---
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can view conversations they are members of" ON public.chat_conversations;
CREATE POLICY "Staff can view conversations they are members of"
  ON public.chat_conversations FOR SELECT
  USING (
    -- Must be an active staff/admin/manager/super_admin
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND (
      -- Is a member of this conversation
      EXISTS (
        SELECT 1 FROM public.chat_conversation_members ccm
        WHERE ccm.conversation_id = chat_conversations.id
          AND ccm.user_id = auth.uid()
          AND ccm.left_at IS NULL
      )
      OR
      -- Super admin can see all
      (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "Staff can create conversations" ON public.chat_conversations;
CREATE POLICY "Staff can create conversations"
  ON public.chat_conversations FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
  );

DROP POLICY IF EXISTS "Group admin or super_admin can update conversation" ON public.chat_conversations;
CREATE POLICY "Group admin or super_admin can update conversation"
  ON public.chat_conversations FOR UPDATE
  USING (
    -- Creator or group admin
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members ccm
      WHERE ccm.conversation_id = chat_conversations.id
        AND ccm.user_id = auth.uid()
        AND ccm.is_admin = true
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- --- chat_conversation_members ---
ALTER TABLE public.chat_conversation_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view membership of their conversations" ON public.chat_conversation_members;
CREATE POLICY "Members can view membership of their conversations"
  ON public.chat_conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversation_members ccm2
      WHERE ccm2.conversation_id = chat_conversation_members.conversation_id
        AND ccm2.user_id = auth.uid()
        AND ccm2.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert members to conversations they own/admin" ON public.chat_conversation_members;
CREATE POLICY "Staff can insert members to conversations they own/admin"
  ON public.chat_conversation_members FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND (
      -- Self-join (direct creation)
      user_id = auth.uid()
      OR
      -- Conversation creator or group admin
      EXISTS (
        SELECT 1 FROM public.chat_conversations cc
        WHERE cc.id = conversation_id
          AND (
            cc.created_by = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.chat_conversation_members ccm
              WHERE ccm.conversation_id = cc.id
                AND ccm.user_id = auth.uid()
                AND ccm.is_admin = true
                AND ccm.left_at IS NULL
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS "Members can update their own membership (leave)" ON public.chat_conversation_members;
CREATE POLICY "Members can update their own membership (leave)"
  ON public.chat_conversation_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_conversations cc
      WHERE cc.id = conversation_id
        AND (
          cc.created_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.chat_conversation_members ccm
            WHERE ccm.conversation_id = cc.id
              AND ccm.user_id = auth.uid()
              AND ccm.is_admin = true
              AND ccm.left_at IS NULL
          )
        )
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- --- chat_messages ---
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can read messages in their conversations" ON public.chat_messages;
CREATE POLICY "Members can read messages in their conversations"
  ON public.chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversation_members ccm
      WHERE ccm.conversation_id = chat_messages.conversation_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Members can insert messages" ON public.chat_messages;
CREATE POLICY "Members can insert messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversation_members ccm
      WHERE ccm.conversation_id = chat_messages.conversation_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
  );

DROP POLICY IF EXISTS "Sender or admin can soft-delete messages" ON public.chat_messages;
CREATE POLICY "Sender or admin can soft-delete messages"
  ON public.chat_messages FOR UPDATE
  USING (
    sender_id = auth.uid()
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- --- chat_attachments ---
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view attachments in their conversations" ON public.chat_attachments;
CREATE POLICY "Members can view attachments in their conversations"
  ON public.chat_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_attachments.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert attachments" ON public.chat_attachments;
CREATE POLICY "Staff can insert attachments"
  ON public.chat_attachments FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_attachments.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
  );

-- --- chat_message_reads ---
ALTER TABLE public.chat_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own read receipts" ON public.chat_message_reads;
CREATE POLICY "Users manage their own read receipts"
  ON public.chat_message_reads FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Members can view read receipts in their conversations" ON public.chat_message_reads;
CREATE POLICY "Members can view read receipts in their conversations"
  ON public.chat_message_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_message_reads.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- --- chat_message_mentions ---
ALTER TABLE public.chat_message_mentions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view mentions in their conversations" ON public.chat_message_mentions;
CREATE POLICY "Members can view mentions in their conversations"
  ON public.chat_message_mentions FOR SELECT
  USING (
    mentioned_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_message_mentions.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert mentions" ON public.chat_message_mentions;
CREATE POLICY "Staff can insert mentions"
  ON public.chat_message_mentions FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
  );

-- --- chat_entity_references ---
ALTER TABLE public.chat_entity_references ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view entity refs in their conversations" ON public.chat_entity_references;
CREATE POLICY "Members can view entity refs in their conversations"
  ON public.chat_entity_references FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_messages cm
      JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
      WHERE cm.id = chat_entity_references.message_id
        AND ccm.user_id = auth.uid()
        AND ccm.left_at IS NULL
    )
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

DROP POLICY IF EXISTS "Staff can insert entity refs" ON public.chat_entity_references;
CREATE POLICY "Staff can insert entity refs"
  ON public.chat_entity_references FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
  );

-- --- chat_admin_audit_logs ---
ALTER TABLE public.chat_admin_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admin can manage audit logs" ON public.chat_admin_audit_logs;
CREATE POLICY "Super admin can manage audit logs"
  ON public.chat_admin_audit_logs FOR ALL
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- ============================================================================
-- SECTION 11: Helper RPCs
-- ============================================================================

-- get_or_create_direct_conversation: Ensures only one DM exists between 2 users
CREATE OR REPLACE FUNCTION public.get_or_create_direct_conversation(
  p_user_a uuid,
  p_user_b uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
BEGIN
  -- Find existing direct conversation between both users
  SELECT cc.id INTO v_conv_id
  FROM public.chat_conversations cc
  WHERE cc.type = 'direct'
    AND cc.deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.chat_conversation_members m1
      WHERE m1.conversation_id = cc.id AND m1.user_id = p_user_a AND m1.left_at IS NULL
    )
    AND EXISTS (
      SELECT 1 FROM public.chat_conversation_members m2
      WHERE m2.conversation_id = cc.id AND m2.user_id = p_user_b AND m2.left_at IS NULL
    )
    AND (
      SELECT count(*) FROM public.chat_conversation_members m
      WHERE m.conversation_id = cc.id AND m.left_at IS NULL
    ) = 2
  LIMIT 1;

  IF v_conv_id IS NOT NULL THEN
    RETURN v_conv_id;
  END IF;

  -- Create new direct conversation
  INSERT INTO public.chat_conversations (type, created_by)
  VALUES ('direct', p_user_a)
  RETURNING id INTO v_conv_id;

  -- Add both members
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, is_admin)
  VALUES
    (v_conv_id, p_user_a, false),
    (v_conv_id, p_user_b, false);

  RETURN v_conv_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_direct_conversation(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_direct_conversation(uuid, uuid) TO authenticated;

-- get_unread_chat_count: Returns unread message count for a user
CREATE OR REPLACE FUNCTION public.get_unread_chat_count(p_user_id uuid)
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(DISTINCT cm.id)
  FROM public.chat_messages cm
  JOIN public.chat_conversation_members ccm ON ccm.conversation_id = cm.conversation_id
  WHERE ccm.user_id = p_user_id
    AND ccm.left_at IS NULL
    AND cm.sender_id != p_user_id
    AND cm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_message_reads r
      WHERE r.message_id = cm.id AND r.user_id = p_user_id
    )
    AND (ccm.last_read_at IS NULL OR cm.created_at > ccm.last_read_at);
$$;

REVOKE ALL ON FUNCTION public.get_unread_chat_count(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_chat_count(uuid) TO service_role;

-- ============================================================================
-- SECTION 12: updated_at trigger for chat_conversations
-- ============================================================================
CREATE OR REPLACE FUNCTION public.touch_chat_conversation_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trig_chat_message_touches_conversation ON public.chat_messages;
CREATE TRIGGER trig_chat_message_touches_conversation
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_chat_conversation_updated_at();
