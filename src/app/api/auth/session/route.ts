import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

// Google's public JWK endpoint for Firebase ID tokens
const FIREBASE_JWKS = createRemoteJWKSet(
  new URL(
    'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'
  )
);

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 401 });
    }

    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectId || !jwtSecret || !supabaseUrl || !supabaseServiceKey) {
      console.error('[session] Missing required environment variables.');
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // Verify Firebase ID token using Google's public JWKs (no firebase-admin needed)
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const uid = payload.sub!;
    const email = (payload.email as string) || null;
    const phone = (payload.phone_number as string) || null;
    const name = (payload.name as string) || null;

    if (!uid) {
      return NextResponse.json(
        { error: 'Invalid token: missing uid' },
        { status: 401 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert the user profile — creates it if it doesn't exist, updates it if it does.
    // This is the permanent, self-healing fix: no more 404 for missing profiles.
    const { data: supabaseUserId, error: upsertError } =
      await supabaseAdmin.rpc('upsert_firebase_user', {
        p_uid: uid,
        p_email: email,
        p_name: name,
        p_phone: phone,
      });

    if (upsertError || !supabaseUserId) {
      console.error('[session] Failed to upsert user profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to sync user profile.' },
        { status: 500 }
      );
    }

    const expiresInSeconds = 60 * 60 * 24 * 5; // 5 days
    const secret = new TextEncoder().encode(jwtSecret);

    // Mint a signed session JWT using SUPABASE_JWT_SECRET
    const sessionToken = await new SignJWT({
      sub: supabaseUserId,
      email,
      firebase_uid: uid,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime(Math.floor(Date.now() / 1000) + expiresInSeconds)
      .sign(secret);

    const response = NextResponse.json({ status: 'success' }, { status: 200 });
    response.cookies.set({
      name: '__session',
      value: sessionToken,
      maxAge: expiresInSeconds,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });

    return response;
  } catch (error: any) {
    console.error('[session] Session creation error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
