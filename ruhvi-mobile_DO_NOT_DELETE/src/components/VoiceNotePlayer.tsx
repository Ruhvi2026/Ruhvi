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
  Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import {
  createAudioPlayer,
  AudioPlayer,
  AudioStatus,
  setAudioModeAsync,
} from 'expo-audio';

interface VoiceNotePlayerProps {
  audioUrl?: string | null;
  durationSeconds?: number;
  isMe?: boolean;
}

// Global reference to ensure only one voice note plays at any time
let globalCurrentPlayer: AudioPlayer | null = null;
let globalStopCallback: (() => void) | null = null;

/**
 * Normalizes Cloudinary /video/upload/ URLs (.webm, .m4a, .ogg, .mp4) to universal MP3 (f_mp3)
 * so both Web .webm and Mobile .m4a voice notes play natively on Android ExoPlayer and iOS AVPlayer.
 */
export function normalizePlayableAudioUrl(rawUrl?: string | null): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  if (!url) return '';

  if (url.startsWith('http://')) {
    url = 'https://' + url.slice(7);
  }

  if (url.includes('res.cloudinary.com') && url.includes('/video/upload/')) {
    if (!url.includes('/f_mp3/')) {
      url = url.replace('/video/upload/', '/video/upload/f_mp3/');
    }
    url = url.replace(/\.(webm|m4a|ogg|wav|mp4|aac)(\?.*)?$/i, '.mp3$2');
  }
  return url;
}

function applyPlayerSpeedSafely(player: AudioPlayer | null, rate: number) {
  if (!player) return;
  try {
    if (typeof (player as any).setPlaybackRate === 'function') {
      (player as any).setPlaybackRate(rate);
      return;
    }
  } catch (_) {}
  try {
    (player as any).playbackRate = rate;
  } catch (_) {
    // Ignore read-only getter TypeError on JSI SharedObject
  }
}

