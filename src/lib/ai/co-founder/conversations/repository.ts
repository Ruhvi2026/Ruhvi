// src/lib/ai/co-founder/conversations/repository.ts
//
// Persistent Storage Repository for Co-Founder Multi-Conversations and Dedicated Worker Chats.

import 'server-only';
import { getServiceClient } from '@/lib/supabase/service';
import {
  CoFounderConversation,
  CoFounderMessage,
  CreateConversationInput,
  AppendMessageInput,
} from './types';
import { WorkerId } from '../workers/types';

export class ConversationRepository {
  private static getClient() {
    return getServiceClient();
  }

  /**
   * Creates a new conversation thread.
   */
  static async createConversation(
    input: CreateConversationInput
  ): Promise<CoFounderConversation> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('co_founder_conversations')
      .insert({
        user_id: input.userId,
        conversation_type: input.conversationType,
        worker_id: input.workerId || null,
        title:
          input.title ||
          (input.conversationType === 'worker'
            ? `Worker: ${input.workerId}`
            : 'New Conversation'),
        summary: input.summary || null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create conversation: ${error.message}`);
    }

    return this.mapConversationRow(data);
  }

  /**
   * Lists conversations for a specific user and conversation type.
   */
  static async listConversations(
    userId: string,
    conversationType: 'cofounder' | 'worker' = 'cofounder',
    limit = 50
  ): Promise<CoFounderConversation[]> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('co_founder_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_type', conversationType)
      .order('last_message_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to list conversations: ${error.message}`);
    }

    return (data || []).map(this.mapConversationRow);
  }

  /**
   * Retrieves conversation details and sequential messages.
   */
  static async getConversationWithMessages(
    conversationId: string,
    userId: string,
    messageLimit = 50
  ): Promise<{
    conversation: CoFounderConversation;
    messages: CoFounderMessage[];
  }> {
    const supabase = this.getClient();

    // 1. Fetch conversation
    const { data: convData, error: convError } = await supabase
      .from('co_founder_conversations')
      .select('*')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (convError || !convData) {
      throw new Error('Conversation not found or access denied');
    }

    // 2. Fetch messages ordered chronologically
    const { data: msgData, error: msgError } = await supabase
      .from('co_founder_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(messageLimit);

    if (msgError) {
      throw new Error(`Failed to load messages: ${msgError.message}`);
    }

    return {
      conversation: this.mapConversationRow(convData),
      messages: (msgData || []).map(this.mapMessageRow),
    };
  }

  /**
   * Appends a message to a conversation and updates its last_message_at timestamp.
   */
  static async appendMessage(
    input: AppendMessageInput
  ): Promise<CoFounderMessage> {
    const supabase = this.getClient();

    // 1. Insert message
    const { data: msgData, error: msgError } = await supabase
      .from('co_founder_messages')
      .insert({
        conversation_id: input.conversationId,
        sender_type: input.senderType,
        sender_id: input.senderId || null,
        worker_id: input.workerId || null,
        content: input.content,
        content_type: input.contentType || 'text',
        attachments: input.attachments || [],
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (msgError) {
      throw new Error(`Failed to append message: ${msgError.message}`);
    }

    // 2. Update conversation last_message_at & updated_at
    await supabase
      .from('co_founder_conversations')
      .update({
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.conversationId);

    return this.mapMessageRow(msgData);
  }

  /**
   * Renames a conversation title.
   */
  static async updateConversationTitle(
    conversationId: string,
    userId: string,
    title: string
  ): Promise<CoFounderConversation> {
    const supabase = this.getClient();

    const { data, error } = await supabase
      .from('co_founder_conversations')
      .update({
        title,
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update conversation title: ${error.message}`);
    }

    return this.mapConversationRow(data);
  }

  /**
   * Deletes a conversation and its messages.
   * Does NOT touch global business memories or other threads.
   */
  static async deleteConversation(
    conversationId: string,
    userId: string
  ): Promise<boolean> {
    const supabase = this.getClient();

    const { error } = await supabase
      .from('co_founder_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }

    return true;
  }

  /**
   * Resolves or creates the single persistent 1:1 conversation for a specific worker.
   */
  static async getOrCreateWorkerConversation(
    userId: string,
    workerId: WorkerId
  ): Promise<CoFounderConversation> {
    const supabase = this.getClient();

    // Check existing
    const { data: existing } = await supabase
      .from('co_founder_conversations')
      .select('*')
      .eq('user_id', userId)
      .eq('conversation_type', 'worker')
      .eq('worker_id', workerId)
      .maybeSingle();

    if (existing) {
      return this.mapConversationRow(existing);
    }

    // Create new dedicated worker conversation
    return this.createConversation({
      userId,
      conversationType: 'worker',
      workerId,
      title: `Direct: ${workerId}`,
    });
  }

  private static mapConversationRow(row: any): CoFounderConversation {
    return {
      id: row.id,
      userId: row.user_id,
      conversationType: row.conversation_type,
      workerId: row.worker_id,
      title: row.title,
      summary: row.summary,
      lastMessageAt: row.last_message_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private static mapMessageRow(row: any): CoFounderMessage {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderType: row.sender_type,
      senderId: row.sender_id,
      workerId: row.worker_id,
      content: row.content,
      contentType: row.content_type,
      attachments: row.attachments || [],
      metadata: row.metadata || {},
      createdAt: row.created_at,
    };
  }
}
