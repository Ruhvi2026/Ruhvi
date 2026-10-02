import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

export interface VoiceTurn {
  id: string;
  speaker: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface VoiceSessionState {
  sessionId: string;
  userId: string;
  roomName: string;
  startTime: number;
  lastActive: number;
  turns: VoiceTurn[];
  extractedNotes: string[];
}

// In-memory low-latency cache for active sessions (0ms block on audio threads)
const activeSessions = new Map<string, VoiceSessionState>();

/**
 * Initialize session memory in fast RAM
 */
export function startVoiceSessionMemory(
  sessionId: string,
  userId: string,
  roomName: string
): VoiceSessionState {
  const session: VoiceSessionState = {
    sessionId,
    userId,
    roomName,
    startTime: Date.now(),
    lastActive: Date.now(),
    turns: [],
    extractedNotes: [],
  };
  activeSessions.set(sessionId, session);
  return session;
}

/**
 * Append a speech turn non-blockingly
 */
export function appendVoiceTurn(
  sessionId: string,
  speaker: 'user' | 'assistant',
  text: string
): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  session.turns.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    speaker,
    text,
    timestamp: Date.now(),
  });
  session.lastActive = Date.now();

  // Async flush to database in background (never blocks voice thread)
  queueMicrotask(() => {
    persistTurnLogAsync(session.userId, session.sessionId, speaker, text).catch(
      () => {}
    );
  });
}

/**
 * Get active session context for brain injection
 */
export function getSessionContext(sessionId: string): VoiceSessionState | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Background non-blocking persistence to Supabase
 */
async function persistTurnLogAsync(
  userId: string,
  sessionId: string,
  speaker: string,
  text: string
) {
  try {
    const supabase = getServiceClient();
    await supabase.from('ai_logs').insert({
      user_id: userId,
      feature: 'co_founder_voice',
      prompt: speaker === 'user' ? text : '[Voice Turn]',
      response: speaker === 'assistant' ? text : '[User Voice Input]',
      tokens_total: Math.ceil(text.length / 4),
      latency_ms: 150,
      metadata: { sessionId, speaker, channel: 'livekit_gemini_voice' },
    });
  } catch (err) {
    // Non-blocking background log error — silently ignore to protect audio flow
  }
}

/**
 * Complete session and write audit log
 */
export async function endVoiceSessionMemory(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  const durationSec = Math.round((Date.now() - session.startTime) / 1000);

  // Background audit log
  try {
    await logAuditEvent({
      actorId: session.userId,
      portal: 'admin',
      action: 'co_founder_voice_session_completed',
      entityType: 'co_founder_session',
      entityId: sessionId,
      changes: {
        roomName: session.roomName,
        durationSeconds: durationSec,
        turnsCount: session.turns.length,
      },
    });
  } catch {}

  activeSessions.delete(sessionId);
}
