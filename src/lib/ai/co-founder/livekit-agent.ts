/**
 * AI Co-Founder LiveKit Real-Time Audio Agent Protocol & Bi-Directional Streaming Engine
 *
 * Implements real-time audio room participation, bi-directional PCM streaming,
 * human voice activity detection (VAD), barge-in interruption handling,
 * and cognitive brain integration for the Ruhvi AI Co-Founder.
 */

import 'server-only';

import { getCoFounderSystemPrompt } from './brain';
import { enforceCoFounderRateLimit } from './rate-limiter';
import { executeCoFounderTool } from './tool-bridge';
import { getUserScopes } from '@/lib/auth/rbac';
import { getLiveKitConfig, LIVEKIT_ROOM_SETTINGS } from '@/lib/livekit/config';
import { createLiveKitToken } from '@/lib/livekit/token';
import { LiveKitAgentManager } from '@/lib/livekit/agent-dispatch';
import { GeminiLiveSession } from '@/lib/livekit/gemini-live';

export type VoiceAgentState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'interrupted'
  | 'error'
  | 'disconnected';

export interface AudioFormat {
  sampleRate: number; // 16000 or 24000 Hz
  channels: number; // 1 (mono)
  bitDepth: number; // 16 (PCM16 LE)
}

export interface VoiceAgentConfig {
  roomName: string;
  userId: string;
  userRole?: string;
  adminName?: string;
  language?: 'en' | 'bn' | 'hi';
  voiceName?: 'Aoede' | 'Kore' | 'Puck' | 'Charon' | 'Fenrir';
  silenceThresholdMs?: number; // default: 600ms
  energyThreshold?: number; // default: 0.015 (normalized RMS)
  interruptionThreshold?: number; // default: 0.025
  maxTurnDurationMs?: number; // default: 30000ms
}

export interface VoiceAgentMetrics {
  state: VoiceAgentState;
  turnsCompleted: number;
  interruptionsCount: number;
  totalAudioFramesReceived: number;
  totalAudioFramesSent: number;
  averageLatencyMs: number;
  lastTurnLatencyMs: number;
  speechDurationMs: number;
}

export interface VoiceAgentEvents {
  onStateChange?: (state: VoiceAgentState, previousState: VoiceAgentState) => void;
  onTranscriptionDelta?: (text: string, isFinal: boolean) => void;
  onAudioOutput?: (base64Pcm: string, sampleRate: number) => void;
  onResponseComplete?: (fullText: string) => void;
  onInterrupted?: () => void;
  onError?: (error: Error) => void;
  onDataMessage?: (payload: Record<string, any>) => void;
}

/**
 * Calculates Root Mean Square (RMS) energy of a 16-bit PCM little-endian buffer.
 */
export function calculatePcmRms(pcmBuffer: Buffer | Uint8Array): number {
  if (!pcmBuffer || pcmBuffer.length < 2) return 0;

  const view = new DataView(
    pcmBuffer.buffer,
    pcmBuffer.byteOffset,
    pcmBuffer.byteLength
  );
  const sampleCount = Math.floor(pcmBuffer.byteLength / 2);
  if (sampleCount === 0) return 0;

  let sumSquares = 0;
  for (let i = 0; i < sampleCount; i++) {
    const sample = view.getInt16(i * 2, true); // 16-bit signed PCM, Little-Endian
    const normalized = sample / 32768.0; // Normalize to [-1.0, 1.0]
    sumSquares += normalized * normalized;
  }

  return Math.sqrt(sumSquares / sampleCount);
}

/**
 * Real-Time Audio Agent Protocol for Co-Founder Voice Sessions.
 */
export class LiveKitVoiceAgent {
  private config: Required<VoiceAgentConfig>;
  private events: VoiceAgentEvents;
  private state: VoiceAgentState = 'idle';
  private agentManager: LiveKitAgentManager | null = null;
  private geminiLive: GeminiLiveSession | null = null;
  private metrics: VoiceAgentMetrics;

  // Voice Activity Detection (VAD) tracking
  private isUserSpeaking = false;
  private lastSpeechTimestamp = 0;
  private silenceTimer: NodeJS.Timeout | null = null;
  private accumulatedUserPcm: Buffer[] = [];
  private activeTurnStartTime = 0;

  constructor(config: VoiceAgentConfig, events: VoiceAgentEvents = {}) {
    this.config = {
      roomName: config.roomName,
      userId: config.userId,
      userRole: config.userRole || 'founder',
      adminName: config.adminName || 'Founder',
      language: config.language || 'en',
      voiceName: config.voiceName || 'Aoede',
      silenceThresholdMs: config.silenceThresholdMs ?? 600,
      energyThreshold: config.energyThreshold ?? 0.015,
      interruptionThreshold: config.interruptionThreshold ?? 0.025,
      maxTurnDurationMs: config.maxTurnDurationMs ?? 30000,
    };
    this.events = events;

    this.metrics = {
      state: 'idle',
      turnsCompleted: 0,
      interruptionsCount: 0,
      totalAudioFramesReceived: 0,
      totalAudioFramesSent: 0,
      averageLatencyMs: 0,
      lastTurnLatencyMs: 0,
      speechDurationMs: 0,
    };
  }

