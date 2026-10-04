import 'server-only';

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary using dedicated io1kkukg account (with environment variable support)
const cloudName =
  process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME ||
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  'io1kkukg';
const apiKey =
  process.env.CHAT_CLOUDINARY_API_KEY ||
  process.env.CLOUDINARY_API_KEY ||
  '522811694238476';
const apiSecret =
  process.env.CHAT_CLOUDINARY_API_SECRET ||
  process.env.CLOUDINARY_API_SECRET ||
  '4InB0lp_J8h_NUwTCp3NVBXalOs';

if (cloudName && apiKey && apiSecret) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

export interface MarketingMediaUploadResult {
  secureUrl: string;
  publicId: string;
  format: string;
  duration?: number;
  bytes: number;
  width?: number;
  height?: number;
}

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates uploaded video file constraints.
 */
export function validateVideoUpload(file: {
  size: number;
  type: string;
  name?: string;
}): UploadValidationResult {
  const MAX_SIZE_BYTES = 100 * 1024 * 1024; // 100MB
  const ALLOWED_MIME_TYPES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
  ];

  if (!file) {
    return { valid: false, error: 'No file provided for upload.' };
  }

  if (file.size > MAX_SIZE_BYTES) {
    return {
      valid: false,
      error: `File size exceeds 100MB limit (size: ${(file.size / (1024 * 1024)).toFixed(1)}MB).`,
    };
  }

  const isTypeAllowed =
    ALLOWED_MIME_TYPES.includes(file.type) ||
    file.name?.endsWith('.mp4') ||
    file.name?.endsWith('.mov') ||
    file.name?.endsWith('.webm');

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: `Unsupported video format. Allowed formats: MP4, MOV, WebM (received: ${file.type || 'unknown'}).`,
    };
  }

  return { valid: true };
}

/**
 * Uploads a marketing video asset (Video 1 or Video 2 from Flow) to Cloudinary.
 */
export async function uploadMarketingVideoToCloudinary(
  fileBuffer: Buffer | string,
  metadata: {
    campaignId?: string;
    taskId?: string;
    clipIndex: 1 | 2;
    fileName?: string;
  }
): Promise<MarketingMediaUploadResult> {
  const folder = `marketing/campaigns/${metadata.campaignId || 'general'}`;
  const publicId = `flow_clip_${metadata.clipIndex}_${Date.now()}`;

  // If Cloudinary is configured, upload via Cloudinary SDK
  if (cloudName && apiKey && apiSecret) {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'video',
          folder,
          public_id: publicId,
          tags: [
            'marketing_worker',
            `clip_${metadata.clipIndex}`,
            metadata.campaignId ? `campaign_${metadata.campaignId}` : 'general_ad',
          ],
          context: {
            campaignId: metadata.campaignId || 'n/a',
            taskId: metadata.taskId || 'n/a',
            clipIndex: metadata.clipIndex.toString(),
          },
        },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }
          resolve({
            secureUrl: result.secure_url,
            publicId: result.public_id,
            format: result.format || 'mp4',
            duration: result.duration,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      if (Buffer.isBuffer(fileBuffer)) {
        uploadStream.end(fileBuffer);
      } else {
        // Base64 string or URL
        cloudinary.uploader.upload(
          fileBuffer,
          {
            resource_type: 'video',
            folder,
            public_id: publicId,
          },
          (err, res) => {
            if (err || !res) {
              return reject(new Error(`Cloudinary upload failed: ${err?.message || 'Unknown error'}`));
            }
            resolve({
              secureUrl: res.secure_url,
              publicId: res.public_id,
              format: res.format || 'mp4',
              duration: res.duration,
              bytes: res.bytes,
              width: res.width,
              height: res.height,
            });
          }
        );
      }
    });
  }

  // Fallback / Development Simulation when Cloudinary credentials are not set in environment
  return {
    secureUrl: `https://res.cloudinary.com/ruhvi-demo/video/upload/v1728000000/${folder}/${publicId}.mp4`,
    publicId: `${folder}/${publicId}`,
    format: 'mp4',
    duration: 5.0,
    bytes: typeof fileBuffer === 'string' ? fileBuffer.length : (fileBuffer as Buffer).length || 5000000,
    width: 1080,
    height: 1920,
  };
}
