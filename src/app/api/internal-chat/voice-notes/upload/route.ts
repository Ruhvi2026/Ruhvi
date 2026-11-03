// src/app/api/internal-chat/voice-notes/upload/route.ts
//
// POST /api/internal-chat/voice-notes/upload
// Secure voice note audio upload endpoint with 45-day retention policy tracking.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import { uploadAudioVoiceNote } from '@/lib/chat/cloudinary-audio';
import { VOICE_NOTE_MAX_BYTES } from '@/lib/chat/voice-types';

const MAX_VOICE_SIZE_BYTES = VOICE_NOTE_MAX_BYTES;

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
  'audio/x-m4a',
]);

async function getAuthenticatedStaff(req: Request) {
  const cookieStore = await cookies();
  let token = cookieStore.get('__session')?.value;
  if (!token) {
    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      token = authHeader.substring(7).trim();
    }
  }
  const decoded = await verifySessionToken(token);
  let userId = decoded?.sub as string | undefined;

  const supabase = getServiceClient();
  if (!userId && token) {
    const { data: authData } = await supabase.auth.getUser(token);
    if (authData?.user?.id) {
      userId = authData.user.id;
    }
  }

  if (!userId) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, role, full_name, email, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (!user || user.account_status !== 'active' || user.role === 'customer') {
    return null;
  }
  return user;
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff(req);
    if (!staffUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const conversationId = formData.get('conversation_id') as string | null;
    const durationSecondsRaw = formData.get('duration_seconds') as
      string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required' },
        { status: 400 }
      );
    }

    if (!conversationId) {
      return NextResponse.json(
        { error: 'conversation_id is required' },
        { status: 400 }
      );
    }

    if (file.size > MAX_VOICE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `Voice note exceeds maximum limit of 10 MB. Got ${(file.size / 1024 / 1024).toFixed(1)} MB`,
        },
        { status: 413 }
      );
    }

    const mimeType = file.type || 'audio/webm';
    if (!ALLOWED_AUDIO_TYPES.has(mimeType)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${mimeType}` },
        { status: 415 }
      );
    }

    const supabase = getServiceClient();
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        conversationId
      );

    // Verify membership in conversation if it is a real database conversation
    if (isUuid) {
      const { data: membership } = await supabase
        .from('chat_conversation_members')
        .select('id')
        .eq('conversation_id', conversationId)
        .eq('user_id', staffUser.id)
        .is('left_at', null)
        .maybeSingle();

      if (!membership) {
        return NextResponse.json(
          { error: 'Forbidden: Not a conversation member' },
          { status: 403 }
        );
      }
    }

    const durationSeconds = durationSecondsRaw
      ? parseFloat(durationSecondsRaw)
      : 0;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Cloudinary under 'video' resource type with 45-day retention tags
    const uploadResult = await uploadAudioVoiceNote(buffer, {
      conversationId,
      senderId: staffUser.id,
      mimeType,
      durationSeconds,
    });

    let voiceNoteId: string | undefined = undefined;

    // Save lifecycle record in chat_voice_notes for real database conversations
    if (isUuid) {
      const { data: voiceNoteRecord, error: dbErr } = await supabase
        .from('chat_voice_notes')
        .insert({
          conversation_id: conversationId,
          sender_id: staffUser.id,
          cloudinary_public_id: uploadResult.publicId,
          cloudinary_url: uploadResult.url,
          duration_seconds: uploadResult.durationSeconds,
          file_size_bytes: uploadResult.bytes,
          mime_type: uploadResult.mimeType,
          uploaded_at: uploadResult.uploadedAt,
          expires_at: uploadResult.expiresAt,
          status: 'active',
        })
        .select()
        .single();

      if (dbErr) {
        console.error('[voice-notes/upload] Database insert error:', dbErr);
        return NextResponse.json(
          { error: 'Failed to record voice note metadata' },
          { status: 500 }
        );
      }
      voiceNoteId = voiceNoteRecord.id;
    }

    return NextResponse.json({
      success: true,
      voiceNoteId,
      publicId: uploadResult.publicId,
      url: uploadResult.url,
      durationSeconds: uploadResult.durationSeconds,
      fileSizeBytes: uploadResult.bytes,
      mimeType: uploadResult.mimeType,
      expiresAt: uploadResult.expiresAt,
    });
  } catch (err: any) {
    console.error('[voice-notes/upload] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
