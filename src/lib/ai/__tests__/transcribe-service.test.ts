import { transcribeAudioBuffer } from '../transcribe-service';
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

describe('Gemini 3.5 Transcribe Service', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv, GEMINI_API_KEY: 'test-gemini-key' };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws an error if no Gemini API key is configured', async () => {
    delete process.env.GEMINI_TRANSCRIBE_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_LIVE_API_KEY;
    delete process.env.GOOGLE_AI_API_KEY;
    delete process.env.GOOGLE_API_KEY;

    const buffer = Buffer.from('dummy-audio-bytes');
    await expect(transcribeAudioBuffer(buffer)).rejects.toThrow(
      'Gemini API key is not configured for transcription.'
    );
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
    expect(result.detectedLanguage).toBe('auto');

    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-3.5-transcribe',
      })
    );
  });

  it('falls back to gemini-2.5-flash when primary model encounters error', async () => {
    const mockFallbackText = 'Fallback transcript in English and Hindi.';
    const mockGenAIInstance = new (GoogleGenerativeAI as any)(
      'test-gemini-key'
    );
    const mockModel = mockGenAIInstance.getGenerativeModel();

    // First call (gemini-3.5-transcribe) fails
    mockModel.generateContent.mockRejectedValueOnce(
      new Error('Model gemini-3.5-transcribe is temporarily unavailable')
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
    expect(result.detectedLanguage).toBe('auto-fallback');

    expect(mockGenAIInstance.getGenerativeModel).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'gemini-2.5-flash',
      })
    );
  });
});
