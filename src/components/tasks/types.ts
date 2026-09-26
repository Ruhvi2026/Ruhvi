export interface TaskPriority {
  id: string;
  name: string;
  level: number;
  color: string;
  created_at: string;
}

export interface TaskStatus {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
  color: string;
  created_at: string;
}

export interface TaskType {
  id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface TaskSLA {
  id: string;
  task_id: string;
  expected_duration_interval: string;
  default_duration: string;
  sla_level: string;
  created_at: string;
}

export interface TaskUser {
  id: string;
  full_name: string;
  email: string;
  department: string | null;
  avatar_url: string | null;
  role?: string;
}

export interface TaskDepartment {
  id: string;
  name: string;
  description: string | null;
}

export interface TaskOrder {
  id: string;
  order_number: string;
}

export interface TaskProduct {
  id: string;
  name: string;
  slug: string;
}

export interface TaskTicket {
  id: string;
  ticket_number: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  status: string;
  assigned_user?: TaskUser;
  assigned_by_user?: TaskUser;
}

export interface TaskSpectator {
  id: string;
  task_id: string;
  user_id: string;
  added_by: string;
  added_at: string;
  spectator?: TaskUser;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  is_progress_update: boolean;
  created_at: string;
  updated_at: string;
  user?: TaskUser;
}

export interface TaskAttachment {
  id: string;
  task_id: string;
  message_id: string | null;
  cloudinary_public_id: string;
  cloudinary_url: string;
  resource_type: 'image' | 'video' | 'raw';
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  uploader_id: string;
  created_at: string;
}

export interface TaskActivity {
  id: string;
  task_id: string;
  user_id: string | null;
  action: string;
  old_value: Record<string, any> | null;
  new_value: Record<string, any> | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: TaskUser;
}

export interface TaskChecklist {
  id: string;
  task_id: string;
  title: string;
  sort_order: number;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
  completed_by_user?: TaskUser;
}

export interface TaskDependency {
  id: string;
  task_id: string;
  depends_on_task_id: string;
  status: 'waiting' | 'blocked' | 'ready';
  created_at: string;
}

export interface TaskRecurrence {
  id: string;
  task_id: string;
  recurrence_pattern: string;
  recurrence_interval: number;
  recurrence_days: string[] | null;
  recurrence_end_date: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  task_id_text: string | null;
  title: string;
  description: string;
  created_by: string;
  assignee_id: string | null;
  department_id: string | null;
  priority_id: string;
  type_id: string | null;
  sla_id: string | null;
  start_time: string | null;
  expected_duration: string | null;
  due_date: string | null;
  due_time: string | null;
  status_id: string;
  related_order_id: string | null;
  related_product_id: string | null;
  related_ticket_id: string | null;
  department_name: string | null;
  tags: string[];
  is_recurring: boolean;
  parent_task_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  closed_at: string | null;
  deleted_at: string | null;

  // Relations
  assignee?: TaskUser;
  creator?: TaskUser;
  priority_name?: TaskPriority;
  status_name?: TaskStatus;
  type_name?: TaskType;
  department_name?: TaskDepartment;
  order?: TaskOrder;
  product?: TaskProduct;
  ticket?: TaskTicket;

  // Aggregates
  assignments?: TaskAssignment[];
  spectators?: TaskSpectator[];
  comments?: TaskComment[];
  activity?: TaskActivity[];
  checklists?: TaskChecklist[];
  attachments?: TaskAttachment[];
}

export interface TaskListResponse {
  tasks: Task[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  department?: string;
  assignee?: string;
  creator?: string;
  due_before?: string;
  due_after?: string;
  search?: string;
  my_tasks?: boolean;
  assigned_by_me?: boolean;
  due_today?: boolean;
  overdue?: boolean;
  supporting?: boolean;
  spectating?: boolean;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  assignee_id?: string;
  department_id?: string;
  priority_id?: string;
  type_id?: string;
  due_date?: string;
  due_time?: string;
  start_time?: string;
  expected_duration?: string;
  related_order_id?: string;
  related_product_id?: string;
  related_ticket_id?: string;
  tags?: string[];
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status_id?: string;
  priority_id?: string;
  assignee_id?: string | null;
  department_id?: string | null;
  due_date?: string | null;
  due_time?: string | null;
  expected_duration?: string | null;
  start_time?: string | null;
  type_id?: string | null;
  tags?: string[];
}

export interface DashboardStats {
  role: 'admin' | 'manager' | 'staff';
  // Admin
  total?: number;
  open?: number;
  in_progress?: number;
  completed?: number;
  overdue?: number;
  sla_breached?: number;
  completed_today?: number;
  department_workload?: Record<
    string,
    { total: number; open: number; overdue: number }
  >;
  staff_workload?: Record<
    string,
    { total: number; open: number; overdue: number }
  >;
  // Manager
  department_tasks?: number;
  pending_assignment?: number;
  unassigned?: number;
  high_priority?: number;
  // Staff
  my_open_tasks?: number;
  due_today?: number;
  due_soon?: number;
  supporting?: number;
  spectating?: number;
}
