'use client';

import React from 'react';
import { Mic, MicOff, Sparkles, Volume2 } from 'lucide-react';

export type CharacterState =
  'idle' | 'listening' | 'thinking' | 'speaking' | 'success' | 'error';

export interface CoFounderCharacterProps {
  state?: CharacterState;
  audioLevel?: number; // 0.0 to 1.0
  size?: number; // e.g. 240, 280, 320
  messageBubble?: string; // Speech bubble text above head
  isMuted?: boolean;
  onMicToggle?: () => void;
  interactive?: boolean;
  onClick?: () => void;
  className?: string;
}

export function CoFounderCharacter({
  state = 'idle',
  audioLevel = 0,
  size = 280,
  messageBubble,
  isMuted = false,
  onMicToggle,
  interactive = true,
  onClick,
  className = '',
}: CoFounderCharacterProps) {
  const isSpeaking = state === 'speaking';
  const isListening = state === 'listening';
  const isThinking = state === 'thinking';
  const isError = state === 'error';

  // Dynamic audio scale multiplier
  const audioPulse = Math.min(1, Math.max(0, audioLevel));
  const scaleEffect = 1 + audioPulse * 0.08;

  // Eye color mapping
  const eyeColorClass = isError
    ? 'bg-rose-400 shadow-[0_0_12px_#F43F5E]'
    : isListening
      ? 'bg-cyan-300 shadow-[0_0_14px_#22D3EE]'
      : isSpeaking
        ? 'bg-violet-200 shadow-[0_0_16px_#C4B5FD]'
        : 'bg-violet-300 shadow-[0_0_10px_#A78BFA]';

  return (
    <div
      className={`relative flex select-none flex-col items-center justify-center ${className}`}
      style={{ width: `${size}px` }}
    >
      {/* 1. Speech Bubble Overlay (if provided) */}
      {messageBubble && (
        <div className="animate-bounce-subtle relative z-30 mb-4 max-w-xs">
          <div className="relative rounded-2xl border border-neutral-200/90 bg-nm-light-bg px-4 py-2.5 text-xs font-semibold text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:shadow-nm-flat-dark">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-amber-400" />
              <p className="line-clamp-2 leading-tight">{messageBubble}</p>
            </div>
            {/* Bubble Arrow Tail */}
            <div className="absolute -bottom-2 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-neutral-200/90 bg-nm-light-bg dark:border-neutral-800 dark:bg-nm-dark-bg" />
          </div>
        </div>
      )}

      {/* 2. Audio-Reactive Radiating Wave Rings / Soundwave Arcs */}
      {(isSpeaking || isListening || audioPulse > 0.05) && (
        <div className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center">
          {/* Radial Expanding Wave 1 */}
          <div
            className={`absolute rounded-full border transition-all duration-300 ${
              isListening
                ? 'border-cyan-400/40 bg-cyan-400/10'
                : 'border-violet-500/40 bg-violet-500/10'
            }`}
            style={{
              width: `${size * (1.2 + audioPulse * 0.3)}px`,
              height: `${size * (1.2 + audioPulse * 0.3)}px`,
              opacity: 0.6 + audioPulse * 0.4,
              transform: `scale(${1 + audioPulse * 0.15})`,
            }}
          />

          {/* Radial Expanding Wave 2 */}
          <div
            className={`absolute rounded-full border border-dashed transition-all duration-500 ${
              isListening ? 'border-cyan-300/30' : 'border-violet-400/30'
            }`}
            style={{
              width: `${size * (1.45 + audioPulse * 0.4)}px`,
              height: `${size * (1.45 + audioPulse * 0.4)}px`,
              opacity: 0.4 + audioPulse * 0.3,
            }}
          />

          {/* Side Soundwave Arcs (Reference Spec) */}
          <div className="absolute flex w-full justify-between px-2">
            <div className="flex space-x-1">
              {[0.6, 1.0, 0.7].map((factor, idx) => (
                <div
                  key={idx}
                  className={`w-1 animate-pulse rounded-full transition-all ${
                    isListening ? 'bg-cyan-400' : 'bg-violet-400'
                  }`}
                  style={{
                    height: `${24 + audioPulse * 30 * factor}px`,
                    animationDelay: `${idx * 150}ms`,
                  }}
                />
              ))}
            </div>
            <div className="flex space-x-1">
              {[0.7, 1.0, 0.6].map((factor, idx) => (
                <div
                  key={idx}
                  className={`w-1 animate-pulse rounded-full transition-all ${
                    isListening ? 'bg-cyan-400' : 'bg-violet-400'
                  }`}
                  style={{
                    height: `${24 + audioPulse * 30 * factor}px`,
                    animationDelay: `${idx * 150}ms`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. Main 3D Soft Character Body (Spherical / Capsule Shell) */}
      <div
        onClick={onClick}
        className={`group relative z-10 flex cursor-pointer flex-col items-center justify-center transition-all duration-300 ${
          interactive ? 'hover:scale-105' : ''
        }`}
        style={{
          transform: `scale(${scaleEffect})`,
        }}
      >
        {/* Soft Ambient Under-Glow */}
        <div
          className={`absolute -bottom-4 h-12 w-4/5 rounded-full blur-xl transition-all duration-300 ${
            isListening
              ? 'bg-cyan-500/40'
              : isError
                ? 'bg-rose-500/40'
                : 'bg-violet-600/40'
          }`}
        />

        {/* Outer 3D Soft Shell Container */}
        <div
          className="relative flex items-center justify-center overflow-hidden rounded-full p-2 shadow-[0_20px_50px_rgba(139,92,246,0.35)] shadow-nm-convex ring-1 ring-white/30 transition-all duration-300 dark:shadow-nm-convex-dark"
          style={{
            width: `${size * 0.85}px`,
            height: `${size * 0.85}px`,
            background:
              'radial-gradient(circle at 35% 25%, #A78BFA 0%, #8B5CF6 55%, #6D28D9 100%)',
          }}
        >
          {/* Top-Down Studio Overhead Specular Bounce Light */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-white/10 to-transparent" />

          {/* Inner Volumetric Depth Gradient */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-[#6D28D9]/40 via-transparent to-white/30" />

          {/* Rim Light Flare Accent */}
          <div className="pointer-events-none absolute left-6 top-2 h-12 w-24 -rotate-12 rounded-full bg-white/35 blur-sm" />

          {/* 4. Expressive Inset Visor Screen */}
          <div
            className="relative flex items-center justify-center rounded-full border border-violet-400/40 bg-[#0B0D13] p-4 shadow-[inset_0_6px_20px_rgba(0,0,0,0.95)]"
            style={{
              width: `${size * 0.58}px`,
              height: `${size * 0.42}px`,
            }}
          >
            {/* Visor Specular Curve Glass Reflection */}
            <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-80" />

            {/* Visor Inner Content: Digital Animated Eyes */}
            <div className="relative z-10 flex items-center justify-center space-x-6">
              {/* Left Eye */}
              <div
                className={`rounded-full transition-all duration-200 ${eyeColorClass} ${
                  isThinking ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${isSpeaking ? 16 + audioPulse * 8 : isListening ? 18 : 14}px`,
                  height: `${isSpeaking ? 22 + audioPulse * 10 : isListening ? 24 : 18}px`,
                  borderRadius: isSpeaking ? '9999px' : '50%',
                  transform: isThinking ? 'translateY(-2px)' : 'none',
                }}
              />

              {/* Right Eye */}
              <div
                className={`rounded-full transition-all duration-200 ${eyeColorClass} ${
                  isThinking ? 'animate-pulse' : ''
                }`}
                style={{
                  width: `${isSpeaking ? 16 + audioPulse * 8 : isListening ? 18 : 14}px`,
                  height: `${isSpeaking ? 22 + audioPulse * 10 : isListening ? 24 : 18}px`,
                  borderRadius: isSpeaking ? '9999px' : '50%',
                  transform: isThinking ? 'translateY(2px)' : 'none',
                  animationDelay: '100ms',
                }}
              />
            </div>

            {/* Subtle Soundwave Mouth Line when Speaking */}
            {isSpeaking && (
              <div className="absolute bottom-2 flex h-2 items-center justify-center gap-1">
                {[0.6, 1.0, 0.5].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 rounded-full bg-violet-300"
                    style={{ height: `${6 + audioPulse * 10 * h}px` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 5. Integrated Mic Toggle Button (if handler provided) */}
        {onMicToggle && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMicToggle();
            }}
            className={`mt-4 flex h-12 w-12 items-center justify-center rounded-full shadow-nm-flat transition-all duration-200 dark:shadow-nm-flat-dark ${
              isMuted
                ? 'border border-rose-500/50 bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                : 'border border-violet-500/40 bg-nm-gradient-light text-violet-700 hover:scale-110 dark:bg-nm-gradient-dark dark:text-amber-400'
            }`}
            title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
          >
            {isMuted ? (
              <MicOff className="h-5 w-5" />
            ) : (
              <Mic className="h-5 w-5 text-violet-600 dark:text-amber-400" />
            )}
          </button>
        )}
      </div>

      {/* 6. Footer Status Label */}
      <div className="mt-3 text-center">
        <h4 className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
          Voice Conversation
        </h4>
        <p className="text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
          Co-Founder reacts to your voice
        </p>
      </div>
    </div>
  );
}