export default function VoiceNotePlayer({
  audioUrl,
  durationSeconds = 0,
  isMe = false,
}: VoiceNotePlayerProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds || 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const playerRef = useRef<AudioPlayer | null>(null);
  const subRef = useRef<{ remove: () => void } | null>(null);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isLoadedOrPlayingRef = useRef<boolean>(false);

  const playableUrl = normalizePlayableAudioUrl(audioUrl);

  const clearLoadTimeout = () => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  };

  const releasePlayer = () => {
    clearLoadTimeout();
    isLoadedOrPlayingRef.current = false;
    if (subRef.current) {
      try {
        subRef.current.remove();
      } catch (_) {}
      subRef.current = null;
    }
    if (playerRef.current) {
      const p = playerRef.current;
      playerRef.current = null;
      if (globalCurrentPlayer === p) {
        globalCurrentPlayer = null;
        globalStopCallback = null;
      }
      try {
        p.pause();
      } catch (_) {}
      try {
        (p as any).remove?.();
      } catch (_) {}
      try {
        p.release();
      } catch (_) {}
    }
  };

  // Only reset player when playableUrl changes
  useEffect(() => {
    releasePlayer();
    setIsPlaying(false);
    setIsLoading(false);
    setHasError(false);
    setCurrentTime(0);
    setDuration(durationSeconds || 0);

    return () => {
      releasePlayer();
    };
  }, [playableUrl]);

  useEffect(() => {
    if (durationSeconds > 0 && duration === 0) {
      setDuration(durationSeconds);
    }
  }, [durationSeconds]);

  const stopThisSound = () => {
    clearLoadTimeout();
    if (playerRef.current) {
      try {
        playerRef.current.pause();
      } catch (_) {}
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const handlePlayPause = async () => {
    if (!playableUrl) {
      setHasError(true);
      return;
    }

    try {
      if (isPlaying) {
        stopThisSound();
        return;
      }

      if (hasError) {
        releasePlayer();
        setHasError(false);
      }

      if (globalStopCallback && globalStopCallback !== stopThisSound) {
        globalStopCallback();
      }

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
          interruptionMode: 'doNotMix',
        });
      } catch (modeErr) {
        console.warn('[VoiceNotePlayer] setAudioModeAsync warning:', modeErr);
      }

      if (!playerRef.current) {
        setIsLoading(true);
        setHasError(false);
        isLoadedOrPlayingRef.current = false;

        clearLoadTimeout();
        loadTimeoutRef.current = setTimeout(() => {
          if (!isLoadedOrPlayingRef.current) {
            console.warn('[VoiceNotePlayer] Audio load timed out:', playableUrl);
            releasePlayer();
            setIsLoading(false);
            setIsPlaying(false);
            setHasError(true);
          }
        }, 12000);

        const newPlayer = createAudioPlayer(
          { uri: playableUrl },
          {
            updateInterval: 200,
            downloadFirst: Platform.OS !== 'web',
          }
        );

        let didTriggerInitialPlay = false;

        subRef.current = newPlayer.addListener(
          'playbackStatusUpdate',
          (status: AudioStatus) => {
            if ((status as any).error) {
              console.warn(
                '[VoiceNotePlayer] Playback error:',
                (status as any).error
              );
              releasePlayer();
              setIsLoading(false);
              setIsPlaying(false);
              setHasError(true);
              return;
            }

            if (status.isLoaded || status.playing) {
              isLoadedOrPlayingRef.current = true;
              clearLoadTimeout();
            }

            if (status.isLoaded && !didTriggerInitialPlay) {
              didTriggerInitialPlay = true;
              if (playbackRate !== 1.0) {
                applyPlayerSpeedSafely(newPlayer, playbackRate);
              }
              try {
                newPlayer.play();
              } catch (_) {}
            }

            setIsPlaying(Boolean(status.playing));
            if (status.playing || (status.isLoaded && !status.isBuffering)) {
              setIsLoading(false);
            }

            if (status.currentTime !== undefined && status.currentTime >= 0) {
              setCurrentTime(status.currentTime);
            }
            if (status.duration && status.duration > 0) {
              setDuration(status.duration);
            }

            if (status.didJustFinish) {
              clearLoadTimeout();
              setIsPlaying(false);
              setIsLoading(false);
              setCurrentTime(0);
              try {
                newPlayer.pause();
                newPlayer.seekTo(0).catch(() => {});
              } catch (_) {}
              if (globalCurrentPlayer === newPlayer) {
                globalCurrentPlayer = null;
                globalStopCallback = null;
              }
            }
          }
        );

        playerRef.current = newPlayer;
        globalCurrentPlayer = newPlayer;
        globalStopCallback = stopThisSound;

        // Also invoke play() safely
        try {
          newPlayer.play();
        } catch (_) {}
      } else {
        const p = playerRef.current;
        if (p.duration > 0 && p.currentTime >= p.duration - 0.15) {
          await p.seekTo(0).catch(() => {});
          setCurrentTime(0);
        }
        if (playbackRate !== 1.0) {
          applyPlayerSpeedSafely(p, playbackRate);
        }
        p.play();
        globalCurrentPlayer = p;
        globalStopCallback = stopThisSound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[VoiceNotePlayer] Error toggling playback:', err);
      releasePlayer();
      setIsLoading(false);
      setIsPlaying(false);
      setHasError(true);
    }
  };

  const handleSpeedToggle = () => {
    const nextRate =
      playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    applyPlayerSpeedSafely(playerRef.current, nextRate);
  };

  const formatTime = (sec: number) => {
    const totalSec = Math.max(0, Math.floor(sec || 0));
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent =
    duration > 0
      ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
      : 0;

  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(duration || durationSeconds);

  if (!playableUrl) {
    return (
      <View style={styles.unavailableBadge}>
        <MaterialIcons name="mic-off" size={16} color="#888" />
        <Text style={styles.unavailableText}>Audio unavailable</Text>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        isMe ? styles.myContainer : styles.otherContainer,
      ]}
    >
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
          <MaterialIcons
            name="refresh"
            size={24}
            color={isMe ? '#D32F2F' : '#d32f2f'}
          />
        ) : (
          <MaterialIcons
            name={isPlaying ? 'pause' : 'play-arrow'}
            size={26}
            color={isMe ? '#075E54' : '#fff'}
          />
        )}
      </TouchableOpacity>

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
          <Text
            style={[
              styles.timeText,
              isMe && styles.myTimeText,
              hasError && styles.errorText,
            ]}
          >
            {hasError ? 'Retry' : displayTime}
          </Text>

          <View style={styles.micBadge}>
            <MaterialIcons
              name="mic"
              size={13}
              color={isMe ? '#075E54' : '#128C7E'}
            />
            <Text style={[styles.vnLabel, isMe && { color: '#075E54' }]}>
              Voice Note
            </Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[
          styles.speedBtn,
          isMe ? styles.mySpeedBtn : styles.otherSpeedBtn,
        ]}
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
