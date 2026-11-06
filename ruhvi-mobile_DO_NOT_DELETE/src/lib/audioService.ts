// ruhvi-mobile_DO_NOT_DELETE/src/lib/audioService.ts
//
// Native Audio Recording, Voice Note Upload & Speech-to-Text Dictation Service for RuhChat Mobile
// Compatible with Expo SDK 57 (expo-audio) and Gemini 3.5 Transcribe.

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
  mimeType: string;
  fileName: string;
  fileSizeBytes: number;
}

export interface VoiceUploadResult {
  url: string;
  publicId: string;
  durationSeconds: number;
  fileSizeBytes?: number;
  mimeType?: string;
  voiceNoteId?: string;
  expiresAt?: string;
}

const BACKEND_BASE_URLS = [
  'https://admin.ruhvi.in',
  'https://ruhvi.in',
];

const MAX_STT_BYTES = 3 * 1024 * 1024; // 3 MB raw ceiling safe for Vercel 4.5 MB function payload

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
 * Start high-quality voice note or dictation recording adhering to Expo SDK 57
 * nested platform configuration.
 */
export async function startAudioRecording(): Promise<AudioRecorder | null> {
  try {
    const granted = await requestAudioPermissions();
    if (!granted) {
      throw new Error('Microphone permission is required to record audio');
    }

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });

    // Expo SDK 57 requires preserving the nested android/ios/web structure
    const raw = RecordingPresets.HIGH_QUALITY;
    const recordingOptions = {
      ...raw,
      isMeteringEnabled: false,
      android: {
        ...raw.android,
      },
      ios: {
        ...raw.ios,
      },
      web: {
        ...(raw.web || {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        }),
      },
    };

    const recorder = new AudioModule.AudioRecorder(recordingOptions as any);
    // CRITICAL: Do NOT pass recordingOptions a second time to prepareToRecordAsync()
    await recorder.prepareToRecordAsync();
    recorder.record();
    return recorder;
  } catch (err: any) {
    console.error('[audioService] Error starting recording:', err);
    throw err;
  }
}

/**
 * Stop active recording, inspect file on disk, and retrieve local file URI,
 * duration, verified size, and platform MIME type.
 */
export async function stopAudioRecording(
  recording: AudioRecorder
): Promise<RecordedAudio | null> {
  try {
    const durationSeconds = Math.max(1, Math.round(recording.currentTime || 1));
    await recording.stop();
    // Wait 120ms for Android MediaRecorder to flush AAC frames & moov atom to disk
    await new Promise((resolve) => setTimeout(resolve, 120));

    // Reset audio mode for loudspeaker playback
    await setAudioModeAsync({
      allowsRecording: false,
      playsInSilentMode: true,
      shouldRouteThroughEarpiece: false,
    });

    const uri = recording.uri;
    if (!uri) {
      throw new Error('Audio recorder did not produce a valid file URI');
    }

    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists || (info as any).size === 0) {
      throw new Error('Recorded audio file is empty or missing from storage');
    }

    const isWeb = Platform.OS === 'web';
    const ext = isWeb ? '.webm' : '.m4a';
    const mimeType = isWeb ? 'audio/webm' : 'audio/mp4';
    const fileName = `Voice_Note_${Date.now()}${ext}`;
    const fileSizeBytes = (info as any).size || 0;

    return {
      uri,
      durationSeconds,
      mimeType,
      fileName,
      fileSizeBytes,
    };
  } catch (err: any) {
    console.error('[audioService] Error stopping recording:', err);
    throw err;
  }
}

async function getEffectiveAuthToken(token?: string | null): Promise<string | null> {
  if (token) return token;
  try {
    const mobileJwt = await AsyncStorage.getItem('ruhvi_mobile_jwt');
    if (mobileJwt) return mobileJwt;

    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }

    // Attempt staff mobile authentication mint if credentials stored
    const uid = await AsyncStorage.getItem('ruhvi_user_id');
    const email = await AsyncStorage.getItem('ruhvi_user_email');
    if (uid || email) {
      const { data: authData } = await supabase.rpc('authenticate_staff_mobile', {
        p_firebase_uid: uid || 'mobile-session',
        p_email: email || '',
      });
      if (authData?.supabaseToken) {
        await AsyncStorage.setItem('ruhvi_mobile_jwt', authData.supabaseToken);
        return authData.supabaseToken;
      }
    }
  } catch (err) {
    console.warn('[audioService] getEffectiveAuthToken error:', err);
  }
  return null;
}

/**
 * Transcribe recorded audio buffer via Gemini 3.5 Transcribe
 * Zero persistence - audio is processed in memory and discarded.
 */
