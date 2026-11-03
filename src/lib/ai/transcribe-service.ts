// src/lib/ai/transcribe-service.ts
//
// Dedicated Gemini Speech-to-Text Transcription Service for Bengali, Hindi, and English.
// Model: gemini-3.5-transcribe (with resilient fallback).
// NOTE: Audio is processed in-memory only and is NEVER uploaded to Cloudinary.

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface TranscribeResult {
  transcript: string;
  detectedLanguage?: string;
  durationSeconds?: number;
}

function getGeminiApiKey(): string | null {
  return (
    process.env.GEMINI_TRANSCRIBE_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_LIVE_API_KEY ||
    process.env.GOOGLE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    null
  );
}

/**
 * Transcribes audio speech using Gemini 3.5 Transcribe.
 * Supports auto-detection of Bengali (bn-IN), Hindi (hi-IN), Indian English (en-IN),
 * and natural multilingual code-switching.
 */
export async function transcribeAudioBuffer(
  audioBuffer: Buffer,
  mimeType = 'audio/webm'
): Promise<TranscribeResult> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    throw new Error('Gemini API key is not configured for transcription.');
  }

  const base64Audio = audioBuffer.toString('base64');
  const genAI = new GoogleGenerativeAI(apiKey);

  const modelName =
    process.env.GEMINI_TRANSCRIBE_MODEL || 'gemini-3.5-transcribe';

  // Specific system prompt for accurate verbatim multilingual transcription
  const prompt =
    'Transcribe the spoken audio verbatim with exact punctuation. ' +
    'Support multilingual code-switching seamlessly: Bengali (Bangla/Banglish), Hindi, and Indian English. ' +
    'Do not add any explanation, meta-commentary, or preamble. Return ONLY the transcribed text.';

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
    console.warn(
      `[transcribeAudioBuffer] Primary model (${modelName}) failed, attempting flash fallback:`,
      err.message
    );

    // Fallback to gemini-2.5-flash for audio transcription
    const fallbackModel = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      generationConfig: {
        temperature: 0.1,
      },
    });

    const result = await fallbackModel.generateContent([
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
      detectedLanguage: 'auto-fallback',
    };
  }
}
