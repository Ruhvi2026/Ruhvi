import {
  transcribeAudioBuffer,
  normalizeGeminiAudioMimeType,
  detectAudioLanguage,
} from '../transcribe-service';
import { GoogleGenerativeAI } from '@google/generative-ai';

jest.mock('server-only', () => ({}));

jest.mock('@google/generative-ai', () => {
  const generateContentMock = jest.fn();
  const getGenerativeModelMock = jest.fn().mockReturnValue({
    generateContent: generateContentMock,
  });

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: getGenerativeModelMock,
    })),
  };
});

describe('Gemini STT Transcribe Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('normalizeGeminiAudioMimeType', () => {
    it('normalizes various audio/video MIME types correctly', () => {
      expect(normalizeGeminiAudioMimeType('audio/m4a')).toBe('audio/m4a');
      expect(normalizeGeminiAudioMimeType('audio/mp4')).toBe('audio/m4a');
      expect(normalizeGeminiAudioMimeType('audio/x-m4a')).toBe('audio/m4a');
      expect(normalizeGeminiAudioMimeType('video/mp4')).toBe('audio/m4a');
      expect(normalizeGeminiAudioMimeType('audio/webm')).toBe('audio/webm');
      expect(normalizeGeminiAudioMimeType('video/webm')).toBe('audio/webm');
      expect(normalizeGeminiAudioMimeType('audio/mp3')).toBe('audio/mp3');
      expect(normalizeGeminiAudioMimeType('audio/mpeg')).toBe('audio/mp3');
      expect(normalizeGeminiAudioMimeType('audio/wav')).toBe('audio/wav');
      expect(normalizeGeminiAudioMimeType('audio/aac')).toBe('audio/aac');
      expect(normalizeGeminiAudioMimeType('')).toBe('audio/m4a');
      expect(normalizeGeminiAudioMimeType(null)).toBe('audio/m4a');
    });
  });

  describe('detectAudioLanguage', () => {
    it('detects Bengali script correctly', () => {
      expect(detectAudioLanguage('আজকের সেলস কেমন?')).toBe('bn');
      expect(
        detectAudioLanguage(
          'এই নেকলেসটার গোল্ড ক্যারেট কত? What is the making charge?'
        )
      ).toBe('bn');
    });

    it('detects Banglish (Romanized Bengali) accurately', () => {
      expect(
        detectAudioLanguage('ajker sales kemon? koto gulo order esheche?')
      ).toBe('banglish');
      expect(detectAudioLanguage('ei necklace tar dam koto? stock ache?')).toBe(
        'banglish'
      );
      expect(detectAudioLanguage('notun order status ki bolun')).toBe(
        'banglish'
      );
      expect(detectAudioLanguage('model change kore dao')).toBe('banglish');
    });

    it('detects Hindi (Devanagari script) correctly', () => {
      expect(
        detectAudioLanguage('आज की बिक्री कैसी रही? कितने ऑर्डर आए?')
      ).toBe('hi');
      expect(detectAudioLanguage('स्टॉक चेक करो')).toBe('hi');
    });

    it('detects Hinglish accurately', () => {
      expect(detectAudioLanguage('aaj kitne orders aaye hai batao')).toBe(
        'hinglish'
      );
      expect(
        detectAudioLanguage('iska price kya hai aur stock check karo')
      ).toBe('hinglish');
    });

    it('detects English correctly', () => {
      expect(detectAudioLanguage('What is today total revenue?')).toBe('en');
      expect(
        detectAudioLanguage('Check inventory for necklace and rings')
      ).toBe('en');
    });

    it('handles silence or empty strings as none', () => {
      expect(detectAudioLanguage('')).toBe('none');
      expect(detectAudioLanguage('   ')).toBe('none');
      expect(detectAudioLanguage('[SILENCE]')).toBe('none');
    });
  });

  it('throws an error if no Gemini API key is configured', async () => {
    delete process.env.GEMINI_TRANSCRIBE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_SECONDARY_API_KEY;
    delete process.env.GEMINI_LIVE_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GOOGLE_KEY;
    delete process.env.GOOGLE_API_KEY;

    const buffer = Buffer.from('dummy-audio-bytes');
    await expect(transcribeAudioBuffer(buffer)).rejects.toThrow(
      'No Gemini API keys configured for transcription service.'
    );
  });

  it('returns empty transcript safely on empty buffer', async () => {
    const emptyBuffer = Buffer.from('');
    const result = await transcribeAudioBuffer(emptyBuffer);
    expect(result).toEqual({ transcript: '', detectedLanguage: 'none' });
  });

  it('transcribes verbatim Bengali/English speech using primary model', async () => {
    const mockResponseText =
      'এই নেকলেসটার গোল্ড ক্যারেট কত? What is the making charge?';
    const mockGenAIInstance = new (GoogleGenerativeAI as any)(
      'test-gemini-key'
    );
    const mockModel = mockGenAIInstance.getGenerativeModel();

    mockModel.generateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => mockResponseText,
      }),
    });

    const buffer = Buffer.from('test-audio-content');
    const result = await transcribeAudioBuffer(buffer, 'audio/webm');

    expect(result.transcript).toBe(mockResponseText);
    expect(result.detectedLanguage).toBe('bn');

    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-flash-lite',
      })
    );
  });

  it('falls back to next model when primary model encounters error', async () => {
    const mockFallbackText = 'Fallback transcript in English and Hindi.';
    const mockGenAIInstance = new (GoogleGenerativeAI as any)(
      'test-gemini-key'
    );
    const mockModel = mockGenAIInstance.getGenerativeModel();

    // First call (gemini-3.5-flash-lite) fails
    mockModel.generateContent.mockRejectedValueOnce(
      new Error('Model gemini-3.5-flash-lite is temporarily unavailable')
    );

    // Second call (gemini-2.5-flash fallback) succeeds
    mockModel.generateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => mockFallbackText,
      }),
    });

    const buffer = Buffer.from('test-audio-content');
    const result = await transcribeAudioBuffer(buffer, 'audio/webm');

    expect(result.transcript).toBe(mockFallbackText);
    expect(result.detectedLanguage).toBe('en');

    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
      })
    );
  });

  it('falls back to next model when a model returns 0 tokens (empty string)', async () => {
    const mockFallbackText = 'Recovered speech from fallback model';
    const mockGenAIInstance = new (GoogleGenerativeAI as any)(
      'test-gemini-key'
    );
    const mockModel = mockGenAIInstance.getGenerativeModel();

    // First model returns empty text (0 output tokens)
    mockModel.generateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => '',
      }),
    });

    // Fallback model returns actual text
    mockModel.generateContent.mockResolvedValueOnce({
      response: Promise.resolve({
        text: () => mockFallbackText,
      }),
    });

    const buffer = Buffer.from('test-audio-content');
    const result = await transcribeAudioBuffer(buffer, 'audio/webm');

    expect(result.transcript).toBe(mockFallbackText);
    expect(result.detectedLanguage).toBe('en');
  });
});
