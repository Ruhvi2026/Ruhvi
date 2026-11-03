jest.mock('server-only', () => ({}));

import {
  handleWorkerDirectChat,
  getWorkerDirectChatHistory,
} from '../worker-chat-service';
import { ConversationRepository } from '../../conversations/repository';

// Mock ConversationRepository
jest.mock('../../conversations/repository', () => ({
  ConversationRepository: {
    getOrCreateWorkerConversation: jest.fn().mockResolvedValue({
      id: 'conv_worker_123',
      userId: 'test_admin_user',
      workerId: 'worker_marketing',
      title: 'Direct Chat: Growth Marketing',
      type: 'worker_direct',
      createdAt: '2026-11-03T10:00:00Z',
      updatedAt: '2026-11-03T10:00:00Z',
    }),
    appendMessage: jest.fn().mockImplementation((input) =>
      Promise.resolve({
        id: `msg_${Date.now()}`,
        conversationId: input.conversationId,
        senderType: input.senderType,
        senderId: input.senderId,
        workerId: input.workerId,
        content: input.content,
        contentType: input.contentType,
        createdAt: '2026-11-03T10:00:00Z',
      })
    ),
    getConversationWithMessages: jest.fn().mockResolvedValue({
      conversation: {
        id: 'conv_worker_123',
        userId: 'test_admin_user',
        workerId: 'worker_marketing',
        title: 'Direct Chat: Growth Marketing',
        type: 'worker_direct',
      },
      messages: [
        {
          id: 'msg_1',
          senderType: 'user',
          content: 'Audit current Meta ad ROAS',
          createdAt: '2026-11-03T10:00:00Z',
        },
        {
          id: 'msg_2',
          senderType: 'worker',
          content: 'ROAS is currently at 3.4x on 22K Gold Choker collection.',
          createdAt: '2026-11-03T10:01:00Z',
        },
      ],
    }),
  },
}));

// Mock GoogleGenerativeAI
jest.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: jest.fn().mockResolvedValue({
          response: {
            text: () =>
              'ROAS is balanced. I recommend scaling festive ad set by 15%.',
          },
        }),
      }),
    })),
  };
});

describe('Worker Direct Chat Service (worker-chat-service)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('executes direct chat turn with canonical worker ID', async () => {
    const result = await handleWorkerDirectChat(
      'admin_user_1',
      'worker_marketing',
      'Review current campaign performance'
    );

    expect(result).toBeDefined();
    expect(result.workerId).toBe('worker_marketing');
    expect(result.workerName).toBe('Marketing Worker');
    expect(result.response).toContain('ROAS is balanced');
    expect(ConversationRepository.appendMessage).toHaveBeenCalledTimes(2); // 1 user + 1 worker
  });

  it('resolves worker alias seamlessly', async () => {
    const result = await handleWorkerDirectChat(
      'admin_user_1',
      'marketing',
      'What are our active campaigns?'
    );

    expect(result).toBeDefined();
    expect(result.workerId).toBe('worker_marketing');
    expect(result.workerName).toBe('Marketing Worker');
  });

  it('throws an error for non-existent worker IDs', async () => {
    await expect(
      handleWorkerDirectChat(
        'admin_user_1',
        'unknown_specialist_xyz' as any,
        'Hello'
      )
    ).rejects.toThrow(/not found in registry/);
  });

  it('fetches worker direct chat history and specialist metadata', async () => {
    const history = await getWorkerDirectChatHistory(
      'admin_user_1',
      'worker_marketing'
    );

    expect(history.conversationId).toBe('conv_worker_123');
    expect(history.workerId).toBe('worker_marketing');
    expect(history.workerName).toBe('Marketing Worker');
    expect(history.messages.length).toBe(2);
    expect(history.responsibilities.length).toBeGreaterThan(0);
    expect(history.tools.length).toBeGreaterThan(0);
  });
});
