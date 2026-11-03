import { ConversationRepository } from '../repository';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Co-Founder ConversationRepository', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('createConversation', () => {
    it('creates a new conversation thread and returns mapped object', async () => {
      const mockRow = {
        id: 'conv_123',
        user_id: 'user_admin_1',
        conversation_type: 'cofounder',
        worker_id: null,
        title: 'Q4 Revenue Strategy',
        summary: null,
        last_message_at: '2026-11-03T10:00:00.000Z',
        created_at: '2026-11-03T10:00:00.000Z',
        updated_at: '2026-11-03T10:00:00.000Z',
      };

      mockSupabase.single.mockResolvedValueOnce({ data: mockRow, error: null });

      const conv = await ConversationRepository.createConversation({
        userId: 'user_admin_1',
        conversationType: 'cofounder',
        title: 'Q4 Revenue Strategy',
      });

      expect(conv.id).toBe('conv_123');
      expect(conv.title).toBe('Q4 Revenue Strategy');
      expect(conv.conversationType).toBe('cofounder');

      expect(mockSupabase.from).toHaveBeenCalledWith(
        'co_founder_conversations'
      );
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'user_admin_1',
          conversation_type: 'cofounder',
          title: 'Q4 Revenue Strategy',
        })
      );
    });
  });

  describe('listConversations', () => {
    it('queries conversations filtered by user and type ordered by last_message_at desc', async () => {
      const mockRows = [
        {
          id: 'conv_1',
          user_id: 'user_admin_1',
          conversation_type: 'cofounder',
          title: 'Thread 1',
          last_message_at: '2026-11-03T12:00:00.000Z',
          created_at: '2026-11-03T10:00:00.000Z',
          updated_at: '2026-11-03T12:00:00.000Z',
        },
      ];

      mockSupabase.limit.mockResolvedValueOnce({ data: mockRows, error: null });

      const list = await ConversationRepository.listConversations(
        'user_admin_1',
        'cofounder'
      );

      expect(list).toHaveLength(1);
      expect(list[0].id).toBe('conv_1');
      expect(mockSupabase.order).toHaveBeenCalledWith('last_message_at', {
        ascending: false,
      });
    });
  });

  describe('getConversationWithMessages', () => {
    it('retrieves conversation and sequential message history', async () => {
      const mockConv = {
        id: 'conv_123',
        user_id: 'user_admin_1',
        conversation_type: 'cofounder',
        title: 'Thread 123',
        last_message_at: '2026-11-03T12:00:00.000Z',
        created_at: '2026-11-03T10:00:00.000Z',
        updated_at: '2026-11-03T12:00:00.000Z',
      };

      const mockMessages = [
        {
          id: 'msg_1',
          conversation_id: 'conv_123',
          sender_type: 'user',
          sender_id: 'user_admin_1',
          content: 'Audit competitor prices',
          content_type: 'text',
          attachments: [],
          metadata: {},
          created_at: '2026-11-03T10:01:00.000Z',
        },
        {
          id: 'msg_2',
          conversation_id: 'conv_123',
          sender_type: 'cofounder',
          content: 'Auditing 22K prices now...',
          content_type: 'text',
          attachments: [],
          metadata: {},
          created_at: '2026-11-03T10:01:05.000Z',
        },
      ];

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockConv,
        error: null,
      });
      mockSupabase.limit.mockResolvedValueOnce({
        data: mockMessages,
        error: null,
      });

      const result = await ConversationRepository.getConversationWithMessages(
        'conv_123',
        'user_admin_1'
      );

      expect(result.conversation.id).toBe('conv_123');
      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].content).toBe('Audit competitor prices');
      expect(result.messages[1].content).toBe('Auditing 22K prices now...');
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', {
        ascending: true,
      });
    });
  });

  describe('appendMessage', () => {
    it('appends message and updates conversation last_message_at timestamp', async () => {
      const mockMsgRow = {
        id: 'msg_new',
        conversation_id: 'conv_123',
        sender_type: 'user',
        sender_id: 'user_admin_1',
        content: 'New user prompt',
        content_type: 'text',
        attachments: [],
        metadata: {},
        created_at: '2026-11-03T12:30:00.000Z',
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockMsgRow,
        error: null,
      });
      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValueOnce({ data: null, error: null }),
      });

      const message = await ConversationRepository.appendMessage({
        conversationId: 'conv_123',
        senderType: 'user',
        senderId: 'user_admin_1',
        content: 'New user prompt',
      });

      expect(message.id).toBe('msg_new');
      expect(message.content).toBe('New user prompt');
      expect(mockSupabase.from).toHaveBeenCalledWith('co_founder_messages');
      expect(mockSupabase.from).toHaveBeenCalledWith(
        'co_founder_conversations'
      );
    });
  });

  describe('deleteConversation', () => {
    it('deletes conversation matching user_id', async () => {
      mockSupabase.delete.mockReturnValue({
        eq: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValueOnce({ error: null }),
        }),
      });

      const ok = await ConversationRepository.deleteConversation(
        'conv_123',
        'user_admin_1'
      );
      expect(ok).toBe(true);
    });
  });

  describe('getOrCreateWorkerConversation', () => {
    it('returns existing worker conversation if found', async () => {
      const mockWorkerConv = {
        id: 'conv_worker_seo',
        user_id: 'user_admin_1',
        conversation_type: 'worker',
        worker_id: 'worker_seo',
        title: 'Direct: worker_seo',
        last_message_at: '2026-11-03T10:00:00.000Z',
        created_at: '2026-11-03T10:00:00.000Z',
        updated_at: '2026-11-03T10:00:00.000Z',
      };

      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockWorkerConv,
        error: null,
      });

      const conv = await ConversationRepository.getOrCreateWorkerConversation(
        'user_admin_1',
        'worker_seo'
      );

      expect(conv.id).toBe('conv_worker_seo');
      expect(conv.workerId).toBe('worker_seo');
    });
  });
});
