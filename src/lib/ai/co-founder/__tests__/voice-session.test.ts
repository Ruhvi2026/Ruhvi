import {
  VoiceSessionCoordinator,
  VoiceSessionState,
  AudioChunk,
} from '../voice-session';
import { writeCoFounderMemory } from '../memory';

// Mock dependencies
jest.mock('server-only', () => ({}));

jest.mock('../memory', () => ({
  writeCoFounderMemory: jest.fn(async (params) => ({
    success: true,
    memoryId: 'mock-memory-id',
  })),
}));

describe('VoiceSessionCoordinator (Step 8.2)', () => {
  const defaultUserId = 'admin-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Initial State & Configuration', () => {
    it('initializes with idle state and default config', () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });

      expect(coordinator.getState()).toBe('idle');
      expect(coordinator.getSessionId()).toMatch(/^voice-sess-/);
      expect(coordinator.getCurrentGenerationId()).toBe(0);
      expect(coordinator.getQueueLength()).toBe(0);
      expect(coordinator.getTurns()).toHaveLength(0);

      const telemetry = coordinator.getTelemetry();
      expect(telemetry.userId).toBe(defaultUserId);
      expect(telemetry.state).toBe('idle');
      expect(telemetry.totalTurns).toBe(0);
      expect(telemetry.interruptionsCount).toBe(0);
    });

    it('accepts custom configuration options', () => {
      const coordinator = new VoiceSessionCoordinator({
        sessionId: 'custom-session-999',
        userId: defaultUserId,
        roomName: 'co-founder-vip-room',
        userRole: 'super_admin',
        language: 'hi',
        maxQueueSize: 20,
        autoFlushOnInterrupt: true,
      });

      expect(coordinator.getSessionId()).toBe('custom-session-999');
      const telemetry = coordinator.getTelemetry();
      expect(telemetry.roomName).toBe('co-founder-vip-room');
    });
  });

  describe('2. State Machine Transitions', () => {
    it('allows valid state transitions and fires onStateChange', () => {
      const onStateChange = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId },
        { onStateChange }
      );

      expect(coordinator.canTransitionTo('user_speaking')).toBe(true);
      const res1 = coordinator.transitionTo('user_speaking');
      expect(res1).toBe(true);
      expect(coordinator.getState()).toBe('user_speaking');
      expect(onStateChange).toHaveBeenCalledWith('user_speaking', 'idle');

      const res2 = coordinator.transitionTo('agent_thinking');
      expect(res2).toBe(true);
      expect(coordinator.getState()).toBe('agent_thinking');

      const res3 = coordinator.transitionTo('agent_speaking');
      expect(res3).toBe(true);
      expect(coordinator.getState()).toBe('agent_speaking');

      const res4 = coordinator.transitionTo('idle');
      expect(res4).toBe(true);
      expect(coordinator.getState()).toBe('idle');
    });

    it('rejects invalid state transitions and notifies onError', () => {
      const onError = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId },
        { onError }
      );

      // Cannot jump from idle directly to interrupted
      expect(coordinator.canTransitionTo('interrupted')).toBe(false);
      const res = coordinator.transitionTo('interrupted');
      expect(res).toBe(false);
      expect(coordinator.getState()).toBe('idle');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining(
            "Cannot transition from 'idle' to 'interrupted'"
          ),
        })
      );
    });
  });

  describe('3. Turn Management & Speech Transitions', () => {
    it('manages user speaking to agent thinking turn cycle', () => {
      const onTurnStart = jest.fn();
      const onTurnComplete = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId },
        { onTurnStart, onTurnComplete }
      );

      // 1. User starts speaking
      const { interrupted, turn } =
        coordinator.startUserSpeaking('turn-user-1');
      expect(interrupted).toBe(false);
      expect(turn.role).toBe('user');
      expect(coordinator.getState()).toBe('user_speaking');
      expect(onTurnStart).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'turn-user-1' })
      );

      // 2. User finishes speaking
      const completedTurn = coordinator.stopUserSpeaking(
        'What are our top revenue drivers?'
      );
      expect(completedTurn).toBeDefined();
      expect(completedTurn?.state).toBe('completed');
      expect(completedTurn?.text).toBe('What are our top revenue drivers?');
      expect(completedTurn?.durationMs).toBeGreaterThanOrEqual(0);
      expect(onTurnComplete).toHaveBeenCalledWith(completedTurn);

      // Transitioned automatically to thinking
      expect(coordinator.getState()).toBe('agent_thinking');
    });

    it('manages agent speaking and completion cycle', () => {
      const onTurnStart = jest.fn();
      const onTurnComplete = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId },
        { onTurnStart, onTurnComplete }
      );

      coordinator.startUserSpeaking();
      coordinator.stopUserSpeaking('Hello');

      // Agent begins speaking
      const { generationId, turn } = coordinator.startAgentSpeaking(
        'Top drivers are Gold necklaces.'
      );
      expect(generationId).toBe(1);
      expect(turn.role).toBe('agent');
      expect(coordinator.getState()).toBe('agent_speaking');

      // Complete agent speaking
      const completedAgentTurn = coordinator.completeAgentSpeaking(
        'Top drivers are Gold necklaces and solitaire earrings.'
      );
      expect(completedAgentTurn?.state).toBe('completed');
      expect(completedAgentTurn?.text).toBe(
        'Top drivers are Gold necklaces and solitaire earrings.'
      );
      expect(coordinator.getState()).toBe('idle');
    });
  });

  describe('4. Interruption Protocol & Barge-In Handling', () => {
    it('triggers barge-in and flushes audio queue when user speaks while agent is speaking', () => {
      const onPlaybackFlush = jest.fn();
      const onTurnComplete = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId, autoFlushOnInterrupt: true },
        { onPlaybackFlush, onTurnComplete }
      );

      // Agent starts speaking
      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Detailed product analysis incoming...');

      // Enqueue some audio chunks
      coordinator.enqueueAudioChunk({
        id: 'chunk-1',
        data: 'audio-base64-1',
      });
      coordinator.enqueueAudioChunk({
        id: 'chunk-2',
        data: 'audio-base64-2',
      });
      expect(coordinator.getQueueLength()).toBe(2);

      // User interrupts
      const { interrupted, turn } =
        coordinator.startUserSpeaking('Wait, stop!');

      expect(interrupted).toBe(true);
      expect(turn.role).toBe('user');
      expect(coordinator.getState()).toBe('user_speaking');

      // Playback buffer must be flushed
      expect(coordinator.getQueueLength()).toBe(0);
      expect(onPlaybackFlush).toHaveBeenCalledWith(1, 'barge_in');

      const telemetry = coordinator.getTelemetry();
      expect(telemetry.interruptionsCount).toBe(1);
    });

    it('supports manual cancel via handleBargeIn', () => {
      const onPlaybackFlush = jest.fn();
      const coordinator = new VoiceSessionCoordinator(
        { userId: defaultUserId },
        { onPlaybackFlush }
      );

      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Speaking...');
      coordinator.enqueueAudioChunk({ id: 'chunk-x', data: 'data' });

      const res = coordinator.handleBargeIn('manual_cancel');
      expect(res.flushedChunks).toBe(1);
      expect(coordinator.getState()).toBe('interrupted');
      expect(onPlaybackFlush).toHaveBeenCalledWith(1, 'manual_cancel');
    });
  });

  describe('5. Audio Buffer Queue Operations', () => {
    it('enqueues and dequeues audio chunks in FIFO order', () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });
      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Test');

      coordinator.enqueueAudioChunk({ id: 'c1', data: 'pcm1' });
      coordinator.enqueueAudioChunk({ id: 'c2', data: 'pcm2' });

      expect(coordinator.getQueueLength()).toBe(2);
      expect(coordinator.peekAudioChunk()?.id).toBe('c1');

      const first = coordinator.dequeueAudioChunk();
      expect(first?.id).toBe('c1');
      expect(coordinator.getQueueLength()).toBe(1);

      const second = coordinator.dequeueAudioChunk();
      expect(second?.id).toBe('c2');
      expect(coordinator.getQueueLength()).toBe(0);
    });

    it('rejects stale generation chunks from past cancelled turns', () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });

      // Gen 1
      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Turn 1');
      coordinator.handleBargeIn();

      // Gen 2
      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Turn 2');

      // Attempt to enqueue audio with gen 1
      const res = coordinator.enqueueAudioChunk({
        id: 'stale-chunk',
        generationId: 1,
        data: 'pcm-old',
      });

      expect(res.enqueued).toBe(false);
      expect(res.reason).toContain('stale_generation');
      expect(coordinator.getQueueLength()).toBe(0);
    });

    it('rejects enqueue when queue reaches maxQueueSize', () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
        maxQueueSize: 2,
      });

      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Speaking');

      coordinator.enqueueAudioChunk({ id: 'c1', data: '1' });
      coordinator.enqueueAudioChunk({ id: 'c2', data: '2' });

      const overflowRes = coordinator.enqueueAudioChunk({
        id: 'c3',
        data: '3',
      });
      expect(overflowRes.enqueued).toBe(false);
      expect(overflowRes.reason).toBe('queue_overflow');
      expect(coordinator.getQueueLength()).toBe(2);
    });
  });

  describe('6. Telemetry & Summary Generation', () => {
    it('computes accurate session telemetry and summary', () => {
      const coordinator = new VoiceSessionCoordinator({
        sessionId: 'sess-telemetry-test',
        userId: defaultUserId,
      });

      coordinator.startUserSpeaking();
      coordinator.stopUserSpeaking('First question');
      coordinator.startAgentSpeaking('First answer');
      coordinator.completeAgentSpeaking('First answer completed');

      const telemetry = coordinator.getTelemetry();
      expect(telemetry.totalTurns).toBe(2);
      expect(telemetry.userTurns).toBe(1);
      expect(telemetry.agentTurns).toBe(1);
      expect(telemetry.sessionId).toBe('sess-telemetry-test');

      const summary = coordinator.getSummary();
      expect(summary.totalTurns).toBe(2);
      expect(summary.conversationExcerpt).toContain('USER: First question');
      expect(summary.conversationExcerpt).toContain(
        'AGENT: First answer completed'
      );
    });
  });

  describe('7. Long-Term Memory Integration', () => {
    it('persists session summary to co-founder memory', async () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });

      coordinator.startUserSpeaking();
      coordinator.stopUserSpeaking('Let us review inventory.');
      coordinator.startAgentSpeaking('Checking stock levels.');
      coordinator.completeAgentSpeaking('Stock looks healthy.');

      const result = await coordinator.persistSessionToMemory();
      expect(result.success).toBe(true);
      expect(writeCoFounderMemory).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: defaultUserId,
          category: 'general',
          source: 'session_inference',
        })
      );
    });

    it('handles memory persistence errors gracefully', async () => {
      (writeCoFounderMemory as jest.Mock).mockRejectedValueOnce(
        new Error('DB failure')
      );

      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });
      coordinator.startUserSpeaking();
      coordinator.stopUserSpeaking('Hello');

      const result = await coordinator.persistSessionToMemory();
      expect(result.success).toBe(false);
    });
  });

  describe('8. Session Closure', () => {
    it('flushes queue and marks session closed', () => {
      const coordinator = new VoiceSessionCoordinator({
        userId: defaultUserId,
      });
      coordinator.transitionTo('agent_thinking');
      coordinator.startAgentSpeaking('Speech');
      coordinator.enqueueAudioChunk({ id: 'c1', data: 'pcm' });

      coordinator.close();
      expect(coordinator.getState()).toBe('closed');
      expect(coordinator.getQueueLength()).toBe(0);
      expect(coordinator.canTransitionTo('idle')).toBe(false);
    });
  });
});
