// ruhvi-mobile_DO_NOT_DELETE/src/components/VoiceNotePlayer.tsx
//
// WhatsApp-style Voice Note Audio Player for RuhChat Mobile

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
  audioUrl: string;
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
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(durationSeconds);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const playerRef = useRef<AudioPlayer | null>(null);

  useEffect(() => {
    // Reset player if audioUrl changes (FlatList virtualization recycling)
    if (playerRef.current) {
      playerRef.current.pause();
      playerRef.current.release();
      playerRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(durationSeconds);

    return () => {
      if (playerRef.current) {
        playerRef.current.pause();
        playerRef.current.release();
        if (globalCurrentPlayer === playerRef.current) {
          globalCurrentPlayer = null;
          globalStopCallback = null;
        }
      }
    };
  }, [audioUrl, durationSeconds]);

  const stopThisSound = () => {
    if (playerRef.current) {
      playerRef.current.pause();
    }
    setIsPlaying(false);
  };

  const handlePlayPause = async () => {
    if (!audioUrl) return;

    try {
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

      // Ensure audio mode outputs to device loud speaker with silent mode bypass
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldRouteThroughEarpiece: false,
        });
      } catch (modeErr) {
        console.warn('[VoiceNotePlayer] setAudioModeAsync warning:', modeErr);
      }

      if (!playerRef.current) {
        setIsLoading(true);
        const newPlayer = createAudioPlayer(audioUrl, {
          updateInterval: 200,
          downloadFirst: false,
        });
        newPlayer.playbackRate = playbackRate;
        newPlayer.addListener('playbackStatusUpdate', (status: AudioStatus) => {
          setIsPlaying(status.playing);
          setIsLoading(status.isBuffering && !status.playing);
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
        setIsLoading(false);
        setIsPlaying(true);
      } else {
        playerRef.current.play();
        globalCurrentPlayer = playerRef.current;
        globalStopCallback = stopThisSound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[VoiceNotePlayer] Error toggling playback:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const handleSpeedToggle = () => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    if (playerRef.current) {
      playerRef.current.playbackRate = nextRate;
    }
  };

  const formatTime = (sec: number) => {
    const totalSec = Math.floor(sec);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = duration > 0
    ? Math.min(100, Math.max(0, (currentTime / duration) * 100))
    : 0;

  const displayTime = isPlaying
    ? formatTime(currentTime)
    : formatTime(duration || durationSeconds);

  return (
    <View style={[styles.container, isMe ? styles.myContainer : styles.otherContainer]}>
      {/* Play / Pause / Loading button */}
      <TouchableOpacity
        style={[styles.playBtn, isMe ? styles.myPlayBtn : styles.otherPlayBtn]}
        onPress={handlePlayPause}
        activeOpacity={0.8}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator size="small" color={isMe ? '#075E54' : '#fff'} />
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
          <Text style={[styles.timeText, isMe && styles.myTimeText]}>
            {displayTime}
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
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#075E54',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  myPlayBtn: {
    backgroundColor: '#DCF8C6',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  otherPlayBtn: {
    backgroundColor: '#075E54',
  },
  trackArea: {
    flex: 1,
    justifyContent: 'center',
  },
  trackBackground: {
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
    position: 'relative',
    justifyContent: 'center',
  },
  trackFill: {
    height: 4,
    backgroundColor: '#075E54',
    borderRadius: 2,
  },
  trackThumb: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#075E54',
    marginLeft: -5,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 11,
    color: '#667781',
    fontWeight: '500',
  },
  myTimeText: {
    color: '#4B5563',
  },
  micBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  vnLabel: {
    fontSize: 10,
    color: '#128C7E',
    fontWeight: '600',
  },
  speedBtn: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mySpeedBtn: {
    backgroundColor: 'rgba(7, 94, 84, 0.12)',
  },
  otherSpeedBtn: {
    backgroundColor: 'rgba(0,0,0,0.08)',
  },
  speedText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#374151',
  },
  mySpeedText: {
    color: '#075E54',
  },
});

