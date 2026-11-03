// src/lib/chat/cloudinary-audio.ts
//
// Cloudinary Audio Service for Voice Notes with 45-day automatic retention lifecycle.

import 'server-only';
import { v2 as cloudinary } from 'cloudinary';
import { getServiceClient } from '@/lib/supabase/service';
import {
  VoiceCleanupResult,
  VOICE_NOTE_RETENTION_DAYS,
  VOICE_NOTE_RETENTION_MS,
} from './voice-types';

const RETENTION_DAYS = VOICE_NOTE_RETENTION_DAYS;
const RETENTION_MS = VOICE_NOTE_RETENTION_MS;

function getCloudinary() {
  const cloudName =
    process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME ||
    process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
    process.env.CLOUDINARY_CLOUD_NAME ||
    'io1kkukg';
  const apiKey =
    process.env.CHAT_CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY ||
    '522811694238476';
  const apiSecret =
    process.env.CHAT_CLOUDINARY_API_SECRET ||
    process.env.CLOUDINARY_API_SECRET ||
    '4InB0lp_J8h_NUwTCp3NVBXalOs';

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
}

export interface UploadVoiceNoteResult {
  publicId: string;
  url: string;
  durationSeconds: number;
  bytes: number;
  mimeType: string;
  uploadedAt: string;
  expiresAt: string;
}

/**
 * Uploads an audio voice note to Cloudinary under the 'video' resource type,
 * tagging it for 45-day retention lifecycle management.
 */
export async function uploadAudioVoiceNote(
  buffer: Buffer,
  options: {
    conversationId: string;
    senderId: string;
    mimeType?: string;
    durationSeconds?: number;
  }
): Promise<UploadVoiceNoteResult> {
  const cld = getCloudinary();
  const mimeType = options.mimeType || 'audio/webm';
  const durationSeconds = options.durationSeconds || 0;
  const now = new Date();
  const uploadedAt = now.toISOString();
  const expiresAt = new Date(now.getTime() + RETENTION_MS).toISOString();

  const folder = 'ruhvi/chat_voice_notes';
  const tags = [
    'voice_note',
    'auto_purge_45d',
    `env_${process.env.NODE_ENV || 'production'}`,
  ];

  return new Promise((resolve, reject) => {
    const uploadStream = cld.uploader.upload_stream(
      {
        folder,
        resource_type: 'video', // Audio must be uploaded as video resource type in Cloudinary
        tags,
        context: {
          uploaded_at: uploadedAt,
          expires_at: expiresAt,
          uploaded_by: options.senderId,
          conversation_id: options.conversationId,
        },
      },
      (error, result) => {
        if (error) {
          return reject(
            new Error(`Cloudinary upload failed: ${error.message}`)
          );
        }
        if (!result) {
          return reject(new Error('Cloudinary returned empty upload result'));
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url,
          durationSeconds: result.duration || durationSeconds,
          bytes: result.bytes,
          mimeType,
          uploadedAt,
          expiresAt,
        });
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Destroys a voice note asset on Cloudinary and invalidates CDN cache.
 */
export async function destroyAudioVoiceNote(
  publicId: string
): Promise<boolean> {
  try {
    const cld = getCloudinary();
    const res = await cld.uploader.destroy(publicId, {
      resource_type: 'video',
      invalidate: true,
    });
    return res.result === 'ok' || res.result === 'not found';
  } catch (err: any) {
    console.error(
      `[destroyAudioVoiceNote] Failed to destroy ${publicId}:`,
      err
    );
    return false;
  }
}

/**
 * Alias adhering to canonical Master Plan naming.
 */
export const deleteAudioVoiceNote = destroyAudioVoiceNote;

/**
 * Automated Cron Job Engine:
 * Purges all audio voice notes whose retention age exceeds 45 days.
 * Dual-tier cleanup:
 * 1. Checks Supabase `chat_voice_notes` for active records with expires_at <= NOW().
 * 2. Destroys the Cloudinary asset.
 * 3. Updates database status to 'expired' with deleted_at timestamp.
 */
export async function purgeExpiredVoiceNotes(
  batchLimit = 100
): Promise<VoiceCleanupResult> {
  const startedAt = Date.now();
  const supabase = getServiceClient();
  const nowIso = new Date().toISOString();

  const purgedPublicIds: string[] = [];
  const errors: string[] = [];

  // 1. Fetch expired active voice notes from database
  const { data: expiredNotes, error: fetchErr } = await supabase
    .from('chat_voice_notes')
    .select('id, cloudinary_public_id, conversation_id, expires_at')
    .eq('status', 'active')
    .lte('expires_at', nowIso)
    .limit(batchLimit);

  if (fetchErr) {
    errors.push(`Database query error: ${fetchErr.message}`);
    return {
      success: false,
      checkedCount: 0,
      purgedCount: 0,
      errorCount: 1,
      purgedPublicIds: [],
      errors,
      durationMs: Date.now() - startedAt,
    };
  }

  const notesToPurge = expiredNotes || [];

  for (const note of notesToPurge) {
    try {
      const deleted = await destroyAudioVoiceNote(note.cloudinary_public_id);
      if (deleted) {
        await supabase
          .from('chat_voice_notes')
          .update({
            status: 'expired',
            deleted_at: new Date().toISOString(),
          })
          .eq('id', note.id);

        purgedPublicIds.push(note.cloudinary_public_id);
      } else {
        errors.push(
          `Failed to destroy Cloudinary asset: ${note.cloudinary_public_id}`
        );
      }
    } catch (err: any) {
      errors.push(`Error purging ${note.cloudinary_public_id}: ${err.message}`);
    }
  }

  // 2. Secondary Cloudinary orphan scan using Search API (if supported)
  try {
    const cld = getCloudinary();
    const fortyFiveDaysAgo = new Date(Date.now() - RETENTION_MS).toISOString();
    const searchRes = await cld.search
      .expression(
        `folder:ruhvi/chat_voice_notes AND tags:auto_purge_45d AND created_at<=${fortyFiveDaysAgo}`
      )
      .max_results(20)
      .execute();

    if (searchRes && searchRes.resources && searchRes.resources.length > 0) {
      for (const res of searchRes.resources) {
        if (!purgedPublicIds.includes(res.public_id)) {
          await destroyAudioVoiceNote(res.public_id);
          purgedPublicIds.push(res.public_id);
        }
      }
    }
  } catch (searchErr: any) {
    // Cloudinary search API is optional if account does not have search index enabled
    console.warn(
      '[purgeExpiredVoiceNotes] Cloudinary Search API fallback skipped:',
      searchErr.message
    );
  }

  return {
    success: errors.length === 0,
    checkedCount: notesToPurge.length,
    purgedCount: purgedPublicIds.length,
    errorCount: errors.length,
    purgedPublicIds,
    errors,
    durationMs: Date.now() - startedAt,
  };
}
