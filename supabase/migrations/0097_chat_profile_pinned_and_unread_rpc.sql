-- ============================================================================
-- Migration 0097: Chat Profile, Group Info, Pinned Messages & WhatsApp Unread Counts
-- Includes:
-- 1. Staff Profile: Avatar URL & Bio (Full Name is strictly locked to database management only)
-- 2. Group Customization: Group Avatar URL, Group Topic & Group Info RPC
-- 3. Notification Trigger: Resolves real sender name with fallback to email username
-- 4. Pinned Messages: pin_chat_message & unpin_chat_message RPCs
-- 5. WhatsApp-Style Unread Badges: get_user_conversations_overview master RPC
-- ============================================================================

-- 1. Schema Extensions on public.users
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text DEFAULT 'Hey there! I am using RuhChat.';

-- Fill any null full_name with email prefix
UPDATE public.users 
SET full_name = initcap(split_part(email, '@', 1))
WHERE (full_name IS NULL OR trim(full_name) = '') AND email IS NOT NULL;

-- 2. Schema Extensions on public.chat_conversations
ALTER TABLE public.chat_conversations
  ADD COLUMN IF NOT EXISTS group_avatar_url text,
  ADD COLUMN IF NOT EXISTS group_topic text,
  ADD COLUMN IF NOT EXISTS pinned_message_id uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- 3. Update Notification Trigger to always show proper sender name (not generic 'Staff Member')
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
  -- Get sender name from users table with fallback to email prefix
  SELECT 
    coalesce(nullif(trim(full_name), ''), split_part(email, '@', 1), 'Staff'),
    coalesce(department, role::text)
  INTO v_sender_name, v_sender_dept
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

  -- Notify all active members except sender
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

