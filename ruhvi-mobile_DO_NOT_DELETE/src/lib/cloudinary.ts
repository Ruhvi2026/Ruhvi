// ruhvi-mobile_DO_NOT_DELETE/src/lib/cloudinary.ts
//
// Secure Cloudinary Upload Utility for RuhChat Mobile
// Security: Zero client-side secrets. Files are uploaded via authenticated backend endpoints
// (/api/internal-chat/upload) with server-side validation and signed Cloudinary transfers.

import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

export interface UploadResult {
  cloudinary_url: string;
  cloudinary_public_id: string;
  resource_type: 'image' | 'video' | 'raw';
  file_name: string;
  mime_type: string;
  file_size?: number;
  width?: number;
  height?: number;
}

const UPLOAD_ENDPOINTS = [
  'https://admin.ruhvi.in/api/internal-chat/upload',
  'https://ruhvi.in/api/internal-chat/upload',
];

async function getAuthToken(): Promise<string | null> {
  try {
    const jwt = await AsyncStorage.getItem('ruhvi_mobile_jwt');
    if (jwt) return jwt;

    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      return data.session.access_token;
    }
  } catch (err) {
    console.warn('[cloudinary.ts] getAuthToken warning:', err);
  }
  return null;
}

export async function uploadToCloudinary(
  fileDataOrUri: string,
  fileName: string,
  mimeType: string,
  fileSize?: number
): Promise<UploadResult> {
  const token = await getAuthToken();
  const lowerName = (fileName || '').toLowerCase();
  const isImage =
    mimeType.startsWith('image/') ||
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    lowerName.endsWith('.gif');
  const isVideo =
    mimeType.startsWith('video/') ||
    mimeType.startsWith('audio/') ||
    lowerName.endsWith('.m4a') ||
    lowerName.endsWith('.mp3') ||
    lowerName.endsWith('.wav') ||
    lowerName.endsWith('.mp4') ||
    lowerName.endsWith('.webm') ||
    lowerName.endsWith('.mov');
  const resourceType = isVideo ? 'video' : isImage ? 'image' : 'raw';

  // 1. If Base64 Data URI, write to safe temporary file first
  let targetUri = fileDataOrUri;
  if (fileDataOrUri.startsWith('data:')) {
    const match = fileDataOrUri.match(/^data:([^;]+);base64,(.+)$/);
    if (match) {
      const detectedMime = match[1];
      const base64Data = match[2];
      const ext = isImage ? '.jpg' : isVideo ? '.m4a' : '.bin';
      const tempPath = `${FileSystem.cacheDirectory}upload_${Date.now()}${ext}`;
      await FileSystem.writeAsStringAsync(tempPath, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      targetUri = tempPath;
      if (!mimeType) mimeType = detectedMime;
    }
  } else {
    // 2. Safe local file copy to avoid SAF permission issues
    const cleanExt = lowerName.includes('.')
      ? lowerName.substring(lowerName.lastIndexOf('.'))
      : isImage
        ? '.jpg'
        : isVideo
          ? '.m4a'
          : '.bin';
    const safeCachePath = `${FileSystem.cacheDirectory}chat_${Date.now()}${cleanExt}`;
    try {
      await FileSystem.copyAsync({
        from: fileDataOrUri,
        to: safeCachePath,
      });
      targetUri = safeCachePath;
    } catch (copyErr) {
      console.warn('[cloudinary.ts] FileSystem.copyAsync fallback to raw URI:', copyErr);
    }
  }

  let lastError: any = null;

  for (const endpoint of UPLOAD_ENDPOINTS) {
    try {
      const uploadResponse = await FileSystem.uploadAsync(endpoint, targetUri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: mimeType || (isImage ? 'image/jpeg' : 'application/octet-stream'),
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (uploadResponse.status >= 200 && uploadResponse.status < 300) {
        const data = JSON.parse(uploadResponse.body);
        return {
          cloudinary_url: data.cloudinary_url,
          cloudinary_public_id: data.cloudinary_public_id,
          resource_type: data.resource_type || resourceType,
          file_name: data.file_name || fileName || 'file',
          mime_type: data.mime_type || mimeType,
          file_size: data.file_size || fileSize,
          width: data.width,
          height: data.height,
        };
      }

      let errMsg = `Upload failed with status ${uploadResponse.status}`;
      try {
        const errObj = JSON.parse(uploadResponse.body);
        errMsg = errObj.error || errMsg;
      } catch (_) {}
      lastError = new Error(errMsg);
    } catch (err: any) {
      console.warn(`[cloudinary.ts] Upload failed on ${endpoint}:`, err?.message);
      lastError = err;
    }
  }

  throw lastError || new Error('Could not upload file to chat attachments');
}
