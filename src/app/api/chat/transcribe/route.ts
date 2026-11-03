// src/app/api/chat/transcribe/route.ts
//
// POST /api/chat/transcribe  → Speech-to-Text via Gemini 3.5 Transcribe
// Security: Authenticated session required.
// NOTE: Audio is processed in memory only and discarded. It is NEVER uploaded to Cloudinary.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import { transcribeAudioBuffer } from '@/lib/ai/transcribe-service';
import { SPEECH_TO_TEXT_MAX_BYTES } from '@/lib/chat/voice-types';

const MAX_STT_AUDIO_BYTES = SPEECH_TO_TEXT_MAX_BYTES;

async function getAuthenticatedUser(req: Request) {
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
    .select('id, role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (!user || user.account_status !== 'active') return null;
  return user;
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Audio file is required for transcription' },
        { status: 400 }
      );
    }

    if (file.size > MAX_STT_AUDIO_BYTES) {
      return NextResponse.json(
        { error: `Audio exceeds maximum allowed dictation size of 5 MB.` },
        { status: 413 }
      );
    }

    const mimeType = file.type || 'audio/webm';
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Gemini 3.5 Transcribe
    const { transcript, detectedLanguage } = await transcribeAudioBuffer(
      buffer,
      mimeType
    );

    return NextResponse.json({
      success: true,
      transcript,
      detectedLanguage,
    });
  } catch (err: any) {
    console.error('[chat/transcribe] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Speech-to-text transcription failed' },
      { status: 500 }
    );
  }
}
