import { NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase/service';
import { getAuthenticatedStaff } from '@/lib/auth/task-auth';

const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

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
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
  'video/mp4',
  'video/webm',
  'video/quicktime',
]);

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const taskId = formData.get('task_id') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!taskId) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Backend file size validation
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 20 MB.` },
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

    // Verify task exists and user has access
    const supabase = getServiceClient();
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', taskId)
      .eq('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Verify access to task
    const canAccess =
      staffUser.role === 'super_admin' ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id ||
      (staffUser.department_id &&
        staffUser.department_id === task.department_id &&
        staffUser.role === 'manager') ||
      // Check if user is assigned via task_assignments
      (
        await supabase
          .from('task_assignments')
          .select('id')
          .eq('task_id', taskId)
          .eq('user_id', staffUser.id)
          .single()
      ).data ||
      // Check if user is spectator
      (
        await supabase
          .from('task_spectators')
          .select('id')
          .eq('task_id', taskId)
          .eq('user_id', staffUser.id)
          .single()
      ).data;

    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // USE MESSENGER'S CLOUDINARY ACCOUNT (io1kkukg)
    const cloudName = process.env.NEXT_PUBLIC_CHAT_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CHAT_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CHAT_CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error('Chat Cloudinary credentials are not configured');
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
    const folder = 'ruhvi/task_attachments';
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate upload signature (same pattern as Messenger)
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
      console.error('[Task Upload] Cloudinary error:', errBody);
      return NextResponse.json(
        { error: 'File upload failed' },
        { status: 502 }
      );
    }

    const cloudData = await uploadRes.json();

    // Save to database
    const { data: attachment, error } = await supabase
      .from('task_attachments')
      .insert({
        task_id: taskId,
        cloudinary_public_id: cloudData.public_id,
        cloudinary_url: cloudData.secure_url,
        resource_type: cloudinaryResourceType,
        file_name: file.name,
        mime_type: mimeType,
        file_size: file.size,
        width: cloudData.width || null,
        height: cloudData.height || null,
        duration: cloudData.duration || null,
        uploader_id: staffUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('[Task Upload] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to save attachment' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: staffUser.id,
      action: 'attachment_added',
      new_value: {
        attachment_id: attachment.id,
        file_name: file.name,
        cloudinary_public_id: cloudData.public_id,
      },
    });

    return NextResponse.json({
      attachment,
      cloudinary_public_id: cloudData.public_id,
      cloudinary_url: cloudData.secure_url,
      resource_type: cloudinaryResourceType,
      file_name: file.name,
      mime_type: mimeType,
      file_size: file.size,
      success: true,
    });
  } catch (err: any) {
    console.error('[Task Upload] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
    if (!staffUser)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const attachmentId = searchParams.get('id');
    const taskId = searchParams.get('task_id');

    if (!attachmentId || !taskId) {
      return NextResponse.json(
        { error: 'Attachment ID and Task ID are required' },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // Verify task exists and user has access
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, created_by, assignee_id, department_id')
      .eq('id', taskId)
      .eq('deleted_at', null)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    // Get attachment to verify ownership
    const { data: attachment, error: attachError } = await supabase
      .from('task_attachments')
      .select('id, uploader_id, cloudinary_public_id')
      .eq('id', attachmentId)
      .eq('task_id', taskId)
      .single();

    if (attachError || !attachment) {
      return NextResponse.json(
        { error: 'Attachment not found' },
        { status: 404 }
      );
    }

    // Only uploader, creator, assignee, or admin can delete
    const canDelete =
      staffUser.role === 'super_admin' ||
      staffUser.id === attachment.uploader_id ||
      staffUser.id === task.created_by ||
      staffUser.id === task.assignee_id;

    if (!canDelete) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Delete from database
    const { error } = await supabase
      .from('task_attachments')
      .delete()
      .eq('id', attachmentId);

    if (error) {
      console.error('[Task Upload DELETE] DB error:', error);
      return NextResponse.json(
        { error: 'Failed to delete attachment' },
        { status: 500 }
      );
    }

    // Log activity
    await supabase.from('task_activity').insert({
      task_id: taskId,
      user_id: staffUser.id,
      action: 'attachment_removed',
      old_value: {
        attachment_id: attachmentId,
        cloudinary_public_id: attachment.cloudinary_public_id,
      },
    });

    return NextResponse.json({ success: true, message: 'Attachment deleted' });
  } catch (err: any) {
    console.error('[Task Upload DELETE] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
