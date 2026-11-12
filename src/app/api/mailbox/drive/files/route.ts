import { NextRequest, NextResponse } from 'next/server';
import { queryMailflareD1 } from '@/lib/mailbox/d1-client';
import { requireAdmin } from '@/lib/auth/require-admin';
import type { RuhMailDriveFile, RuhMailDriveFolder } from '@/types/mailbox';

export const dynamic = 'force-dynamic';

interface RawFolderRow {
  id: string;
  name: string;
  owner_uid: string;
  parent_id: string | null;
  created_at: number;
}

interface RawFileRow {
  id: string;
  name: string;
  owner_uid: string;
  r2_key: string;
  file_size: number;
  content_type: string;
  folder_id: string | null;
  is_public: number;
  created_at: number;
}

// GET /api/mailbox/drive/files?folder_id=xxx
export async function GET(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folder_id');

    let fileQuery = `
      SELECT id, name, owner_uid, r2_key, file_size, content_type, folder_id, is_public, created_at
      FROM ruhmail_drive_files
    `;
    const fileParams: unknown[] = [];

    if (folderId && folderId !== 'root') {
      fileQuery += ` WHERE folder_id = ?`;
      fileParams.push(folderId);
    } else {
      fileQuery += ` WHERE folder_id IS NULL OR folder_id = ''`;
    }

    fileQuery += ` ORDER BY created_at DESC`;

    // Also get folders
    let folderQuery = `SELECT id, name, owner_uid, parent_id, created_at FROM ruhmail_drive_folders`;
    const folderParams: unknown[] = [];
    if (folderId && folderId !== 'root') {
      folderQuery += ` WHERE parent_id = ?`;
      folderParams.push(folderId);
    } else {
      folderQuery += ` WHERE parent_id IS NULL OR parent_id = ''`;
    }
    folderQuery += ` ORDER BY name ASC`;

    const [fileRows, folderRows] = await Promise.all([
      queryMailflareD1<RawFileRow>(fileQuery, fileParams),
      queryMailflareD1<RawFolderRow>(folderQuery, folderParams),
    ]);

    const files: RuhMailDriveFile[] = fileRows.map((f) => ({
      id: f.id,
      name: f.name,
      owner_uid: f.owner_uid,
      r2_key: f.r2_key,
      file_size: f.file_size,
      content_type: f.content_type,
      folder_id: f.folder_id || undefined,
      is_public: Boolean(f.is_public),
      created_at: f.created_at,
    }));

    const folders: RuhMailDriveFolder[] = folderRows.map((fo) => ({
      id: fo.id,
      name: fo.name,
      owner_uid: fo.owner_uid,
      parent_id: fo.parent_id || undefined,
      created_at: fo.created_at,
    }));

    return NextResponse.json({ success: true, files, folders });
  } catch (error) {
    console.error('[API /api/mailbox/drive/files] GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch drive items',
        files: [],
        folders: [],
      },
      { status: 500 }
    );
  }
}

// DELETE /api/mailbox/drive/files?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const adminCheck = await requireAdmin();
    if (!adminCheck.ok) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: adminCheck.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'File ID is required' },
        { status: 400 }
      );
    }

    // Delete record from D1 (MIME blobs in R2 are pruned asynchronously)
    await queryMailflareD1(`DELETE FROM ruhmail_drive_files WHERE id = ?`, [
      id,
    ]);
    return NextResponse.json({
      success: true,
      message: 'File deleted from drive',
    });
  } catch (error) {
    console.error('[API /api/mailbox/drive/files] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete file' },
      { status: 500 }
    );
  }
}
