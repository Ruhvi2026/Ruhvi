'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Volume2,
  Sparkles,
  AlertCircle,
  RefreshCw,
  Orbit,
  Layers,
  Activity,
} from 'lucide-react';
import { Cofounder3DCharacter } from '@/components/ai/motion-engine/Cofounder3DCharacter';

export type VoiceConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'reconnecting'
  | 'error';

interface LiveVoiceVisualizerProps {
  state: VoiceConnectionState;
  isMuted: boolean;
  onToggleMute: () => void;
  onDisconnect: () => void;
  onStart: () => void;
  errorMessage?: string;
  roomName?: string;
  audioLevel?: number;
  interimTranscript?: string;
}

export function LiveVoiceVisualizer({
  state,
  isMuted,
  onToggleMute,
  onDisconnect,
  onStart,
  errorMessage,
  roomName,
  audioLevel = 0,
  interimTranscript = '',
}: LiveVoiceVisualizerProps) {
  const isLive =
    state === 'connected' || state === 'listening' || state === 'speaking';

  // Dynamic scale and glow based on real microphone / speaker audio level
  const glowOpacity = isLive ? 0.4 + audioLevel * 0.6 : 0.2;

  // Map VoiceConnectionState to AgentWorkState for 3D character
  const charState =
    state === 'speaking'
      ? 'speaking'
      : state === 'listening'
        ? 'listening'
        : state === 'connecting'
          ? 'thinking'
          : state === 'error'
            ? 'idle'
            : 'idle';

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-neutral-800 bg-[#121318] p-6 text-neutral-100 shadow-2xl backdrop-blur-2xl transition-all">
      {/* Background Starfield & Soft Ambient Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#262833_1px,transparent_1px)] opacity-30 [background-size:24px_24px]" />

      {/* Background Ambient Glow reacting to voice volume */}
      <div
        className={`pointer-events-none absolute -top-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl transition-all duration-300 ${
          state === 'speaking'
            ? 'bg-violet-600/35'
            : state === 'listening'
              ? 'bg-cyan-500/30'
              : state === 'error'
                ? 'bg-rose-500/25'
                : 'bg-violet-600/15'
        }`}
        style={{
          transform: `translateX(-50%) scale(${1 + audioLevel * 0.6})`,
          opacity: glowOpacity,
        }}
      />

      {/* Header Badge */}
      <div className="relative z-10 mb-2 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-4 py-1 text-xs font-medium shadow-sm backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-violet-400" />
        <span className="font-semibold text-neutral-200">
          Ruhvi AI Co-Founder • 3D Voice Core
        </span>
        {roomName ? (
          <span className="border-l border-neutral-700 pl-2 font-mono text-[11px] text-neutral-400">
            {roomName.split('-').slice(0, 3).join('-')}
          </span>
        ) : (
          <span className="border-l border-neutral-700 pl-2 font-mono text-[10px] text-violet-300">
            19 Agents Active
          </span>
        )}
      </div>

      {/* Central 3D AI Co-Founder Character */}
      <div className="relative my-2 flex w-full items-center justify-center">
        <div className="relative flex items-center justify-center">
          <Cofounder3DCharacter
            roleId="co_founder"
            name="Ruhvi AI Co-Founder"
            baseColor="#8b5cf6"
            accentColor="#a855f7"
            isApex={true}
            state={charState}
            audioLevel={audioLevel}
            size={320}
            showPodium={true}
            interactive={true}
          />
        </div>
      </div>

      {/* Orbiting Co-Workers HUD Status Pill Bar */}
      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-center gap-2 font-mono text-[10px]">
        <span className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-neutral-300">
          <Orbit className="h-3 w-3 text-violet-400" />
          <span>Apex Co-Founder</span>
        </span>
        <span className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-neutral-300">
          <Layers className="h-3 w-3 text-cyan-400" />
          <span>12 Core Workers</span>
        </span>
        <span className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/80 px-2.5 py-1 text-amber-300">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>6 Co-Workers</span>
        </span>
      </div>

      {/* Voice Wave Equalizer Bars (Active when Live) */}
      {isLive && !isMuted && (
        <div className="relative z-10 mb-2 flex h-6 items-center gap-1.5">
          {[0.6, 1.2, 0.8, 1.6, 0.7, 1.4, 0.9, 1.3].map((factor, idx) => {
            const barHeight = Math.max(
              4,
              Math.min(24, 4 + audioLevel * 22 * factor)
            );
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  state === 'speaking' ? 'bg-violet-400' : 'bg-cyan-400'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Live Hearing Transcript Display */}
      {interimTranscript && (
        <div className="animate-fade-in relative z-10 my-1 max-w-md rounded-xl border border-violet-500/30 bg-neutral-900/90 px-3.5 py-2 text-center shadow-lg">
          <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] italic text-violet-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-violet-400" />
            &ldquo;{interimTranscript}&rdquo;
          </p>
        </div>
      )}

      {/* Connection State Description */}
      <div className="relative z-10 my-1 min-h-[36px] text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-violet-400">
          {state === 'idle' && 'AI Co-Founder Ready'}
          {state === 'connecting' && 'Connecting Voice Session...'}
          {state === 'connected' && 'Connected • Ready for Voice'}
          {state === 'listening' &&
            (audioLevel > 0.08
              ? 'Receiving Voice Input...'
              : 'Listening to Founder...')}
          {state === 'speaking' && 'Co-Founder Speaking...'}
          {state === 'reconnecting' && 'Reconnecting live stream...'}
          {state === 'error' && 'Voice Connection Error'}
        </p>
        <p className="mt-0.5 max-w-sm text-xs text-neutral-400">
          {state === 'idle' &&
            'Engage in realtime voice conversation with your AI Co-Founder.'}
          {state === 'listening' &&
            'Speak naturally into your microphone. Workers sync in real-time.'}
          {state === 'speaking' &&
            'Co-Founder is responding. You can interrupt anytime.'}
          {state === 'error' &&
            (errorMessage || 'Failed to establish WebRTC voice session.')}
          {state === 'connecting' &&
            'Initializing microphone and AI voice session.'}
        </p>
      </div>

      {/* Control Buttons Bar */}
      <div className="relative z-10 mt-3 flex items-center gap-3">
        {!isLive ? (
          <button
            onClick={onStart}
            disabled={state === 'connecting'}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-xl shadow-violet-500/25 transition-all hover:from-violet-500 hover:to-amber-400 active:scale-95 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            <span>Start Voice Call</span>
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              className={`rounded-2xl border p-2.5 transition-all duration-200 ${
                isMuted
                  ? 'border-rose-500 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </button>

            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 rounded-2xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all hover:bg-rose-500 active:scale-95"
              title="End voice session"
            >
              <PhoneOff className="h-4 w-4" />
              <span>End Call</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
