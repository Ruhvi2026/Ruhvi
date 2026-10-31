'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';
import { VoiceConnectionState } from '@/components/co-founder/LiveVoiceVisualizer';
import { ChatMessageItem } from '@/components/co-founder/VoiceTranscriptWindow';

export interface UseVoiceSessionOptions {
  roomName?: string;
  userId?: string;
  userRole?: string;
  adminName?: string;
  language?: string;
  voiceURI?: string;
  speechRate?: number;
  speechPitch?: number;
  voiceStyle?: 'spoken_bengali' | 'banglish' | 'standard';
  autoBargeIn?: boolean; // default: true
  interruptionThreshold?: number; // default: 0.15
  onTranscript?: (
    speaker: 'user' | 'assistant',
    text: string,
    metadata?: { provider?: string; model?: string; fallbackUsed?: boolean }
  ) => void;
  onError?: (err: Error) => void;
  onStateChange?: (state: VoiceConnectionState) => void;
}

export interface VoiceSessionTelemetryData {
  turnsCount: number;
  interruptionsCount: number;
  sessionDurationSeconds: number;
  lastTurnLatencyMs: number;
}

export interface UseVoiceSessionReturn {
  state: VoiceConnectionState;
  isMuted: boolean;
  roomName: string;
  audioLevel: number;
  frequencyData: Uint8Array;
  interimTranscript: string;
  messages: ChatMessageItem[];
  errorMessage: string;
  isLive: boolean;
  isFallback: boolean;
  fallbackReason: string;
  voiceMode: 'idle' | 'livekit' | 'fallback';
  telemetry: VoiceSessionTelemetryData;
  start: () => Promise<void>;
  disconnect: () => void;
  toggleMute: () => void;
  sendMessage: (text: string) => Promise<void>;
  bargeIn: () => void;
  testVoice: (customText?: string) => void;
}

/**
 * Normalizes multilingual text for natural text-to-speech cadence.
 */
