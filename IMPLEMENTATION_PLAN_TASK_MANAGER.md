# Ruhvi Staff Task Manager - Implementation Plan

## Executive Summary

This document provides a comprehensive implementation plan for building a dedicated Staff Task Manager module as specified in TASK_MANAGER.md. The plan is based on a thorough audit of the existing Ruhvi Jewels codebase.

---

## AUDIT FINDINGS SUMMARY

### 1. EXISTING INFRASTRUCTURE CAN BE FULLY REUSED

#### A. Authentication & Authorization
- **Provider:** Supabase Auth with JWT
- **Roles:** `super_admin`, `admin`, `manager`, `staff`, `customer`
- **Staff Table:** `public.users` (linked to `auth.users` via `id`)
- **Role Column:** `public.users.role` (enum: super_admin, admin, manager, staff, customer)
- **Department Column:** `public.users.department` (text field)
- **Department IDs:** `public.users.department_id` (FK to `public.departments`)
- **Allowed Portals:** `public.users.allowed_portals` (jsonb array)

**Key Files:**
- `src/lib/auth/server.ts` - Server-side auth helpers
- `src/lib/auth/rbac.ts` - RBAC utilities
- `src/lib/auth/verify-session.ts` - JWT verification
- `src/context/AuthContext.tsx` - React context
- `supabase/migrations/0092_staff_department_and_mobile_auth.sql` - Staff setup
- `supabase/migrations/0094_user_department_management_rpc.sql` - Role/department management

#### B. Staff Messenger (Cloudinary Account IDENTIFIED)

**There IS a separate Cloudinary account for Messenger!**

**Primary (Website):**
- Cloud Name: `tfelmupe`
- Env Vars: `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`

**Messenger/Task Manager (Secondary):**
- Cloud Name: `io1kkukg` (env: `NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME`)
- API Key: 522811694238476 (env: `CHAT_CLOUDINARY_API_KEY`)
- API Secret: `4InB0lp_J8h_NUwTCp3NVBXalOs` (env: `CHAT_CLOUDINARY_API_SECRET`)
- Upload Folder: `ruhvi/chat_attachments`
- Auth: Signed uploads with SHA-1 signature

**Critical Security Findings:**
1. **MESSENGER HAS ITS OWN CLOUDINARY ACCOUNT** - Confirmed! Use `io1kkukg` for Task Manager
2. **Current Upload Route:** `src/app/api/internal-chat/upload/route.ts`
3. **Upload Security:** Uses signed Cloudinary uploads (signature from SHA-1 hash)
4. **File Types Allowed:** Images, video, documents, PDFs
5. **Max Size:** 20MB enforced

**Task Manager Attachment Flow:**
```
Task Manager Upload → POST /api/task-manager/upload → Cloudinary io1kkukg
  → cloudinary_public_id → chat_attachments table
  → Supabase metadata stored
  → Task record references attachment
```

**Messenger Attachment Flow (for reference):**
```
Messenger Upload → POST /api/internal-chat/upload → Cloudinary io1kkukg
  → cloudinary_public_id → chat_attachments table
  → Supabase metadata stored
  → Message record references attachment
```

#### C. Database Schema (Supabase)

**Existing Tables (reusable for Task Manager):**
- `public.users` - Staff/users (id, role, department, allowed_portals, etc.)
- `public.departments` - Departments (id, name, description)
- `public.notifications` - Notification center (user_id, title, message, category, reference_type, reference_id)
- `public.chat_messages` - Messenger messages (id, conversation_id, sender_id, message_type, text_content, file references)
- `public.chat_conversations` - Messenger conversations
- `public.chat_attachments` - File attachments (cloudinary_public_id, cloudinary_url, resource_type, etc.)
- `public.chat_conversation_members` - Conversation membership
- `public.chat_message_reads` - Read receipts

**New Tables Needed for Task Manager:**
1. `tasks` - Core task definitions
2. `task_assignments` - Assignment records (who, when, department routing)
3. `task_spectators` - View-only participants
4. `task_comments` - Task remarks/progress updates
5. `task_attachments` - Task file attachments (will reuse chat_attachments or create own)
6. `task_activity` - Audit trail
7. `task_priority_levels` - Priority enum/levels
8. `task_statuses` - Status workflow
9. `task_types` - Task categorization
10. `task_slas` - SLA tracking

#### D. Notification System
- **Provider:** Supabase Realtime + Email (Resend/Brevo)
- **Table:** `public.notifications` (user_id, title, message, category, reference_type, reference_id, actor_id)
- **Chat Notifications:** Auto-triggered via trigger function `fn_notify_chat_members_on_message`
- **Existing Usage:** Order notifications, chat messages, support tickets
- **Task Manager Integration:** Will create new notification records with category='TASK' or 'task_manager'

#### E. API Route Patterns
- **Authentication:** JWT via `verifySessionToken` from cookie
- **Authorization:** Supabase RLS policies + server-side checks
- **Error Format:** Standard `{ error: 'message' }` JSON responses
- **Success Format:** `{ data: ..., success: true }` or direct return values
- **Service Role:** Uses `getServiceClient()` with service role key for backend operations
- **File Uploads:** Multipart FormData with validation

#### F. Security Architecture
- **RLS Policies:** Comprehensive Row Level Security on chat tables
- **Staff Check:** `SELECT role FROM public.users WHERE id = auth.uid()` - always exclude 'customer'
- **Admin Check:** `role IN ('super_admin', 'admin')` for privileged operations
- **Department Security:** Chat RLS enforces department-based access
- **Soft Deletes:** `deleted_at` timestamps for audit trails
- **Audit Logging:** `chat_admin_audit_logs` for admin actions

---

## KEY SECURITY FINDINGS

### 1. MESSSENGER CLOUDINARY CONFIRMED ✓
**Use Cloudinary Account:** `io1kkukg`
**Env Vars:** `NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME`, `CHAT_CLOUDINARY_API_KEY`, `CHAT_CLOUDINARY_API_SECRET`
**Important:** The existing `src/lib/imageService.ts` uses website Cloudinary (`tfelmupe`). Do NOT modify this for Task Manager.

### 2. TASK MANAGER SHOULD USE MESSSENGER CLOUDINARY
- Create separate upload route: `src/app/api/task-manager/upload/route.ts`
- Reuse existing upload logic from `src/app/api/internal-chat/upload/route.ts`
- Store in same `chat_attachments` table or separate `task_attachments` table