-- 4. RPC: Update Staff Profile
-- Strict Policy: Name cannot be changed by staff or anyone else via client RPC.
-- Names can only be modified directly in the database (Supabase) by administrators.
CREATE OR REPLACE FUNCTION public.update_staff_profile(
  p_user_id uuid,
  p_full_name text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL,
  p_bio text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_updated record;
BEGIN
  -- p_full_name is intentionally ignored to prevent modification outside of direct database edits.
  UPDATE public.users
  SET 
    avatar_url = coalesce(p_avatar_url, avatar_url),
    bio = coalesce(p_bio, bio),
    updated_at = now()
  WHERE id = p_user_id
  RETURNING id, full_name, email, department, role, avatar_url, bio INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  RETURN to_jsonb(v_updated);
END;
$$;

-- 5. RPC: Update Group Info & Avatar
CREATE OR REPLACE FUNCTION public.update_group_info(
  p_conversation_id uuid,
  p_group_name text DEFAULT NULL,
  p_group_avatar_url text DEFAULT NULL,
  p_group_topic text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_conv record;
BEGIN
  UPDATE public.chat_conversations
  SET
    group_name = coalesce(nullif(trim(p_group_name), ''), group_name),
    group_avatar_url = coalesce(p_group_avatar_url, group_avatar_url),
    group_topic = coalesce(p_group_topic, group_topic),
    updated_at = now()
  WHERE id = p_conversation_id
  RETURNING id, type, group_name, group_avatar_url, group_topic INTO v_conv;

  RETURN to_jsonb(v_conv);
END;
$$;

-- 6. RPC: Pin & Unpin Chat Message
CREATE OR REPLACE FUNCTION public.pin_chat_message(
  p_conversation_id uuid,
  p_message_id uuid,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  -- 1. Update message pinned status
  UPDATE public.chat_messages
  SET pinned_at = now(), pinned_by = p_user_id
  WHERE id = p_message_id AND conversation_id = p_conversation_id;

  -- 2. Update conversation pinned_message_id
  UPDATE public.chat_conversations
  SET pinned_message_id = p_message_id, updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true, 'pinned_message_id', p_message_id);
END;
$$;

CREATE OR REPLACE FUNCTION public.unpin_chat_message(
  p_conversation_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  UPDATE public.chat_conversations
  SET pinned_message_id = NULL, updated_at = now()
  WHERE id = p_conversation_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 7. Master RPC: get_user_conversations_overview with real WhatsApp Unread Counts
CREATE OR REPLACE FUNCTION public.get_user_conversations_overview(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_result jsonb;
BEGIN
  SELECT coalesce(jsonb_agg(conv_row ORDER BY conv_row->>'latest_activity_at' DESC), '[]'::jsonb)
  INTO v_result
  FROM (
    SELECT 
      jsonb_build_object(
        'id', c.id,
        'type', c.type,
        'group_name', c.group_name,
        'group_topic', c.group_topic,
        'group_avatar_url', c.group_avatar_url,
        'pinned_message_id', c.pinned_message_id,
        'archived_at', c.archived_at,
        'created_at', c.created_at,
        'updated_at', c.updated_at,
        'allow_replies', c.allow_replies,
        'latest_activity_at', coalesce(latest_msg.created_at, c.updated_at, c.created_at),
        'unread_count', (
          SELECT count(DISTINCT cm.id)
          FROM public.chat_messages cm
          WHERE cm.conversation_id = c.id
            AND cm.sender_id != p_user_id
            AND cm.deleted_at IS NULL
            AND NOT EXISTS (
              SELECT 1 FROM public.chat_message_reads r
              WHERE r.message_id = cm.id AND r.user_id = p_user_id
            )
            AND (mem.last_read_at IS NULL OR cm.created_at > mem.last_read_at)
        ),
        'last_message', CASE WHEN latest_msg.id IS NOT NULL THEN
          jsonb_build_object(
            'id', latest_msg.id,
            'text_content', latest_msg.text_content,
            'message_type', latest_msg.message_type,
            'created_at', latest_msg.created_at,
            'sender_id', latest_msg.sender_id,
            'sender_name', coalesce(nullif(trim(u_sender.full_name), ''), split_part(u_sender.email, '@', 1), 'Staff')
          )
        ELSE NULL END,
        'pinned_message', CASE WHEN pinned_msg.id IS NOT NULL THEN
          jsonb_build_object(
            'id', pinned_msg.id,
            'text_content', pinned_msg.text_content,
            'message_type', pinned_msg.message_type,
            'sender_name', coalesce(nullif(trim(u_pinned_sender.full_name), ''), split_part(u_pinned_sender.email, '@', 1), 'Staff')
          )
        ELSE NULL END,
        'members', (
          SELECT jsonb_agg(
            jsonb_build_object(
              'user_id', m.user_id,
              'full_name', coalesce(nullif(trim(u.full_name), ''), split_part(u.email, '@', 1), 'Staff'),
              'email', u.email,
              'role', u.role,
              'department', u.department,
              'avatar_url', u.avatar_url,
              'bio', u.bio
            )
          )
          FROM public.chat_conversation_members m
          JOIN public.users u ON u.id = m.user_id
          WHERE m.conversation_id = c.id AND m.left_at IS NULL
        )
      ) AS conv_row
    FROM public.chat_conversations c
    JOIN public.chat_conversation_members mem 
      ON mem.conversation_id = c.id 
     AND mem.user_id = p_user_id 
     AND mem.left_at IS NULL
    LEFT JOIN LATERAL (
      SELECT id, text_content, message_type, created_at, sender_id
      FROM public.chat_messages
      WHERE conversation_id = c.id AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    ) latest_msg ON true
    LEFT JOIN public.users u_sender ON u_sender.id = latest_msg.sender_id
    LEFT JOIN public.chat_messages pinned_msg ON pinned_msg.id = c.pinned_message_id
    LEFT JOIN public.users u_pinned_sender ON u_pinned_sender.id = pinned_msg.sender_id
  ) q;

  RETURN v_result;
END;
$$;
