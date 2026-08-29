import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

/**
 * POST /api/support/upload
 *
 * Server-side secure upload route for support attachments.
 * Validates MIME type, size, and rate-limit BEFORE uploading to Cloudinary.
 *
 * Requirements (spec §8):
 *  - Allowed: image/* and application/pdf only (server-side MIME validation)
 *  - Max size: 10 MB per file
 *  - Rate-limit: 20 uploads per hour per account
 *  - Server-side re-validation of file type and size
 *  - Returns { secure_url, public_id, file_type, file_size, file_name }
 */

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_UPLOADS_PER_HOUR = 20;

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );
}

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;
    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', uid)
      .maybeSingle();
    return user;
  } catch {
    return null;
  }
}

/** Validate file content by magic bytes. */
function validateFileMagic(buffer: ArrayBuffer, mime: string): boolean {
  const view = new Uint8Array(buffer);
  const head = Array.from(view.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const magic: Record<string, string[]> = {
    'image/jpeg': ['ffd8ff'],
    'image/png': ['89504e47'],
    'image/webp': ['52494646'],
    'image/gif': ['47494638'],
    'application/pdf': ['25504446'],
  };

  const signatures = magic[mime];
  if (!signatures) return false;
  return signatures.some((sig) => head.startsWith(sig));
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = [
      'admin',
      'manager',
      'staff',
      'super_admin',
      'SUPER_ADMIN',
    ].includes(user.role);
    const supabase = await getSupabaseAdmin(cookieStore);

    // Rate-limit: check uploads in the past hour.
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from('support_ticket_attachments')
      .select('*', { count: 'exact', head: true })
      .eq('uploaded_by', user.id)
      .gte('created_at', hourAgo);

    if (count && count >= MAX_UPLOADS_PER_HOUR) {
      return NextResponse.json(
        { error: 'Upload rate limit exceeded (max 20/hour). Try again later.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Server-side MIME validation.
    const mime = file.type.toLowerCase();
    if (!ALLOWED_TYPES.includes(mime)) {
      return NextResponse.json(
        {
          error: `File type "${mime}" not allowed. Only images (JPEG, PNG, WebP, GIF) and PDF are accepted.`,
        },
        { status: 400 }
      );
    }

    // Server-side size validation.
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'File exceeds 10 MB maximum size.' },
        { status: 400 }
      );
    }

    // Server-side magic-byte validation.
    const buffer = await file.arrayBuffer();
    if (!validateFileMagic(buffer, mime)) {
      return NextResponse.json(
        { error: 'File content does not match its declared type.' },
        { status: 400 }
      );
    }

    // Upload to Cloudinary via server-side API (signed).
    const cloudName =
      process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'tfelmupe';
    const apiKey = process.env.CLOUDINARY_API_KEY || '';
    const apiSecret = process.env.CLOUDINARY_API_SECRET || '';

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: 'Cloudinary server-side credentials not configured' },
        { status: 500 }
      );
    }

    // Generate a signed upload signature.
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `support_attachments/${user.id}`;
    const params = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
    const crypto = await import('node:crypto');
    const signature = crypto.createHash('sha1').update(params).digest('hex');

    const cloudFormData = new FormData();
    cloudFormData.append('file', file);
    cloudFormData.append('api_key', apiKey);
    cloudFormData.append('timestamp', String(timestamp));
    cloudFormData.append('folder', folder);
    cloudFormData.append('signature', signature);

    const endpoint = mime === 'application/pdf' ? 'raw' : 'image';
    const cloudRes = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${endpoint}/upload`,
      { method: 'POST', body: cloudFormData }
    );

    if (!cloudRes.ok) {
      const errText = await cloudRes.text();
      console.error('Cloudinary upload error:', errText);
      return NextResponse.json(
        { error: 'Failed to upload file to storage' },
        { status: 502 }
      );
    }

    const cloudData = await cloudRes.json();

    return NextResponse.json({
      secure_url: cloudData.secure_url,
      public_id: cloudData.public_id,
      file_type: mime,
      file_size: file.size,
      file_name: file.name,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
