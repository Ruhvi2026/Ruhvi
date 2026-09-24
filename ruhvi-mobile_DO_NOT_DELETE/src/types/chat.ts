// src/types/chat.ts
// TypeScript types for the Ruhvi Internal Staff Chat system.
// These types mirror the Supabase DB schema (migration 0085).

export type ConversationType = 'direct' | 'group' | 'broadcast';
export type MessageType = 'text' | 'attachment' | 'system' | 'entity_ref';
export type EntityRefType = 'order' | 'support_ticket' | 'product';
export type CloudinaryResourceType = 'image' | 'video' | 'raw';

/** Lightweight staff profile used inside chat UI */
export interface ChatUserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string;
  avatar_url?: string | null;
  department?: string | null;
  department_id?: string | null;
}

/** chat_conversations row */
export interface ChatConversation {
  id: string;
  type: ConversationType;
  group_name: string | null;
  group_topic: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  archived_at: string | null;
  deleted_at: string | null;
  group_avatar_url: string | null;
  allow_replies?: boolean;
  // Joined fields (not in DB directly, added by query)
  members?: ChatMember[];
  last_message?: ChatMessage | null;
  unread_count?: number;
  other_user?: ChatUserProfile; // for direct chats
}

/** chat_conversation_members row */
export interface ChatMember {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  is_admin: boolean;
  last_read_at: string | null;
  // Joined
  user?: ChatUserProfile;
}

/** chat_attachments row */
export interface ChatAttachment {
  id: string;
  message_id: string;
  cloudinary_public_id: string;
  cloudinary_url: string;
  resource_type: CloudinaryResourceType;
  file_name: string;
  mime_type: string | null;
  file_size: number | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  created_at: string;
}

export interface ChatReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: ChatUserProfile;
}

/** chat_message_mentions row */
export interface ChatMention {
  id: string;
  message_id: string;
  mentioned_user_id: string;
  created_at: string;
  user?: ChatUserProfile;
}

/** chat_entity_references row */
export interface ChatEntityRef {
  id: string;
  message_id: string;
  entity_type: EntityRefType;
  entity_id: string;
  display_label: string | null;
  created_at: string;
}

/** chat_messages row (full, with joins) */
export interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: MessageType;
  text_content: string | null;
  reply_to_id: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_edited: boolean;
  system_action: string | null;
  pinned_at?: string | null;
  pinned_by?: string | null;
  // Joined
  sender?: ChatUserProfile;
  attachments?: ChatAttachment[];
  chat_attachments?: ChatAttachment[];
  mentions?: ChatMention[];
  entity_refs?: ChatEntityRef[];
  reactions?: ChatReaction[];
  reply_to?: Pick<ChatMessage, 'id' | 'text_content' | 'sender_id' | 'message_type' | 'sender'>;
  read_by?: string[]; // array of user_ids
  uploading?: boolean;
  chat_message_reads?: { user_id: string; read_at: string }[];
}

/** Payload for sending a new message */
export interface SendMessagePayload {
  conversation_id: string;
  message_type: MessageType;
  text_content?: string;
  reply_to_id?: string;
  attachments?: Omit<ChatAttachment, 'id' | 'message_id' | 'created_at'>[];
  mentions?: string[]; // user_ids
  entity_refs?: Omit<ChatEntityRef, 'id' | 'message_id' | 'created_at'>[];
}

/** Payload for creating a group conversation */
export interface CreateGroupPayload {
  group_name: string;
  group_topic?: string;
  member_ids: string[]; // user_ids (excluding self, backend adds creator)
}

/** Admin audit log */
export interface ChatAdminAuditLog {
  id: string;
  admin_user_id: string;
  action: string;
  conversation_id: string | null;
  target_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

/** Realtime event types */
export type ChatRealtimeEvent =
  | { type: 'new_message'; payload: ChatMessage }
  | { type: 'message_updated'; payload: ChatMessage }
  | { type: 'conversation_updated'; payload: ChatConversation }
  | { type: 'member_added'; payload: ChatMember }
  | { type: 'member_left'; payload: ChatMember };
