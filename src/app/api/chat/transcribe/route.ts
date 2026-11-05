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

  if (!token) return null;

  const decoded = await verifySessionToken(token);
  let userId = decoded?.sub as string | undefined;

  const supabase = getServiceClient();
  if (!userId) {
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

  if (!user || (user.account_status && user.account_status !== 'active')) {
    return null;
  }
  return user;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

function normalizeMimeType(rawMime?: string | null): string {
  if (!rawMime) return 'audio/mp4';
  const lower = rawMime.toLowerCase().trim();
  if (lower === 'audio/m4a' || lower === 'audio/x-m4a') return 'audio/mp4';
  return lower;
}

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(
      req.headers.get('content-length') || '0',
      10
    );
    // 4.2 MB envelope ceiling protects against Vercel's 4.5 MB function payload limit
    if (contentLength > 4.2 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: 'Payload exceeds maximum allowed size (limit 3 MB raw audio).',
        },
        { status: 413, headers: CORS_HEADERS }
      );
    }

    const user = await getAuthenticatedUser(req);
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers: CORS_HEADERS }
      );
    }

    let buffer: Buffer;
    let mimeType = 'audio/mp4';

    const contentType = (req.headers.get('content-type') || '').toLowerCase();
    if (contentType.includes('application/json')) {
      const body = await req.json();
      if (!body.audioBase64) {
        return NextResponse.json(
          { error: 'audioBase64 is required in JSON payload' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const rawBase64 = body.audioBase64.replace(/^data:[^;]+;base64,/, '');
      buffer = Buffer.from(rawBase64, 'base64');
      mimeType = normalizeMimeType(body.mimeType);

      if (buffer.length > MAX_STT_AUDIO_BYTES) {
        return NextResponse.json(
          { error: 'Audio exceeds maximum allowed dictation size of 3 MB.' },
          { status: 413, headers: CORS_HEADERS }
        );
      }
    } else {
      const formData = await req.formData();
      const file = formData.get('file') as File | null;

      if (!file) {
        return NextResponse.json(
          { error: 'Audio file is required for transcription' },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      if (file.size > MAX_STT_AUDIO_BYTES) {
        return NextResponse.json(
          { error: 'Audio exceeds maximum allowed dictation size of 3 MB.' },
          { status: 413, headers: CORS_HEADERS }
        );
      }

      mimeType = normalizeMimeType(file.type);
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
      { headers: CORS_HEADERS }
    );
  } catch (err: any) {
    console.error('[chat/transcribe] Fatal error:', err);
    return NextResponse.json(
      { error: err.message || 'Speech-to-text transcription failed' },
      {
        status: 500,
        headers: CORS_HEADERS,
      }
    );
  }
}
