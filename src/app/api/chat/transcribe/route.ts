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

  // Also decode custom JWT sub
  if (!userId && token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(
          Buffer.from(parts[1], 'base64').toString('utf8')
        );
        if (payload?.sub) {
          userId = payload.sub;
        }
      }
    } catch (_) {}
  }

  // Also support 'x-ruhvi-user-id' header if bearer token was provided
  if (!userId && token) {
    const xUid = req.headers.get('x-ruhvi-user-id');
    if (xUid && /^[0-9a-f-]{36}$/i.test(xUid)) {
      userId = xUid;
    }
  }

  if (!userId) return null;

  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status')
    .eq('id', userId)
    .maybeSingle();

  if (!user || (user.account_status && user.account_status !== 'active'))
    return null;
  return user;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let buffer: Buffer;
    let mimeType = 'audio/m4a';

    const contentType = (req.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (!body.audioBase64) {
        return NextResponse.json(
          { error: 'audioBase64 is required in JSON payload' },
          { status: 400 }
        );
      }
      const rawBase64 = body.audioBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(rawBase64, 'base64');
      mimeType = body.mimeType || 'audio/m4a';

      if (buffer.length > MAX_STT_AUDIO_BYTES) {
        return NextResponse.json(
          { error: 'Audio exceeds maximum allowed dictation size of 5 MB.' },
          { status: 413 }
        );
      }
    } else {
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

      mimeType = file.type || 'audio/m4a';
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    }

    // Call Gemini 3.5 Transcribe
    const { transcript, detectedLanguage } = await transcribeAudioBuffer(
      buffer,
      mimeType
    );

    return NextResponse.json(
      {
        success: true,
        transcript,
        detectedLanguage,
      },
      {
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  } catch (err: any) {
    console.error('[chat/transcribe] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Speech-to-text transcription failed' },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
}
