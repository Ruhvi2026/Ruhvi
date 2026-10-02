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
  onTranscript?: (speaker: 'user' | 'assistant', text: string) => void;
  onError?: (err: Error) => void;
}

export function useLiveKitVoice(options: UseLiveKitVoiceOptions = {}) {
  const [state, setState] = useState<VoiceConnectionState>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [roomName, setRoomName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const roomRef = useRef<Room | null>(null);
  const audioElementsRef = useRef<HTMLAudioElement[]>([]);

  // Cleanup audio elements helper
  const cleanupAudio = () => {
    audioElementsRef.current.forEach((el) => {
      el.pause();
      el.srcObject = null;
      el.remove();
    });
    audioElementsRef.current = [];
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
   * Connect to LiveKit Room
   */
  const startSession = useCallback(async () => {
    try {
      setState('connecting');
      setErrorMessage('');

      // 1. Fetch token from secure Next.js API
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

      // 2. Initialize LiveKit Room client
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
        audioCaptureDefaults: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      roomRef.current = room;

      // 3. Register Event Listeners
      room.on(RoomEvent.Connected, () => {
        setState('connected');
      });

      room.on(RoomEvent.Reconnecting, () => {
        setState('reconnecting');
      });

      room.on(RoomEvent.Reconnected, () => {
        setState('connected');
      });

      room.on(RoomEvent.Disconnected, () => {
        disconnect();
      });

      // Handle incoming audio track from AI Co-Founder
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

      room.on(RoomEvent.TrackUnsubscribed, (track: Track) => {
        track.detach().forEach((el) => el.remove());
        setState('listening');
      });

      // Handle user speaking & barge-in
      room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
        const localSpeaker = speakers.find((s) => s.isLocal);
        const remoteSpeaker = speakers.find((s) => !s.isLocal);

        if (localSpeaker) {
          setState('listening');
          // If remote was speaking, barge-in occurred
          if (remoteSpeaker) {
            // Lower remote volume temporarily to prioritize user speech
            audioElementsRef.current.forEach((el) => {
              el.volume = 0.2;
            });
          }
        } else if (remoteSpeaker) {
          setState('speaking');
          audioElementsRef.current.forEach((el) => {
            el.volume = 1.0;
          });
        }
      });

      // 4. Connect to LiveKit Cloud WebRTC SFU
      await room.connect(url, token);

      // 5. Request mic access and enable track
      await room.localParticipant.setMicrophoneEnabled(true);
      setIsMuted(false);
      setState('listening');

      // 6. Trigger agent dispatch if server requires it
      fetch('/api/admin/co-founder/agent/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: serverRoom }),
      }).catch(() => {
        // Non-blocking
      });
    } catch (err: any) {
      console.error('LiveKit Voice Error:', err);
      const msg = err.message || 'Failed to connect to voice session';
      setErrorMessage(msg);
      setState('error');
      options.onError?.(err);
    }
  }, [disconnect, options]);

  /**
   * Toggle local microphone mute
   */
  const toggleMute = useCallback(async () => {
    if (!roomRef.current?.localParticipant) return;
    const newMuted = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
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
    startSession,
    disconnect,
    toggleMute,
  };
}
