// src/lib/ai/transcribe-service.ts
//
// Dedicated Gemini Speech-to-Text Transcription Service for Bengali, Hindi, and English.
// Supported Models: gemini-3.5-transcribe, gemini-3.5-flash, gemini-3.5-flash-lite
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
 * Transcribes audio speech using Gemini 3.5 Transcribe with automatic resilient fallback
 * to multimodal flash models. Supports auto-detection of Bengali (bn-IN), Hindi (hi-IN),
 * Indian English (en-IN), and natural multilingual code-switching.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = 'audio/webm'
): Promise<TranscribeResult> {
  const apiKeys = getCandidateApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('Gemini API key is not configured for transcription.');
  }

  // If buffer is empty or too small, return empty transcript safely
  if (!audioBuffer || audioBuffer.length === 0) {
    return { transcript: '', detectedLanguage: 'auto' };
  }

  const base64Audio = audioBuffer.toString('base64');
  const candidateModels = [
    process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
  ];

  const prompt =
    'Transcribe the spoken audio verbatim with exact punctuation. ' +
    'Support multilingual code-switching seamlessly: Bengali (Bangla/Banglish), Hindi, and Indian English. ' +
    'Do not add any explanation, meta-commentary, or preamble. Return ONLY the transcribed text.';

  let lastError: any = null;

  for (const apiKey of apiKeys) {
    const genAI = new GoogleGenerativeAI(apiKey);
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.1,
          },
        });

        const result = await model.generateContent([
          {
            inlineData: {
              mimeType,
              data: base64Audio,
            },
          },
          { text: prompt },
        ]);

        const response = await result.response;
        const transcript = response.text()?.trim() || '';

        return {
          transcript,
          detectedLanguage: 'auto',
        };
      } catch (err: any) {
        lastError = err;
        console.warn(
          `[transcribeAudioBuffer] Model ${modelName} failed with key:`,
          err.message
        );
      }
    }
  }

  throw new Error(
    lastError?.message || 'All candidate Gemini transcription models failed.'
  );
}
