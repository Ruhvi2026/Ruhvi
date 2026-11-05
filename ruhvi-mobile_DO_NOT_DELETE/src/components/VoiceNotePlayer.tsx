// ruhvi-mobile_DO_NOT_DELETE/src/components/VoiceNotePlayer.tsx
//
// WhatsApp-style Voice Note Audio Player for RuhChat Mobile
// Resilient player state machine with status.error handling, automatic player release, and retry.

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { createAudioPlayer, AudioPlayer, AudioStatus, setAudioModeAsync } from 'expo-audio';

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  durationSeconds?: number;
  isMe?: boolean;
}

// Global reference to ensure only one voice note plays at any time
let globalCurrentPlayer: AudioPlayer | null = null;
let globalStopCallback: (() => void) | null = null;

export default function VoiceNotePlayer({
  audioUrl,
  durationSeconds = 0,
  isMe = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const playerRef = useRef<AudioPlayer | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cleanUpPlayer = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
    if (playerRef.current) {
      try {
        playerRef.current.pause();
        playerRef.current.release();
      } catch (_) {}
      if (globalCurrentPlayer === playerRef.current) {
        globalCurrentPlayer = null;
        globalStopCallback = null;
      }
      playerRef.current = null;
    }
  };

  useEffect(() => {
    cleanUpPlayer();
    setIsPlaying(false);
    setIsLoading(false);
    setHasError(false);
    setCurrentTime(0);
    setDuration(durationSeconds);

    return () => {
      cleanUpPlayer();
    };
  }, [audioUrl, durationSeconds]);

  const stopThisSound = () => {
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch (_) {}
    }
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (!audioUrl || audioUrl.trim().length === 0) {
      setHasError(true);
      return;
    }

    try {
      // If currently playing, pause
      if (isPlaying) {
        if (playerRef.current) {
          playerRef.current.pause();
        }
        setIsPlaying(false);
        return;
      }

      // Stop any other active voice note
      if (globalStopCallback && globalStopCallback !== stopThisSound) {
        globalStopCallback();
      }

      // If in error state or player missing, recreate
      if (hasError || !playerRef.current) {
        cleanUpPlayer();
        setHasError(false);
        setIsLoading(true);

        try {
          await setAudioModeAsync({
            playsInSilentMode: true,
            allowsRecording: false,
            shouldRouteThroughEarpiece: false,
          });
        } catch (modeErr) {
          console.warn('[VoiceNotePlayer] setAudioModeAsync warning:', modeErr);
        }

        const newPlayer = createAudioPlayer(audioUrl.trim(), {
          updateInterval: 200,
          downloadFirst: false,
        });

        newPlayer.playbackRate = playbackRate;

        // Set safety timeout in case remote player hangs buffering
        loadTimeoutRef.current = setTimeout(() => {
          if (isLoading && !isPlaying) {
            console.warn('[VoiceNotePlayer] Player load timeout for URL:', audioUrl);
            setHasError(true);
            setIsLoading(false);
            cleanUpPlayer();
          }
        }, 12000);

        newPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          if (loadTimeoutRef.current) {
            clearTimeout(loadTimeoutRef.current);
            loadTimeoutRef.current = null;
          }

          if (status.error) {
            console.warn('[VoiceNotePlayer] AudioStatus error event:', status.error);
            setHasError(true);
            setIsPlaying(false);
            setIsLoading(false);
            cleanUpPlayer();
            return;
          }

          setIsPlaying(Boolean(status.playing));
          setIsLoading(Boolean(status.isBuffering && !status.playing));

          if (status.currentTime !== undefined) {
            setCurrentTime(status.currentTime);
          }
          if (status.duration > 0) {
            setDuration(status.duration);
          }
          if (status.didJustFinish) {
            setIsPlaying(false);
            setCurrentTime(0);
            newPlayer.seekTo(0).catch(() => {});
            if (globalCurrentPlayer === newPlayer) {
              globalCurrentPlayer = null;
              globalStopCallback = null;
            }
          }
        });

        playerRef.current = newPlayer;
        globalCurrentPlayer = newPlayer;
        globalStopCallback = stopThisSound;

        newPlayer.play();
      } else {
        // Player already exists, resume playback
        playerRef.current.play();
        globalCurrentPlayer = playerRef.current;
        globalStopCallback = stopThisSound;
      }
    } catch (err: any) {
      console.warn('[VoiceNotePlayer] Playback toggle error:', err);
      setHasError(true);
      setIsLoading(false);
      setIsPlaying(false);
      cleanUpPlayer();
    }
  };

  const handleSpeedToggle = () => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    if (playerRef.current) {
      try {
        playerRef.current.playbackRate = nextRate;
      } catch (_) {}
    }
  };

  const formatTime = (sec: number) => {
    const totalSec = Math.floor(sec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent =
    duration > 0 ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(duration || durationSeconds);

  const isAudioMissing = !audioUrl || audioUrl.trim().length === 0;

  if (isAudioMissing) {
    return (
      <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
        <View style={styles.unavailableBadge}>
          <MaterialIcons name="mic-off" size={16} color="#888" />
          <Text style={styles.unavailableText}>Audio unavailable</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
      {/* Play / Pause / Loading / Retry button */}
      <TouchableOpacity
        style={[
          styles.playBtn,
          isMe ? styles.myPlayBtn : styles.otherPlayBtn,
          hasError && styles.errorPlayBtn,
        ]}
        onPress={handlePlayPause}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isMe ? '#075E54' : '#fff'} />
        ) : hasError ? (
          <MaterialIcons name="refresh" size={24} color={isMe ? '#d32f2f' : '#ffcdd2'} />
        ) : (
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={26}
            color={isMe ? '#075E54' : '#fff'}
          />
        )}
      </TouchableOpacity>

      {/* Progress Track and Duration */}
      <View style={styles.trackArea}>
        <View style={styles.trackBackground}>
          <View style={[styles.trackFill, { width: `${progressPercent}%` }]} />
          <View
            style={[
              styles.trackThumb,
              { left: `${progressPercent}%` },
              isMe && { backgroundColor: '#075E54' },
            ]}
          />
        </View>

        <View style={styles.metaRow}>
          <Text style={[styles.timeText, isMe && styles.myTimeText, hasError && styles.errorText]}>
            {hasError ? 'Retry' : displayTime}
          </Text>

          <View style={styles.micBadge}>
            <MaterialIcons
              name="mic"
              size={13}
              color={isMe ? '#075E54' : '#128C7E'}
            />
            <Text style={[styles.vnLabel, isMe && { color: '#075E54' }]}>Voice Note</Text>
          </View>
        </View>
      </View>

      {/* Speed Rate Toggle Button (1x / 1.5x / 2x) */}
      <TouchableOpacity
        style={[styles.speedBtn, isMe ? styles.mySpeedBtn : styles.otherSpeedBtn]}
        onPress={handleSpeedToggle}
        activeOpacity={0.7}
      >
        <Text style={[styles.speedText, isMe && styles.mySpeedText]}>
          {playbackRate === 1.0 ? '1x' : playbackRate === 1.5 ? '1.5x' : '2x'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 210,
    maxWidth: 270,
  },
  myContainer: {
    backgroundColor: 'transparent',
  },
  otherContainer: {
    backgroundColor: 'transparent',
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  myPlayBtn: {
    backgroundColor: '#fff',
  },
  otherPlayBtn: {
    backgroundColor: '#128C7E',
  },
  errorPlayBtn: {
    backgroundColor: '#ffebee',
  },
  trackArea: {
    flex: 1,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 2,
    position: 'relative',
    marginBottom: 4,
  },
  trackFill: {
    height: '100%',
    backgroundColor: '#25D366',
    borderRadius: 2,
  },
  trackThumb: {
    position: 'absolute',
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#128C7E',
    marginLeft: -6,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '500',
  },
  myTimeText: {
    color: '#075E54',
  },
  errorText: {
    color: '#d32f2f',
    fontWeight: '600',
  },
  micBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  vnLabel: {
    fontSize: 10,
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  speedBtn: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  mySpeedBtn: {
    backgroundColor: 'rgba(7, 94, 84, 0.1)',
  },
  otherSpeedBtn: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  speedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#555',
  },
  mySpeedText: {
    color: '#075E54',
  },
  unavailableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 6,
  },
  unavailableText: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
