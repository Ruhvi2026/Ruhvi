import {
  VoiceSessionClient,
  normalizeSpeechText,
} from '../use-voice-session';

// Mock LiveKit Client
jest.mock('livekit-client', () => {
  return {
    Room: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
      on: jest.fn(),
      localParticipant: {
        publishTrack: jest.fn().mockResolvedValue(undefined),
        setMicrophoneEnabled: jest.fn(),
      },
    })),
    RoomEvent: {
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
      Disconnected: 'disconnected',
    },
    Track: {
      Kind: { Audio: 'audio' },
    },
  };
});

class MockSpeechSynthesisUtterance {
  text: string;
  lang: string = '';
  pitch: number = 1;
  rate: number = 1;
  voice: any = null;
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(text: string) {
    this.text = text;
  }
}

describe('LiveKit WebRTC Audio Client Engine & Hook (Step 9.1)', () => {
  const mockCancel = jest.fn();
  const mockSpeak = jest.fn();
  const mockGetVoices = jest.fn(() => [
    { voiceURI: 'bn-voice', name: 'Google বাংলা', lang: 'bn-IN' },
    { voiceURI: 'en-voice', name: 'Google English', lang: 'en-IN' },
  ]);

  const mockSpeechSynthesis = {
    speak: mockSpeak,
    cancel: mockCancel,
    getVoices: mockGetVoices,
    onvoiceschanged: null,
  };

  beforeAll(() => {
    (global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    (global as any).window = {
      speechSynthesis: mockSpeechSynthesis,
    };
  });

  afterAll(() => {
    delete (global as any).window;
    delete (global as any).SpeechSynthesisUtterance;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (global as any).window = {
      speechSynthesis: mockSpeechSynthesis,
    };

    // Mock global fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        token: 'mock-livekit-jwt',
        url: 'wss://test.livekit.cloud',
        reply: 'AI response to spoken instruction.',
      }),
    });
  });

  describe('1. Multilingual Speech Text Normalization', () => {
    it('normalizes markdown formatting and external links', () => {
      const raw = 'Check out **Ruhvi** at [website](https://ruhvi.com) for *exclusive* designs!';
      const normalized = normalizeSpeechText(raw);
      expect(normalized).toBe('Check out Ruhvi at website for exclusive designs!');
    });

    it('converts archaic conjunctions to natural colloquial spoken phrasing', () => {
      const raw = 'হাড় এবং কানের দুল';
      const normalized = normalizeSpeechText(raw);
      expect(normalized).toBe('হাড় আর কানের দুল');
    });

    it('formats Indian currency symbols and percentage signs', () => {
      const raw = 'Discount is 25% on orders above ₹1500 or INR 2000';
      const normalized = normalizeSpeechText(raw);
      expect(normalized).toContain('25 পার্সেন্ট');
      expect(normalized).toContain('1500 টাকা');
      expect(normalized).toContain('2000 টাকা');
    });

    it('handles empty input gracefully', () => {
      expect(normalizeSpeechText('')).toBe('');
    });
  });

  describe('2. VoiceSessionClient Initialization & Basic Controls', () => {
    it('initializes with idle state and default values', () => {
      const client = new VoiceSessionClient({ roomName: 'room-1' });

      expect(client.getState()).toBe('idle');
      expect(client.isMuted()).toBe(false);
      expect(client.getRoomName()).toBe('room-1');
      expect(client.getAudioLevel()).toBe(0);
      expect(client.getMessages()).toHaveLength(0);
      expect(client.getTelemetry().turnsCount).toBe(0);
      expect(client.getTelemetry().interruptionsCount).toBe(0);
    });

    it('toggles mute state accurately and notifies subscribers', () => {
      const client = new VoiceSessionClient();
      const listener = jest.fn();
      client.subscribe(listener);

      expect(client.isMuted()).toBe(false);
      client.toggleMute();
      expect(client.isMuted()).toBe(true);
      expect(listener).toHaveBeenCalled();

      client.toggleMute();
      expect(client.isMuted()).toBe(false);
    });
  });

  describe('3. Sub-50ms Barge-In Interruption Protocol', () => {
    it('cancels active speech playback and updates telemetry on bargeIn', () => {
      const client = new VoiceSessionClient();
      const listener = jest.fn();
      client.subscribe(listener);

      client.bargeIn();

      expect(mockCancel).toHaveBeenCalled();
      expect(client.getState()).toBe('listening');
      expect(client.getAudioLevel()).toBe(0);
      expect(client.getTelemetry().interruptionsCount).toBe(1);
      expect(listener).toHaveBeenCalled();
    });
  });

  describe('4. Message Sending & Speech Synthesis', () => {
    it('sends user message, receives brain response, and updates messages array', async () => {
      const onTranscript = jest.fn();
      const client = new VoiceSessionClient({
        onTranscript,
        voiceStyle: 'spoken_bengali',
      });

      await client.sendMessage('Show today revenue');

      expect(onTranscript).toHaveBeenCalledWith('user', 'Show today revenue');
      expect(onTranscript).toHaveBeenCalledWith(
        'assistant',
        'AI response to spoken instruction.'
      );
      const messages = client.getMessages();
      expect(messages).toHaveLength(2);
      expect(messages[0].sender).toBe('user');
      expect(messages[1].sender).toBe('assistant');
      expect(client.getTelemetry().turnsCount).toBe(1);
      expect(mockSpeak).toHaveBeenCalled();
    });

    it('ignores empty message text', async () => {
      const client = new VoiceSessionClient();

      await client.sendMessage('   ');

      expect(client.getMessages()).toHaveLength(0);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('5. Diagnostic Voice Preview', () => {
    it('speaks Bengali preview sample text when testVoice is called', () => {
      const client = new VoiceSessionClient({ voiceStyle: 'spoken_bengali' });

      client.testVoice();

      expect(mockSpeak).toHaveBeenCalledWith(
        expect.objectContaining({
          text: expect.stringContaining('রূহভির কোফাউন্ডার'),
        })
      );
    });
  });

  describe('6. Disconnect & Cleanup', () => {
    it('cleans up resources and transitions state to idle on disconnect', () => {
      const client = new VoiceSessionClient({ roomName: 'active-room' });

      client.disconnect();

      expect(client.getState()).toBe('idle');
      expect(client.getRoomName()).toBe('');
      expect(client.getAudioLevel()).toBe(0);
    });
  });
});
