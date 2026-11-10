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

export type MailboxFolder = 'inbox' | 'sent' | 'starred' | 'drafts';

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
