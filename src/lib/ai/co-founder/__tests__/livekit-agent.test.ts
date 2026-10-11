import {
  LiveKitVoiceAgent,
  createLiveKitVoiceAgent,
  calculatePcmRms,
  VoiceAgentState,
} from '../livekit-agent';

// Mock dependencies
jest.mock('server-only', () => ({}));

jest.mock('../brain', () => ({
  getCoFounderSystemPrompt: jest.fn(
    async () => 'Voice system prompt with concise brevity rules.'
  ),
}));

jest.mock('../rate-limiter', () => ({
  enforceCoFounderRateLimit: jest.fn(() => ({
    success: true,
    result: { allowed: true, retryAfterSeconds: 0 },
  })),
}));

jest.mock('../tool-bridge', () => ({
  executeCoFounderTool: jest.fn(async () => ({ success: true, summaryForVoice: 'Done' })),
}));

jest.mock('@/lib/auth/rbac', () => ({
  getUserScopes: jest.fn(async () => ['analytics:read', 'tasks:read']),
}));

jest.mock('@/lib/livekit/config', () => ({
  getLiveKitConfig: jest.fn(() => ({
    url: 'wss://test.livekit.cloud',
    apiKey: 'test-api-key',
    apiSecret: 'test-api-secret',
  })),
  LIVEKIT_ROOM_SETTINGS: {
    roomPrefix: 'test-room-',
    defaultTtlSeconds: 900,
    getAgentIdentity: () => 'test-agent',
    getUserIdentity: (id: string) => `user-${id}`,
    userPermissions: { canPublish: true, canSubscribe: true },
  },
}));

jest.mock('@/lib/livekit/agent-dispatch', () => ({
  LiveKitAgentManager: jest.fn().mockImplementation(() => ({
    ensureRoom: jest.fn(async () => ({ ok: true })),
    createAgentToken: jest.fn(async () => 'mock-agent-token-xyz'),
  })),
}));

jest.mock('@/lib/livekit/gemini-live', () => ({
  GeminiLiveSession: jest.fn().mockImplementation((config, handlers) => ({
    connect: jest.fn(async () => {}),
    disconnect: jest.fn(() => {}),
    sendRealtimeAudio: jest.fn(() => {}),
    sendTextMessage: jest.fn((text: string) => {
      // Simulate response turn
      handlers?.onTextDelta?.(`Echo: ${text}`);
      handlers?.onAudioData?.('base64audiochunk');
      handlers?.onTurnComplete?.();
    }),
    sendToolResponse: jest.fn(() => {}),
  })),
}));

