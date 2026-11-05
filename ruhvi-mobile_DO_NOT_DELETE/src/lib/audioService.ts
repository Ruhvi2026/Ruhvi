// ruhvi-mobile_DO_NOT_DELETE/src/lib/audioService.ts
//
// Native Audio Recording, Voice Note Upload & Speech-to-Text Dictation Service for RuhChat Mobile

import {
  AudioModule,
  AudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from 'expo-audio';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';
import { uploadToCloudinary } from './cloudinary';

export interface RecordedAudio {
  uri: string;
  durationSeconds: number;
}

export interface VoiceUploadResult {
  url: string;
  publicId: string;
  durationSeconds: number;
}

const BACKEND_BASE = 'https://ruhvi.in';

/**
 * Request runtime microphone permission for audio recording
 */
export async function requestAudioPermissions(): Promise<boolean> {
  try {
    const { status } = await requestRecordingPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[audioService] Failed to request audio permissions:', err);
    return false;
  }
}

/**
 * Start high-quality voice note or dictation recording
 */
export async function startAudioRecording(): Promise<AudioRecorder | null> {
  try {
    const granted = await requestAudioPermissions();
    if (!granted) {
      throw new Error('Microphone permission is required to record voice notes');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });

    const raw = RecordingPresets.HIGH_QUALITY;
    const platformOptions = {
      extension: raw.extension,
      sampleRate: raw.sampleRate,
      numberOfChannels: raw.numberOfChannels,
      bitRate: raw.bitRate,
      isMeteringEnabled: false,
      ...(Platform.OS === 'android' ? raw.android : raw.ios),
    };

    const recorder = new AudioModule.AudioRecorder(platformOptions);
    await recorder.prepareToRecordAsync(platformOptions);
    recorder.record();
    return recorder;
  } catch (err: any) {
    console.error('[audioService] Error starting recording:', err);
    throw err;
  }
}

/**
 * Stop active recording and retrieve local file URI + duration
 */
export async function stopAudioRecording(
  recording: AudioRecorder
): Promise<RecordedAudio | null> {
  try {
    const durationSeconds = Math.max(1, Math.round(recording.currentTime || 1));
    await recording.stop();

    // Reset audio mode for loud speaker playback
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });

    const uri = recording.uri;
    if (!uri) return null;

    return { uri, durationSeconds };
  } catch (err: any) {
    console.error('[audioService] Error stopping recording:', err);
    return null;
  }
}

/**
 * Transcribe recorded audio buffer via Gemini 3.5 Transcribe
 * Zero persistence - audio is discarded after streaming transcription
 */
export async function transcribeAudio(
  uri: string,
  token?: string | null
): Promise<string> {
  try {
    let effectiveToken = token;
    if (!effectiveToken) {
      effectiveToken = await AsyncStorage.getItem('ruhvi_mobile_jwt');
    }
    if (!effectiveToken) {
      const { data } = await supabase.auth.getSession();
      effectiveToken = data.session?.access_token || null;
    }

    let uid = await AsyncStorage.getItem('ruhvi_user_id');
    let email = await AsyncStorage.getItem('ruhvi_user_email');

    // Self-healing: if token is missing, attempt quick authentication mint
    if (!effectiveToken && (email || uid)) {
      try {
        const { data: authData } = await supabase.rpc('authenticate_staff_mobile', {
          p_firebase_uid: uid || 'mobile-session',
          p_email: email || '',
        });
        if (authData?.supabaseToken) {
          effectiveToken = authData.supabaseToken;
          await AsyncStorage.setItem('ruhvi_mobile_jwt', authData.supabaseToken);
        }
      } catch (_) {}
    }

    const endpoints = [
      'https://admin.ruhvi.in/api/chat/transcribe',
      'https://ruhvi.in/api/chat/transcribe',
    ];

    // Read audio as base64 to avoid React Native FormData compatibility issues across Android/iOS
    let base64Audio = '';
    try {
      base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: 'base64' as any,
      });
    } catch (readErr) {
      console.warn('[audioService] readAsStringAsync failed, will attempt uploadAsync:', readErr);
    }

    let lastError: any = null;
    for (const url of endpoints) {
      try {
        if (base64Audio) {
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
              ...(uid ? { 'x-ruhvi-user-id': uid } : {}),
            },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType: 'audio/m4a',
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript !== undefined) {
              return (data.transcript || '').trim();
            }
          } else {
            const errText = await response.text();
            console.warn(`[audioService] Transcribe failed via JSON on ${url}:`, errText);
            try {
              const parsed = JSON.parse(errText);
              lastError = new Error(parsed.error || `Server error ${response.status}`);
            } catch {
              lastError = new Error(`Server error ${response.status}`);
            }
          }
        } else {
          // Native upload fallback via FileSystem.uploadAsync
          const res = await FileSystem.uploadAsync(url, uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'file',
            mimeType: 'audio/m4a',
            headers: {
              ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
              ...(uid ? { 'x-ruhvi-user-id': uid } : {}),
            },
          });

          if (res.status >= 200 && res.status < 300) {
            const data = JSON.parse(res.body);
            if (data.transcript !== undefined) {
              return (data.transcript || '').trim();
            }
          } else {
            console.warn(`[audioService] Transcribe failed via uploadAsync on ${url}:`, res.body);
            try {
              const parsed = JSON.parse(res.body);
              lastError = new Error(parsed.error || `Server error ${res.status}`);
            } catch {
              lastError = new Error(`Server error ${res.status}`);
            }
          }
        }
      } catch (reqErr) {
        console.warn(`[audioService] Request failed on ${url}:`, reqErr);
        lastError = reqErr;
      }
    }

    if (lastError) throw lastError;
    return '';
  } catch (err: any) {
    console.error('[audioService] transcribeAudio error:', err);
    throw new Error(err?.message || 'Failed to transcribe audio dictation');
  }
}

/**
 * Upload voice note to Cloudinary via secondary credentials with 45-day retention
 */
export async function uploadVoiceNote(
  uri: string,
  durationSeconds: number
): Promise<VoiceUploadResult> {
  try {
    const fileName = `Voice_Note_${Date.now()}.m4a`;
    const mimeType = 'audio/mp4';

    const result = await uploadToCloudinary(uri, fileName, mimeType);
    return {
      url: result.cloudinary_url,
      publicId: result.cloudinary_public_id,
      durationSeconds,
    };
  } catch (err: any) {
    console.error('[audioService] uploadVoiceNote error:', err);
    throw new Error(err?.message || 'Failed to upload voice note');
  }
}

