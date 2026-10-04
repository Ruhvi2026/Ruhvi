'use client';

import React from 'react';
import {
  Mic,
  MicOff,
  PhoneOff,
  Sparkles,
  Orbit,
  Layers,
  Activity,
} from 'lucide-react';
import { CoFounderCharacter, CharacterState } from './CoFounderCharacter';

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

  // Map VoiceConnectionState to CharacterState
  const charState: CharacterState =
    state === 'speaking'
      ? 'speaking'
      : state === 'listening'
        ? 'listening'
        : state === 'connecting'
          ? 'thinking'
          : state === 'error'
            ? 'error'
            : 'idle';

  return (
    <div className="relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-6 text-nm-light-textPrimary shadow-nm-flat backdrop-blur-2xl transition-all dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:text-nm-dark-textPrimary dark:shadow-nm-flat-dark">
      {/* Background Soft Ambient Glow reacting to voice volume */}
      <div
        className={`pointer-events-none absolute -top-16 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full blur-3xl transition-all duration-300 ${
          state === 'speaking'
            ? 'bg-violet-600/30'
            : state === 'listening'
              ? 'bg-cyan-500/25'
              : state === 'error'
                ? 'bg-rose-500/20'
                : 'bg-violet-600/10'
        }`}
        style={{
          transform: `translateX(-50%) scale(${1 + audioLevel * 0.5})`,
          opacity: glowOpacity,
        }}
      />

      {/* Header Badge */}
      <div className="relative z-10 mb-4 flex items-center gap-2 rounded-full border border-neutral-300/80 bg-nm-light-bg px-4 py-1.5 text-xs font-medium shadow-nm-flat backdrop-blur-md dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
        <Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-amber-400" />
        <span className="font-bold text-nm-light-textPrimary dark:text-white">
          AI Co-Founder • Real-Time Voice Spec
        </span>
        {roomName ? (
          <span className="border-l border-neutral-300 pl-2 font-mono text-[11px] text-nm-light-textSecondary dark:border-neutral-800 dark:text-neutral-400">
            {roomName.split('-').slice(0, 3).join('-')}
          </span>
        ) : (
          <span className="border-l border-neutral-300 pl-2 font-mono text-[10px] font-bold text-violet-700 dark:border-neutral-800 dark:text-violet-300">
            7 Agents Synchronized
          </span>
        )}
      </div>

      {/* Central Modular 3D AI Co-Founder Character Component */}
      <div className="relative my-3 flex w-full items-center justify-center">
        <CoFounderCharacter
          state={charState}
          audioLevel={audioLevel}
          size={290}
          messageBubble={
            interimTranscript ||
            (isLive
              ? undefined
              : 'Great idea! Let me check and get back to you...')
          }
          isMuted={isMuted}
          onMicToggle={isLive ? onToggleMute : undefined}
          interactive={true}
        />
      </div>

      {/* Orbiting Co-Workers HUD Status Pill Bar */}
      <div className="relative z-10 my-3 flex flex-wrap items-center justify-center gap-2 font-mono text-[10px]">
        <span className="flex items-center gap-1 rounded-xl border border-neutral-300/80 bg-nm-light-bg px-2.5 py-1 font-bold text-violet-700 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-violet-300 dark:shadow-nm-flat-dark">
          <Orbit className="h-3 w-3 text-violet-600 dark:text-violet-400" />
          <span>Apex Co-Founder</span>
        </span>
        <span className="flex items-center gap-1 rounded-xl border border-neutral-300/80 bg-nm-light-bg px-2.5 py-1 font-bold text-cyan-700 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-cyan-300 dark:shadow-nm-flat-dark">
          <Layers className="h-3 w-3 text-cyan-600 dark:text-cyan-400" />
          <span>6 Orbiting Workers</span>
        </span>
        <span className="flex items-center gap-1 rounded-xl border border-neutral-300/80 bg-nm-light-bg px-2.5 py-1 font-bold text-emerald-700 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-emerald-300 dark:shadow-nm-flat-dark">
          <Activity className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
          <span>WebRTC Voice Active</span>
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
                  state === 'speaking' ? 'bg-violet-500' : 'bg-cyan-400'
                }`}
                style={{ height: `${barHeight}px` }}
              />
            );
          })}
        </div>
      )}

      {/* Connection State Description */}
      <div className="relative z-10 my-1 min-h-[36px] text-center">
        <p className="font-mono text-xs font-bold uppercase tracking-wider text-violet-700 dark:text-amber-400">
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
        <p className="mt-0.5 max-w-sm text-xs text-nm-light-textSecondary dark:text-neutral-400">
          {state === 'idle' &&
            'Engage in real-time voice conversation with your AI Co-Founder.'}
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
            className="flex items-center gap-2 rounded-2xl border border-violet-500/30 bg-nm-gradient-light px-6 py-2.5 text-xs font-bold text-violet-700 shadow-nm-flat transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark"
          >
            <Mic className="h-4 w-4" />
            <span>Start Voice Call</span>
          </button>
        ) : (
          <>
            <button
              onClick={onToggleMute}
              className={`rounded-2xl border p-2.5 shadow-nm-flat transition-all duration-200 dark:shadow-nm-flat-dark ${
                isMuted
                  ? 'border-rose-500 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                  : 'border-neutral-300 bg-nm-light-bg text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-200'
              }`}
              title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
            >
              {isMuted ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4 text-violet-600 dark:text-amber-400" />
              )}
            </button>

            <button
              onClick={onDisconnect}
              className="flex items-center gap-2 rounded-2xl border border-rose-500/40 bg-rose-500/20 px-5 py-2.5 text-xs font-bold text-rose-600 shadow-nm-flat transition-all hover:bg-rose-500/30 active:scale-95 dark:text-rose-400 dark:shadow-nm-flat-dark"
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
