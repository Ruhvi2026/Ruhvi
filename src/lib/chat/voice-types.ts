// src/lib/chat/voice-types.ts
//
// Typed contracts for Ru Chat Voice Notes, Speech-to-Text, and Cloudinary 45-day retention lifecycle.

export const VOICE_NOTE_RETENTION_DAYS = 45;
export const VOICE_NOTE_RETENTION_MS =
  VOICE_NOTE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
export const VOICE_NOTE_MAX_BYTES = 10 * 1024 * 1024; // 10MB
export const SPEECH_TO_TEXT_MAX_BYTES = 5 * 1024 * 1024; // 5MB

export const VOICE_NOTE_ALLOWED_MIME_TYPES = [
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/aac',
] as const;

export type AllowedVoiceMimeType =
  (typeof VOICE_NOTE_ALLOWED_MIME_TYPES)[number];

export type VoiceNoteStatus = 'active' | 'expired' | 'deleted';

export interface VoiceNoteMetadata {
  id: string;
  messageId?: string;
  conversationId: string;
  senderId: string;
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  expiresAt: string; // Exactly 45 days after uploadedAt
  status: VoiceNoteStatus;
  deletedAt?: string | null;
}

export type VoiceRecorderState =
  'idle' | 'recording' | 'paused' | 'reviewing' | 'uploading' | 'error';

export type SpeechToTextState =
  'idle' | 'listening' | 'transcribing' | 'success' | 'error';

export interface VoiceUploadResponse {
  success: boolean;
  voiceNoteId: string;
  publicId: string;
  url: string;
  durationSeconds: number;
  fileSizeBytes: number;
  mimeType: string;
  expiresAt: string;
  error?: string;
}

export interface SpeechToTextResponse {
  success: boolean;
  transcript: string;
  detectedLanguage?: string;
  durationSeconds?: number;
  error?: string;
}

export interface VoiceCleanupResult {
  success: boolean;
  checkedCount: number;
  purgedCount: number;
  errorCount: number;
  purgedPublicIds: string[];
  errors: string[];
  durationMs: number;
}

/**
 * Checks whether a voice note has passed its 45-day retention deadline.
 */
export function isVoiceNoteExpired(expiresAt: string | Date): boolean {
  const expiryTime =
    typeof expiresAt === 'string'
      ? new Date(expiresAt).getTime()
      : expiresAt.getTime();
  return Date.now() >= expiryTime;
}

/**
 * Calculates the exact expiry date (now + 45 days) for a newly uploaded voice note.
 */
export function calculateVoiceNoteExpiry(from: Date = new Date()): Date {
  return new Date(from.getTime() + VOICE_NOTE_RETENTION_MS);
}