  /**
   * Current lifecycle state of the voice agent.
   */
  getState(): VoiceAgentState {
    return this.state;
  }

  /**
   * Diagnostic runtime metrics.
   */
  getMetrics(): VoiceAgentMetrics {
    return { ...this.metrics, state: this.state };
  }

  /**
   * Transition to a new agent state and notify listeners.
   */
  private setState(newState: VoiceAgentState): void {
    if (this.state === newState) return;
    const previous = this.state;
    this.state = newState;
    this.metrics.state = newState;
    this.events.onStateChange?.(newState, previous);
  }

  /**
   * Connect to the LiveKit audio room and initialize the cognitive live session.
   */
  async connect(): Promise<{ success: boolean; token?: string; error?: string }> {
    try {
      this.setState('connecting');

      // 1. Check Voice tier rate limiting
      const rateLimitCheck = enforceCoFounderRateLimit(this.config.userId, {
        tier: 'voice',
        role: this.config.userRole,
      });

      if (!rateLimitCheck.success) {
        const error = new Error(
          `Voice rate limit exceeded. Please retry in ${rateLimitCheck.result.retryAfterSeconds}s.`
        );
        this.setState('error');
        this.events.onError?.(error);
        return { success: false, error: error.message };
      }

      // 2. Fetch live system prompt configured specifically for conversational voice
      const systemPrompt = await getCoFounderSystemPrompt({
        userId: this.config.userId,
        userRole: this.config.userRole,
        adminName: this.config.adminName,
        channel: 'voice',
        language: this.config.language,
      });

      // 3. Initialize LiveKit Agent Manager if server config exists
      let agentToken = '';
      try {
        const liveKitConfig = getLiveKitConfig();
        if (liveKitConfig.apiKey && liveKitConfig.url) {
          this.agentManager = new LiveKitAgentManager();
          await this.agentManager.ensureRoom(this.config.roomName);
          agentToken = await this.agentManager.createAgentToken(this.config.roomName);
        }
      } catch (err: any) {
        console.warn(
          '[LiveKitVoiceAgent] LiveKit credentials not present, running in direct-bridge audio mode:',
          err?.message
        );
      }

      // 4. Initialize Gemini Multimodal Live Session if API key configured
      const geminiApiKey =
        process.env.GEMINI_LIVE_API_KEY || process.env.GEMINI_API_KEY;

      if (geminiApiKey) {
        const scopes = await getUserScopes(this.config.userId);

        this.geminiLive = new GeminiLiveSession(
          {
            apiKey: geminiApiKey,
            voiceName: this.config.voiceName,
            systemInstruction: systemPrompt,
          },
          {
            onAudioData: (base64Pcm) => {
              this.metrics.totalAudioFramesSent++;
              this.setState('speaking');
              this.events.onAudioOutput?.(base64Pcm, 24000);
            },
            onTextDelta: (text) => {
              this.events.onTranscriptionDelta?.(text, false);
            },
            onInterrupted: () => {
              this.handleInterruption();
            },
            onTurnComplete: () => {
              this.handleTurnComplete();
            },
            onToolCall: async (functionCalls) => {
              for (const fc of functionCalls) {
                try {
                  const result = await executeCoFounderTool(
                    fc.name,
                    fc.args,
                    scopes
                  );
                  this.geminiLive?.sendToolResponse([
                    { id: fc.id, name: fc.name, response: result },
                  ]);
                } catch (toolErr: any) {
                  this.geminiLive?.sendToolResponse([
                    {
                      id: fc.id,
                      name: fc.name,
                      response: { error: toolErr?.message || 'Tool failed' },
                    },
                  ]);
                }
              }
            },
            onError: (err) => {
              this.events.onError?.(err);
            },
          }
        );

        try {
          await this.geminiLive.connect();
        } catch (connErr: any) {
          console.warn(
            '[LiveKitVoiceAgent] Gemini Live WebSocket connect deferred or fallback active:',
            connErr?.message
          );
        }
      }

      this.setState('connected');
      this.setState('listening');
      return { success: true, token: agentToken };
    } catch (error: any) {
      this.setState('error');
      this.events.onError?.(error);
      return { success: false, error: error?.message || 'Failed to connect voice agent' };
    }
  }

