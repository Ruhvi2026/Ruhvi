/**
 * AI Co-Founder Audio Session State Machine & Interruption Coordinator
 *
 * Implements deterministic session state transitions, sub-50ms barge-in playback
 * cancellation tokens, audio chunk FIFO buffering, latency telemetry tracking,
 * and cognitive memory synchronization for real-time voice sessions.
 */

import 'server-only';

import { writeCoFounderMemory } from './memory';

export type VoiceSessionState =
  | 'idle'
  | 'user_speaking'
  | 'agent_thinking'
  | 'agent_speaking'
  | 'interrupted'
  | 'error'
  | 'closed';

export interface AudioChunk {
  id: string;
  generationId: number;
  data: string | Buffer; // Base64 PCM or binary buffer
  durationMs?: number;
  sampleRate?: number;
  isFinal?: boolean;
  timestamp: number;
}

export interface VoiceTurn {
  id: string;
  generationId?: number;
  role: 'user' | 'agent';
  state: 'in_progress' | 'completed' | 'interrupted' | 'failed';
  text?: string;
  audioFramesCount?: number;
  durationMs?: number;
  latencyMs?: number; // Time from user finish to agent first speech/audio
  startedAt: number;
  endedAt?: number;
}

export interface VoiceSessionConfig {
  sessionId?: string;
  userId: string;
  roomName?: string;
  userRole?: string;
  adminName?: string;
  language?: 'en' | 'bn' | 'hi';
  maxQueueSize?: number; // Default: 100 audio chunks
  autoFlushOnInterrupt?: boolean; // Default: true
}

export interface VoiceSessionTelemetry {
  sessionId: string;
  userId: string;
  roomName: string;
  state: VoiceSessionState;
  currentGenerationId: number;
  totalTurns: number;
  userTurns: number;
  agentTurns: number;
  interruptionsCount: number;
  queuedAudioChunks: number;
  totalUserDurationMs: number;
  totalAgentDurationMs: number;
  averageLatencyMs: number;
  lastLatencyMs: number;
  timeToFirstAudioChunkMs: number;
  sessionDurationMs: number;
  startedAt: number;
}

export interface VoiceSessionSummary {
  sessionId: string;
  userId: string;
  durationSeconds: number;
  totalTurns: number;
  userTurns: number;
  agentTurns: number;
  interruptionsCount: number;
  averageLatencyMs: number;
  conversationExcerpt: string;
}

export interface VoiceSessionEvents {
  onStateChange?: (toState: VoiceSessionState, fromState: VoiceSessionState) => void;
  onPlaybackFlush?: (
    generationId: number,
    reason: 'barge_in' | 'manual_cancel' | 'session_closed'
  ) => void;
  onTurnStart?: (turn: VoiceTurn) => void;
  onTurnComplete?: (turn: VoiceTurn) => void;
  onError?: (error: Error) => void;
}

const VALID_TRANSITIONS: Record<VoiceSessionState, VoiceSessionState[]> = {
  idle: ['user_speaking', 'agent_thinking', 'error', 'closed'],
  user_speaking: ['agent_thinking', 'idle', 'error', 'closed'],
  agent_thinking: [
    'agent_speaking',
    'interrupted',
    'user_speaking',
    'idle',
    'error',
    'closed',
  ],
  agent_speaking: [
    'interrupted',
    'user_speaking',
    'idle',
    'error',
    'closed',
  ],
  interrupted: [
    'user_speaking',
    'idle',
    'agent_thinking',
    'error',
    'closed',
  ],
  error: ['idle', 'closed'],
  closed: [],
};

/**
 * Voice Session Coordinator managing audio states, turn tracking,
 * and low-latency barge-in playback cancellation.
 */
export class VoiceSessionCoordinator {
  private config: Required<VoiceSessionConfig>;
  private events: VoiceSessionEvents;

  private state: VoiceSessionState = 'idle';
  private currentGenerationId = 0;
  private audioQueue: AudioChunk[] = [];
  private turns: VoiceTurn[] = [];

  private activeTurn: VoiceTurn | null = null;
  private userSpeechStartTime = 0;
  private agentThinkingStartTime = 0;
  private agentSpeakingStartTime = 0;

  private totalUserDurationMs = 0;
  private totalAgentDurationMs = 0;
  private interruptionsCount = 0;
  private totalLatencyMs = 0;
  private latencySamplesCount = 0;
  private lastLatencyMs = 0;
  private timeToFirstAudioChunkMs = 0;
  private sessionStartTime: number;

