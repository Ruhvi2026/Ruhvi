export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  filename: string;
  size: number;
  contentType: string;
  url?: string;
}

export interface EmailMessage {
  id: string;
  mailboxId?: string;
  direction: 'inbound' | 'outbound';
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  snippet: string;
  bodyText?: string;
  bodyHtml?: string;
  date: string;
  createdAt: number;
  read: boolean;
  starred: boolean;
  status?: string;
  threadId?: string;
  attachments?: EmailAttachment[];
}

export interface EmailThread {
  id: string;
  subject: string;
  participants: EmailAddress[];
  messages: EmailMessage[];
  lastMessageDate: string;
  unread: boolean;
  starred: boolean;
  messageCount: number;
  snippet: string;
}

export type MailboxFolder = 'inbox' | 'sent' | 'starred' | 'drafts' | 'all';

export interface ComposeEmailPayload {
  from: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
}

export interface AISummaryResponse {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment?: 'positive' | 'neutral' | 'urgent' | 'negative';
}

export interface AIReplySuggestion {
  tone: 'professional' | 'quick' | 'clarify';
  label: string;
  body: string;
}

export interface RuhMailbox {
  id: string;
  local_part: string;
  display_name: string;
  domain: string;
  mailbox_type: 'personal' | 'shared' | 'alias';
  email: string;
  is_active: boolean;
  created_at: number;
}

export interface RuhMailSignature {
  id: string;
  mailbox_id?: string;
  staff_uid?: string;
  name: string;
  html: string;
  is_default: boolean;
}

export interface RuhMailLabel {
  id: string;
  name: string;
  color: string;
  created_at: number;
}

export type RoutingConditionField =
  'from' | 'to' | 'subject' | 'has_attachment';
export type RoutingConditionOp = 'contains' | 'equals' | 'starts_with';
export type RoutingAction =
  'forward' | 'label' | 'assign' | 'auto_reply' | 'reject';

export interface RuhMailRoutingRule {
  id: string;
  priority: number;
  condition_field: RoutingConditionField;
  condition_op: RoutingConditionOp;
  condition_value: string;
  action: RoutingAction;
  action_value: string;
  is_active: boolean;
  created_at: number;
}

export interface RuhMailMember {
  id: string;
  mailbox_id: string;
  staff_uid: string;
  role: 'owner' | 'member' | 'viewer';
  can_send: boolean;
  can_delete: boolean;
  added_at: number;
}

export interface RuhMailCalendarEvent {
  id: string;
  mailbox_id?: string;
  staff_uid: string;
  title: string;
  description?: string;
  location?: string;
  start_time: number;
  end_time: number;
  all_day: boolean;
  attendees?: string[];
  status: 'confirmed' | 'tentative' | 'cancelled';
  ics_uid?: string;
  created_at: number;
}

export interface RuhMailBookingPage {
  id: string;
  staff_uid: string;
  slug: string;
  title: string;
  description?: string;
  duration_minutes: number;
  buffer_minutes: number;
  available_days: string[];
  available_start: string;
  available_end: string;
  timezone: string;
  is_active: boolean;
  created_at: number;
}

export interface RuhMailBooking {
  id: string;
  page_id: string;
  guest_name: string;
  guest_email: string;
  start_time: number;
  end_time: number;
  notes?: string;
  status: 'confirmed' | 'cancelled';
  created_at: number;
}

export interface RuhMailDriveFolder {
  id: string;
  name: string;
  owner_uid: string;
  parent_id?: string;
  created_at: number;
}

export interface RuhMailDriveFile {
  id: string;
  name: string;
  owner_uid: string;
  r2_key: string;
  file_size: number;
  content_type: string;
  folder_id?: string;
  is_public: boolean;
  created_at: number;
}