export async function transcribeAudio(
  uri: string,
  token?: string | null,
  customMimeType?: string
): Promise<string> {
  try {
    const effectiveToken = await getEffectiveAuthToken(token);
    if (!effectiveToken) {
      throw new Error('Authentication required for speech transcription');
    }

    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (fileInfo.exists && (fileInfo as any).size > MAX_STT_BYTES) {
      throw new Error(
        `Audio recording (${(((fileInfo as any).size) / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed size of 3 MB for dictation.`
      );
    }

    const mimeType = customMimeType || (Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4');

    // Read audio as base64 for fast JSON streaming
    let base64Audio = '';
    try {
      base64Audio = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch (readErr) {
      console.warn('[audioService] Base64 read failed, fallback to uploadAsync:', readErr);
    }

    let lastError: any = null;

    for (const base of BACKEND_BASE_URLS) {
      const endpoint = `${base}/api/chat/transcribe`;
      try {
        if (base64Audio) {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${effectiveToken}`,
            },
            body: JSON.stringify({
              audioBase64: base64Audio,
              mimeType,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.transcript !== undefined) {
              return (data.transcript || '').trim();
            }
          } else {
            const errText = await response.text();
            console.warn(`[audioService] Transcribe JSON failed on ${endpoint}:`, errText);
            try {
              const parsed = JSON.parse(errText);
              lastError = new Error(parsed.error || `Server error ${response.status}`);
            } catch {
              lastError = new Error(`Server error ${response.status}`);
            }
          }
        } else {
          // Native upload fallback via FileSystem.uploadAsync
          const res = await FileSystem.uploadAsync(endpoint, uri, {
            httpMethod: 'POST',
            uploadType: FileSystem.FileSystemUploadType.MULTIPART,
            fieldName: 'audio',
            mimeType: mimeType === 'audio/mp4' ? 'audio/m4a' : mimeType,
            headers: {
              ...(effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : {}),
            },
          });

          if (res.status >= 200 && res.status < 300) {
            const data = JSON.parse(res.body);
            if (data.transcript !== undefined) {
              return (data.transcript || '').trim();
            }
          } else {
            console.warn(`[audioService] Transcribe uploadAsync failed on ${endpoint}:`, res.body);
            try {
              const parsed = JSON.parse(res.body);
              lastError = new Error(parsed.error || `Server error ${res.status}`);
            } catch {
              lastError = new Error(`Server error ${res.status}`);
            }
          }
        }
      } catch (reqErr: any) {
        console.warn(`[audioService] Transcribe request error on ${endpoint}:`, reqErr?.message);
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
 * Upload voice note with 45-day retention lifecycle tracking.
 * When conversationId is provided, uploads via /api/internal-chat/voice-notes/upload
 * which creates the server-side retention record in chat_voice_notes automatically.
 */
export async function uploadVoiceNote(
  uri: string,
  durationSeconds: number,
  mimeType?: string,
  conversationId?: string
): Promise<VoiceUploadResult> {
  const token = await getEffectiveAuthToken();
  const effectiveMime = mimeType || (Platform.OS === 'web' ? 'audio/webm' : 'audio/mp4');
  const fileName = `Voice_Note_${Date.now()}.${effectiveMime.includes('webm') ? 'webm' : 'm4a'}`;

  // If conversationId provided and token available, use dedicated voice note endpoint
  if (conversationId && token) {
    for (const base of BACKEND_BASE_URLS) {
      const endpoint = `${base}/api/internal-chat/voice-notes/upload`;
      try {
        const uploadRes = await FileSystem.uploadAsync(endpoint, uri, {
          httpMethod: 'POST',
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: 'file',
          mimeType: effectiveMime,
          parameters: {
            conversation_id: conversationId,
            duration_seconds: durationSeconds.toString(),
          },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (uploadRes.status >= 200 && uploadRes.status < 300) {
          const data = JSON.parse(uploadRes.body);
          const vn = data.voice_note || data.voiceNote || data;
          const resolvedUrl = vn?.url || vn?.cloudinary_url || data?.url;
          const resolvedPublicId =
            vn?.public_id || vn?.publicId || vn?.cloudinary_public_id || data?.publicId || '';
          if (data.success && resolvedUrl) {
            return {
              url: resolvedUrl,
              publicId: resolvedPublicId,
              durationSeconds:
                vn?.duration_seconds || vn?.durationSeconds || durationSeconds,
              fileSizeBytes: vn?.bytes || vn?.file_size_bytes || data?.fileSizeBytes,
              mimeType: vn?.mime_type || vn?.mimeType || effectiveMime,
              voiceNoteId: vn?.id || data?.voiceNoteId,
              expiresAt: vn?.expires_at || vn?.expiresAt || data?.expiresAt,
            };
          }
        }
      } catch (vnUploadErr) {
        console.warn(`[audioService] voice-notes/upload error on ${endpoint}:`, vnUploadErr);
      }
    }
  }

  // Fallback to standard attachment upload
  try {
    const result = await uploadToCloudinary(uri, fileName, effectiveMime);
    return {
      url: result.cloudinary_url,
      publicId: result.cloudinary_public_id,
      durationSeconds,
      fileSizeBytes: result.file_size,
      mimeType: result.mime_type || effectiveMime,
    };
  } catch (err: any) {
    console.error('[audioService] uploadVoiceNote fallback error:', err);
    throw new Error(err?.message || 'Failed to upload voice note');
  }
}