  constructor(config: VoiceSessionConfig, events: VoiceSessionEvents = {}) {
    this.config = {
      sessionId:
        config.sessionId ||
        `voice-sess-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: config.userId,
      roomName: config.roomName || `room-${config.userId.slice(0, 8)}`,
      userRole: config.userRole || 'founder',
      adminName: config.adminName || 'Founder',
      language: config.language || 'en',
      maxQueueSize: config.maxQueueSize ?? 100,
      autoFlushOnInterrupt: config.autoFlushOnInterrupt ?? true,
    };
    this.events = events;
    this.sessionStartTime = Date.now();
  }

  /**
   * Current session lifecycle state.
   */
  getState(): VoiceSessionState {
    return this.state;
  }

  /**
   * Unique session ID.
   */
  getSessionId(): string {
    return this.config.sessionId;
  }

  /**
   * Current active speech generation ID.
   */
  getCurrentGenerationId(): number {
    return this.currentGenerationId;
  }

  /**
   * Validates whether target state transition is allowed.
   */
  canTransitionTo(targetState: VoiceSessionState): boolean {
    if (this.state === targetState) return true;
    const allowed = VALID_TRANSITIONS[this.state] || [];
    return allowed.includes(targetState);
  }

  /**
   * Transitions to a new session state with strict state machine validation.
   */
  transitionTo(targetState: VoiceSessionState): boolean {
    if (this.state === targetState) return true;

    if (!this.canTransitionTo(targetState)) {
      const err = new Error(
        `Invalid state transition: Cannot transition from '${this.state}' to '${targetState}'`
      );
      this.events.onError?.(err);
      return false;
    }

    const previousState = this.state;
    this.state = targetState;
    this.events.onStateChange?.(targetState, previousState);
    return true;
  }

  /**
   * Triggered when user begins speaking (e.g. from VAD detector).
   * Automatically executes barge-in if agent was currently speaking or thinking.
   */
  startUserSpeaking(turnId?: string): { interrupted: boolean; turn: VoiceTurn } {
    let wasInterrupted = false;

    // Handle barge-in if agent is speaking or thinking
    if (this.state === 'agent_speaking' || this.state === 'agent_thinking') {
      this.handleBargeIn('barge_in');
      wasInterrupted = true;
    }

    this.transitionTo('user_speaking');

    const id = turnId || `turn-u-${Date.now()}`;
    this.userSpeechStartTime = Date.now();

    const turn: VoiceTurn = {
      id,
      role: 'user',
      state: 'in_progress',
      startedAt: this.userSpeechStartTime,
    };

    this.activeTurn = turn;
    this.turns.push(turn);
    this.events.onTurnStart?.(turn);

    return { interrupted: wasInterrupted, turn };
  }

  /**
   * Triggered when user stops speaking (e.g. after trailing silence window).
   * Moves state machine to 'agent_thinking'.
   */
  stopUserSpeaking(transcription?: string): VoiceTurn | null {
    if (this.state !== 'user_speaking') return null;

    const now = Date.now();
    const duration = now - this.userSpeechStartTime;
    this.totalUserDurationMs += duration;

    if (this.activeTurn && this.activeTurn.role === 'user') {
      this.activeTurn.state = 'completed';
      this.activeTurn.durationMs = duration;
      this.activeTurn.text = transcription || this.activeTurn.text;
      this.activeTurn.endedAt = now;
      this.events.onTurnComplete?.(this.activeTurn);
    }

    const completedTurn = this.activeTurn;
    this.activeTurn = null;

    // Transition to thinking
    this.startAgentThinking();

    return completedTurn;
  }

  /**
   * Triggered when agent begins cognitive thinking / LLM generation.
   */
  startAgentThinking(): boolean {
    const success = this.transitionTo('agent_thinking');
    if (success) {
      this.agentThinkingStartTime = Date.now();
    }
    return success;
  }

  /**
   * Triggered when agent begins speaking / outputting audio.
   * Increments generationId to invalidate any prior generation buffers.
   */
  startAgentSpeaking(
    text?: string,
    turnId?: string
  ): { generationId: number; turn: VoiceTurn } {
    this.currentGenerationId++;
    const genId = this.currentGenerationId;

    this.transitionTo('agent_speaking');
    this.agentSpeakingStartTime = Date.now();

    const latency =
      this.agentThinkingStartTime > 0
        ? this.agentSpeakingStartTime - this.agentThinkingStartTime
        : 0;

    this.lastLatencyMs = latency;
    this.totalLatencyMs += latency;
    this.latencySamplesCount++;

    const id = turnId || `turn-a-${Date.now()}`;
    const turn: VoiceTurn = {
      id,
      generationId: genId,
      role: 'agent',
      state: 'in_progress',
      text,
      latencyMs: latency,
      startedAt: this.agentSpeakingStartTime,
    };

    this.activeTurn = turn;
    this.turns.push(turn);
    this.events.onTurnStart?.(turn);

    return { generationId: genId, turn };
  }

  /**
   * Completes the agent's active speaking turn.
   */
  completeAgentSpeaking(fullText?: string): VoiceTurn | null {
    if (this.state !== 'agent_speaking') return null;

    const now = Date.now();
    const duration = now - this.agentSpeakingStartTime;
    this.totalAgentDurationMs += duration;

    if (this.activeTurn && this.activeTurn.role === 'agent') {
      this.activeTurn.state = 'completed';
      this.activeTurn.durationMs = duration;
      if (fullText) {
        this.activeTurn.text = fullText;
      }
      this.activeTurn.endedAt = now;
      this.events.onTurnComplete?.(this.activeTurn);
    }

    const completedTurn = this.activeTurn;
    this.activeTurn = null;

    this.transitionTo('idle');
    return completedTurn;
  }

  /**
   * Immediate Barge-In / Interruption Handler.
   * Clears playback queue instantly and marks current turn interrupted.
   */
  handleBargeIn(
    reason: 'barge_in' | 'manual_cancel' = 'barge_in'
  ): { flushedChunks: number; generationId: number } {
    this.interruptionsCount++;
    const interruptedGenId = this.currentGenerationId;

    if (this.activeTurn) {
      this.activeTurn.state = 'interrupted';
      this.activeTurn.endedAt = Date.now();
      if (this.activeTurn.startedAt) {
        this.activeTurn.durationMs =
          this.activeTurn.endedAt - this.activeTurn.startedAt;
      }
      this.events.onTurnComplete?.(this.activeTurn);
      this.activeTurn = null;
    }

    // Flush audio playback buffer
    let flushedCount = 0;
    if (this.config.autoFlushOnInterrupt) {
      flushedCount = this.flushPlaybackQueue(reason);
    }

    this.transitionTo('interrupted');
    return { flushedChunks: flushedCount, generationId: interruptedGenId };
  }

  /**
   * Enqueues an audio playback chunk.
   * Drops chunks from outdated generations (e.g. from previously interrupted turns).
   */
  enqueueAudioChunk(
    chunk: Omit<AudioChunk, 'generationId' | 'timestamp'> & {
      generationId?: number;
      timestamp?: number;
    }
  ): { enqueued: boolean; reason?: string } {
    const genId = chunk.generationId ?? this.currentGenerationId;

    // Discard stale audio chunks from past/cancelled generations
    if (genId !== this.currentGenerationId) {
      return {
        enqueued: false,
        reason: `stale_generation: chunk generation ${genId} does not match current active generation ${this.currentGenerationId}`,
      };
    }

    if (this.audioQueue.length >= this.config.maxQueueSize) {
      return {
        enqueued: false,
        reason: 'queue_overflow',
      };
    }

    const fullChunk: AudioChunk = {
      ...chunk,
      generationId: genId,
      timestamp: chunk.timestamp || Date.now(),
    };

    // Record time to first audio chunk for latency tracking
    if (
      this.audioQueue.length === 0 &&
      this.agentSpeakingStartTime > 0 &&
      this.timeToFirstAudioChunkMs === 0
    ) {
      this.timeToFirstAudioChunkMs =
        Date.now() - (this.agentThinkingStartTime || this.agentSpeakingStartTime);
    }

    this.audioQueue.push(fullChunk);

    if (this.activeTurn && this.activeTurn.role === 'agent') {
      this.activeTurn.audioFramesCount =
        (this.activeTurn.audioFramesCount || 0) + 1;
    }

    return { enqueued: true };
  }

  /**
   * Dequeues next audio chunk for playback emission.
   */
  dequeueAudioChunk(): AudioChunk | undefined {
    return this.audioQueue.shift();
  }

  /**
   * Peeks next audio chunk without removing from queue.
   */
  peekAudioChunk(): AudioChunk | undefined {
    return this.audioQueue[0];
  }

  /**
   * Number of pending audio chunks in queue.
   */
  getQueueLength(): number {
    return this.audioQueue.length;
  }

  /**
   * Instantly flushes audio playback queue.
   */
  flushPlaybackQueue(
    reason: 'barge_in' | 'manual_cancel' | 'session_closed' = 'manual_cancel'
  ): number {
    const count = this.audioQueue.length;
    this.audioQueue = [];
    this.events.onPlaybackFlush?.(this.currentGenerationId, reason);
    return count;
  }

  /**
   * Returns complete history of voice conversation turns.
   */
  getTurns(): VoiceTurn[] {
    return [...this.turns];
  }

  /**
   * Comprehensive session telemetry and latency metrics.
   */
  getTelemetry(): VoiceSessionTelemetry {
    const now = Date.now();
    const sessionDurationMs = now - this.sessionStartTime;

    const userTurns = this.turns.filter((t) => t.role === 'user').length;
    const agentTurns = this.turns.filter((t) => t.role === 'agent').length;

    const avgLatency =
      this.latencySamplesCount > 0
        ? Math.round(this.totalLatencyMs / this.latencySamplesCount)
        : 0;

    return {
      sessionId: this.config.sessionId,
      userId: this.config.userId,
      roomName: this.config.roomName,
      state: this.state,
      currentGenerationId: this.currentGenerationId,
      totalTurns: this.turns.length,
      userTurns,
      agentTurns,
      interruptionsCount: this.interruptionsCount,
      queuedAudioChunks: this.audioQueue.length,
      totalUserDurationMs: this.totalUserDurationMs,
      totalAgentDurationMs: this.totalAgentDurationMs,
      averageLatencyMs: avgLatency,
      lastLatencyMs: this.lastLatencyMs,
      timeToFirstAudioChunkMs: this.timeToFirstAudioChunkMs,
      sessionDurationMs,
      startedAt: this.sessionStartTime,
    };
  }

  /**
   * High-level summary of the voice session.
   */
  getSummary(): VoiceSessionSummary {
    const telemetry = this.getTelemetry();

    const conversationExcerpt = this.turns
      .filter((t) => t.text)
      .slice(-6)
      .map((t) => `${t.role.toUpperCase()}: ${t.text}`)
      .join('\n');

    return {
      sessionId: telemetry.sessionId,
      userId: telemetry.userId,
      durationSeconds: Math.round(telemetry.sessionDurationMs / 1000),
      totalTurns: telemetry.totalTurns,
      userTurns: telemetry.userTurns,
      agentTurns: telemetry.agentTurns,
      interruptionsCount: telemetry.interruptionsCount,
      averageLatencyMs: telemetry.averageLatencyMs,
      conversationExcerpt,
    };
  }

  /**
   * Persists voice session summary into Co-Founder long-term memory.
   */
  async persistSessionToMemory(): Promise<{ success: boolean; memoryId?: string }> {
    try {
      const summary = this.getSummary();
      if (summary.totalTurns === 0) {
        return { success: true };
      }

      const memory = await writeCoFounderMemory({
        userId: this.config.userId,
        category: 'general',
        key: `voice_session_${this.config.sessionId}`,
        value: `Voice Session (${summary.durationSeconds}s, ${summary.totalTurns} turns, ${summary.interruptionsCount} interruptions). Excerpt: ${summary.conversationExcerpt.slice(0, 300)}`,
        source: 'session_inference',
        confidence: 0.9,
        metadata: {
          sessionId: this.config.sessionId,
          turnsCount: summary.totalTurns,
          interruptions: summary.interruptionsCount,
          averageLatencyMs: summary.averageLatencyMs,
        },
      });

      return { success: memory.success, memoryId: memory.memoryId };
    } catch (err: any) {
      console.warn(
        '[VoiceSessionCoordinator] Memory persistence failed (non-critical):',
        err?.message
      );
      return { success: false };
    }
  }

  /**
   * Gracefully close session, flushing buffers and releasing state.
   */
  close(): void {
    if (this.state === 'closed') return;

    if (this.activeTurn) {
      this.activeTurn.state = 'completed';
      this.activeTurn.endedAt = Date.now();
      this.events.onTurnComplete?.(this.activeTurn);
      this.activeTurn = null;
    }

    this.flushPlaybackQueue('session_closed');
    this.transitionTo('closed');
  }
}
