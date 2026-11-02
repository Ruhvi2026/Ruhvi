// src/lib/chat/voice-types.ts
//
// Typed contracts for Ru Chat Voice Notes, Speech-to-Text, and Cloudinary 45-day retention lifecycle.

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