  /**
   * Ingest an incoming PCM audio frame from the participant's microphone.
   * Performs VAD energy analysis, barge-in detection, and media forwarding.
   */
  pushAudioFrame(pcmBuffer: Buffer | Uint8Array): void {
    if (this.state === 'disconnected' || this.state === 'error') return;

    this.metrics.totalAudioFramesReceived++;
    const now = Date.now();
    const rms = calculatePcmRms(pcmBuffer);

    // 1. Barge-In Interruption Check:
    // If agent is speaking and participant speaks with energy above threshold, interrupt!
    if (this.state === 'speaking' && rms >= this.config.interruptionThreshold) {
      this.handleInterruption();
    }

    // 2. Voice Activity Detection (VAD) Logic:
    if (rms >= this.config.energyThreshold) {
      if (!this.isUserSpeaking) {
        this.isUserSpeaking = true;
        this.activeTurnStartTime = now;
        this.setState('listening');
      }

      this.lastSpeechTimestamp = now;
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }

      // Collect audio buffer
      const buf = Buffer.isBuffer(pcmBuffer)
        ? pcmBuffer
        : Buffer.from(pcmBuffer.buffer, pcmBuffer.byteOffset, pcmBuffer.byteLength);
      this.accumulatedUserPcm.push(buf);

      // Forward live audio to Gemini Live if active
      if (this.geminiLive) {
        this.geminiLive.sendRealtimeAudio(buf.toString('base64'));
      }
    } else if (this.isUserSpeaking) {
      // Silence detected during an active speaking turn
      if (!this.silenceTimer) {
        this.silenceTimer = setTimeout(() => {
          this.finalizeUserSpeechTurn();
        }, this.config.silenceThresholdMs);
      }
    }
  }

  /**
   * Finalizes the user's speech turn after silence threshold elapses.
   */
  private finalizeUserSpeechTurn(): void {
    if (!this.isUserSpeaking) return;

    this.isUserSpeaking = false;
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    const turnDuration = Date.now() - this.activeTurnStartTime;
    this.metrics.speechDurationMs += turnDuration;
    this.setState('thinking');

    // Notify listeners of turn end
    this.events.onTranscriptionDelta?.('', true);
  }

  /**
   * Ingest text directly into the active voice conversation turn.
   */
  pushUserText(text: string): void {
    if (!text || this.state === 'disconnected') return;

    this.setState('thinking');
    this.activeTurnStartTime = Date.now();

    if (this.geminiLive) {
      this.geminiLive.sendTextMessage(text);
    } else {
      // Direct synthesis simulation fallback
      this.synthesizeTextResponse(text);
    }
  }

  /**
   * Interruption handler (Barge-in).
   */
  interrupt(): void {
    this.handleInterruption();
  }

  private handleInterruption(): void {
    this.metrics.interruptionsCount++;
    this.setState('interrupted');
    this.events.onInterrupted?.();
    this.setState('listening');
  }

  private handleTurnComplete(): void {
    this.metrics.turnsCompleted++;
    const turnLatency = Date.now() - this.activeTurnStartTime;
    this.metrics.lastTurnLatencyMs = turnLatency;

    const currentTotal =
      this.metrics.averageLatencyMs * (this.metrics.turnsCompleted - 1) +
      turnLatency;
    this.metrics.averageLatencyMs = Math.round(
      currentTotal / this.metrics.turnsCompleted
    );

    this.setState('listening');
  }

  /**
   * Direct text response synthesis for test/fallback environments without live audio sockets.
   */
  private async synthesizeTextResponse(userText: string): Promise<void> {
    try {
      const responseText = `I have received your audio instruction: "${userText.slice(0, 50)}". Processing in voice mode.`;

      const latency = Date.now() - this.activeTurnStartTime;
      this.metrics.lastTurnLatencyMs = latency;
      this.metrics.turnsCompleted++;

      this.setState('speaking');
      this.events.onAudioOutput?.('base64simulatedpcm', 24000);
      this.events.onTranscriptionDelta?.(responseText, true);
      this.events.onResponseComplete?.(responseText);
      this.setState('listening');

    } catch (err: any) {
      this.setState('error');
      this.events.onError?.(err);
    }
  }

  /**
   * Gracefully disconnect from audio room and release sessions.
   */
  disconnect(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }

    if (this.geminiLive) {
      this.geminiLive.disconnect();
      this.geminiLive = null;
    }

    this.accumulatedUserPcm = [];
    this.isUserSpeaking = false;
    this.setState('disconnected');
  }
}

/**
 * Factory helper to construct and initialize a LiveKit Voice Agent.
 */
export async function createLiveKitVoiceAgent(
  config: VoiceAgentConfig,
  events: VoiceAgentEvents = {}
): Promise<LiveKitVoiceAgent> {
  const agent = new LiveKitVoiceAgent(config, events);
  await agent.connect();
  return agent;
}
