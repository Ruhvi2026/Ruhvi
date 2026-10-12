'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface RecordedAudio {
  blob: Blob;
  base64: string;
  url: string;
  duration: number;
  mimeType: string;
}

export function useVoiceNoteRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const cleanupMedia = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    setIsRecording(false);
    setAudioLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      cleanupMedia();
    };
  }, [cleanupMedia]);

  const startRecording = useCallback(async () => {
    setError(null);
    setDuration(0);
    setAudioLevel(0);
    audioChunksRef.current = [];

    if (
      typeof window === 'undefined' ||
      !navigator.mediaDevices?.getUserMedia
    ) {
      setError('Audio recording is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Audio Level Analyser
      try {
        const AudioCtx =
          window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkLevel = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            setAudioLevel(Math.min(1, avg / 80));
            animFrameRef.current = requestAnimationFrame(checkLevel);
          };
          checkLevel();
        }
      } catch {}

      // Determine best supported mime type
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(100); // collect 100ms chunks
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      return true;
    } catch (err: any) {
      cleanupMedia();
      const msg =
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Microphone permission denied. Please allow microphone access.'
          : `Failed to access microphone: ${err.message || 'Unknown error'}`;
      setError(msg);
      return false;
    }
  }, [cleanupMedia]);

  const stopRecording = useCallback((): Promise<RecordedAudio | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanupMedia();
        resolve(null);
        return;
      }

      const recordedSeconds = duration;
      const mime = recorder.mimeType || 'audio/webm';

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });
        const url = URL.createObjectURL(audioBlob);

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string) || '';
          cleanupMedia();
          resolve({
            blob: audioBlob,
            base64,
            url,
            duration: recordedSeconds,
            mimeType: mime,
          });
        };
        reader.onerror = () => {
          cleanupMedia();
          resolve({
            blob: audioBlob,
            base64: '',
            url,
            duration: recordedSeconds,
            mimeType: mime,
          });
        };
        reader.readAsDataURL(audioBlob);
      };

      try {
        recorder.stop();
      } catch {
        cleanupMedia();
        resolve(null);
      }
    });
  }, [cleanupMedia, duration]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop();
      } catch {}
    }
    cleanupMedia();
  }, [cleanupMedia]);

  return {
    isRecording,
    duration,
    audioLevel,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
