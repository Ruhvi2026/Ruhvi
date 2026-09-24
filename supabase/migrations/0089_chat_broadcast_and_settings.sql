-- =============================================================================
-- 0089_chat_broadcast_and_settings.sql
--
-- Adds:
-- 1. Broadcast conversation type support in chat_conversations
-- 2. Dedicated Official Staff Broadcast channel
-- 3. send_staff_broadcast RPC restricted to Admins/Super Admins
-- 4. Initial internal_chat_settings in public.settings
-- =============================================================================

-- 1. Expand chat_conversations type constraint
ALTER TABLE public.chat_conversations 
  DROP CONSTRAINT IF EXISTS chat_conversations_type_check;

ALTER TABLE public.chat_conversations 
  ADD CONSTRAINT chat_conversations_type_check 
  CHECK (type IN ('direct', 'group', 'broadcast'));

ALTER TABLE public.chat_conversations 
  DROP CONSTRAINT IF EXISTS direct_no_name;

ALTER TABLE public.chat_conversations 
  ADD CONSTRAINT direct_no_name 
  CHECK (type IN ('group', 'broadcast') OR group_name IS NULL);

-- 2. Create permanent Official Staff Broadcast conversation
DO $$
DECLARE
  v_admin_id uuid;
  v_conv_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  SELECT id INTO v_admin_id FROM public.users 
  WHERE role IN ('super_admin', 'admin') 
  ORDER BY created_at ASC LIMIT 1;

  IF v_admin_id IS NOT NULL THEN
    INSERT INTO public.chat_conversations (id, type, group_name, group_topic, created_by)
    VALUES (
      v_conv_id,
      'broadcast',
      '📢 Official Staff Broadcast',
      'Official company announcements and updates for all staff members',
      v_admin_id
    )
    ON CONFLICT (id) DO UPDATE SET
      group_name = EXCLUDED.group_name,
      group_topic = EXCLUDED.group_topic,
      type = 'broadcast';

    -- Add all active staff to broadcast channel members
    INSERT INTO public.chat_conversation_members (conversation_id, user_id, is_admin)
    SELECT v_conv_id, u.id, (u.role IN ('super_admin', 'admin'))
    FROM public.users u
    WHERE u.role IN ('super_admin', 'admin', 'manager', 'staff')
    ON CONFLICT (conversation_id, user_id) DO NOTHING;
  END IF;
END $$;

-- 3. Broadcast Sender RPC (Only Admin / Super Admin)
CREATE OR REPLACE FUNCTION public.send_staff_broadcast(
  p_sender_id uuid,
  p_title text,
  p_message text,
  p_priority text DEFAULT 'normal'
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
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

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

  -- Touch conversation timestamp
  UPDATE public.chat_conversations
  SET updated_at = now()
  WHERE id = v_conv_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_staff_broadcast(uuid, text, text, text) TO authenticated, service_role, anon;

-- 4. Initial Chat Settings seed in public.settings
INSERT INTO public.settings (key, value, updated_at)
VALUES (
  'internal_chat_settings',
  jsonb_build_object(
    'allow_staff_direct_messages', true,
    'allow_staff_group_creation', true,
    'max_attachment_size_mb', 20,
    'enable_file_attachments', true,
    'broadcast_channel_name', '📢 Official Staff Broadcast',
    'auto_archive_resolved_after_days', 30
  ),
  now()
)
ON CONFLICT (key) DO NOTHING;
