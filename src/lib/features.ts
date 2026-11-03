/**
 * Feature flag helper for Unified Voice Notes, STT, Multi-Conversation & Worker Direct Chat.
 * Defaults to true unless explicitly disabled via environment variable ('false' or '0').
 */
export const FEATURES = {
  isVoiceNotesEnabled: (): boolean =>
    process.env.NEXT_PUBLIC_VOICE_NOTES_ENABLED !== 'false' &&
    process.env.NEXT_PUBLIC_VOICE_NOTES_ENABLED !== '0',

  isSpeechToTextEnabled: (): boolean =>
    process.env.NEXT_PUBLIC_SPEECH_TO_TEXT_ENABLED !== 'false' &&
    process.env.NEXT_PUBLIC_SPEECH_TO_TEXT_ENABLED !== '0',

  isCoFounderMultiConversationEnabled: (): boolean =>
    process.env.NEXT_PUBLIC_COFOUNDER_MULTI_CONVERSATION_ENABLED !== 'false' &&
    process.env.NEXT_PUBLIC_COFOUNDER_MULTI_CONVERSATION_ENABLED !== '0',

  isWorkerDirectChatEnabled: (): boolean =>
    process.env.NEXT_PUBLIC_WORKER_DIRECT_CHAT_ENABLED !== 'false' &&
    process.env.NEXT_PUBLIC_WORKER_DIRECT_CHAT_ENABLED !== '0',
} as const;
