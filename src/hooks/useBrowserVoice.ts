'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

export interface UseBrowserVoiceOptions {
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (err: string) => void;
  autoSpeak?: boolean;
  language?: string;
}

export function useBrowserVoice(options: UseBrowserVoiceOptions = {}) {
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  const [finalTranscript, setFinalTranscript] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [error, setError] = useState<string>('');

  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef(false);
  const selectedLanguageRef = useRef(options.language || 'bn-IN');
  const lastProcessedIndexRef = useRef(0);
  const accumulatedFinalRef = useRef('');

  useEffect(() => {
    selectedLanguageRef.current = options.language || 'bn-IN';
  }, [options.language]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const vList = window.speechSynthesis.getVoices();
      if (vList && vList.length > 0) {
        setVoices(vList);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  const startRecording = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    try {
      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = selectedLanguageRef.current;
      recognition.maxAlternatives = 1;

      // Reset tracking refs
      lastProcessedIndexRef.current = 0;
      accumulatedFinalRef.current = '';

      recognition.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';

        // Only process NEW results since lastProcessedIndexRef.current
        for (
          let i = lastProcessedIndexRef.current;
          i < event.results.length;
          i++
        ) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalText += trans;
          } else {
            interimText += trans;
          }
        }

        // Update the last processed index
        lastProcessedIndexRef.current = event.results.length;

        if (interimText) {
          setInterimTranscript(interimText);
          options.onTranscript?.(interimText, false);
        }

        if (finalText.trim()) {
          setInterimTranscript('');
          accumulatedFinalRef.current = (
            accumulatedFinalRef.current +
            ' ' +
            finalText
          ).trim();
          setFinalTranscript(accumulatedFinalRef.current);
          options.onTranscript?.(finalText, true);
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          const errMsg = `Speech recognition error: ${e.error}`;
          setError(errMsg);
          options.onError?.(errMsg);
        }
      };

      recognition.onend = () => {
        // Only restart if still recording (user didn't stop)
        if (isRecording && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
      setError('');
    } catch (err) {
      const errMsg =
        err instanceof Error
          ? err.message
          : 'Failed to start speech recognition';
      setError(errMsg);
      options.onError?.(errMsg);
    }
  }, [isRecording, options]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
      recognitionRef.current = null;
    }
    setIsRecording(false);
    setInterimTranscript('');
    // Keep final transcript for user
  }, []);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  const speak = useCallback(
    (text: string) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      if (isMuted) return;

      window.speechSynthesis.cancel();

      const cleanText = text
        .replace(/[*#_`~>]/g, '')
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!cleanText) return;

      const utterance = new SpeechSynthesisUtterance(cleanText);

      const isBengali = /[\u0980-\u09FF]/.test(cleanText);
      const isHindi = /[\u0900-\u097F]/.test(cleanText);

      const availableVoices = window.speechSynthesis.getVoices();
      let preferredVoice: SpeechSynthesisVoice | null = null;

      if (isBengali) {
        preferredVoice =
          availableVoices.find((v) => v.lang.toLowerCase().startsWith('bn')) ||
          availableVoices.find(
            (v) =>
              v.name.toLowerCase().includes('bengali') ||
              v.name.toLowerCase().includes('bangla')
          ) ||
          availableVoices.find((v) => v.lang.includes('IN')) ||
          null;
      } else if (isHindi) {
        preferredVoice =
          availableVoices.find((v) => v.lang.startsWith('hi')) ||
          availableVoices.find(
            (v) => v.lang.includes('IN') && v.name.includes('Hindi')
          ) ||
          availableVoices.find((v) => v.lang.includes('IN')) ||
          null;
      } else {
        preferredVoice =
          availableVoices.find(
            (v) =>
              (v.lang.includes('en') || v.lang.includes('IN')) &&
              (v.name.includes('Natural') ||
                v.name.includes('Neural') ||
                v.name.includes('Google') ||
                v.name.includes('Online'))
          ) ||
          availableVoices.find((v) => v.lang.startsWith('en')) ||
          availableVoices[0] ||
          null;
      }

      if (preferredVoice) {
        utterance.voice = preferredVoice;
        utterance.lang = preferredVoice.lang;
      } else {
        utterance.lang = isBengali ? 'bn-IN' : isHindi ? 'hi-IN' : 'en-IN';
      }

      utterance.rate = isBengali ? 0.92 : 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        isSpeakingRef.current = true;
      };

      utterance.onend = () => {
        isSpeakingRef.current = false;
      };

      utterance.onerror = () => {
        isSpeakingRef.current = false;
      };

      window.speechSynthesis.speak(utterance);
    },
    [isMuted]
  );

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const newMuted = !prev;
      if (newMuted && typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      return newMuted;
    });
  }, []);

  const clearTranscript = useCallback(() => {
    setFinalTranscript('');
    setInterimTranscript('');
    accumulatedFinalRef.current = '';
  }, []);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isRecording,
    isMuted,
    interimTranscript,
    finalTranscript,
    voices,
    error,
    startRecording,
    stopRecording,
    toggleRecording,
    speak,
    toggleMute,
    clearTranscript,
  };
}
