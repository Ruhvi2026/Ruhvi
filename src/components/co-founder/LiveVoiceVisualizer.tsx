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
} from 'lucide-react';

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
}

export function LiveVoiceVisualizer({
  state,
  isMuted,
  onToggleMute,
  onDisconnect,
  onStart,
  errorMessage,
  roomName,
}: LiveVoiceVisualizerProps) {
  const isLive =
    state === 'connected' || state === 'listening' || state === 'speaking';

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-2xl border border-amber-500/20 bg-neutral-950/80 p-8 text-neutral-100 shadow-2xl backdrop-blur-xl">
      {/* Background Ambient Glow */}
      <div
        className={`pointer-events-none absolute -top-24 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl transition-all duration-700 ${
          state === 'speaking'
            ? 'scale-125 bg-amber-500/20'
            : state === 'listening'
              ? 'scale-110 bg-emerald-500/15'
              : state === 'error'
                ? 'bg-rose-500/20'
                : 'bg-amber-600/10'
        }`}
      />

      {/* Header Badge */}
      <div className="mb-6 flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/90 px-3 py-1 text-xs font-medium">
        <Sparkles className="h-3.5 w-3.5 text-amber-400" />
        <span className="text-neutral-300">
          Ruhvi AI Co-Founder • Live Voice
        </span>
        {roomName && (
          <span className="border-l border-neutral-700 pl-2 font-mono text-[11px] text-neutral-500">
            {roomName.split('-').slice(0, 3).join('-')}
          </span>
        )}
      </div>

      {/* Central Visualizer Orb */}
      <div className="relative my-6 flex items-center justify-center">
        {/* Pulsing Outer Rings */}
        {isLive && (
          <>
            <div
              className={`absolute h-44 w-44 animate-ping rounded-full border border-amber-400/30 duration-1000 ${
                state === 'speaking' ? 'opacity-75' : 'opacity-25'
              }`}
            />
            <div
              className={`absolute h-36 w-36 rounded-full bg-gradient-to-tr from-amber-500/20 to-yellow-400/20 blur-md transition-transform duration-300 ${
                state === 'speaking' ? 'scale-125 animate-pulse' : 'scale-100'
              }`}
            />
          </>
        )}

        {/* Core Center Orb */}
        <div
          className={`relative z-10 flex h-28 w-28 items-center justify-center rounded-full shadow-xl transition-all duration-500 ${
            state === 'speaking'
              ? 'scale-105 bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/50'
              : state === 'listening'
                ? 'bg-gradient-to-br from-emerald-500 to-teal-700 shadow-emerald-500/40'
                : state === 'connecting' || state === 'reconnecting'
                  ? 'animate-spin bg-gradient-to-br from-neutral-700 to-neutral-800'
                  : state === 'error'
                    ? 'bg-gradient-to-br from-rose-600 to-red-800 shadow-rose-600/50'
                    : 'border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 shadow-black'
          }`}
        >
          {state === 'connecting' || state === 'reconnecting' ? (
            <RefreshCw className="h-8 w-8 animate-spin text-neutral-300" />
          ) : state === 'error' ? (
            <AlertCircle className="h-8 w-8 text-white" />
          ) : state === 'speaking' ? (
            <Volume2 className="h-10 w-10 animate-bounce text-neutral-950" />
          ) : isMuted ? (
            <MicOff className="h-9 w-9 text-rose-300" />
          ) : (
            <Mic className="h-9 w-9 text-white" />
          )}
        </div>
      </div>

      {/* Connection State Description */}
      <div className="my-3 min-h-[44px] text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
          {state === 'idle' && 'Voice Session Idle'}
          {state === 'connecting' && 'Connecting to LiveKit Cloud...'}
          {state === 'connected' && 'Connected • Ready'}
          {state === 'listening' && 'Listening to you...'}
          {state === 'speaking' && 'Co-Founder Speaking...'}
          {state === 'reconnecting' && 'Reconnecting stream...'}
          {state === 'error' && 'Connection Error'}
        </p>
        <p className="mt-1 max-w-sm text-xs text-neutral-400">
          {state === 'idle' &&
            'Click below to start a live voice conversation.'}
          {state === 'listening' &&
            'Speak naturally. You can interrupt anytime.'}
          {state === 'speaking' && 'Speaking. You can barge in anytime.'}
          {state === 'error' &&
            (errorMessage || 'Failed to establish voice session.')}
          {state === 'connecting' &&
            'Minting token and initializing WebRTC tracks.'}
        </p>
      </div>

      {/* Control Buttons Bar */}
      <div className="mt-6 flex items-center gap-4">
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
