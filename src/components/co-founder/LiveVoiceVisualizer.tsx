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
import { GrokDotsVoiceBody } from '@/components/ai/motion-engine/GrokDotsVoiceBody';

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
  const dynamicScale = isLive ? 1 + audioLevel * 0.35 : 1;
  const glowOpacity = isLive ? 0.35 + audioLevel * 0.65 : 0.2;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-500/25 bg-stone-950/90 p-6 text-stone-100 shadow-2xl backdrop-blur-xl transition-all">
      {/* Background Starfield Ambient Grid */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#333_1px,transparent_1px)] opacity-30 [background-size:20px_20px]" />

      {/* Background Ambient Glow reacting to voice volume */}
      <div
        className={`pointer-events-none absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl transition-all duration-300 ${
          state === 'speaking'
            ? 'bg-amber-500/35'
            : state === 'listening'
              ? 'bg-emerald-500/30'
              : state === 'error'
                ? 'bg-rose-500/25'
                : 'bg-amber-600/15'
        }`}
        style={{
          transform: `translateX(-50%) scale(${1 + audioLevel * 0.6})`,
          opacity: glowOpacity,
        }}
      />

      {/* Header Badge */}
      <div className="relative z-10 mb-2 flex items-center gap-2 rounded-full border border-stone-800 bg-stone-900/90 px-3.5 py-1 text-xs font-medium backdrop-blur-md">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="font-mono text-stone-300">
          Ruhvi AI Co-Founder • 3D Grok Motion
        </span>
        {roomName ? (
          <span className="border-l border-stone-700 pl-2 font-mono text-[11px] text-stone-400">
            {roomName.split('-').slice(0, 3).join('-')}
          </span>
        ) : (
          <span className="border-l border-stone-700 pl-2 font-mono text-[10px] text-amber-400">
            18 Worker Dots Active
          </span>
        )}
      </div>

      {/* Central Minimalist 3D Motion Body with Co-Worker Dots */}
      <div className="relative my-2 flex w-full items-center justify-center">
        {/* 3D Grok Dots & Orbiting Co-Workers Canvas */}
        <div className="relative flex items-center justify-center">
          <GrokDotsVoiceBody
            audioLevel={audioLevel}
            state={
              state === 'speaking'
                ? 'speaking'
                : state === 'listening'
                  ? 'listening'
                  : state === 'connecting'
                    ? 'connecting'
                    : state === 'error'
                      ? 'error'
                      : 'idle'
            }
            size={360}
            interactive={true}
          />

          {/* Minimalist Floating Center Indicator (Non-blocking, glassmorphic) */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full border transition-all duration-200 ${
                state === 'speaking'
                  ? 'border-amber-400/60 bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.4)] backdrop-blur-md'
                  : state === 'listening'
                    ? 'border-emerald-400/60 bg-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.4)] backdrop-blur-md'
                    : state === 'connecting' || state === 'reconnecting'
                      ? 'border-sky-400/40 bg-sky-950/30 backdrop-blur-md'
                      : state === 'error'
                        ? 'border-rose-500/60 bg-rose-950/40 backdrop-blur-md'
                        : 'border-amber-500/20 bg-stone-950/40 shadow-inner backdrop-blur-sm'
              }`}
              style={{
                transform: `scale(${dynamicScale})`,
              }}
            >
              {state === 'connecting' || state === 'reconnecting' ? (
                <RefreshCw className="h-6 w-6 animate-spin text-sky-400" />
              ) : state === 'error' ? (
                <AlertCircle className="h-6 w-6 text-rose-400" />
              ) : state === 'speaking' ? (
                <Volume2 className="h-7 w-7 animate-pulse text-amber-300" />
              ) : isMuted ? (
                <MicOff className="h-6 w-6 text-rose-400" />
              ) : (
                <Mic
                  className={`h-6 w-6 transition-colors ${
                    isLive ? 'text-emerald-300' : 'text-amber-400/80'
                  }`}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Orbiting Co-Workers HUD Status Pill Bar */}
      <div className="relative z-10 mb-3 flex flex-wrap items-center justify-center gap-1.5 font-mono text-[10px]">
        <span className="flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900/80 px-2 py-0.5 text-stone-400">
          <Orbit className="h-3 w-3 text-amber-400" />
          <span>Apex Co-Founder</span>
        </span>
        <span className="flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900/80 px-2 py-0.5 text-stone-400">
          <Layers className="h-3 w-3 text-sky-400" />
          <span>12 Core Workers</span>
        </span>
        <span className="flex items-center gap-1 rounded-md border border-stone-800 bg-stone-900/80 px-2 py-0.5 text-amber-300">
          <Activity className="h-3 w-3 text-emerald-400" />
          <span>6 Co-Worker Dots</span>
        </span>
        <span className="hidden text-stone-500 sm:inline">
          • Drag 3D swarm to rotate
        </span>
      </div>

      {/* Voice Wave Equalizer Bars (Active when Live) */}
      {isLive && !isMuted && (
        <div className="relative z-10 mb-2 flex h-5 items-center gap-1.5">
          {[0.5, 1.2, 0.8, 1.5, 0.7, 1.3, 0.9, 1.1].map((factor, idx) => {
            const barHeight = Math.max(
              4,
              Math.min(22, 4 + audioLevel * 20 * factor)
            );
            return (
              <span
                key={idx}
                className={`w-1 rounded-full transition-all duration-75 ${
                  state === 'speaking' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Live Hearing Transcript Display */}
      {interimTranscript && (
        <div className="animate-fade-in relative z-10 my-1 max-w-md rounded-lg border border-amber-500/30 bg-stone-900/90 px-3 py-1.5 text-center">
          <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] italic text-amber-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
            &ldquo;{interimTranscript}&rdquo;
          </p>
        </div>
      )}

      {/* Connection State Description */}
      <div className="relative z-10 my-1 min-h-[36px] text-center">
        <p className="font-mono text-xs font-semibold uppercase tracking-wider text-amber-400">
          {state === 'idle' && '3D AI Voice Swarm Idle'}
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
        <p className="mt-0.5 max-w-sm text-xs text-stone-400">
          {state === 'idle' &&
            'Click below to engage live voice with the AI Co-Founder & Worker swarm.'}
          {state === 'listening' &&
            'Speak naturally into your microphone. Co-workers sync in real-time.'}
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
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-2.5 text-xs font-bold text-stone-950 shadow-lg shadow-amber-500/25 transition-all duration-200 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            <span>Start Voice Call</span>
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              className={`rounded-xl border p-2.5 transition-all duration-200 ${
                isMuted
                  ? 'border-rose-500 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'border-stone-700 bg-stone-800 text-stone-200 hover:bg-stone-700'
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
              className="flex items-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-500"
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
