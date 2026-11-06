// src/lib/ai/transcribe-service.ts
//
// Dedicated Gemini Speech-to-Text Transcription Service for Bengali, Hindi, and English.
// NOTE: Audio is processed in-memory only and is NEVER uploaded to Cloudinary.

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TranscribeResult {
  transcript: string;
  detectedLanguage?: string;
  durationSeconds?: number;
}

function getCandidateApiKeys(): string[] {
  const keys = [
    process.env.GEMINI_TRANSCRIBE_API_KEY,
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_SECONDARY_API_KEY,
    process.env.GEMINI_LIVE_API_KEY,
    process.env.GOOGLE_AI_API_KEY,
    process.env.GOOGLE_API_KEY,
  ].filter((k): k is string => Boolean(k && k.trim().length > 0));
  return Array.from(new Set(keys));
}

/**
 * Normalizes mobile/browser/Cloudinary MIME types to Gemini's supported audio MIME list:
 * audio/m4a, audio/aac, audio/wav, audio/mp3, audio/mpeg, audio/ogg, audio/flac, audio/webm
 */
export function normalizeGeminiAudioMimeType(rawMime?: string | null): string {
  const cleaned = (rawMime || '').split(';')[0].trim().toLowerCase();
  if (!cleaned) return 'audio/m4a';

  if (
    cleaned === 'audio/mp4' ||
    cleaned === 'audio/x-m4a' ||
    cleaned === 'audio/mp4a-latm' ||
    cleaned === 'video/mp4' ||
    cleaned === 'audio/m4a'
  ) {
    return 'audio/m4a';
  }
  if (cleaned === 'video/webm' || cleaned === 'audio/webm') {
    return 'audio/webm';
  }
  if (
    cleaned === 'audio/mp3' ||
    cleaned === 'audio/mpeg' ||
    cleaned === 'audio/mpga'
  ) {
    return 'audio/mp3';
  }
  if (
    cleaned === 'audio/ogg' ||
    cleaned === 'audio/opus' ||
    cleaned === 'application/ogg'
  ) {
    return 'audio/ogg';
  }
  if (
    cleaned === 'audio/wav' ||
    cleaned === 'audio/x-wav' ||
    cleaned === 'audio/wave'
  ) {
    return 'audio/wav';
  }
  if (cleaned === 'audio/aac' || cleaned === 'audio/x-aac') {
    return 'audio/aac';
  }
  if (cleaned === 'audio/flac' || cleaned === 'audio/x-flac') {
    return 'audio/flac';
  }
  return 'audio/m4a';
}

export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = 'audio/m4a',
  preferredModel?: string
): Promise<TranscribeResult> {
  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcript: '', detectedLanguage: 'auto' };
  }

  const MAX_BUFFER_BYTES = 4.5 * 1024 * 1024;
  if (audioBuffer.length > MAX_BUFFER_BYTES) {
    throw new Error(
      `Audio payload size (${(audioBuffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds limit.`
    );
  }

  const apiKeys = getCandidateApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('No Gemini API keys configured for transcription service.');
  }

  const safeMimeType = normalizeGeminiAudioMimeType(mimeType);
  const base64Audio = audioBuffer.toString('base64');

  // Multimodal models support { inlineData } + { text: prompt } for Bengali/Hindi/English script rules.
  // Dedicated 'gemini-3.5-transcribe' is Audio-only (must NOT be sent a { text } prompt part).
  const defaultOrder = [
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash',
    'gemini-3.5-flash',
    'gemini-3.5-transcribe',
  ];
  const candidateModels = preferredModel
    ? [preferredModel, ...defaultOrder.filter((m) => m !== preferredModel)]
    : defaultOrder;

  const prompt =
    'Transcribe the spoken audio verbatim with exact punctuation. ' +
    'Support multilingual code-switching seamlessly: Bengali (Bangla script বাংলা), Hindi (Devanagari हिंदी), and Indian English. ' +
    'If the audio contains only silence or noise with no human speech at all, return [SILENCE]. ' +
    'Do not add any explanation, meta-commentary, or preamble. Return ONLY the transcribed text.';

  let lastError: Error | null = null;

  for (const modelName of candidateModels) {
    const isAudioOnlyModel = modelName.includes('transcribe');

    for (const apiKey of apiKeys) {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
          },
        });

        // Try with safeMimeType first; if a multimodal model prefers audio/mp4 for .m4a, try fallback MIME on 400
        const mimeCandidates =
          safeMimeType === 'audio/m4a' && !isAudioOnlyModel
            ? ['audio/m4a', 'audio/mp4', 'audio/aac']
            : [safeMimeType];

        for (const candidateMime of mimeCandidates) {
          try {
            const parts: any[] = [
              {
                inlineData: {
                  mimeType: candidateMime,
                  data: base64Audio,
                },
              },
            ];

            if (!isAudioOnlyModel) {
              parts.push({ text: prompt });
            }

            const result = await model.generateContent(parts);
            const response = await result.response;
            const rawTranscript = response.text()?.trim() || '';

            if (rawTranscript === '[SILENCE]') {
              return {
                transcript: '',
                detectedLanguage: 'none',
              };
            }

            // Never return empty "" if a model produced 0 tokens; try next model/MIME
            if (!rawTranscript) {
              console.warn(
                `[transcribeAudioBuffer] Model ${modelName} (${candidateMime}) returned 0 tokens, trying fallback...`
              );
              continue;
            }

            return {
              transcript: rawTranscript,
              detectedLanguage:
                modelName === candidateModels[0] ? 'auto' : 'auto-fallback',
            };
          } catch (innerErr: any) {
            lastError =
              innerErr instanceof Error
                ? innerErr
                : new Error(String(innerErr));
            const msg = lastError.message.toLowerCase();
            // If error is not MIME-related, break out of candidate MIME loop
            if (
              !msg.includes('mime') &&
              !msg.includes('400') &&
              !msg.includes('argument')
            ) {
              throw lastError;
            }
          }
        }
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message.toLowerCase();
        console.warn(
          `[transcribeAudioBuffer] Model ${modelName} failed:`,
          lastError.message.slice(0, 180)
        );
        // If the model ID itself is 404 Not Found, break to next model immediately
        if (msg.includes('404') || msg.includes('not found')) {
          break;
        }
      }
    }
  }

  throw new Error(
    lastError?.message || 'All candidate Gemini transcription models failed.'
  );
}
