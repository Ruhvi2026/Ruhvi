// src/lib/ai/co-founder/conversations/types.ts
//
// Typed contracts for AI Co-Founder Multi-Conversation Threads and Dedicated Worker Chats.

import { WorkerId } from '../workers/types';

export type ConversationType = 'cofounder' | 'worker';

export type MessageSenderType =
  'user' | 'cofounder' | 'worker' | 'tool' | 'system';

export type MessageContentType =
  | 'text'
  | 'voice_transcript'
  | 'image'
  | 'tool_call'
  | 'tool_result'
  | 'structured';

export interface ConversationAttachment {
  type: 'image' | 'file' | 'audio';
  url: string;
  publicId?: string;
  name?: string;
  size?: number;
  mimeType?: string;
}

export interface CoFounderConversation {
  id: string;
  userId: string;
  conversationType: ConversationType;
  workerId?: WorkerId | null;
  title: string;
  summary?: string | null;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CoFounderMessage {
  id: string;
  conversationId: string;
  senderType: MessageSenderType;
  senderId?: string | null;
  workerId?: WorkerId | null;
  content: string;
  contentType: MessageContentType;
  attachments?: ConversationAttachment[];
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface CreateConversationInput {
  userId: string;
  conversationType: ConversationType;
  workerId?: WorkerId | null;
  title?: string;
  summary?: string;
}

export interface AppendMessageInput {
  conversationId: string;
  senderType: MessageSenderType;
  senderId?: string | null;
  workerId?: WorkerId | null;
  content: string;
  contentType?: MessageContentType;
  attachments?: ConversationAttachment[];
  metadata?: Record<string, any>;
}

export interface ConversationFilter {
  userId: string;
  conversationType?: ConversationType;
  workerId?: WorkerId;
  limit?: number;
  cursor?: string;
}

export interface UpdateConversationInput {
  title?: string;
  summary?: string;
}

export interface DeleteConversationResult {
  success: boolean;
  conversationId: string;
  deletedMessagesCount?: number;
  error?: string;
}

export interface GetConversationResult {
  conversation: CoFounderConversation;
  messages: CoFounderMessage[];
}
