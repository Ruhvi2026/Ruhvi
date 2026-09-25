-- Migration 0096: Chat Notifications Trigger & Supabase Realtime for Notifications
-- Automatically creates in-app notification records for conversation members when messages arrive

-- 1. Add notifications to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- 2. Trigger function to notify members on new chat message
CREATE OR REPLACE FUNCTION public.fn_notify_chat_members_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_sender_name text;
  v_sender_dept text;
  v_preview text;
  v_conv_type text;
  v_group_name text;
  v_member record;
BEGIN
  -- Get sender info
  SELECT full_name, coalesce(department, role::text) INTO v_sender_name, v_sender_dept
  FROM public.users
  WHERE id = NEW.sender_id;

  v_sender_name := coalesce(v_sender_name, 'Staff Member');
  IF v_sender_dept IS NOT NULL AND v_sender_dept != '' THEN
    v_sender_name := v_sender_name || ' (' || v_sender_dept || ')';
  END IF;

  -- Prepare message preview snippet
  IF NEW.message_type = 'attachment' THEN
    v_preview := '📎 Sent an attachment';
  ELSIF NEW.text_content IS NOT NULL AND trim(NEW.text_content) != '' THEN
    v_preview := substring(NEW.text_content from 1 for 120);
  ELSE
    v_preview := 'New message';
  END IF;

  -- Get conversation details
  SELECT type, group_name INTO v_conv_type, v_group_name
  FROM public.chat_conversations
  WHERE id = NEW.conversation_id;

  -- For direct and group conversations: notify all active members except sender
  FOR v_member IN
    SELECT user_id
    FROM public.chat_conversation_members
    WHERE conversation_id = NEW.conversation_id
      AND user_id != NEW.sender_id
      AND left_at IS NULL
  LOOP
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      category,
      reference_type,
      reference_id,
      actor_id
    ) VALUES (
      v_member.user_id,
      CASE 
        WHEN v_conv_type = 'group' THEN coalesce(v_group_name, 'Group Chat') || ': ' || v_sender_name
        ELSE v_sender_name
      END,
      v_preview,
      'CHAT',
      'chat_conversation',
      NEW.conversation_id::text,
      NEW.sender_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- 3. Attach trigger to chat_messages
DROP TRIGGER IF EXISTS trg_chat_message_notify_members ON public.chat_messages;
CREATE TRIGGER trg_chat_message_notify_members
  AFTER INSERT ON public.chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_chat_members_on_message();
