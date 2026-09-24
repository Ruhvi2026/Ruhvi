-- =============================================================================
-- 0090_chat_broadcast_replies_permission.sql
--
-- Adds:
-- 1. allow_replies boolean column to chat_conversations (default false)
-- 2. Updates send_staff_broadcast RPC with p_allow_replies parameter
-- 3. Enforces read-only check on chat_messages INSERT policy for broadcasts
-- =============================================================================

-- 1. Add allow_replies column to chat_conversations
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS allow_replies BOOLEAN NOT NULL DEFAULT false;

-- 2. Update send_staff_broadcast function to accept p_allow_replies
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

  -- Update conversation allow_replies setting and touch timestamp
  UPDATE public.chat_conversations
  SET allow_replies = p_allow_replies,
      updated_at = now()
  WHERE id = v_conv_id;

  RETURN v_msg_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.send_staff_broadcast(uuid, text, text, text, boolean) TO authenticated, service_role, anon;

-- 3. Policy update for chat_messages INSERT to honor allow_replies for broadcast channels
DROP POLICY IF EXISTS "Members can insert messages to their conversations" ON public.chat_messages;
CREATE POLICY "Members can insert messages to their conversations"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND (
      -- If it's a broadcast channel, allow insert only if allow_replies is true OR user is admin/super_admin
      (
        SELECT cc.type = 'broadcast' 
        FROM public.chat_conversations cc 
        WHERE cc.id = conversation_id
      ) IS NOT TRUE
      OR (
        (SELECT cc.allow_replies FROM public.chat_conversations cc WHERE cc.id = conversation_id) = true
        OR (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin')
      )
    )
    AND (
      public.is_chat_member(conversation_id, auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  );
