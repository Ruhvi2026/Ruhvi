import { normalizeBengaliForSpeech } from '@/hooks/useLiveKitVoice';
import { VoiceSessionClient, normalizeSpeechText } from '../use-voice-session';

// Mock livekit-client
jest.mock('livekit-client', () => {
  return {
    Room: jest.fn().mockImplementation(() => ({
      connect: jest.fn().mockImplementation((url: string, token: string) => {
        if (token === 'invalid-token' || url === 'error') {
          return Promise.reject(new Error('LiveKit room connection rejected'));
        }
        return Promise.resolve();
      }),
      disconnect: jest.fn(),
      on: jest.fn(),
      localParticipant: {
        publishTrack: jest.fn().mockResolvedValue(undefined),
        setMicrophoneEnabled: jest.fn(),
      },
    })),
    RoomEvent: {
      Connected: 'connected',
      Disconnected: 'disconnected',
      TrackSubscribed: 'trackSubscribed',
      TrackUnsubscribed: 'trackUnsubscribed',
    },
    Track: {
      Kind: { Audio: 'audio' },
    },
  };
});

describe('Phase 44: AI Co-Founder Voice Path End-to-End Verification', () => {
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
    (global as any).window = {
      speechSynthesis: mockSpeechSynthesis,
    };
  });

  afterAll(() => {
    delete (global as any).window;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('1. Multilingual Voice Cadence Normalization', () => {
    it('normalizes markdown, currency, percentages and Bengali conjunctions for speech', () => {
      const text =
        'Welcome! Check [necklace](https://ruhvi.in) for ₹5,000 and 15% discount. রূহভি এবং গয়না।';
      const clean = normalizeBengaliForSpeech(text);

      expect(clean).not.toContain('**');
      expect(clean).not.toContain('https://');
      expect(clean).toContain('5,000 টাকা');
      expect(clean).toContain('15 পার্সেন্ট');
      expect(clean).toContain('রূহভি আর গয়না');
      expect(clean).not.toContain('এবং');
    });

    it('matches normalizeSpeechText in core livekit helper', () => {
      const text = 'হাড় এবং কানের দুল - ₹2500';
      const normalized = normalizeSpeechText(text);
      expect(normalized).toContain('হাড় আর কানের দুল');
      expect(normalized).toContain('2500 টাকা');
    });
  });

  describe('2. Browser Permissions Policy & Microphone Access Error Categorization', () => {
    it('categorizes NotAllowedError as actionable permission guidance', async () => {
      const permissionError = new Error('Permission denied by user');
      permissionError.name = 'NotAllowedError';

      (global as any).navigator = {
        mediaDevices: {
          getUserMedia: jest.fn().mockRejectedValue(permissionError),
        },
      };

      const onError = jest.fn();
      const client = new VoiceSessionClient({ onError });

      await client.start();

      expect(client.getState()).toBe('error');
      expect(client.getErrorMessage()).toContain(
        'Microphone access denied. Please allow microphone permissions'
      );
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Microphone access denied'),
        })
      );
    });

    it('categorizes NotFoundError as missing device guidance', async () => {
      const deviceError = new Error('Requested device not found');
      deviceError.name = 'NotFoundError';

      (global as any).navigator = {
        mediaDevices: {
          getUserMedia: jest.fn().mockRejectedValue(deviceError),
        },
      };

      const onError = jest.fn();
      const client = new VoiceSessionClient({ onError });

      await client.start();

      expect(client.getState()).toBe('error');
      expect(client.getErrorMessage()).toContain('No microphone detected');
      expect(onError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('No microphone detected'),
        })
      );
    });
  });

  describe('3. Real LiveKit Connection vs Fallback Mode Disambiguation', () => {
    it('sets isFallback = false and voiceMode = "livekit" on successful LiveKit connection', async () => {
      const mockTrack = { enabled: true, stop: jest.fn() };
      (global as any).navigator = {
        mediaDevices: {
          getUserMedia: jest.fn().mockResolvedValue({
            getAudioTracks: () => [mockTrack],
            getTracks: () => [mockTrack],
          }),
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          token: 'valid-livekit-jwt',
          url: 'wss://ruhvi.livekit.cloud',
          roomName: 'co-founder-room-777',
        }),
      });

      const client = new VoiceSessionClient();
      await client.start();

      expect(client.getState()).toBe('listening');
      expect(client.isFallbackMode()).toBe(false);
      expect(client.getVoiceMode()).toBe('livekit');
      expect(client.getFallbackReason()).toBe('');
      expect(client.getRoomName()).toBe('co-founder-room-777');
    });

    it('gracefully enters fallback mode when LiveKit credentials or connection fail', async () => {
      const mockTrack = { enabled: true, stop: jest.fn() };
      (global as any).navigator = {
        mediaDevices: {
          getUserMedia: jest.fn().mockResolvedValue({
            getAudioTracks: () => [mockTrack],
            getTracks: () => [mockTrack],
          }),
        },
      };

      // LiveKit token route fails (e.g. 500 missing credentials in local dev)
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({
          error: 'LIVEKIT_URL environment variable is missing.',
        }),
      });

      const client = new VoiceSessionClient();
      await client.start();

      // Invariant: Session must not crash, must enter fallback mode
      expect(client.getState()).toBe('listening');
      expect(client.isFallbackMode()).toBe(true);
      expect(client.getVoiceMode()).toBe('fallback');
      expect(client.getFallbackReason()).toContain(
        'LiveKit credentials unavailable; running in Web Speech fallback mode'
      );
    });

    it('resets fallback mode, voiceMode, and roomName cleanly on disconnect', async () => {
      const client = new VoiceSessionClient();
      client.disconnect();

      expect(client.getState()).toBe('idle');
      expect(client.isFallbackMode()).toBe(false);
      expect(client.getVoiceMode()).toBe('idle');
      expect(client.getFallbackReason()).toBe('');
      expect(client.getRoomName()).toBe('');
    });
  });

  describe('4. Mute Toggle and Barge-In Controls', () => {
    it('toggles microphone track enabled property and notifies listener', () => {
      const mockTrack = { enabled: true, stop: jest.fn() };
      (global as any).navigator = {
        mediaDevices: {
          getUserMedia: jest.fn().mockResolvedValue({
            getAudioTracks: () => [mockTrack],
            getTracks: () => [mockTrack],
          }),
        },
      };

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

    it('cancels speech playback immediately upon barge-in', () => {
      const client = new VoiceSessionClient();
      client.bargeIn();
      expect(mockCancel).toHaveBeenCalled();
    });
  });
});
