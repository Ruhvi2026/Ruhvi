// src/lib/ai/transcribe-service.ts
//
// Dedicated Gemini Speech-to-Text Transcription Service for Bengali, Banglish, Hindi, and English.
// NOTE: Audio is processed in-memory only and is NEVER uploaded to Cloudinary.

import 'server-only';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type DetectedAudioLanguage =
  'bn' | 'banglish' | 'hi' | 'hinglish' | 'en' | 'mixed' | 'none';

export interface TranscribeResult {
  transcript: string;
  detectedLanguage?: DetectedAudioLanguage | string;
  durationSeconds?: number;
}

/**
 * Detects the language of a transcribed speech string:
 * - 'none': Empty, silence, or no linguistic content
 * - 'bn': Bengali script (বাংলা হরফ)
 * - 'hi': Devanagari script (हिंदी)
 * - 'banglish': Romanized Bengali (Bengali spoken phonetics written in Latin script)
 * - 'hinglish': Romanized Hindi (Hindi spoken phonetics written in Latin script)
 * - 'en': Standard English
 * - 'mixed': Code-switching between multiple scripts/languages
 */
export function detectAudioLanguage(text: string): DetectedAudioLanguage {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed === '[SILENCE]') {
    return 'none';
  }

  // Count script character occurrences
  const bengaliChars = (trimmed.match(/[\u0980-\u09FF]/g) || []).length;
  const devanagariChars = (trimmed.match(/[\u0900-\u097F]/g) || []).length;
  const latinChars = (trimmed.match(/[a-zA-Z]/g) || []).length;

  const totalAlphabetChars = bengaliChars + devanagariChars + latinChars;
  if (totalAlphabetChars === 0) {
    return 'none';
  }

  // If Bengali script is present:
  if (bengaliChars > 0) {
    if (devanagariChars === 0) {
      return 'bn';
    }
    if (bengaliChars >= devanagariChars * 2) return 'bn';
    if (devanagariChars >= bengaliChars * 2) return 'hi';
    return 'mixed';
  }

  // If Devanagari script is present:
  if (devanagariChars > 0) {
    return 'hi';
  }

  // Latin alphabet analysis (Distinguish Banglish vs Hinglish vs English)
  const lower = trimmed.toLowerCase();
  const words = lower.match(/[a-z]+/g) || [];
  if (words.length === 0) {
    return 'en';
  }

  // Lexicon tokens for Banglish
  const BANGLISH_WORDS = new Set([
    'ami',
    'tumi',
    'apni',
    'amader',
    'tomader',
    'apnader',
    'amake',
    'tomake',
    'apnake',
    'ei',
    'oi',
    'eta',
    'ota',
    'egulo',
    'ogulo',
    'sheta',
    'koto',
    'keno',
    'kivabe',
    'kibhabe',
    'kothay',
    'kobe',
    'ki',
    'ache',
    'achhe',
    'nei',
    'hobe',
    'hochhe',
    'hoche',
    'holo',
    'koro',
    'korun',
    'korbo',
    'korechi',
    'korchi',
    'korecho',
    'korchen',
    'bolun',
    'bolo',
    'dekho',
    'dekhun',
    'dekhan',
    'dam',
    'daam',
    'taka',
    'shob',
    'sob',
    'bhalo',
    'valo',
    'khub',
    'notun',
    'purono',
    'ajke',
    'aajke',
    'kal',
    'kaal',
    'ekhon',
    'aar',
    'ar',
    'ebong',
    'kintu',
    'karun',
    'karon',
    'kichu',
    'keu',
    'gulo',
    'gula',
    'khana',
    'jonno',
    'theke',
    'diye',
    'shathe',
    'sathe',
    'bujhte',
    'parche',
    'parchi',
    'parbo',
    'din',
    'deo',
    'dao',
    'pathao',
    'pathan',
    'dekhlam',
    'pelam',
    'pawa',
    'gelo',
    'ekta',
    'duto',
    'tin',
    'te',
    'chai',
    'bolchi',
    'shunchi',
    'shunte',
    'shunchen',
    'thik',
    'thakbe',
    'thakun',
    'bujhechi',
    'korle',
  ]);

  // Lexicon tokens for Hinglish
  const HINGLISH_WORDS = new Set([
    'kya',
    'hai',
    'hain',
    'ho',
    'hoon',
    'hun',
    'kaise',
    'kaisa',
    'kaisi',
    'kitna',
    'kitne',
    'kitni',
    'kaha',
    'kahan',
    'kab',
    'kyun',
    'kyu',
    'batao',
    'bataiye',
    'karo',
    'kariye',
    'karein',
    'raha',
    'rahi',
    'rahe',
    'hoga',
    'hogi',
    'honge',
    'tha',
    'thi',
    'the',
    'nahi',
    'nahin',
    'mat',
    'accha',
    'achha',
    'bahut',
    'thoda',
    'zyada',
    'lekin',
    'magar',
    'aur',
    'bhi',
    'hum',
    'aap',
    'tum',
    'mera',
    'meri',
    'mere',
    'tera',
    'teri',
    'tere',
    'uska',
    'uski',
    'unka',
    'inka',
    'bhejo',
    'dekho',
    'karna',
    'kijiye',
  ]);

  let banglishScore = 0;
  let hinglishScore = 0;

  for (const w of words) {
    if (BANGLISH_WORDS.has(w)) banglishScore++;
    if (HINGLISH_WORDS.has(w)) hinglishScore++;
  }

  // Also check common Banglish phonetic suffixes: -er, -tar, -gulo, -che, -chi, -chen, -lam, -bo
  const banglishSuffixMatches = words.filter(
    (w) =>
      w.length > 4 &&
      (w.endsWith('tar') ||
        w.endsWith('gulo') ||
        w.endsWith('che') ||
        w.endsWith('chi') ||
        w.endsWith('chen') ||
        w.endsWith('lam') ||
        w.endsWith('bo'))
  ).length;

  const totalBanglishPoints = banglishScore + banglishSuffixMatches;

  if (totalBanglishPoints >= 1 && totalBanglishPoints > hinglishScore) {
    return 'banglish';
  }

  if (hinglishScore >= 1 && hinglishScore > totalBanglishPoints) {
    return 'hinglish';
  }

  return 'en';
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
    return { transcript: '', detectedLanguage: 'none' };
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
    'You are an expert speech-to-text transcriber for Ruhvi Jewels, a fine jewellery brand based in Kolkata, West Bengal, India.\n' +
    'TARGET REGIONAL LANGUAGES: Spoken Bengali (বাংলা / Banglish), Indian English, and Hindi (हिन्दी / Hinglish).\n' +
    'CRITICAL TRANSCRIPTION RULES:\n' +
    '1. STRICT NO TRANSLATION: Transcribe the EXACT spoken words verbatim. NEVER translate the speech from one language into another. If the speaker speaks Bengali, DO NOT translate it into English or Hindi!\n' +
    '2. BENGALI & BANGLISH RECOGNITION (TOP PRIORITY):\n' +
    '   - Bengali is the primary language of the users.\n' +
    '   - You MAY transcribe spoken Bengali into standard Bengali script (বাংলা লিপি) OR verbatim Banglish (colloquial Bengali written in English/Latin letters). Both scripts are fully accepted.\n' +
    '   - DO NOT confuse Bengali vocabulary and verb forms with Hindi! For example: "korchi", "korechi", "korbo", "koro", "korun", "hobe", "ache", "nei", "koto", "dam", "keno", "bhalo", "ajke", "bolun", "dekhan", "taka", "gulo", "amader", "apnar" are BENGALI. Never output Hindi equivalents like "karo", "hoga", "hai", "kitna", "batao", etc. unless the speaker actually spoke Hindi.\n' +
    '3. MULTILINGUAL CODE-SWITCHING: Seamlessly preserve natural code-switching between Bengali and English (e.g., "ajker total sales koto?", "ei necklace-er stock ache kina check koro", "new collection launch hobe").\n' +
    '4. SILENCE & BACKGROUND NOISE: If the audio contains only silence, background noise, or no human speech at all, return exactly [SILENCE].\n' +
    '5. OUTPUT FORMAT: Return ONLY the raw transcribed text. No explanations, no markdown fences, no prefixes like "Transcript:", no metadata, and no translation.';

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

            const detectedLang = detectAudioLanguage(rawTranscript);
            return {
              transcript: rawTranscript,
              detectedLanguage: detectedLang,
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