### 3. SECURITY RULES FOR TASK MANAGER
- **Role Check:** Always validate `role != 'customer'`
- **Department Check:** If department-based access, validate `department_id` matches
- **Manager Check:** `role IN ('super_admin', 'admin', 'manager')`
- **Assignment Validation:** Staff can only see tasks they're assigned to, in their department, or are admin
- **RLS Policies:** Must be created for all new tables

### 4. SPECTATOR ROLE CLARIFICATION
- **Definition:** Anyone with valid staff account but NOT 'customer' role
- **TASK MANAGER SPEC:** Spectator can view task but NOT be responsible for completing it
- **Permission Model:**
  - Spectator: Can view assigned tasks, add comments, upload attachments
  - Assignee: Can update status, assign to others, modify task
  - Admin: Full access

---

## IMPLEMENTATION PLAN

### PHASE 1: DATABASE SCHEMA (Migration 0098)

#### New Tables

```sql
-- =============================================================================
-- Migration 0098: Task Manager Database Schema
-- =============================================================================

-- 1. Task Priorities
CREATE TABLE IF NOT EXISTS public.task_priorities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'low', 'normal', 'high', 'important', 'immediate'
  level INT NOT NULL UNIQUE,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Task Statuses
CREATE TABLE IF NOT EXISTS public.task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'open', 'in_progress', 'blocked', 'completed', 'closed'
  description TEXT,
  display_order INT NOT NULL DEFAULT 0,
  color TEXT DEFAULT '#6b7280',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Task Types
CREATE TABLE IF NOT EXISTS public.task_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE, -- 'order_issue', 'product_info', 'customer_support', 'technical', 'inventory', 'dispatch', 'approval', 'internal_request', 'other'
  icon TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. SLA Configuration
CREATE TABLE IF NOT EXISTS public.task_slas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  expected_duration_interval INTERVAL NOT NULL,
  default_duration INTERVAL DEFAULT '4 hours'::INTERVAL,
  sla_level TEXT DEFAULT 'normal', -- 'normal', 'medium', 'heavy'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Core Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id_text TEXT UNIQUE, -- Human-readable ID like 'TASK-2026-001'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  
  -- Creator
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  
  -- Assignment (nullable if department assignment)
  assignee_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  
  -- Department assignment
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  
  -- Priority
  priority_id UUID NOT NULL REFERENCES public.task_priorities(id) ON DELETE RESTRICT DEFAULT 'normal',
  
  -- Task Type
  type_id UUID REFERENCES public.task_types(id) ON DELETE SET NULL,
  
  -- SLA
  sla_id UUID REFERENCES public.task_slas(id) ON DELETE SET NULL,
  
  -- Timing
  start_time TIMESTAMPTZ,
  expected_duration INTERVAL,
  due_date DATE,
  due_time TIME,
  
  -- Status
  status_id UUID NOT NULL REFERENCES public.task_statuses(id) ON DELETE RESTRICT DEFAULT 'open',
  
  -- Related Context (nullable - order, product, ticket)
  related_order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  related_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  related_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
  
  -- Metadata
  department_name TEXT, -- Denormalized for search/filter
  tags TEXT[], -- Optional tags
  is_recurring BOOLEAN DEFAULT false,
  parent_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  
  -- Soft delete
  deleted_at TIMESTAMPTZ
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON public.tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee_id ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_department_id ON public.tasks(department_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_id ON public.tasks(status_id);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON public.tasks(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_related_order ON public.tasks(related_order_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_product ON public.tasks(related_product_id);
CREATE INDEX IF NOT EXISTS idx_tasks_related_ticket ON public.tasks(related_ticket_id);
CREATE INDEX IF NOT EXISTS idx_tasks_is_recurring ON public.tasks(is_recurring) WHERE is_recurring = true;

-- 6. Task Assignments
CREATE TABLE IF NOT EXISTS public.task_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'assigned', -- 'assigned', 'accepted', 'declined', 'completed'
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON public.task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON public.task_assignments(user_id);

-- 7. Task Spectators
CREATE TABLE IF NOT EXISTS public.task_spectators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_spectators_task ON public.task_spectators(task_id);
CREATE INDEX IF NOT EXISTS idx_task_spectators_user ON public.task_spectators(user_id);

-- 8. Task Comments
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  content TEXT NOT NULL,
  is_progress_update BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user ON public.task_comments(user_id);

-- 9. Task Attachments
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  cloudinary_public_id TEXT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  resource_type TEXT NOT NULL DEFAULT 'image' CHECK (resource_type IN ('image', 'video', 'raw')),
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  width INTEGER,
  height INTEGER,
  duration NUMERIC,
  uploader_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_attachments_task ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_message ON public.task_attachments(message_id);

-- 10. Task Activity Log
CREATE TABLE IF NOT EXISTS public.task_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL, -- 'created', 'assigned', 'status_changed', 'priority_changed', 'sla_changed', 'comment_added', 'attachment_added', 'spectator_added', 'completed', 'closed', 'reopened'
  old_value JSONB,
  new_value JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_activity_task ON public.task_activity(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_user ON public.task_activity(user_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_action ON public.task_activity(action);

-- 11. Task Checklists
CREATE TABLE IF NOT EXISTS public.task_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_checklists_task ON public.task_checklists(task_id);

-- 12. Task Dependencies
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  depends_on_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'blocked', 'ready'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON public.task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON public.task_dependencies(depends_on_task_id);

-- 13. Task Recurrence (for future automation)
CREATE TABLE IF NOT EXISTS public.task_recurrence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  recurrence_pattern TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
  recurrence_interval INT DEFAULT 1,
  recurrence_days TEXT[], -- For weekly: [0-6]
  recurrence_end_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_task_recurrence_task ON public.task_recurrence(task_id);

-- 14. Enable RLS on all tables
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_spectators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_recurrence ENABLE ROW LEVEL SECURITY;

-- 15. RLS Policies

-- Tasks: Staff can only see tasks in their department or assigned to them
DROP POLICY IF EXISTS "Staff can view tasks" ON public.tasks;
CREATE POLICY "Staff can view tasks" ON public.tasks FOR SELECT
USING (
  -- Super admin sees all
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
  OR
  -- If assigned to user
  EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
  )
  OR
  -- If in user's department (staff can see tasks in their department)
  EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = tasks.department_id AND d.id IN (
      SELECT department_id FROM public.users WHERE id = auth.uid() AND department_id IS NOT NULL
    )
  )
  OR
  -- If user created the task
  tasks.created_by = auth.uid()
);

-- Tasks: Staff can create tasks
DROP POLICY IF EXISTS "Staff can create tasks" ON public.tasks;
CREATE POLICY "Staff can create tasks" ON public.tasks FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
);

-- Tasks: Staff can update tasks they own or are assigned to
DROP POLICY IF EXISTS "Staff can update tasks" ON public.tasks;
CREATE POLICY "Staff can update tasks" ON public.tasks FOR UPDATE
USING (
  -- If user is assigned
  EXISTS (
    SELECT 1 FROM public.task_assignments ta
    WHERE ta.task_id = tasks.id AND ta.user_id = auth.uid()
  )
  OR
  -- If user created the task
  tasks.created_by = auth.uid()
  OR
  -- If manager of task's department
  EXISTS (
    SELECT 1 FROM public.departments d
    WHERE d.id = tasks.department_id
      AND (SELECT role FROM public.users WHERE id = auth.uid()) IN ('super_admin', 'admin', 'manager')
  )
  OR
  -- If super admin
  (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
);

-- Task Assignments
DROP POLICY IF EXISTS "Staff can view task assignments" ON public.task_assignments;
CREATE POLICY "Staff can view task assignments" ON public.task_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_assignments.task_id AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
      )
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

DROP POLICY IF EXISTS "Staff can assign tasks" ON public.task_assignments;
CREATE POLICY "Staff can assign tasks" ON public.task_assignments FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
);

-- Task Comments
DROP POLICY IF EXISTS "Staff can view task comments" ON public.task_comments;
CREATE POLICY "Staff can view task comments" ON public.task_comments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_comments.task_id AND (
      -- Comment is in a task they can see
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
      )
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

DROP POLICY IF EXISTS "Staff can add task comments" ON public.task_comments;
CREATE POLICY "Staff can add task comments" ON public.task_comments FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
);

-- Task Attachments
DROP POLICY IF EXISTS "Staff can view task attachments" ON public.task_attachments;
CREATE POLICY "Staff can view task attachments" ON public.task_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
      )
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

DROP POLICY IF EXISTS "Staff can upload task attachments" ON public.task_attachments;
CREATE POLICY "Staff can upload task attachments" ON public.task_attachments FOR INSERT
WITH CHECK (
  (SELECT role FROM public.users WHERE id = auth.uid()) NOT IN ('customer')
);

-- Task Activity
DROP POLICY IF EXISTS "Staff can view task activity" ON public.task_activity;
CREATE POLICY "Staff can view task activity" ON public.task_activity FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_activity.task_id AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
      )
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

-- Task Spectators
DROP POLICY IF EXISTS "Staff can view task spectators" ON public.task_spectators;
CREATE POLICY "Staff can view task spectators" ON public.task_spectators FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_spectators.task_id AND (
      t.created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.task_assignments ta
        WHERE ta.task_id = t.id AND ta.user_id = auth.uid()
      )
      OR (SELECT role FROM public.users WHERE id = auth.uid()) = 'super_admin'
    )
  )
);

-- 16. Helper RPCs

-- Generate task ID
CREATE OR REPLACE FUNCTION public.generate_task_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task_id_text TEXT;
  v_year INT;
  v_count INT;
BEGIN
  v_year := EXTRACT(YEAR FROM NEW.created_at);
  
  -- Count tasks created this year
  SELECT COUNT(*) INTO v_count
  FROM public.tasks
  WHERE task_id_text LIKE v_year || '%';
  
  -- Format: TASK-YYYY-NNN
  v_task_id_text := 'TASK-' || v_year || '-' || LPAD((v_count + 1)::TEXT, 3, '0');
  
  NEW.task_id_text := v_task_id_text;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_task_id ON public.tasks;
CREATE TRIGGER trg_generate_task_id
  BEFORE INSERT ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_task_id();

-- Update task updated_at
CREATE OR REPLACE FUNCTION public.touch_task_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.tasks
  SET updated_at = now()
  WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;

-- 17. Seed default values
INSERT INTO public.task_priorities (name, level, color) VALUES
  ('Low', 1, '#6b7280'),
  ('Normal', 2, '#3b82f6'),
  ('High', 3, '#f59e0b'),
  ('Important', 4, '#ef4444'),
  ('Immediate', 5, '#dc2626')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.task_statuses (name, display_order, color) VALUES
  ('Open', 1, '#6b7280'),
  ('In Progress', 2, '#3b82f6'),
  ('Blocked', 3, '#ef4444'),
  ('Completed', 4, '#10b981'),
  ('Closed', 5, '#6b7280')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.task_types (name) VALUES
  ('Order Issue'),
  ('Product Information'),
  ('Customer Support'),
  ('Technical Issue'),
  ('Inventory'),
  ('Dispatch'),
  ('Approval'),
  ('Internal Request'),
  ('Other')
ON CONFLICT (name) DO NOTHING;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.task_priorities, public.task_statuses, public.task_types TO authenticated;
GRANT SELECT ON public.tasks, public.task_assignments, public.task_spectators, public.task_comments, public.task_attachments, public.task_activity, public.task_checklists, public.task_dependencies, public.task_recurrence TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_task_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.touch_task_updated_at() TO authenticated;
```

