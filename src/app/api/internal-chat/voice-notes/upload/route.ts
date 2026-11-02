// src/app/api/internal-chat/voice-notes/upload/route.ts
//
// POST /api/internal-chat/voice-notes/upload
// Secure voice note audio upload endpoint with 45-day retention policy tracking.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import { uploadAudioVoiceNote } from '@/lib/chat/cloudinary-audio';

const MAX_VOICE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB limit for voice notes

const ALLOWED_AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/aac',
  'audio/x-m4a',
]);

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, full_name, email, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  if (!user || user.account_status !== 'active' || user.role === 'customer') {
    return null;
  }
  return user;
}

export async function POST(req: Request) {
  try {
    const staffUser = await getAuthenticatedStaff();
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

    // Verify membership in conversation
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

    // Save lifecycle record in chat_voice_notes
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

    return NextResponse.json({
      success: true,
      voiceNoteId: voiceNoteRecord.id,
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
