-- =============================================================================
-- 0087_fix_chat_rls_recursion.sql
--
-- Fixes PostgreSQL error 42P17: "infinite recursion detected in policy for 
-- relation chat_conversation_members" by replacing self-referential subqueries
-- with STABLE SECURITY DEFINER helper functions (is_chat_member & is_chat_admin_or_creator).
-- =============================================================================

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

-- chat_conversations SELECT policy
DROP POLICY IF EXISTS "Staff can view conversations they are members of" ON public.chat_conversations;
CREATE POLICY "Staff can view conversations they are members of"
  ON public.chat_conversations FOR SELECT
  USING (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND (
      public.is_chat_member(id, auth.uid())
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  );

-- chat_conversations UPDATE policy
DROP POLICY IF EXISTS "Group admin or super_admin can update conversation" ON public.chat_conversations;
CREATE POLICY "Group admin or super_admin can update conversation"
  ON public.chat_conversations FOR UPDATE
  USING (
    public.is_chat_admin_or_creator(id, auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- chat_conversation_members SELECT policy
DROP POLICY IF EXISTS "Members can view membership of their conversations" ON public.chat_conversation_members;
CREATE POLICY "Members can view membership of their conversations"
  ON public.chat_conversation_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR public.is_chat_member(conversation_id, auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- chat_conversation_members UPDATE policy
DROP POLICY IF EXISTS "Members can update their own membership (leave)" ON public.chat_conversation_members;
CREATE POLICY "Members can update their own membership (leave)"
  ON public.chat_conversation_members FOR UPDATE
  USING (
    user_id = auth.uid()
    OR public.is_chat_admin_or_creator(conversation_id, auth.uid())
    OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  );

-- chat_conversation_members INSERT policy
DROP POLICY IF EXISTS "Staff can insert members to conversations they own/admin" ON public.chat_conversation_members;
CREATE POLICY "Staff can insert members to conversations they own/admin"
  ON public.chat_conversation_members FOR INSERT
  WITH CHECK (
    (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
    AND (
      user_id = auth.uid()
      OR public.is_chat_admin_or_creator(conversation_id, auth.uid())
    )
  );

GRANT EXECUTE ON FUNCTION public.is_chat_member(uuid, uuid) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.is_chat_admin_or_creator(uuid, uuid) TO authenticated, service_role, anon;

-- Staff directory lookup for messenger
CREATE OR REPLACE FUNCTION public.get_staff_directory()
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  role user_role
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT u.id, u.full_name, u.email, u.role
  FROM public.users u
  WHERE u.role IN ('super_admin', 'admin', 'manager', 'staff')
  ORDER BY COALESCE(u.full_name, u.email) ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_staff_directory() TO authenticated, anon;

-- Allow chat participants to view profiles of members in their conversations
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

DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.users;
CREATE POLICY "Users can view participants in their conversations"
  ON public.users FOR SELECT
  USING (
    public.can_view_user_in_chat(id)
  );

GRANT EXECUTE ON FUNCTION public.can_view_user_in_chat(uuid) TO authenticated, anon;

-- Group conversation creator RPC
CREATE OR REPLACE FUNCTION public.create_group_conversation(
  p_creator_id uuid,
  p_group_name text,
  p_member_ids uuid[]
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conv_id uuid;
  v_mem_id uuid;
BEGIN
  -- Insert group conversation
  INSERT INTO public.chat_conversations (type, group_name, created_by)
  VALUES ('group', p_group_name, p_creator_id)
  RETURNING id INTO v_conv_id;

  -- Insert creator as admin
  INSERT INTO public.chat_conversation_members (conversation_id, user_id, is_admin)
  VALUES (v_conv_id, p_creator_id, true)
  ON CONFLICT (conversation_id, user_id) DO NOTHING;

  -- Insert all selected members
  FOREACH v_mem_id IN ARRAY p_member_ids
  LOOP
    IF v_mem_id != p_creator_id THEN
      INSERT INTO public.chat_conversation_members (conversation_id, user_id, is_admin)
      VALUES (v_conv_id, v_mem_id, false)
      ON CONFLICT (conversation_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  RETURN v_conv_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_group_conversation(uuid, text, uuid[]) TO authenticated, anon;



