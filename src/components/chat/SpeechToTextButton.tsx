// src/components/chat/SpeechToTextButton.tsx
//
// Dedicated Speech-to-Text Dictation Button for Bengali, Hindi, and English.
// Transcribes speech into an editable draft inside the composer without auto-sending.

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Mic, Loader2, Square, AlertCircle } from 'lucide-react';

interface SpeechToTextButtonProps {
  onTranscript: (text: string) => void;
  className?: string;
  disabled?: boolean;
}

export function SpeechToTextButton({
  onTranscript,
  className = '',
  disabled = false,
}: SpeechToTextButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  const startListening = async () => {
    try {
      setErrorMsg(null);
      audioChunksRef.current = [];

      if (!navigator?.mediaDevices?.getUserMedia) {
        setErrorMsg('Microphone not supported on this browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

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

      recorder.onstop = async () => {
        stopStream();
        const finalType = recorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: finalType });

        if (audioBlob.size > 0) {
          await sendForTranscription(audioBlob);
        }
        setIsListening(false);
      };

      recorder.start(250);
      setIsListening(true);
    } catch (err: any) {
      console.error('[SpeechToTextButton] Mic error:', err);
      stopStream();
      setIsListening(false);
      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setErrorMsg('Microphone permission denied.');
      } else {
        setErrorMsg('Could not access microphone.');
      }
    }
  };

  const stopListening = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
  };

  const sendForTranscription = async (blob: Blob) => {
    try {
      setIsTranscribing(true);
      setErrorMsg(null);

      const formData = new FormData();
      formData.append('file', blob, 'dictation.webm');

      const res = await fetch('/api/chat/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Transcription failed');
      }

      if (data.transcript && data.transcript.trim()) {
        onTranscript(data.transcript.trim());
      }
    } catch (err: any) {
      console.error('[SpeechToTextButton] Transcription request error:', err);
      setErrorMsg(err.message || 'Transcription failed. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  if (isTranscribing) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-xl bg-violet-500/10 px-2.5 py-1 text-xs text-violet-600 dark:bg-violet-950/40 dark:text-violet-400 ${className}`}
      >
        <Loader2 size={14} className="animate-spin" />
        <span className="font-medium">Transcribing Bengali / English...</span>
      </div>
    );
  }

  if (isListening) {
    return (
      <div
        className={`flex items-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-600 dark:text-red-400 ${className}`}
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span className="font-medium">Listening... Speak now</span>
        <button
          type="button"
          onClick={stopListening}
          className="flex h-6 w-6 items-center justify-center rounded-lg bg-red-500 text-white transition hover:bg-red-600"
          title="Stop & transcribe speech"
        >
          <Square size={10} className="fill-current" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        disabled={disabled}
        onClick={startListening}
        title="Dictate message (Speech to Text - Bengali, Hindi, English)"
        className={`group relative flex h-9 w-9 items-center justify-center rounded-xl text-neutral-500 transition hover:bg-violet-500/10 hover:text-violet-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-violet-500/20 dark:hover:text-violet-300 ${className}`}
      >
        <Mic size={16} />
        <span
          className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-violet-600 text-[8px] font-bold text-white shadow-sm group-hover:bg-violet-700"
          title="Speech to Text"
        >
          T
        </span>
      </button>

      {errorMsg ? (
        <div className="absolute bottom-full left-0 mb-2 flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-red-600 px-2.5 py-1 text-[11px] text-white shadow-lg">
          <AlertCircle size={12} />
          <span>{errorMsg}</span>
          <button
            type="button"
            onClick={() => setErrorMsg(null)}
            className="ml-1 font-bold opacity-75 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ) : null}
    </div>
  );
}