---

### PHASE 2: BACKEND API ROUTES

#### 2.1 Create Task (POST /api/task-manager/tasks)

**File:** `src/app/api/task-manager/tasks/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status, department_id')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const {
      title,
      description,
      assignee_id,
      department_id,
      priority,
      task_type,
      due_date,
      due_time,
      start_time,
      expected_duration,
      related_order_id,
      related_product_id,
      related_ticket_id
    } = body;

    const supabase = getServiceClient();
    
    // Validate required fields
    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required' },
        { status: 400 }
      );
    }

    // Validate due date format if provided
    if (due_date && isNaN(Date.parse(due_date))) {
      return NextResponse.json(
        { error: 'Invalid due date' },
        { status: 400 }
      );
    }

    // Create task
    const { data: task, error } = await supabase
      .from('tasks')
      .insert({
        title,
        description,
        created_by: staffUser.id,
        assignee_id: assignee_id || null,
        department_id: department_id || staffUser.department_id,
        priority: priority || 'normal',
        type_id: task_type || null,
        due_date: due_date || null,
        due_time: due_time || null,
        start_time: start_time || null,
        expected_duration: expected_duration || null,
        related_order_id: related_order_id || null,
        related_product_id: related_product_id || null,
        related_ticket_id: related_ticket_id || null,
      })
      .select()
      .single();

    if (error) {
      console.error('[Task POST] Error creating task:', error);
      return NextResponse.json(
        { error: 'Failed to create task' },
        { status: 500 }
      );
    }

    // Create assignment record
    if (assignee_id) {
      await supabase.from('task_assignments').insert({
        task_id: task.id,
        user_id: assignee_id,
        assigned_by: staffUser.id,
      });
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: task.id,
      user_id: staffUser.id,
      action: 'created',
      new_value: { task_id: task.id, title, status: 'open' },
    });

    // Create notification for assignee
    if (assignee_id && assignee_id !== staffUser.id) {
      const { error: notifyErr } = await supabase.from('notifications').insert({
        user_id: assignee_id,
        title: 'New Task Assigned to You',
        message: `Task "${title}" has been assigned to you`,
        category: 'TASK_ASSIGNMENT',
        reference_type: 'task',
        reference_id: task.id,
        actor_id: staffUser.id,
      });
      if (notifyErr) console.error('[Task POST] Notification error:', notifyErr);
    }

    return NextResponse.json({ 
      task, 
      success: true,
      message: 'Task created successfully'
    });
  } catch (err: any) {
    console.error('[Task POST] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.2 Get Tasks (GET /api/task-manager/tasks)

**File:** `src/app/api/task-manager/tasks/route.ts` (extend)

```typescript
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const supabase = getServiceClient();
    
    // Build query
    let query = supabase
      .from('tasks')
      .select('*, 
        assignee:users(id, full_name, email, department, avatar_url),
        creator:users(id, full_name, email),
        priority_name:task_priorities(name),
        status_name:task_statuses(name),
        type_name:task_types(name),
        department_name:departments(name),
        order:orders(order_number, id),
        product:products(id, name, slug),
        ticket:support_tickets(id, ticket_number)
      )
      .eq('deleted_at', null);

    // Apply filters from query params
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const department = searchParams.get('department');
    const assignee = searchParams.get('assignee');
    const creator = searchParams.get('creator');
    const due_before = searchParams.get('due_before');
    const due_after = searchParams.get('due_after');
    const search = searchParams.get('search');
    const my_tasks = searchParams.get('my_tasks');
    const assigned_by_me = searchParams.get('assigned_by_me');
    const due_today = searchParams.get('due_today');
    const overdue = searchParams.get('overdue');

    // My tasks view
    if (my_tasks === 'true') {
      query = query.eq('created_by', staffUser.id);
    } else if (assigned_by_me === 'true') {
      query = query.eq('assigned_by', staffUser.id);
    } else {
      // Normal view - staff can only see tasks in their department
      if (staffUser.department_id) {
        query = query.or(`department_id.eq.${staffUser.department_id},created_by.eq.${staffUser.id}`);
      }
    }

    // Other filters
    if (status) query = query.eq('status_id', status);
    if (priority) query = query.eq('priority_id', priority);
    if (department) query = query.eq('department_id', department);
    if (assignee) query = query.eq('assignee_id', assignee);
    if (creator) query = query.eq('created_by', creator);
    if (due_before) query = query.lte('due_date', due_before);
    if (due_after) query = query.gte('due_date', due_after);
    if (due_today) {
      const today = new Date().toISOString().split('T')[0];
      query = query.eq('due_date', today);
    }
    if (overdue) {
      const today = new Date().toISOString().split('T')[0];
      query = query.lt('due_date', today);
    }

    // Search
    if (search) {
      query = query.ilike('title', `%${search}%`)
        .or('description.ilike.%' + search + '%');
    }

    // Sort
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_dir = searchParams.get('sort_dir') || 'desc';
    query = query.order(sort_by, { ascending: sort_dir === 'asc' });

    // Pagination
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    query = query.range(offset, offset + limit - 1);

    const { data: tasks, count, error } = await query;
    
    if (error) {
      console.error('[Task GET] Error:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    // Get total count
    const { count: total } = await supabase
      .from('tasks')
      .select('id', { count: 'exact', head: true })
      .eq('deleted_at', null);

    return NextResponse.json({ 
      tasks, 
      total: count || 0,
      page: Math.floor(offset / limit) + 1,
      limit,
      has_more: offset + limit < (count || 0)
    });
  } catch (err: any) {
    console.error('[Task GET] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.3 Get Task Detail (GET /api/task-manager/tasks/[id])

**File:** `src/app/api/task-manager/tasks/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const supabase = getServiceClient();

    // Get task with all relations
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*, 
        assignee:users(id, full_name, email, department, avatar_url),
        creator:users(id, full_name, email),
        priority_name:task_priorities(name),
        status_name:task_statuses(name),
        type_name:task_types(name),
        department_name:departments(name),
        order:orders(order_number, id),
        product:products(id, name, slug),
        ticket:support_tickets(id, ticket_number),
        
        // Aggregates
        assignments:task_assignments(*, assigned_user:users(id, full_name, email)),
        spectators:task_spectators(*, spectator:users(id, full_name, email)),
        comments:task_comments(*, user:users(id, full_name, email, avatar_url)),
        activity:task_activity(*, user:users(id, full_name, email))
      )
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (error) {
      console.error('[Task GET /:id] Error:', error);
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Validate access
    if (staffUser.role === 'customer') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Staff can only see tasks in their department or assigned to them
    if (staffUser.department_id && task.department_id !== staffUser.department_id && 
        task.assignee_id !== staffUser.id && task.created_by !== staffUser.id) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ task, success: true });
  } catch (err: any) {
    console.error('[Task GET /:id] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.4 Update Task (PUT /api/task-manager/tasks/[id])

**File:** `src/app/api/task-manager/tasks/[id]/route.ts`

```typescript
export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    // Map request fields to database fields
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.status_id !== undefined) updates.status_id = body.status_id;
    if (body.priority_id !== undefined) updates.priority_id = body.priority_id;
    if (body.assignee_id !== undefined) updates.assignee_id = body.assignee_id;
    if (body.department_id !== undefined) updates.department_id = body.department_id;
    if (body.due_date !== undefined) updates.due_date = body.due_date;
    if (body.due_time !== undefined) updates.due_time = body.due_time;
    if (body.expected_duration !== undefined) updates.expected_duration = body.expected_duration;
    if (body.start_time !== undefined) updates.start_time = body.start_time;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Check if user has permission to update
    const { data: existingTask, error: fetchErr } = await supabase
      .from('tasks')
      .select('*, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Permission check
    const canUpdate = staffUser.role === 'super_admin' ||
      staffUser.id === existingTask.assignee_id ||
      staffUser.id === existingTask.created_by ||
      (staffUser.department_id && staffUser.department_id === existingTask.department_id &&
       staffUser.role === 'manager');

    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Update task
    const { data: updatedTask, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('[Task PUT] Error:', error);
      return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }

    // Log activity
    const changes: Record<string, unknown> = {};
    Object.keys(updates).forEach(key => {
      changes[key] = updates[key];
    });
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'updated',
      old_value: existingTask,
      new_value: changes,
    });

    return NextResponse.json({ 
      task: updatedTask, 
      success: true,
      message: 'Task updated successfully'
    });
  } catch (err: any) {
    console.error('[Task PUT] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.5 Task Upload (POST /api/task-manager/upload)

**File:** `src/app/api/task-manager/upload/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'application/pdf', 'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv', 'video/mp4', 'video/webm', 'video/quicktime',
]);

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Backend file size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 20 MB.` },
        { status: 413 }
      );
    }

    // Backend MIME type validation
    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `File type '${mimeType}' is not allowed.` },
        { status: 415 }
      );
    }

    // USE MESSENGER'S CLOUDINARY ACCOUNT
    const cloudName = process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CHAT_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CHAT_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Chat Cloudinary credentials are not configured');
    }

    // Determine resource type for Cloudinary
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const cloudinaryResourceType = isVideo ? 'video' : isImage ? 'image' : 'raw';

    // Build the upload folder path
    const folder = 'ruhvi/task_attachments';
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate upload signature (same pattern as Messenger)
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signaturePayload);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${cloudinaryResourceType}/upload`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error('[Task Upload] Cloudinary error:', errBody);
      return NextResponse.json(
        { error: 'File upload failed' },
        { status: 502 }
      );
    }

    const cloudData = await uploadRes.json();

    // Save to database
    const supabase = getServiceClient();
    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: req.body.task_id, // This would need to be passed in form data
        cloudinary_public_id: cloudData.public_id,
        cloudinary_url: cloudData.secure_url,
        resource_type: cloudinaryResourceType,
        file_name: file.name,
        mime_type: mimeType,
        file_size: file.size,
        width: cloudData.width || null,
        height: cloudData.height || null,
        duration: cloudData.duration || null,
        uploader_id: staffUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[Task Upload] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to save attachment' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      attachment,
      cloudinary_public_id: cloudData.public_id,
      cloudinary_url: cloudData.secure_url,
      resource_type: cloudinaryResourceType,
      file_name: file.name,
      mime_type: mimeType,
      file_size: file.size,
      success: true,
    });
  } catch (err: any) {
    console.error('[Task Upload] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

#### 2.6 Task Comments (POST /api/task-manager/tasks/[id]/comments)

**File:** `src/app/api/task-manager/tasks/[id]/comments/route.ts`

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { content, is_progress_update } = await req.json();

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify access to task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access
    if (staffUser.role === 'customer' ||
        (staffUser.department_id && task.department_id !== staffUser.department_id &&
         task.assignee_id !== staffUser.id && task.created_by !== staffUser.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: id,
        user_id: staffUser.id,
        content,
        is_progress_update: is_progress_update || false,
      })
      .select('*, user:users(id, full_name, email, avatar_url)')
      .single();

    if (error) {
      console.error('[Comment POST] Error:', error);
      return NextResponse.json({ error: 'Failed to add comment' }, { status: 500 });
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'comment_added',
      metadata: { comment_id: comment.id, is_progress_update },
    });

    // Notification to assignee
    if (task.assignee_id && task.assignee_id !== staffUser.id) {
      await supabase.from('notifications').insert({
        user_id: task.assignee_id,
        title: 'New Comment on Your Task',
        message: `"${content.substring(0, 100)}${content.length > 100 ? '...' : ''}"`,
        category: 'TASK_COMMENT',
        reference_type: 'task',
        reference_id: id,
        actor_id: staffUser.id,
      });
    }

    return NextResponse.json({ comment, success: true });
  } catch (err: any) {
    console.error('[Comment POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

#### 2.7 Add Spectator (POST /api/task-manager/tasks/[id]/spectators)

**File:** `src/app/api/task-manager/tasks/[id]/spectators/route.ts`

```typescript
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const { user_id } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    const supabase = getServiceClient();

    // Verify access to task
    const { data: task, error: fetchErr } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', id)
      .eq('deleted_at', null)
      .single();

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access
    if (staffUser.role === 'customer' ||
        (staffUser.department_id && task.department_id !== staffUser.department_id &&
         task.assignee_id !== staffUser.id && task.created_by !== staffUser.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Verify spectator is not assignee or creator
    if (user_id === task.assignee_id || user_id === task.created_by) {
      return NextResponse.json({ error: 'Cannot add assignee or creator as spectator' }, { status: 400 });
    }

    // Check if already spectator
    const { data: existing } = await supabase
      .from('task_spectators')
      .select('id')
      .eq('task_id', id)
      .eq('user_id', user_id)
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already a spectator' }, { status: 400 });
    }

    // Add spectator
    const { error } = await supabase
      .from('task_spectators')
      .insert({
        task_id: id,
        user_id,
        added_by: staffUser.id,
      });

    if (error) {
      console.error('[Spectator POST] Error:', error);
      return NextResponse.json({ error: 'Failed to add spectator' }, { status: 500 });
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: id,
      user_id: staffUser.id,
      action: 'spectator_added',
      new_value: { user_id },
    });

    return NextResponse.json({ success: true, message: 'Spectator added' });
  } catch (err: any) {
    console.error('[Spectator POST] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
```

---

### PHASE 3: FRONTEND COMPONENTS

#### 3.1 Task List Component

**File:** `src/components/tasks/TaskList.tsx`

```tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  task_id_text: string;
  title: string;
  description: string;
  status_name: string;
  priority_name: string;
  assignee: { full_name: string };
  department_name: string;
  due_date: string | null;
  created_at: string;
}

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    department: '',
    assignee: '',
    search: '',
    due_today: false,
    overdue: false,
  });
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const router = useRouter();

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    
    if (filters.status) params.set('status', filters.status);
    if (filters.priority) params.set('priority', filters.priority);
    if (filters.department) params.set('department', filters.department);
    if (filters.assignee) params.set('assignee', filters.assignee);
    if (filters.search) params.set('search', filters.search);
    if (filters.due_today) params.set('due_today', 'true');
    if (filters.overdue) params.set('overdue', 'true');
    
    params.set('sort_by', 'created_at');
    params.set('sort_dir', 'desc');
    params.set('limit', '20');
    params.set('offset', ((page - 1) * 20).toString());
    
    try {
      const res = await fetch(`/api/task-manager/tasks?${params}`);
      const data = await res.json();
      setTasks(data.tasks || []);
      setTotal(data.total || 0);
      setHasMore(data.has_more || false);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const handleViewChange = (view: string) => {
    const filtersMap: Record<string, Record<string, string>> = {
      my_tasks: { created_by: 'my' },
      assigned_to_me: { assignee: 'me' },
      due_today: { due_today: 'true', status: '' },
      overdue: { overdue: 'true', status: '' },
    };
    setFilters(filtersMap[view] || {});
    setPage(1);
  };

  const handleCreateTask = () => {
    router.push('/admin/tasks/new');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Tasks</h2>
        <button
          onClick={handleCreateTask}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filters.status}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-1 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="blocked">Blocked</option>
          <option value="completed">Completed</option>
          <option value="closed">Closed</option>
        </select>

        <select
          value={filters.priority}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
          className="px-3 py-1 border rounded-lg"
        >
          <option value="">All Priorities</option>
          <option value="low">Low</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
          <option value="important">Important</option>
          <option value="immediate">Immediate</option>
        </select>

        <input
          type="text"
          placeholder="Search tasks..."
          value={filters.search}
          onChange={(e) => handleFilterChange('search', e.target.value)}
          className="px-3 py-1 border rounded-lg flex-1 max-w-xs"
        />

        <div className="flex gap-2">
          <button
            onClick={() => handleViewChange('my_tasks')}
            className={`px-3 py-1 rounded-lg ${filters.created_by === 'my' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
          >
            My Tasks
          </button>
          <button
            onClick={() => handleViewChange('assigned_to_me')}
            className={`px-3 py-1 rounded-lg ${filters.assignee === 'me' ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
          >
            Assigned to Me
          </button>
          <button
            onClick={() => handleViewChange('due_today')}
            className={`px-3 py-1 rounded-lg ${filters.due_today ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}`}
          >
            Due Today
          </button>
          <button
            onClick={() => handleViewChange('overdue')}
            className={`px-3 py-1 rounded-lg ${filters.overdue ? 'bg-red-100 text-red-700' : 'text-gray-600'}`}
          >
            Overdue
          </button>
        </div>
      </div>

      {/* Task Cards */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">No tasks found</p>
          <p className="text-sm">Create a new task or adjust your filters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => router.push(`/admin/tasks/${task.id}`)}
              className="p-4 border rounded-lg hover:shadow-md cursor-pointer bg-white transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-gray-500 font-mono">
                      {task.task_id_text}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.priority_name === 'Immediate' ? 'bg-red-100 text-red-700' :
                      task.priority_name === 'High' ? 'bg-orange-100 text-orange-700' :
                      task.priority_name === 'Important' ? 'bg-yellow-100 text-yellow-700' :
                      task.priority_name === 'Low' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {task.priority_name}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      task.status_name === 'Blocked' ? 'bg-red-100 text-red-700' :
                      task.status_name === 'Overdue' ? 'bg-purple-100 text-purple-700' :
                      task.status_name === 'Completed' ? 'bg-green-100 text-green-700' :
                      task.status_name === 'Closed' ? 'bg-gray-100 text-gray-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {task.status_name}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{task.title}</h3>
                  <p className="text-sm text-gray-600 line-clamp-2 mt-1">
                    {task.description}
                  </p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  {task.due_date && (
                    <div className={`text-sm ${
                      task.due_date < new Date().toISOString().split('T')[0] && task.status_name !== 'Completed' 
                        ? 'text-red-600 font-semibold'
                        : 'text-gray-600'
                    }`}>
                      📅 {new Date(task.due_date).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  )}
                  {task.assignee && (
                    <div className="flex items-center gap-1">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold">
                        {(task.assignee.full_name || '?')[0]}
                      </div>
                      <span className="text-sm text-gray-600">{task.assignee.full_name}</span>
                    </div>
                  )}
                  <span className="text-sm text-gray-400">{task.department_name}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {hasMore && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page === 1}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={!hasMore}
            className="px-4 py-2 border rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
```

#### 3.2 Task Create/Edit Component

**File:** `src/components/tasks/TaskForm.tsx`

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface TaskFormData {
  title: string;
  description: string;
  assignee_id: string;
  department_id: string;
  priority: string;
  task_type: string;
  due_date: string;
  due_time: string;
  start_time: string;
  expected_duration: string;
  related_order_id: string;
  related_product_id: string;
  related_ticket_id: string;
}

export default function TaskForm({ taskId }: { taskId?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [staffMembers, setStaffMembers] = useState<{ id: string; full_name: string; email: string }[]>([]);

  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    description: '',
    assignee_id: '',
    department_id: '',
    priority: 'normal',
    task_type: '',
    due_date: '',
    due_time: '',
    start_time: '',
    expected_duration: '',
    related_order_id: '',
    related_product_id: '',
    related_ticket_id: '',
  });

  useState(async () => {
    // Fetch staff members for assignment dropdown
    try {
      const res = await fetch('/api/task-manager/staff');
      const data = await res.json();
      setStaffMembers(data.staff || []);
    } catch (err) {
      console.error('Failed to fetch staff:', err);
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const url = taskId 
        ? `/api/task-manager/tasks/${taskId}` 
        : '/api/task-manager/tasks';
      const method = taskId ? 'PUT' : 'POST';

      const body = taskId ? formData : {
        ...formData,
        department_id: formData.department_id || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save task');
      }

      setSuccess(taskId ? 'Task updated successfully!' : 'Task created successfully!');
      
      // Navigate to task detail
      router.push(`/admin/tasks/${data.task.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl mx-auto">
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h2 className="text-xl font-semibold mb-4">
          {taskId ? 'Edit Task' : 'Create New Task'}
        </h2>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 mb-4">
            {success}
          </div>
        )}

        {/* Basic Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
              placeholder="Brief task description"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select priority</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="important">Important</option>
              <option value="immediate">Immediate</option>
            </select>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description <span className="text-red-500">*</span>
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            rows={4}
            required
            placeholder="Detailed task description..."
          />
        </div>

        {/* Assignment */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Assign To <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.assignee_id}
            onChange={(e) => setFormData(prev => ({ ...prev, assignee_id: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            required
          >
            <option value="">Select staff member</option>
            {staffMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.full_name} ({member.email})
              </option>
            ))}
          </select>
        </div>

        {/* Timing */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Time
            </label>
            <input
              type="datetime-local"
              value={formData.start_time}
              onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expected Duration (e.g., 4 hours, 1 day, 1 week)
            </label>
            <input
              type="text"
              value={formData.expected_duration}
              onChange={(e) => setFormData(prev => ({ ...prev, expected_duration: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="4 hours, 1 day, 2 days, 1 week..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Task Type (optional)
            </label>
            <select
              value={formData.task_type}
              onChange={(e) => setFormData(prev => ({ ...prev, task_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Select type</option>
              <option value="order_issue">Order Issue</option>
              <option value="product_info">Product Information</option>
              <option value="customer_support">Customer Support</option>
              <option value="technical">Technical Issue</option>
              <option value="inventory">Inventory</option>
              <option value="dispatch">Dispatch</option>
              <option value="approval">Approval</option>
              <option value="internal_request">Internal Request</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : taskId ? 'Update Task' : 'Create Task'}
          </button>
        </div>
      </div>
    </form>
  );
}
```

#### 3.3 Task Detail Component

**File:** `src/components/tasks/TaskDetail.tsx`

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

interface TaskActivity {
  id: string;
  user_id: string;
  action: string;
  created_at: string;
  user: { full_name: string };
}

interface TaskComment {
  id: string;
  user_id: string;
  content: string;
  is_progress_update: boolean;
  created_at: string;
  user: { full_name: string; email: string; avatar_url: string | null };
}

export default function TaskDetail() {
  const params = useParams();
  const [task, setTask] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  const [newComment, setNewComment] = useState('');
  const [isProgressUpdate, setIsProgressUpdate] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [params.id]);

  const fetchTask = async () => {
    try {
      const res = await fetch(`/api/task-manager/tasks/${params.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setTask(data.task);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!newComment.trim()) return;

    try {
      const res = await fetch(`/api/task-manager/tasks/${params.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newComment, is_progress_update }),
      });

      if (!res.ok) throw new Error('Failed to add comment');

      setNewComment('');
      fetchTask();
    } catch (err: any) {
      alert(err.message);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700">{error}</div>;
  if (!task) return <div className="text-center py-8">Task not found</div>;

  const priorityColors: Record<string, string> = {
    Immediate: 'bg-red-100 text-red-700',
    High: 'bg-orange-100 text-orange-700',
    Important: 'bg-yellow-100 text-yellow-700',
    Normal: 'bg-blue-100 text-blue-700',
    Low: 'bg-green-100 text-green-700',
  };

  const statusColors: Record<string, string> = {
    Open: 'bg-gray-100 text-gray-700',
    'In Progress': 'bg-blue-100 text-blue-700',
    Blocked: 'bg-red-100 text-red-700',
    Completed: 'bg-green-100 text-green-700',
    Closed: 'bg-gray-200 text-gray-500',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm text-gray-500">{task.task_id_text}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[task.priority_name] || 'bg-gray-100'}`}>
                {task.priority_name}
              </span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[task.status_name] || 'bg-gray-100'}`}>
                {task.status_name}
              </span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                {task.department_name}
              </span>
              {task.type_name && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {task.type_name}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{task.title}</h1>
            <p className="text-gray-600 mt-2 whitespace-pre-wrap">{task.description}</p>
          </div>
          
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Edit
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Assign
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Complete
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
              Close
            </button>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div>
            <span className="text-sm text-gray-500">Created by</span>
            <p className="font-medium">{task.creator?.full_name || 'Unknown'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Assigned to</span>
            <p className="font-medium">{task.assignee?.full_name || 'Unassigned'}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Due Date</span>
            <p className="font-medium">
              {task.due_date 
                ? new Date(task.due_date).toLocaleDateString('en-IN', { 
                    day: 'numeric', month: 'short', year: 'numeric' 
                  })
                : 'No due date'}
            </p>
          </div>
          <div>
            <span className="text-sm text-gray-500">SLA</span>
            <p className="font-medium">
              {task.expected_duration || 'Not set'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'comments', label: 'Comments', icon: '💬' },
            { id: 'activity', label: 'Activity', icon: '📋' },
            { id: 'attachments', label: 'Attachments', icon: '📎' },
            { id: 'spectators', label: 'Spectators', icon: '👁' },
            { id: 'related', label: 'Related', icon: '🔗' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2 px-1 text-sm font-medium ${
                activeTab === tab.id 
                  ? 'border-b-2 border-blue-600 text-blue-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">
            {isProgressUpdate ? 'Progress Updates' : 'Comments'}
          </h3>

          <div className="space-y-4 mb-6">
            {task.comments?.map((comment: TaskComment) => (
              <div key={comment.id} className="flex gap-3">
                {comment.user.avatar_url && (
                  <img 
                    src={comment.user.avatar_url} 
                    alt={comment.user.full_name}
                    className="w-10 h-10 rounded-full"
                  />
                )}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm">{comment.user.full_name}</span>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.created_at).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                  {comment.is_progress_update && (
                    <span className="text-xs text-blue-600 font-medium mt-1 inline-block">
                      ✓ Progress update
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              rows={3}
              placeholder="Add a comment or progress update..."
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isProgressUpdate}
                onChange={(e) => setIsProgressUpdate(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-gray-600">Mark as progress update (appears in activity)</span>
            </label>
            <button
              onClick={addComment}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Add Comment
            </button>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h3 className="text-lg font-semibold mb-4">Activity Timeline</h3>
          <div className="space-y-4">
            {task.activity?.map((activity: TaskActivity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold">
                  {activity.action[0]}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {activity.user.full_name} {activity.action}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(activity.created_at).toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

### PHASE 4: ADMIN INTERFACE

#### 4.1 Task Manager Admin Page

**File:** `src/app/admin/tasks/page.tsx`

```tsx
'use client';

import TaskList from '@/components/tasks/TaskList';
import Link from 'next/link';

export default function TasksPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Task Manager</h1>
          <Link
            href="/admin/tasks/new"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            + New Task
          </Link>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <TaskList />
        </div>
      </div>
    </div>
  );
}
```

#### 4.2 Create Task Page

**File:** `src/app/admin/tasks/new/page.tsx`

```tsx
'use client';

import TaskForm from '@/components/tasks/TaskForm';

export default function NewTaskPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Create New Task</h1>
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <TaskForm />
        </div>
      </div>
    </div>
  );
}
```

#### 4.3 Task Detail Page

**File:** `src/app/admin/tasks/[id]/page.tsx`

```tsx
'use client';

import TaskDetail from '@/components/tasks/TaskDetail';

export default function TaskDetailPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <TaskDetail />
      </div>
    </div>
  );
}
```

---

### PHASE 5: NAVIGATION INTEGRATION

#### 5.1 Add to Admin Navigation

**File:** `src/components/layout/AccountDrawer.tsx`

Add to the existing navigation structure (find the appropriate place in the admin section):

```tsx
// Add to navigation items array
{
  href: '/admin/tasks',
  label: 'Tasks',
  icon: ClipboardList, // or Calendar, or CheckSquare from lucide-react
  roles: ['super_admin', 'admin', 'manager', 'staff'],
}
```

---

### PHASE 6: NOTIFICATION INTEGRATION

#### 6.1 Task Notification Trigger

Create a trigger function in Supabase (run as migration):

```sql
-- Task notification trigger
CREATE OR REPLACE FUNCTION public.fn_notify_task_assignee()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_task_title text;
  v_assignee_id uuid;
BEGIN
  -- Get task details
  SELECT title, assignee_id INTO v_task_title, v_assignee_id
  FROM public.tasks
  WHERE id = NEW.task_id;

  IF v_assignee_id IS NULL OR v_task_title IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create notification for assignee
  INSERT INTO public.notifications (
    user_id,
    title,
    message,
    category,
    reference_type,
    reference_id,
    actor_id
  ) VALUES (
    v_assignee_id,
    'New Task Assigned to You',
    'Task "' || v_task_title || '" has been assigned to you',
    'TASK_ASSIGNMENT',
    'task',
    NEW.task_id::text,
    NEW.created_by
  );

  RETURN NEW;
END;
$$;

-- Attach to task_assignments
DROP TRIGGER IF EXISTS trg_notify_task_assignee ON public.task_assignments;
CREATE TRIGGER trg_notify_task_assignee
  AFTER INSERT ON public.task_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_notify_task_assignee();
```

---

### FILES STRUCTURE

```
src/
├── app/
│   ├── admin/
│   │   └── tasks/
│   │       ├── page.tsx          # Task list
│   │       ├── new/
│   │       │   └── page.tsx      # Create task form
│   │       └── [id]/
│   │           └── page.tsx      # Task detail
│   │
│   ├── api/
│   │   └── task-manager/
│   │       ├── route.ts          # GET/POST /api/task-manager/tasks
│   │       ├── staff/
│   │       │   └── route.ts      # GET /api/task-manager/staff (for dropdown)
│   │       └── upload/
│   │           └── route.ts      # POST /api/task-manager/upload
│   │       └── [id]/
│   │           ├── route.ts      # GET/PUT /api/task-manager/tasks/[id]
│   │           └── comments/
│   │               └── route.ts  # POST /api/task-manager/tasks/[id]/comments
│   │           └── spectators/
│   │               └── route.ts  # POST /api/task-manager/tasks/[id]/spectators
│   │
│   └── api/
│       └── internal-chat/
│           └── upload/
│               └── route.ts      # Existing Messenger upload (DO NOT MODIFY)
│
supabase/
├── migrations/
│   └── 0098_task_manager_schema.sql
│
src/
├── components/
│   └── tasks/
│       ├── TaskList.tsx
│       ├── TaskForm.tsx
│       └── TaskDetail.tsx
│
```

---

### DATABASE MIGRATION FILE

**File:** `supabase/migrations/0098_task_manager_schema.sql`

(Full SQL provided in Phase 1 section above)

---

### IMPLEMENTATION CHECKLIST

#### Phase 1: Database Schema
- [ ] Create `supabase/migrations/0098_task_manager_schema.sql`
- [ ] Run migration
- [ ] Verify all tables created
- [ ] Verify RLS policies work
- [ ] Seed default priorities, statuses, types

#### Phase 2: Backend API
- [ ] Create `src/app/api/task-manager/upload/route.ts`
- [ ] Create `src/app/api/task-manager/tasks/route.ts` (GET/POST)
- [ ] Create `src/app/api/task-manager/tasks/[id]/route.ts` (GET/PUT)
- [ ] Create `src/app/api/task-manager/tasks/[id]/comments/route.ts`
- [ ] Create `src/app/api/task-manager/tasks/[id]/spectators/route.ts`
- [ ] Create `src/app/api/task-manager/staff/route.ts`
- [ ] Test all endpoints with curl/Postman

#### Phase 3: Frontend Components
- [ ] Create `src/components/tasks/TaskList.tsx`
- [ ] Create `src/components/tasks/TaskForm.tsx`
- [ ] Create `src/components/tasks/TaskDetail.tsx`
- [ ] Test components in browser

#### Phase 4: Admin Pages
- [ ] Create `src/app/admin/tasks/page.tsx`
- [ ] Create `src/app/admin/tasks/new/page.tsx`
- [ ] Create `src/app/admin/tasks/[id]/page.tsx`
- [ ] Add navigation link in `AccountDrawer.tsx`

#### Phase 5: Notifications
- [ ] Add notification trigger function
- [ ] Test notification delivery

#### Phase 6: Testing
- [ ] Manual testing (all roles)
- [ ] Regression testing (existing Messenger, website)
- [ ] Security testing (RLS, auth, access control)

---

### CRITICAL SECURITY NOTES

1. **USE MESSENGER CLOUDINARY ACCOUNT ONLY**
   - Cloud Name: `io1kkukg` (env: `NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME`)
   - API Key: 522811694238476
   - API Secret: `4InB0lp_J8h_NUwTCp3NVBXalOs`

2. **NEVER USE WEBSITE CLOUDINARY** for Task Manager attachments
   - Website uses: `tfelmupe` account

3. **ALWAYS VALIDATE STAFF ROLE**
   - Check `role != 'customer'` on every endpoint
   - Use `getServiceClient()` for backend operations

4. **ALWAYS VALIDATE ACCESS**
   - Staff can only see tasks in their department
   - Staff can only see tasks assigned to them
   - Staff can only update tasks they own or are assigned to

5. **USE SIGNED CLOUDINARY UPLOADS** (same pattern as Messenger)
   - SHA-1 signature from env vars
   - Folder: `ruhvi/task_attachments`

6. **Soft Delete** on all tables with `deleted_at` column

7. **Audit Trail** via `task_activity` table

---

### COMPATIBILITY RISKS

1. **Existing `src/lib/imageService.ts`** - Uses website Cloudinary (`tfelmupe`). Do NOT modify this file. Create separate upload route for Task Manager.

2. **Existing Messenger API** - `src/app/api/internal-chat/upload/route.ts` uses Messenger Cloudinary. Do NOT modify this file.

3. **Cloudinary Env Vars** - Task Manager needs `NEXT_PUBLIC_CHAT_CLOUDINARY_*` vars, not `NEXT_PUBLIC_CLOUDINARY_*` vars.

4. **Staff Department Column** - The `department` column in `users` table is being used (see migration 0092). Task Manager uses `department_id` FK to `departments` table.

5. **Notification System** - Existing `notifications` table uses category='CHAT'. Task Manager uses category='TASK_*' or 'TASK_ASSIGNMENT'.

---

### NEXT STEPS

1. Review this implementation plan
2. Provide feedback on any required changes
3. Approve implementation to proceed with Phase 1 (Database Schema)
