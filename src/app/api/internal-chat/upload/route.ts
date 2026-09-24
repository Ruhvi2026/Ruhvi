// src/app/api/internal-chat/upload/route.ts
//
// POST /api/internal-chat/upload  → Upload a file to Cloudinary for chat attachments
//
// Security: Requires authenticated staff session.
// Max file size: 20 MB (enforced here + frontend).
// Returns: { cloudinary_public_id, cloudinary_url, resource_type, file_name, mime_type, file_size, width, height }

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// Allowed MIME types for chat attachments
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Backend file size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `File too large. Maximum size is 20 MB. Got ${(file.size / 1024 / 1024).toFixed(1)} MB.`,
        },
        { status: 413 }
      );
    }

    // Backend MIME type validation
    const mimeType = file.type || 'application/octet-stream';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `File type '${mimeType}' is not allowed.` },
        { status: 415 }
      );
    }

    const cloudName = process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CHAT_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CHAT_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Cloudinary credentials are not configured');
    }

    // Determine resource type for Cloudinary
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');
    const cloudinaryResourceType = isVideo
      ? 'video'
      : isImage
        ? 'image'
        : 'raw';

    // Build the upload folder path
    const folder = 'ruhvi/chat_attachments';
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate upload signature
    const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(signaturePayload);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Upload to Cloudinary
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);
    uploadFormData.append('api_key', apiKey);
    uploadFormData.append('timestamp', timestamp.toString());
    uploadFormData.append('signature', signature);
    uploadFormData.append('folder', folder);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/${cloudinaryResourceType}/upload`;
    const uploadRes = await fetch(uploadUrl, {
      method: 'POST',
      body: uploadFormData,
    });

    if (!uploadRes.ok) {
      const errBody = await uploadRes.text();
      console.error('[Chat upload] Cloudinary error:', errBody);
      return NextResponse.json(
        { error: 'File upload failed' },
        { status: 502 }
      );
    }

    const cloudData = await uploadRes.json();

    return NextResponse.json({
      cloudinary_public_id: cloudData.public_id,
      cloudinary_url: cloudData.secure_url,
      resource_type: cloudinaryResourceType,
      file_name: file.name,
      mime_type: mimeType,
      file_size: file.size,
      width: cloudData.width || null,
      height: cloudData.height || null,
      duration: cloudData.duration || null,
    });
  } catch (err: any) {
    console.error('[Chat POST /upload]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