export function normalizeSpeechText(rawText: string): string {
  if (!rawText) return '';
  return rawText
    .replace(/[*#_`~>]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\bএবং\b/g, 'আর')
    .replace(/ এবং /g, ' আর ')
    .replace(/₹\s*([0-9,]+)/g, '$1 টাকা')
    .replace(/INR\s*([0-9,]+)/gi, '$1 টাকা')
    .replace(/([0-9]+)\s*%/g, '$1 পার্সেন্ট')
    .replace(/([।!?.,])\1+/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Controller class managing WebRTC room transport, audio analysis,
 * VAD barge-in interruptions, and speech synthesis state.
 */
export class VoiceSessionClient {
  private options: UseVoiceSessionOptions;
  private state: VoiceConnectionState = 'idle';
  private muted = false;
  private roomName = '';
  private errorMessage = '';
  private audioLevel = 0;
  private frequencyData = new Uint8Array(16);
  private interimTranscript = '';
  private messages: ChatMessageItem[] = [];

  private telemetry: VoiceSessionTelemetryData = {
    turnsCount: 0,
    interruptionsCount: 0,
    sessionDurationSeconds: 0,
    lastTurnLatencyMs: 0,
  };

  private isFallback = false;
  private voiceMode: 'idle' | 'livekit' | 'fallback' = 'idle';
  private fallbackReason = '';

  private listeners: Set<() => void> = new Set();
  private sessionStartTime = 0;
  private turnStartTime = 0;
  private isSpeaking = false;

  private room: Room | null = null;
  private audioElements: HTMLAudioElement[] = [];
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private animFrameId: number | null = null;
  private recognition: any = null;

  constructor(options: UseVoiceSessionOptions = {}) {
    this.options = options;
    this.roomName = options.roomName || '';
  }

  getState(): VoiceConnectionState {
    return this.state;
  }

  isMuted(): boolean {
    return this.muted;
  }

  getRoomName(): string {
    return this.roomName;
  }

  getAudioLevel(): number {
    return this.audioLevel;
  }

  getFrequencyData(): Uint8Array {
    return this.frequencyData;
  }

  getInterimTranscript(): string {
    return this.interimTranscript;
  }

  getMessages(): ChatMessageItem[] {
    return [...this.messages];
  }

  getErrorMessage(): string {
    return this.errorMessage;
  }

  getTelemetry(): VoiceSessionTelemetryData {
    return { ...this.telemetry };
  }

  isFallbackMode(): boolean {
    return this.isFallback;
  }

  getVoiceMode(): 'idle' | 'livekit' | 'fallback' {
    return this.voiceMode;
  }

  getFallbackReason(): string {
    return this.fallbackReason;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  private setState(newState: VoiceConnectionState): void {
    if (this.state === newState) return;
    this.state = newState;
    this.options.onStateChange?.(newState);
    this.notify();
  }

  /**
   * Sub-50ms barge-in interruption protocol.
   */
  bargeIn(): void {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.audioElements.forEach((el) => {
      try {
        el.pause();
        el.currentTime = 0;
      } catch {}
    });

    this.isSpeaking = false;
    this.audioLevel = 0;
    this.interimTranscript = '';
    this.telemetry.interruptionsCount++;
    this.setState('listening');
    this.notify();
  }

  /**
   * Toggle microphone mute state.
   */
  toggleMute(): void {
    this.muted = !this.muted;
    if (this.micStream) {
      this.micStream.getAudioTracks().forEach((track) => {
        track.enabled = !this.muted;
      });
    }
    if (this.room) {
      this.room.localParticipant.setMicrophoneEnabled(!this.muted);
    }
    this.notify();
  }

  /**
   * Release media resources.
   */
  cleanup(): void {
    if (this.animFrameId && typeof cancelAnimationFrame !== 'undefined') {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.audioElements.forEach((el) => {
      try {
        el.pause();
        el.srcObject = null;
        el.remove();
      } catch {}
    });
    this.audioElements = [];

    if (this.micStream) {
      this.micStream.getTracks().forEach((t) => t.stop());
      this.micStream = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch {}
      this.recognition = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    this.audioLevel = 0;
    this.frequencyData = new Uint8Array(16);
    this.interimTranscript = '';
    this.notify();
  }

  /**
   * Disconnects active room and cleans up.
   */
  disconnect(): void {
    if (this.room) {
      try {
        this.room.disconnect();
      } catch {}
      this.room = null;
    }
    this.cleanup();
    this.roomName = '';
    this.isFallback = false;
    this.voiceMode = 'idle';
    this.fallbackReason = '';
    this.setState('idle');
  }

  /**
   * Connect and start voice session.
   */
  async start(): Promise<void> {
    try {
      this.setState('connecting');
      this.errorMessage = '';
      this.sessionStartTime = Date.now();

      // 1. Microphone access with permission and device error categorization
      if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          this.micStream = stream;
          this.initAudioAnalyzer(stream);
        } catch (micErr: any) {
          let errorMsg = 'Failed to access microphone';
          if (
            micErr.name === 'NotAllowedError' ||
            micErr.name === 'PermissionDeniedError'
          ) {
            errorMsg =
              'Microphone access denied. Please allow microphone permissions in your browser to speak with the AI Co-Founder.';
          } else if (
            micErr.name === 'NotFoundError' ||
            micErr.name === 'DevicesNotFoundError'
          ) {
            errorMsg =
              'No microphone detected. Please connect an audio input device to use voice mode.';
          } else if (micErr.message) {
            errorMsg = micErr.message;
          }
          this.errorMessage = errorMsg;
          this.setState('error');
          this.options.onError?.(new Error(errorMsg));
          this.cleanup();
          return;
        }
      }

      // 2. Fetch LiveKit room credentials
      let token = '';
      let url = '';
      let room = this.options.roomName || `room-founder-${Date.now()}`;

      try {
        const resp = await fetch('/api/admin/co-founder/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomName: room }),
        });

        if (resp.ok) {
          const data = await resp.json();
          token = data.token;
          url = data.url;
          room = data.roomName || room;
        }
      } catch (err: any) {
        console.warn(
          '[VoiceSessionClient] Session credentials warning:',
          err?.message
        );
      }

      this.roomName = room;

      // 3. Connect LiveKit room
      if (token && url) {
        try {
          const lkRoom = new Room({ adaptiveStream: true, dynacast: true });

          lkRoom.on(RoomEvent.TrackSubscribed, (track: Track) => {
            if (track.kind === Track.Kind.Audio) {
              const el = track.attach();
              this.audioElements.push(el);
              this.setState('speaking');
            }
          });

          lkRoom.on(RoomEvent.Disconnected, () => {
            this.disconnect();
          });

          await lkRoom.connect(url, token);
          this.room = lkRoom;

          if (this.micStream) {
            const audioTrack = this.micStream.getAudioTracks()[0];
            if (audioTrack) {
              await lkRoom.localParticipant.publishTrack(audioTrack);
            }
          }

          this.isFallback = false;
          this.voiceMode = 'livekit';
          this.fallbackReason = '';
        } catch (connErr: any) {
          this.isFallback = true;
          this.voiceMode = 'fallback';
          this.fallbackReason =
            connErr?.message || 'LiveKit Cloud connection failed';
        }
      } else {
        this.isFallback = true;
        this.voiceMode = 'fallback';
        this.fallbackReason =
          'LiveKit credentials unavailable; running in Web Speech fallback mode';
      }

      this.setState('connected');
      this.setState('listening');
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to start voice call';
      this.setState('error');
      this.options.onError?.(err);
    }
  }

  /**
   * Initializes Web Audio Analyser node for frequency and volume tracking.
   */
  private initAudioAnalyzer(stream: MediaStream): void {
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      this.audioContext = ctx;
      this.analyser = analyser;

      const buffer = new Uint8Array(analyser.frequencyBinCount);

      const loop = () => {
        if (!this.analyser) return;
        this.analyser.getByteFrequencyData(buffer);

        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const norm = buffer[i] / 255;
          sum += norm * norm;
        }
        const rms = Math.sqrt(sum / buffer.length);
        this.audioLevel = rms;
        this.frequencyData = new Uint8Array(buffer.slice(0, 16));

        // Auto barge-in check
        const threshold = this.options.interruptionThreshold ?? 0.15;
        if (
          (this.options.autoBargeIn ?? true) &&
          this.isSpeaking &&
          rms >= threshold
        ) {
          this.bargeIn();
        }

        if (typeof requestAnimationFrame !== 'undefined') {
          this.animFrameId = requestAnimationFrame(loop);
        }
      };

      loop();
    } catch {}
  }

  /**
   * Send message to Co-Founder Brain API and speak response aloud.
   */
  async sendMessage(text: string): Promise<void> {
    if (!text || !text.trim()) return;
    const userText = text.trim();

    const userMsg: ChatMessageItem = {
      id: `msg-${Date.now()}-u`,
      sender: 'user',
      text: userText,
      timestamp: Date.now(),
    };
    this.messages.push(userMsg);
    this.options.onTranscript?.('user', userText);

    this.bargeIn();
    this.turnStartTime = Date.now();
    this.setState('speaking');

    try {
      const resp = await fetch('/api/admin/co-founder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userText }],
          channel: 'voice',
          voiceStyle: this.options.voiceStyle || 'spoken_bengali',
        }),
      });

      if (!resp.ok) {
        throw new Error(`Chat API responded with HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const replyText =
        data?.reply ||
        data?.message ||
        'I have processed your audio instruction.';

      const latency = Date.now() - this.turnStartTime;
      this.telemetry.turnsCount++;
      this.telemetry.lastTurnLatencyMs = latency;

      const assistantMsg: ChatMessageItem = {
        id: `msg-${Date.now()}-a`,
        sender: 'assistant',
        role: 'cofounder',
        text: replyText,
        timestamp: Date.now(),
      };
      this.messages.push(assistantMsg);
      this.options.onTranscript?.('assistant', replyText);

      this.speak(replyText);
    } catch (err: any) {
      this.errorMessage = err?.message || 'Failed to process voice instruction';
      this.setState('error');
      this.options.onError?.(err);
    }
  }

  /**
   * Speak response aloud via SpeechSynthesis.
   */
  speak(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const clean = normalizeSpeechText(text);
    if (!clean) return;

    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.pitch = this.options.speechPitch ?? 1.0;
    utterance.rate = this.options.speechRate ?? 0.94;

    const voices = window.speechSynthesis.getVoices();
    const isBengali = /[\u0980-\u09FF]/.test(clean);
    const isHindi = /[\u0900-\u097F]/.test(clean);

    let chosenVoice: SpeechSynthesisVoice | null = null;
    if (this.options.voiceURI && this.options.voiceURI !== 'auto') {
      chosenVoice =
        voices.find(
          (v) =>
            v.voiceURI === this.options.voiceURI ||
            v.name === this.options.voiceURI
        ) || null;
    }

    if (!chosenVoice) {
      if (isBengali) {
        chosenVoice =
          voices.find((v) => v.lang.toLowerCase().startsWith('bn')) ||
          voices.find((v) => v.lang.includes('IN')) ||
          null;
      } else if (isHindi) {
        chosenVoice =
          voices.find((v) => v.lang.startsWith('hi')) ||
          voices.find((v) => v.lang.includes('IN')) ||
          null;
      } else {
        chosenVoice =
          voices.find((v) => v.lang.includes('en') && v.lang.includes('IN')) ||
          voices.find((v) => v.lang.startsWith('en')) ||
          voices[0] ||
          null;
      }
    }

    if (chosenVoice) {
      utterance.voice = chosenVoice;
      utterance.lang = chosenVoice.lang;
    }

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.setState('speaking');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.setState('listening');
      this.audioLevel = 0;
    };

    utterance.onerror = () => {
      this.isSpeaking = false;
      this.setState('listening');
      this.audioLevel = 0;
    };

    window.speechSynthesis.speak(utterance);
  }

  /**
   * Diagnostic sample sentence preview.
   */
  testVoice(customText?: string): void {
    const sample =
      customText ||
      (this.options.voiceStyle === 'spoken_bengali'
        ? 'নমস্কার Founder! আমি রূহভির কোফাউন্ডার। আজকের ব্যবসার পরিস্থিতি আর স্টক দেখতে চান?'
        : this.options.voiceStyle === 'banglish'
          ? 'Nomoshkar Founder! Ami Ruhvi co-founder. Aajker sales aar orders dekhbo ki?'
          : 'Hello Founder! I am your AI Co-Founder at Ruhvi. Ready to review sales and stock.');
    this.speak(sample);
  }
}

/**
 * React hook wrapper over VoiceSessionClient.
 */
export function useVoiceSession(
  options: UseVoiceSessionOptions = {}
): UseVoiceSessionReturn {
  const [client] = useState(() => new VoiceSessionClient(options));
  const [, setTick] = useState(0);

  useEffect(() => {
    const unsubscribe = client.subscribe(() => {
      setTick((t) => t + 1);
    });
    return () => {
      unsubscribe();
      client.cleanup();
    };
  }, [client]);

  const start = useCallback(() => client.start(), [client]);
  const disconnect = useCallback(() => client.disconnect(), [client]);
  const toggleMute = useCallback(() => client.toggleMute(), [client]);
  const sendMessage = useCallback(
    (t: string) => client.sendMessage(t),
    [client]
  );
  const bargeIn = useCallback(() => client.bargeIn(), [client]);
  const testVoice = useCallback(
    (txt?: string) => client.testVoice(txt),
    [client]
  );

  return {
    state: client.getState(),
    isMuted: client.isMuted(),
    roomName: client.getRoomName(),
    audioLevel: client.getAudioLevel(),
    frequencyData: client.getFrequencyData(),
    interimTranscript: client.getInterimTranscript(),
    messages: client.getMessages(),
    errorMessage: client.getErrorMessage(),
    isLive:
      client.getState() === 'connected' ||
      client.getState() === 'listening' ||
      client.getState() === 'speaking',
    isFallback: client.isFallbackMode(),
    fallbackReason: client.getFallbackReason(),
    voiceMode: client.getVoiceMode(),
    telemetry: client.getTelemetry(),
    start,
    disconnect,
    toggleMute,
    sendMessage,
    bargeIn,
    testVoice,
  };
}
