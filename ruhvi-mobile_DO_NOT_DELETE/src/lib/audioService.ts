// ruhvi-mobile_DO_NOT_DELETE/src/lib/audioService.ts
//
// Native Audio Recording, Voice Note Upload & Speech-to-Text Dictation Service for RuhChat Mobile

import { Audio } from 'expo-av';
import { Platform } from 'react-native';
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
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[audioService] Failed to request audio permissions:', err);
    return false;
  }
}

/**
 * Start high-quality voice note or dictation recording
 */
export async function startAudioRecording(): Promise<Audio.Recording | null> {
  try {
    const granted = await requestAudioPermissions();
    if (!granted) {
      throw new Error('Microphone permission is required to record voice notes');
    }

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    return recording;
  } catch (err: any) {
    console.error('[audioService] Error starting recording:', err);
    throw err;
  }
}

/**
 * Stop active recording and retrieve local file URI + duration
 */
export async function stopAudioRecording(
  recording: Audio.Recording
): Promise<RecordedAudio | null> {
  try {
    const status = await recording.getStatusAsync();
    await recording.stopAndUnloadAsync();

    // Reset audio mode for normal playback
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });

    const uri = recording.getURI();
    if (!uri) return null;

    const durationSeconds = Math.max(1, Math.round((status.durationMillis || 1000) / 1000));
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
    const formData = new FormData();
    const filePayload = {
      uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
      name: 'voice_note.m4a',
      type: 'audio/mp4',
    };
    formData.append('file', filePayload as any);

    const endpoints = [
      `${BACKEND_BASE}/api/chat/transcribe`,
      'http://localhost:3000/api/chat/transcribe',
    ];

    let lastError: any = null;
    for (const url of endpoints) {
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          if (data.transcript) {
            return data.transcript.trim();
          }
        } else {
          const errText = await response.text();
          console.warn(`[audioService] Transcribe failed on ${url}:`, errText);
        }
      } catch (reqErr) {
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