describe('LiveKit Real-Time Audio Agent Protocol (livekit-agent.ts)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.GEMINI_LIVE_API_KEY = 'test-gemini-live-key';
  });

  afterEach(() => {
    delete process.env.GEMINI_LIVE_API_KEY;
  });

  describe('PCM RMS Calculation', () => {
    it('returns 0 for empty or invalid buffers', () => {
      expect(calculatePcmRms(Buffer.alloc(0))).toBe(0);
      expect(calculatePcmRms(Buffer.alloc(1))).toBe(0);
    });

    it('measures zero energy on pure digital silence', () => {
      const silence = Buffer.alloc(320); // 160 samples of 0
      expect(calculatePcmRms(silence)).toBe(0);
    });

    it('accurately calculates RMS energy for audio samples', () => {
      const buffer = Buffer.alloc(320);
      // Write half-amplitude samples (16384 out of 32768 => ~0.5 normalized)
      for (let i = 0; i < 160; i++) {
        buffer.writeInt16LE(16384, i * 2);
      }
      const rms = calculatePcmRms(buffer);
      expect(rms).toBeCloseTo(0.5, 2);
    });
  });

  describe('Agent Connection & Lifecycle States', () => {
    it('initializes in idle state and transitions to listening on connect', async () => {
      const stateTransitions: VoiceAgentState[] = [];

      const agent = new LiveKitVoiceAgent(
        {
          roomName: 'test-room-1',
          userId: 'user_admin_1',
          userRole: 'founder',
        },
        {
          onStateChange: (state) => {
            stateTransitions.push(state);
          },
        }
      );

      expect(agent.getState()).toBe('idle');

      const connectResult = await agent.connect();
      expect(connectResult.success).toBe(true);
      expect(connectResult.token).toBe('mock-agent-token-xyz');
      expect(agent.getState()).toBe('listening');

      expect(stateTransitions).toContain('connecting');
      expect(stateTransitions).toContain('connected');
      expect(stateTransitions).toContain('listening');

      agent.disconnect();
      expect(agent.getState()).toBe('disconnected');
    });

    it('enforces voice tier rate limiting on connection', async () => {
      const { enforceCoFounderRateLimit } = require('../rate-limiter');
      enforceCoFounderRateLimit.mockReturnValueOnce({
        success: false,
        result: { allowed: false, retryAfterSeconds: 30 },
      });

      const errors: Error[] = [];
      const agent = new LiveKitVoiceAgent(
        { roomName: 'test-room-rate', userId: 'user_throttled' },
        { onError: (err) => errors.push(err) }
      );

      const res = await agent.connect();
      expect(res.success).toBe(false);
      expect(res.error).toContain('Voice rate limit exceeded');
      expect(agent.getState()).toBe('error');
      expect(errors.length).toBe(1);
    });
  });

  describe('Voice Activity Detection & Human Interruption', () => {
    it('detects speech onset when audio RMS exceeds energy threshold', async () => {
      const agent = await createLiveKitVoiceAgent({
        roomName: 'test-vad',
        userId: 'user_vad',
        energyThreshold: 0.015,
      });

      expect(agent.getState()).toBe('listening');

      // Feed a silence frame
      const silenceFrame = Buffer.alloc(320);
      agent.pushAudioFrame(silenceFrame);
      expect(agent.getState()).toBe('listening');

      // Feed high-energy speech frame (normalized ~0.25)
      const speechFrame = Buffer.alloc(320);
      for (let i = 0; i < 160; i++) {
        speechFrame.writeInt16LE(8192, i * 2);
      }

      agent.pushAudioFrame(speechFrame);
      const metrics = agent.getMetrics();
      expect(metrics.totalAudioFramesReceived).toBe(2);

      agent.disconnect();
    });

    it('triggers barge-in interruption when human speaks while agent is speaking', async () => {
      let interruptedCalled = false;

      const agent = await createLiveKitVoiceAgent(
        {
          roomName: 'test-interruption',
          userId: 'user_interruption',
          interruptionThreshold: 0.02,
        },
        {
          onInterrupted: () => {
            interruptedCalled = true;
          },
        }
      );

      // Force agent state into speaking (simulating active output)
      (agent as any).setState('speaking');
      expect(agent.getState()).toBe('speaking');

      // Deliver loud audio frame (RMS ~0.3)
      const loudBargeIn = Buffer.alloc(320);
      for (let i = 0; i < 160; i++) {
        loudBargeIn.writeInt16LE(10000, i * 2);
      }

      agent.pushAudioFrame(loudBargeIn);

      expect(interruptedCalled).toBe(true);
      expect(agent.getState()).toBe('listening');
      expect(agent.getMetrics().interruptionsCount).toBe(1);

      agent.disconnect();
    });

    it('allows explicit manual interruption', async () => {
      let interrupted = false;
      const agent = await createLiveKitVoiceAgent(
        { roomName: 'manual-barge', userId: 'user_1' },
        { onInterrupted: () => { interrupted = true; } }
      );

      (agent as any).setState('speaking');
      agent.interrupt();

      expect(interrupted).toBe(true);
      expect(agent.getState()).toBe('listening');
      agent.disconnect();
    });
  });

  describe('Conversational Turn Processing & Text Integration', () => {
    it('processes user text input through live session and tracks metrics', async () => {
      let deltaReceived = '';
      let audioReceived = false;

      const agent = await createLiveKitVoiceAgent(
        {
          roomName: 'test-text-turn',
          userId: 'user_turn_1',
        },
        {
          onTranscriptionDelta: (delta) => {
            deltaReceived += delta;
          },
          onAudioOutput: () => {
            audioReceived = true;
          },
        }
      );

      agent.pushUserText('What are today sales?');

      expect(deltaReceived).toContain('Echo: What are today sales?');
      expect(audioReceived).toBe(true);

      const metrics = agent.getMetrics();
      expect(metrics.turnsCompleted).toBeGreaterThanOrEqual(1);

      agent.disconnect();
    });

    it('falls back gracefully to direct synthesis when Gemini Live key is absent', async () => {
      delete process.env.GEMINI_LIVE_API_KEY;
      delete process.env.GEMINI_API_KEY;

      let responseTextReceived = '';
      let audioReceived = false;

      const agent = await createLiveKitVoiceAgent(
        {
          roomName: 'test-fallback-turn',
          userId: 'user_fallback_1',
        },
        {
          onResponseComplete: (text) => {
            responseTextReceived = text;
          },
          onAudioOutput: () => {
            audioReceived = true;
          },
        }
      );

      agent.pushUserText('Check inventory for royal choker');

      expect(responseTextReceived).toContain('Check inventory for royal choker');
      expect(audioReceived).toBe(true);

      agent.disconnect();
    });
  });
});

