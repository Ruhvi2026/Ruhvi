import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';
import { createClient } from '@supabase/supabase-js';

// Google's public JWK endpoint for Firebase ID tokens
// This is what firebase-admin uses internally — we call it directly
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

    if (!projectId || !jwtSecret) {
      return NextResponse.json(
        {
          error: `Server misconfiguration: NEXT_PUBLIC_FIREBASE_PROJECT_ID is ${projectId ? 'SET' : 'MISSING'}, SUPABASE_JWT_SECRET is ${jwtSecret ? 'SET' : 'MISSING'}`,
        },
        { status: 500 }
      );
    }

    // ✅ Verify Firebase ID token using Google's public JWKs via jose@4
    // This does the exact same thing as firebase-admin.verifyIdToken() but
    // uses only jose which supports CommonJS — no jwks-rsa required!
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const uid = payload.sub;
    const email = payload.email as string | undefined;

    if (!uid) {
      return NextResponse.json(
        { error: 'Invalid token: missing uid' },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Missing Supabase credentials' },
        { status: 500 }
      );
    }

    // Lookup the real Supabase UUID for this user to avoid RLS casting errors
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userProfile, error: dbError } = await supabaseAdmin
      .rpc('get_user_profile', { p_user_id: uid })
      .maybeSingle();

    if (dbError) {
      console.error('Supabase DB Error in session route:', dbError);
      return NextResponse.json(
        {
          error: `Database error finding user profile: ${dbError.message || JSON.stringify(dbError)}`,
        },
        { status: 500 }
      );
    }

    const supabaseUserId = (userProfile as any)?.id;
    if (!supabaseUserId) {
      return NextResponse.json(
        { error: 'User profile not found in database. Please sign up again.' },
        { status: 404 }
      );
    }

    // ✅ Create a signed session JWT using our own SUPABASE_JWT_SECRET
    // (replaces firebase-admin.createSessionCookie())
    const expiresInSeconds = 60 * 60 * 24 * 5; // 5 days
    const secret = new TextEncoder().encode(jwtSecret);

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
    console.error('Session creation error:', error?.message || error);
    return NextResponse.json(
      { error: error?.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
