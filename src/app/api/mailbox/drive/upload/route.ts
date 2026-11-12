import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.R2_BUCKET_MAILFLARE_RAW || 'mailflare-raw';

// POST /api/mailbox/drive/upload (Direct upload via Cloudflare REST API to R2)
export async function POST(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const folderId = formData.get('folder_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file uploaded' },
        { status: 400 }
      );
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return NextResponse.json(
        { success: false, error: 'Cloudflare credentials not configured' },
        { status: 500 }
      );
    }

    const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const r2Key = `drive/${fileId}_${sanitizedFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudflare R2 via REST API
    const r2Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${BUCKET_NAME}/objects/${encodeURIComponent(r2Key)}`;
    const r2Res = await fetch(r2Url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${apiToken}`,
        'Content-Type': file.type || 'application/octet-stream',
      },
      body: buffer,
    });

    if (!r2Res.ok) {
      const errText = await r2Res.text();
      console.error('[Drive Upload] R2 upload failed:', r2Res.status, errText);
      return NextResponse.json(
        { success: false, error: 'Failed to upload to Cloudflare R2' },
        { status: 502 }
      );
    }

    // Save record to D1
    const now = Math.floor(Date.now() / 1000);
    await queryMailflareD1(
      `INSERT INTO ruhmail_drive_files 
       (id, name, owner_uid, r2_key, file_size, content_type, folder_id, is_public, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [
        fileId,
        file.name,
        adminCheck.uid,
        r2Key,
        file.size,
        file.type || 'application/octet-stream',
        folderId && folderId !== 'root' ? folderId : null,
        now,
      ]
    );

    return NextResponse.json({
      success: true,
      file: {
        id: fileId,
        name: file.name,
        owner_uid: adminCheck.uid,
        r2_key: r2Key,
        file_size: file.size,
        content_type: file.type,
        folder_id: folderId || undefined,
        is_public: false,
        created_at: now,
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/drive/upload] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Upload processing failed' },
      { status: 500 }
    );
  }
}
