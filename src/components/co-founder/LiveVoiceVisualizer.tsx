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

  // Compute dynamic scale and glow based on real microphone / speaker audio level
  const dynamicScale = isLive ? 1 + audioLevel * 0.45 : 1;
  const glowOpacity = isLive ? 0.3 + audioLevel * 0.7 : 0.2;

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-500/20 bg-neutral-950/80 p-8 text-neutral-100 shadow-2xl backdrop-blur-xl">
      {/* Background Ambient Glow reacting to voice volume */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl transition-all duration-300 ${
          state === 'speaking'
            ? 'bg-amber-500/30'
            : state === 'listening'
              ? 'bg-emerald-500/25'
              : state === 'error'
                ? 'bg-rose-500/20'
                : 'bg-amber-600/10'
        }`}
        style={{
          transform: `translateX(-50%) scale(${1 + audioLevel * 0.6})`,
          opacity: glowOpacity,
        }}
      />

      {/* Header Badge */}
      <div className="mb-6 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-neutral-300">
          Ruhvi AI Co-Founder • Realtime Voice
        </span>
        {roomName && (
          <span className="border-l border-neutral-700 pl-2 font-mono text-[11px] text-neutral-500">
            {roomName.split('-').slice(0, 3).join('-')}
          </span>
        )}
      </div>

      {/* Central Visualizer Orb with Voice-Reactive Dynamics & Grok Dots 3D Particle Body */}
      <div className="relative my-6 flex items-center justify-center">
        {/* Grok Dots 3D Particle Constellation Body */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <GrokDotsVoiceBody
            audioLevel={audioLevel}
            state={state === 'speaking' ? 'speaking' : state === 'listening' ? 'listening' : state === 'error' ? 'error' : 'idle'}
            size={230}
          />
        </div>

        {/* Pulsing Outer Dynamic Rings */}
        {isLive && (
          <>
            <div
              className={`absolute h-48 w-48 rounded-full border border-amber-400/30 transition-transform duration-75 pointer-events-none ${
                state === 'speaking'
                  ? 'border-amber-400/50'
                  : 'border-emerald-400/40'
              }`}
              style={{
                transform: `scale(${1 + audioLevel * 0.7})`,
                opacity: 0.2 + audioLevel * 0.6,
              }}
            />
            <div
              className={`absolute h-36 w-36 rounded-full blur-md transition-all duration-75 pointer-events-none ${
                state === 'speaking'
                  ? 'bg-gradient-to-tr from-amber-500/40 to-yellow-400/30'
                  : 'bg-gradient-to-tr from-emerald-500/30 to-teal-400/30'
              }`}
              style={{
                transform: `scale(${1 + audioLevel * 0.5})`,
              }}
            />
          </>
        )}

        {/* Core Center Orb */}
        <div
          className={`relative z-10 flex h-32 w-32 items-center justify-center rounded-full shadow-2xl transition-all duration-100 ${
            state === 'speaking'
              ? 'bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 shadow-amber-500/60'
              : state === 'listening'
                ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-emerald-700 shadow-emerald-500/50'
                : state === 'connecting' || state === 'reconnecting'
                  ? 'animate-spin bg-gradient-to-br from-neutral-700 to-neutral-800'
                  : state === 'error'
                    ? 'bg-gradient-to-br from-rose-600 to-red-800 shadow-rose-600/50'
                    : 'border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-black'
          }`}
          style={{
            transform: `scale(${dynamicScale})`,
          }}
        >
          {state === 'connecting' || state === 'reconnecting' ? (
            <RefreshCw className="h-8 w-8 animate-spin text-neutral-300" />
          ) : state === 'error' ? (
            <AlertCircle className="h-8 w-8 text-white" />
          ) : state === 'speaking' ? (
            <Volume2 className="h-10 w-10 animate-pulse text-neutral-950" />
          ) : isMuted ? (
            <MicOff className="h-9 w-9 text-rose-300" />
          ) : (
            <Mic className="h-9 w-9 text-white" />
          )}
        </div>
      </div>

      {/* Voice Wave Equalizer Bars (ChatGPT / Gemini style) */}
      {isLive && !isMuted && (
        <div className="mb-2 flex h-6 items-center gap-1.5">
          {[0.6, 1.2, 0.9, 1.4, 0.7].map((factor, idx) => {
            const barHeight = Math.max(
              4,
              Math.min(24, 4 + audioLevel * 20 * factor)
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
        <div className="animate-fade-in my-2 max-w-md rounded-lg border border-amber-500/30 bg-neutral-900/90 px-3 py-1.5 text-center">
          <p className="flex items-center justify-center gap-1.5 font-mono text-[11px] italic text-amber-300">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-400" />
            &ldquo;{interimTranscript}&rdquo;
          </p>
        </div>
      )}

      {/* Connection State Description */}
      <div className="my-2 min-h-[44px] text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          {state === 'idle' && 'Voice Session Idle'}
          {state === 'connecting' && 'Connecting Voice Session...'}
          {state === 'connected' && 'Connected • Ready'}
          {state === 'listening' &&
            (audioLevel > 0.08 ? 'Receiving Voice...' : 'Listening to you...')}
          {state === 'speaking' && 'Co-Founder Speaking...'}
          {state === 'reconnecting' && 'Reconnecting stream...'}
          {state === 'error' && 'Connection Error'}
        </p>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          {state === 'idle' &&
            'Click below to start a live voice conversation.'}
          {state === 'listening' &&
            'Speak naturally into your microphone. Say "Hello" or ask any business question.'}
          {state === 'speaking' &&
            'Co-Founder is responding. You can interrupt anytime.'}
          {state === 'error' &&
            (errorMessage || 'Failed to establish voice session.')}
          {state === 'connecting' &&
            'Initializing microphone and AI voice session.'}
        </p>
      </div>

      {/* Control Buttons Bar */}
      <div className="mt-4 flex items-center gap-4">
        {!isLive ? (
          <button
            onClick={onStart}
            disabled={state === 'connecting'}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-amber-500/25 transition-all duration-200 hover:bg-amber-400 disabled:opacity-50"
          >
            <Mic className="h-4 w-4" />
            <span>Start Voice Call</span>
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              className={`rounded-full border p-3.5 transition-all duration-200 ${
                isMuted
                  ? 'border-rose-500 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'border-neutral-700 bg-neutral-800 text-neutral-200 hover:bg-neutral-700'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? (
                <MicOff className="h-5 w-5" />
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </button>

            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 rounded-full bg-rose-600 px-5 py-3 text-sm font-medium text-white shadow-lg shadow-rose-600/30 transition-all duration-200 hover:bg-rose-500"
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
