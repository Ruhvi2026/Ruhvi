-- =============================================================================
-- 0088_chat_archive_and_reads.sql
--
-- RPCs for:
-- 1. Marking messages as read in batch (and updating last_read_at)
-- 2. Archiving / Unarchiving conversations when issues are resolved
-- =============================================================================

-- 1. Batch mark conversation messages as read
CREATE OR REPLACE FUNCTION public.mark_conversation_messages_as_read(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update member last_read_at
  UPDATE public.chat_conversation_members
  SET last_read_at = now()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id
    AND left_at IS NULL;

  -- Insert read receipts for unread messages not sent by this user
  INSERT INTO public.chat_message_reads (message_id, user_id, read_at)
  SELECT cm.id, p_user_id, now()
  FROM public.chat_messages cm
  WHERE cm.conversation_id = p_conversation_id
    AND cm.sender_id != p_user_id
    AND cm.deleted_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.chat_message_reads r
      WHERE r.message_id = cm.id AND r.user_id = p_user_id
    )
  ON CONFLICT (message_id, user_id) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_conversation_messages_as_read(uuid, uuid) TO authenticated, anon;

-- 2. Archive conversation (Issue resolved)
CREATE OR REPLACE FUNCTION public.archive_chat_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name text;
BEGIN
  -- Verify membership or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND left_at IS NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  -- Set archived_at
  UPDATE public.chat_conversations
  SET archived_at = now(), updated_at = now()
  WHERE id = p_conversation_id;

  -- Get staff user name
  SELECT COALESCE(full_name, email, 'Staff Member') INTO v_user_name
  FROM public.users WHERE id = p_user_id;

  -- Insert a system message recording the resolution
  INSERT INTO public.chat_messages (
    conversation_id,
    sender_id,
    message_type,
    text_content,
    system_action
  ) VALUES (
    p_conversation_id,
    p_user_id,
    'system',
    'Issue marked as resolved and chat archived by ' || v_user_name,
    'conversation_archived'
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_chat_conversation(uuid, uuid) TO authenticated, anon;

-- 3. Unarchive conversation
CREATE OR REPLACE FUNCTION public.unarchive_chat_conversation(
  p_conversation_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_name text;
BEGIN
  -- Verify membership or admin
  IF NOT EXISTS (
    SELECT 1 FROM public.chat_conversation_members
    WHERE conversation_id = p_conversation_id
      AND user_id = p_user_id
      AND left_at IS NULL
  ) AND NOT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'Not a member of this conversation';
  END IF;

  -- Remove archived_at
  UPDATE public.chat_conversations
  SET archived_at = NULL, updated_at = now()
  WHERE id = p_conversation_id;

  -- Get staff user name
  SELECT COALESCE(full_name, email, 'Staff Member') INTO v_user_name
  FROM public.users WHERE id = p_user_id;

  -- Insert system message
  INSERT INTO public.chat_messages (
    conversation_id,
    sender_id,
    message_type,
    text_content,
    system_action
  ) VALUES (
    p_conversation_id,
    p_user_id,
    'system',
    'Chat reopened / unarchived by ' || v_user_name,
    'conversation_unarchived'
  );

  RETURN true;
END;
$$;

GRANT EXECUTE ON FUNCTION public.unarchive_chat_conversation(uuid, uuid) TO authenticated, anon;
