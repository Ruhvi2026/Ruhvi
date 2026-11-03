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
import { Audio, AVPlaybackStatus } from 'expo-av';

interface VoiceNotePlayerProps {
  audioUrl: string;
  durationSeconds?: number;
  isMe?: boolean;
}

// Global reference to ensure only one voice note plays at any time
let globalCurrentSound: Audio.Sound | null = null;
let globalStopCallback: (() => void) | null = null;

export default function VoiceNotePlayer({
  audioUrl,
  durationSeconds = 0,
  isMe = false,
}: VoiceNotePlayerProps) {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [positionMillis, setPositionMillis] = useState<number>(0);
  const [durationMillis, setDurationMillis] = useState<number>(durationSeconds * 1000);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
        if (globalCurrentSound === soundRef.current) {
          globalCurrentSound = null;
          globalStopCallback = null;
        }
      }
    };
  }, []);

  const onPlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      if (status.error) {
        setIsPlaying(false);
        setIsLoading(false);
      }
      return;
    }

    setIsPlaying(status.isPlaying);
    setPositionMillis(status.positionMillis);
    if (status.durationMillis) {
      setDurationMillis(status.durationMillis);
    }

    if (status.didJustFinish) {
      setIsPlaying(false);
      setPositionMillis(0);
      if (globalCurrentSound === soundRef.current) {
        globalCurrentSound = null;
        globalStopCallback = null;
      }
    }
  };

  const handlePlayPause = async () => {
    try {
      if (isPlaying) {
        if (sound) {
          await sound.pauseAsync();
        }
        setIsPlaying(false);
        return;
      }

      // Stop any other active voice note
      if (globalStopCallback && globalStopCallback !== stopThisSound) {
        globalStopCallback();
      }

      if (!sound) {
        setIsLoading(true);
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true, rate: playbackRate, shouldCorrectPitch: true },
          onPlaybackStatusUpdate
        );
        soundRef.current = newSound;
        setSound(newSound);
        globalCurrentSound = newSound;
        globalStopCallback = stopThisSound;
        setIsLoading(false);
        setIsPlaying(true);
      } else {
        await sound.playAsync();
        globalCurrentSound = sound;
        globalStopCallback = stopThisSound;
        setIsPlaying(true);
      }
    } catch (err) {
      console.warn('[VoiceNotePlayer] Error toggling playback:', err);
      setIsLoading(false);
      setIsPlaying(false);
    }
  };

  const stopThisSound = () => {
    if (soundRef.current) {
      soundRef.current.pauseAsync().catch(() => {});
    }
    setIsPlaying(false);
  };

  const handleSpeedToggle = async () => {
    const nextRate = playbackRate === 1.0 ? 1.5 : playbackRate === 1.5 ? 2.0 : 1.0;
    setPlaybackRate(nextRate);
    if (sound) {
      await sound.setRateAsync(nextRate, true).catch(() => {});
    }
  };

  const formatTime = (millis: number) => {
    const totalSec = Math.floor(millis / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const progressPercent = durationMillis > 0
    ? Math.min(100, Math.max(0, (positionMillis / durationMillis) * 100))
    : 0;

  const displayTime = isPlaying
    ? formatTime(positionMillis)
    : formatTime(durationMillis || durationSeconds * 1000);

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
