'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, RotateCcw } from 'lucide-react';

interface VoiceNotePlayerProps {
  src: string;
  duration?: number;
  className?: string;
  isUser?: boolean;
}

export function VoiceNotePlayer({
  src,
  duration = 0,
  className = '',
  isUser = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play().catch(() => setIsPlaying(false));
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const time = Number(e.target.value);
    audio.currentTime = time;
    setCurrentTime(time);
  };

  const cyclePlaybackRate = () => {
    const audio = audioRef.current;
    if (!audio) return;
    const nextRate = playbackRate === 1 ? 1.5 : playbackRate === 1.5 ? 2 : 1;
    audio.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const formatSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const maxTime = duration > 0 ? duration : audioRef.current?.duration || 10;
  const progressPercent = maxTime > 0 ? (currentTime / maxTime) * 100 : 0;

  return (
    <div
      className={`my-1.5 flex items-center gap-3 rounded-2xl border p-2.5 transition-all ${
        isUser
          ? 'border-violet-500/30 bg-violet-500/15 text-violet-950 dark:border-violet-500/40 dark:bg-violet-950/40 dark:text-violet-100'
          : 'border-neutral-300/80 bg-neutral-100/90 text-neutral-900 dark:border-neutral-800 dark:bg-neutral-900/90 dark:text-neutral-100'
      } ${className}`}
    >
      <audio ref={audioRef} src={src} preload="metadata" />

      {/* Play / Pause Action Button */}
      <button
        type="button"
        onClick={togglePlay}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm transition active:scale-95 ${
          isUser
            ? 'bg-violet-600 text-white hover:bg-violet-700'
            : 'bg-gradient-to-tr from-violet-600 to-indigo-600 text-white hover:opacity-95'
        }`}
        title={isPlaying ? 'Pause' : 'Play voice note'}
      >
        {isPlaying ? (
          <Pause size={15} className="fill-current" />
        ) : (
          <Play size={15} className="ml-0.5 fill-current" />
        )}
      </button>

      {/* Waveform and Progress Bar */}
      <div className="flex flex-1 flex-col justify-center gap-1 overflow-hidden">
        {/* Animated Sound Wave Bars when playing */}
        <div className="flex h-4 items-center gap-0.5 px-0.5">
          {Array.from({ length: 24 }).map((_, i) => {
            const barProgress = (i / 24) * 100;
            const isPassed = barProgress <= progressPercent;
            // pseudo-random bar height pattern
            const baseH = [35, 60, 90, 45, 75, 100, 50, 80, 65, 40, 85, 95][
              i % 12
            ];
            const height = isPlaying
              ? Math.max(
                  20,
                  baseH * (0.6 + Math.sin(currentTime * 8 + i) * 0.4)
                )
              : baseH * 0.7;

            return (
              <span
                key={i}
                style={{ height: `${height}%` }}
                className={`w-1 rounded-full transition-all duration-150 ${
                  isPassed
                    ? isUser
                      ? 'bg-violet-600 dark:bg-violet-400'
                      : 'bg-indigo-600 dark:bg-indigo-400'
                    : 'bg-neutral-300 dark:bg-neutral-700'
                }`}
              />
            );
          })}
        </div>

        {/* Seek Range Input (invisible on top of bars or slider) */}
        <div className="flex items-center justify-between font-mono text-[10px] text-neutral-500 dark:text-neutral-400">
          <span>{formatSec(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={maxTime}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="mx-2 h-1 flex-1 cursor-pointer accent-violet-600"
          />
          <span>{formatSec(maxTime)}</span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        type="button"
        onClick={cyclePlaybackRate}
        className="rounded-lg border border-neutral-300/80 bg-black/5 px-1.5 py-0.5 font-mono text-[9px] font-bold text-neutral-600 transition hover:bg-black/10 dark:border-neutral-700 dark:bg-white/5 dark:text-neutral-300 dark:hover:bg-white/10"
        title="Toggle playback speed"
      >
        {playbackRate}x
      </button>
    </div>
  );
}
