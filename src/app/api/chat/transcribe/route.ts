// src/app/api/chat/transcribe/route.ts
//
// POST /api/chat/transcribe  → Speech-to-Text via Gemini Multi-Model Architecture
// Security: Authenticated session required.
// NOTE: Audio is processed in memory only and discarded. It is NEVER uploaded to Cloudinary.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';
import {
  transcribeAudioBuffer,
  normalizeGeminiAudioMimeType,
} from '@/lib/ai/transcribe-service';
import { SPEECH_TO_TEXT_MAX_BYTES } from '@/lib/chat/voice-types';

const MAX_STT_AUDIO_BYTES = SPEECH_TO_TEXT_MAX_BYTES;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

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

  const supabase = getServiceClient();
  const decoded = await verifySessionToken(token);
  let userId = decoded?.sub as string | undefined;

  if (!userId && decoded?.email) {
    const { data: userByEmail } = await supabase
      .from('users')
      .select('id')
      .eq('email', decoded.email)
      .maybeSingle();
    if (userByEmail?.id) {
      userId = userByEmail.id;
    }
  }

  // Fallback to Supabase Auth session verification (critical for mobile sessions)
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: Request) {
  try {
    const contentLength = parseInt(
      req.headers.get('content-length') || '0',
      10
    );
    if (contentLength > 4.4 * 1024 * 1024) {
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
    let mimeType = 'audio/m4a';

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
      mimeType = normalizeGeminiAudioMimeType(body.mimeType);
    } else if (
      contentType.includes('multipart/form-data') ||
      contentType.includes('audio/')
    ) {
      const formData = await req.formData();
      // Accept both 'audio' and 'file' field names from mobile/web clients
      const file = (formData.get('audio') ||
        formData.get('file')) as File | null;
      if (!file) {
        return NextResponse.json(
          { error: 'audio or file field is required' },
          { status: 400, headers: CORS_HEADERS }
        );
      }
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
      mimeType = normalizeGeminiAudioMimeType(file.type);
    } else {
      return NextResponse.json(
        { error: 'Unsupported Content-Type' },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (buffer.length > MAX_STT_AUDIO_BYTES) {
      return NextResponse.json(
        { error: 'Audio file exceeds maximum size for speech-to-text (3 MB).' },
        { status: 413, headers: CORS_HEADERS }
      );
    }

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
