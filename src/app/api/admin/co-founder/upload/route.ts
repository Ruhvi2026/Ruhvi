/**
 * POST /api/admin/co-founder/upload
 *
 * Dedicated authenticated upload endpoint for the AI Co-Founder workspace.
 * Accepts product images for Vision inspection & Studio photography.
 * Uploads to Cloudinary when configured, with seamless base64 fallback.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  enforceCoFounderRateLimit,
  createRateLimitHeaders,
} from '@/lib/ai/co-founder/rate-limiter';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/gif',
]);

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.uid) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const rateLimitCheck = enforceCoFounderRateLimit(auth.uid, {
      tier: 'tool_execution',
      role: auth.role || 'founder',
    });
    if (!rateLimitCheck.success) {
      return rateLimitCheck.response!;
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size too large. Max size is 15MB. Received ${(file.size / (1024 * 1024)).toFixed(1)}MB.`,
        },
        { status: 413 }
      );
    }

    const mimeType = file.type || 'image/jpeg';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        {
          error: `Unsupported image format: ${mimeType}. Please upload JPEG, PNG, or WebP.`,
        },
        { status: 415 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Check Cloudinary credentials
    const cloudName =
      process.env.CLOUDINARY_CLOUD_NAME ||
      process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME;
    const apiKey =
      process.env.CLOUDINARY_API_KEY || process.env.CHAT_CLOUDINARY_API_KEY;
    const apiSecret =
      process.env.CLOUDINARY_API_SECRET ||
      process.env.CHAT_CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    let cdnUrl: string | undefined;
    let publicId: string | undefined;

    if (cloudName && (uploadPreset || (apiKey && apiSecret))) {
      try {
        const uploadForm = new FormData();
        const blob = new Blob([buffer], { type: mimeType });
        uploadForm.append('file', blob, file.name || 'product.jpg');
        uploadForm.append('folder', 'ruhvi/co-founder-uploads');

        if (uploadPreset) {
          uploadForm.append('upload_preset', uploadPreset);
        } else if (apiKey && apiSecret) {
          const timestamp = Math.floor(Date.now() / 1000);
          const folder = 'ruhvi/co-founder-uploads';
          const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
          const encoder = new TextEncoder();
          const data = encoder.encode(signaturePayload);
          const hashBuffer = await crypto.subtle.digest('SHA-1', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const signature = hashArray
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');

          uploadForm.append('api_key', apiKey);
          uploadForm.append('timestamp', timestamp.toString());
          uploadForm.append('signature', signature);
        }

        const uploadEndpoint = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
        const cloudRes = await fetch(uploadEndpoint, {
          method: 'POST',
          body: uploadForm,
        });

        if (cloudRes.ok) {
          const cloudData = await cloudRes.json();
          cdnUrl = cloudData.secure_url;
          publicId = cloudData.public_id;
        }
      } catch (cloudErr) {
        console.warn(
          '[co-founder/upload] Cloudinary upload fallback to data URL:',
          cloudErr
        );
      }
    }

    const rateHeaders = createRateLimitHeaders(rateLimitCheck.result);

    return NextResponse.json(
      {
        success: true,
        url: cdnUrl || dataUrl,
        isCdn: Boolean(cdnUrl),
        publicId,
        base64,
        mimeType,
        fileName: file.name,
        fileSize: file.size,
      },
      { headers: rateHeaders }
    );
  } catch (err: any) {
    console.error('[co-founder/upload] Error processing upload:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to process image upload' },
      { status: 500 }
    );
  }
}
