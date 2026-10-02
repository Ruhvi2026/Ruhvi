'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Room,
  RoomEvent,
  Track,
  RemoteTrackPublication,
  RemoteParticipant,
} from 'livekit-client';
import { VoiceConnectionState } from '@/components/co-founder/LiveVoiceVisualizer';

export interface UseLiveKitVoiceOptions {
  onTranscript?: (
    speaker: 'user' | 'assistant',
    text: string,
    metadata?: { provider?: string; model?: string; fallbackUsed?: boolean }
  ) => void;
  onError?: (err: Error) => void;
  provider?: string;
  model?: string;
  language?: string;
}

export function useLiveKitVoice(options: UseLiveKitVoiceOptions = {}) {
  const [state, setState] = useState<VoiceConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [roomName, setRoomName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [interimTranscript, setInterimTranscript] = useState<string>('');

  const selectedProviderRef = useRef<string | undefined>(options.provider);
  const selectedModelRef = useRef<string | undefined>(options.model);
  const selectedLangRef = useRef<string | undefined>(
    options.language || 'en-IN'
  );

  useEffect(() => {
    selectedProviderRef.current = options.provider;
    selectedModelRef.current = options.model;
    selectedLangRef.current = options.language || 'en-IN';
  }, [options.provider, options.model, options.language]);

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const conversationHistoryRef = useRef<
    Array<{ sender: string; text: string }>
  >([]);

  // Cleanup audio elements helper
  const cleanupAudio = () => {
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current = [];

    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      try {
        audioContextRef.current.close();
      } catch {}
      audioContextRef.current = null;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }

    setAudioLevel(0);
    setInterimTranscript('');
  };

  /**
   * Disconnect from current voice session
   */
  const disconnect = useCallback(() => {
    if (roomRef.current) {
      try {
        roomRef.current.disconnect();
      } catch {}
      roomRef.current = null;
    }
    cleanupAudio();
    setState('idle');
    setRoomName('');
  }, []);

  /**
   * Speak a response aloud using high-quality browser Web Speech Synthesis
   */
  const speakResponse = useCallback((text: string) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();

    // Clean markdown symbols for natural speaking
    const cleanText = text
      .replace(/[*#_`~>]/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/https?:\/\/\S+/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    // Detect language of response: Bengali (বাংলা), Hindi (हिन्दी), or English
    const isBengali = /[\u0980-\u09FF]/.test(cleanText);
    const isHindi = /[\u0900-\u097F]/.test(cleanText);

    const voices = window.speechSynthesis.getVoices();
    let preferredVoice = null;

    if (isBengali) {
      utterance.lang = 'bn-IN';
      preferredVoice =
        voices.find((v) => v.lang.startsWith('bn')) ||
        voices.find(
          (v) =>
            v.lang.includes('IN') &&
            (v.name.includes('Bengali') || v.name.includes('Bangla'))
        ) ||
        voices.find((v) => v.lang.includes('IN'));
    } else if (isHindi) {
      utterance.lang = 'hi-IN';
      preferredVoice =
        voices.find((v) => v.lang.startsWith('hi')) ||
        voices.find((v) => v.lang.includes('IN') && v.name.includes('Hindi')) ||
        voices.find((v) => v.lang.includes('IN'));
    } else {
      utterance.lang = 'en-IN';
      preferredVoice =
        voices.find(
          (v) =>
            (v.lang.includes('en') || v.lang.includes('IN')) &&
            (v.name.includes('Natural') ||
              v.name.includes('Neural') ||
              v.name.includes('Google') ||
              v.name.includes('Online'))
        ) ||
        voices.find((v) => v.lang.startsWith('en')) ||
        voices[0];
    }

    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setState('speaking');
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setState('listening');
      setAudioLevel(0);
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setState('listening');
      setAudioLevel(0);
    };

    window.speechSynthesis.speak(utterance);
  }, []);

  /**
   * Send recognized user speech to AI Co-Founder Brain
   */
  const processUserInput = useCallback(
    async (userText: string) => {
      if (!userText.trim()) return;

      const trimmed = userText.trim();
      options.onTranscript?.('user', trimmed);

      conversationHistoryRef.current.push({ sender: 'user', text: trimmed });

      // If AI was speaking, barge-in immediately
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }

      try {
        setState('speaking'); // Indicate thinking/answering
        setInterimTranscript('Thinking...');

        const res = await fetch('/api/admin/co-founder/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: conversationHistoryRef.current,
            channel: 'voice',
            provider: selectedProviderRef.current,
            model: selectedModelRef.current,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              errData.response ||
              `Co-Founder brain returned status ${res.status}`
          );
        }

        const data = await res.json();
        const responseText =
          data.response || "I'm reviewing that now, Founder.";

        conversationHistoryRef.current.push({
          sender: 'assistant',
          text: responseText,
        });

        options.onTranscript?.('assistant', responseText, {
          provider: data.provider,
          model: data.model,
          fallbackUsed: data.fallbackUsed,
        });
        setInterimTranscript('');
        speakResponse(responseText);
      } catch (err: any) {
        console.error('Co-Founder brain error:', err);
        const errMsg =
          err?.message && !err.message.includes('status')
            ? err.message
            : 'I had trouble processing that request. Could you please repeat?';
        options.onTranscript?.('assistant', errMsg);
        speakResponse(errMsg);
      }
    },
    [options, speakResponse]
  );

  /**
   * Start microphone audio analysis loop
   */
  const startAudioAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx =
        window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.5;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;

        if (isSpeakingRef.current) {
          // Organic speech pulsation when Co-Founder speaks
          const wave =
            0.35 + Math.sin(Date.now() / 120) * 0.25 + Math.random() * 0.2;
          setAudioLevel(wave);
        } else {
          analyserRef.current.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i];
          }
          const avg = sum / dataArray.length;
          // Normalize level between 0 and 1 with sensitivity boost
          const level = Math.min(1, Math.max(0, (avg - 10) / 70));
          setAudioLevel(level);
        }

        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn('AudioAnalyser setup warning:', err);
    }
  };

  /**
   * Start continuous browser speech recognition
   */
  const startSpeechRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      console.warn('SpeechRecognition not supported in this browser.');
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLangRef.current || 'en-IN'; // Dynamic multilingual language (en-IN, bn-IN, hi-IN)
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += trans;
          } else {
            currentInterim += trans;
          }
        }

        if (currentInterim) {
          setInterimTranscript(currentInterim);
          // If assistant is speaking and user begins talking, barge-in!
          if (isSpeakingRef.current && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            isSpeakingRef.current = false;
            setState('listening');
          }
        }

        if (finalTranscript.trim()) {
          setInterimTranscript('');
          processUserInput(finalTranscript);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('Speech recognition warning:', e.error);
        }
      };

      recognition.onend = () => {
        // Automatically keep listening if session is still active
        if (roomRef.current || micStreamRef.current) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (err) {
      console.warn('SpeechRecognition start failed:', err);
    }
  }, [processUserInput]);

  /**
   * Connect to LiveKit Room & Initialize Multimodal Voice Loop
   */
  const startSession = useCallback(async () => {
    try {
      setState('connecting');
      setErrorMessage('');
      setInterimTranscript('');

      // 1. Acquire microphone stream directly
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      micStreamRef.current = micStream;

      // Start audio level visualizer loop
      startAudioAnalyser(micStream);

      // Start continuous speech recognition
      startSpeechRecognition();

      // 2. Fetch token from secure Next.js API
      const res = await fetch('/api/admin/co-founder/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed to authenticate voice session: ${res.status}`
        );
      }

      const { token, url, roomName: serverRoom } = await res.json();
      setRoomName(serverRoom);

      // 3. Initialize LiveKit Room client (for WebRTC relay/collab)
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      });

      roomRef.current = room;

      room.on(RoomEvent.Connected, () => {
        setState('listening');
      });

      room.on(RoomEvent.Disconnected, () => {
        disconnect();
      });

      // Handle incoming remote audio tracks if agent is running
      room.on(
        RoomEvent.TrackSubscribed,
        (
          track: Track,
          publication: RemoteTrackPublication,
          participant: RemoteParticipant
        ) => {
          if (track.kind === Track.Kind.Audio) {
            const el = track.attach();
            audioElementsRef.current.push(el);
            setState('speaking');
          }
        }
      );

      // Connect to LiveKit SFU
      await room.connect(url, token);
      await room.localParticipant.setMicrophoneEnabled(true);

      setIsMuted(false);
      setState('listening');

      // Dispatch agent in background if cloud worker present
      fetch('/api/admin/co-founder/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: serverRoom }),
      }).catch(() => {});

      // Welcome voice greeting on initial connect
      setTimeout(() => {
        speakResponse(
          'Hello Founder! I am listening. How can I help you today?'
        );
      }, 600);
    } catch (err: any) {
      console.error('LiveKit Voice Error:', err);
      const msg = err.message || 'Failed to connect to voice session';
      setErrorMessage(msg);
      setState('error');
      options.onError?.(err);
      cleanupAudio();
    }
  }, [disconnect, options, speakResponse, startSpeechRecognition]);

  /**
   * Toggle local microphone mute
   */
  const toggleMute = useCallback(async () => {
    if (roomRef.current?.localParticipant) {
      const newMuted = !isMuted;
      await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
      setIsMuted(newMuted);
    } else if (micStreamRef.current) {
      const newMuted = !isMuted;
      micStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted;
      });
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    state,
    isMuted,
    roomName,
    errorMessage,
    audioLevel,
    interimTranscript,
    startSession,
    disconnect,
    toggleMute,
  };
}
