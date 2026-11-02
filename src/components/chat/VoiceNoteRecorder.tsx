// src/components/chat/VoiceNoteRecorder.tsx
//
// WhatsApp-style Voice Note Audio Recorder with duration timer, live wave visualizer,
// cancellation, and explicit send controls.

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Mic,
  Square,
  Trash2,
  Send,
  Play,
  Pause,
  AlertCircle,
} from 'lucide-react';

interface VoiceNoteRecorderProps {
  onSend: (audioBlob: Blob, durationSeconds: number) => Promise<void> | void;
  onCancel: () => void;
  isUploading?: boolean;
}

export function VoiceNoteRecorder({
  onSend,
  onCancel,
  isUploading = false,
}: VoiceNoteRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Stop media stream tracks safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopStream();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl, stopStream]);

  // Start recording
  const startRecording = async () => {
    try {
      setErrorMsg(null);
      audioChunksRef.current = [];
      setDuration(0);
      setAudioUrl(null);
      setRecordedBlob(null);

      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMsg('Microphone not supported on this browser');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Select supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
            ? 'audio/mp4'
            : '';

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined
      );
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        stopStream();
        if (timerRef.current) clearInterval(timerRef.current);

        const finalType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: finalType });
        if (blob.size > 0) {
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setAudioUrl(url);
        }
        setIsRecording(false);
      };

      recorder.start(250); // Slice every 250ms
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error('[VoiceNoteRecorder] Mic access error:', err);
      stopStream();
      setIsRecording(false);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setErrorMsg('Microphone permission was denied. Please allow access.');
      } else {
        setErrorMsg('Unable to access microphone.');
      }
    }
  };

  // Stop recording to preview
  const stopRecording = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  // Cancel and discard recording
  const handleCancel = () => {
    if (isRecording) {
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== 'inactive'
      ) {
        mediaRecorderRef.current.stop();
      }
    }
    stopStream();
    if (timerRef.current) clearInterval(timerRef.current);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setRecordedBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
    onCancel();
  };

  // Explicit send
  const handleSend = async () => {
    if (!recordedBlob) return;
    await onSend(recordedBlob, duration);
  };

  // Toggle preview playback
  const togglePlayPreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play().catch(() => setIsPlayingPreview(false));
      setIsPlayingPreview(true);
    }
  };

  // Format MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Auto-start recording on mount
  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (errorMsg) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-600 dark:text-red-400">
        <div className="flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-semibold hover:bg-red-500/30"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-3 rounded-2xl border border-violet-500/30 bg-violet-50/80 px-4 py-2.5 shadow-sm backdrop-blur dark:border-violet-500/30 dark:bg-violet-950/40">
      {/* Left: Delete / Cancel */}
      <button
        type="button"
        onClick={handleCancel}
        disabled={isUploading}
        title="Discard voice note"
        className="flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-500/20 dark:hover:text-red-400"
      >
        <Trash2 size={18} />
      </button>

      {/* Middle: Recording Status & Waveform */}
      <div className="flex flex-1 items-center gap-3">
        {isRecording ? (
          <>
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
            </span>
            <span className="font-mono text-sm font-semibold text-red-600 dark:text-red-400">
              {formatTime(duration)}
            </span>
            {/* Visualizer bars */}
            <div className="flex h-5 items-center gap-0.5">
              {Array.from({ length: 16 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    height: `${Math.max(25, (Math.sin(duration * 2 + i) + 1) * 50)}%`,
                  }}
                  className="w-1 rounded-full bg-red-500/80 transition-all duration-150"
                />
              ))}
            </div>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Recording Voice Note...
            </span>
          </>
        ) : recordedBlob && audioUrl ? (
          <>
            <audio
              ref={previewAudioRef}
              src={audioUrl}
              onEnded={() => setIsPlayingPreview(false)}
            />
            <button
              type="button"
              onClick={togglePlayPreview}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-600 text-white shadow hover:bg-violet-700"
              title={isPlayingPreview ? 'Pause' : 'Play preview'}
            >
              {isPlayingPreview ? (
                <Pause size={14} />
              ) : (
                <Play size={14} className="ml-0.5" />
              )}
            </button>
            <span className="font-mono text-xs font-semibold text-neutral-700 dark:text-neutral-300">
              {formatTime(duration)}
            </span>
            <span className="text-xs text-neutral-500 dark:text-neutral-400">
              Ready to send (WhatsApp-style)
            </span>
          </>
        ) : null}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            type="button"
            onClick={stopRecording}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-neutral-200 text-neutral-800 transition hover:bg-neutral-300 dark:bg-neutral-800 dark:text-neutral-200"
            title="Stop recording and review"
          >
            <Square size={16} />
          </button>
        ) : null}

        {recordedBlob ? (
          <button
            type="button"
            onClick={handleSend}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-xl bg-violet-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-violet-700 disabled:opacity-50"
            title="Send Voice Note"
          >
            <Send size={14} />
            <span>{isUploading ? 'Sending...' : 'Send'}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
