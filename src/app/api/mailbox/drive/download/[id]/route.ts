import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';

export const dynamic = 'force-dynamic';

const BUCKET_NAME = process.env.R2_BUCKET_MAILFLARE_RAW || 'mailflare-raw';

// GET /api/mailbox/drive/download/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return new NextResponse('Unauthorized', { status: adminCheck.status });
    }

    const { id } = await params;

    const rows = await queryMailflareD1<any>(
      `SELECT * FROM ruhmail_drive_files WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return new NextResponse('File not found', { status: 404 });
    }

    const file = rows[0];
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken) {
      return new NextResponse('Cloudflare credentials not configured', {
        status: 500,
      });
    }

    // Fetch object from Cloudflare R2
    const r2Url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/r2/buckets/${BUCKET_NAME}/objects/${encodeURIComponent(file.r2_key)}`;
    const r2Res = await fetch(r2Url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiToken}`,
      },
    });

    if (!r2Res.ok) {
      return new NextResponse('Object missing in Cloudflare R2', {
        status: 404,
      });
    }

    const fileBuffer = await r2Res.arrayBuffer();

    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': file.content_type || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(file.name)}"`,
        'Content-Length': String(file.file_size),
      },
    });
  } catch (error) {
    console.error('[API /api/mailbox/drive/download] Error:', error);
    return new NextResponse('Internal error streaming file', { status: 500 });
  }
}
