-- =============================================================================
-- 0091_broadcast_auto_unarchive_and_triggers.sql
--
-- 1. Updates send_staff_broadcast to automatically unarchive the broadcast
--    channel (clearing archived_at) whenever a new broadcast is sent.
-- 2. Adds an automatic unarchive trigger on chat_messages:
--    If an archived conversation receives a new non-system message,
--    it automatically unarchives (archived_at = NULL) and touches updated_at,
--    ensuring it jumps straight back to the top of the active chat list.
-- =============================================================================

-- 1. Update send_staff_broadcast RPC
CREATE OR REPLACE FUNCTION public.send_staff_broadcast(
  p_sender_id uuid,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal',
  p_allow_replies boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_sender_role text;
  v_formatted_text text;
  v_msg_id uuid;
BEGIN
  -- Verify sender is admin or super_admin
  SELECT role INTO v_sender_role FROM public.users WHERE id = p_sender_id;
  IF v_sender_role NOT IN ('super_admin', 'admin') THEN
    RAISE EXCEPTION 'Only Admins and Super Admins can send broadcast announcements';
  END IF;

  -- Ensure all active staff members are enrolled in the broadcast channel
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, is_admin)
  SELECT v_conv_id, u.id, (u.role IN ('super_admin', 'admin'))
  FROM public.users u
  WHERE u.role IN ('super_admin', 'admin', 'manager', 'staff')
  ON CONFLICT (conversation_id, user_id) DO UPDATE SET
    is_admin = (EXCLUDED.is_admin);

  -- Format text content with optional title and priority banner
  IF p_title IS NOT NULL AND trim(p_title) != '' THEN
    v_formatted_text := '📢 *' || trim(p_title) || '*' || E'\n\n' || trim(p_message);
  ELSE
    v_formatted_text := trim(p_message);
  END IF;

  IF p_priority = 'urgent' THEN
    v_formatted_text := '🚨 [URGENT ANNOUNCEMENT]' || E'\n' || v_formatted_text;
  ELSIF p_priority = 'high' THEN
    v_formatted_text := '⚡ [IMPORTANT NOTICE]' || E'\n' || v_formatted_text;
  END IF;

  -- Insert broadcast message
  INSERT INTO public.chat_messages (
    conversation_id,
    sender_id,
    message_type,
    text_content,
    system_action
  ) VALUES (
    v_conv_id,
    p_sender_id,
    'text',
    v_formatted_text,
    'broadcast'
  )
  RETURNING id INTO v_msg_id;

  -- Unarchive channel automatically on new broadcast, update allow_replies, and touch updated_at
  UPDATE public.chat_conversations
  SET allow_replies = p_allow_replies,
      archived_at = NULL,
      updated_at = now()
  WHERE id = v_conv_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_staff_broadcast(uuid, text, text, text, boolean) TO authenticated, service_role, anon;

-- 2. Trigger function to automatically unarchive any conversation when a new message arrives
CREATE OR REPLACE FUNCTION public.fn_auto_unarchive_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If conversation was archived, unarchive it so it jumps back to active chats
  UPDATE public.chat_conversations
  SET archived_at = NULL,
      updated_at = now()
  WHERE id = NEW.conversation_id
    AND archived_at IS NOT NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_unarchive_on_message ON public.chat_messages;
CREATE TRIGGER trg_auto_unarchive_on_message
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_auto_unarchive_on_message();
