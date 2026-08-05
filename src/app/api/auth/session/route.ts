import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

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

    // ✅ Create a signed session JWT using our own SUPABASE_JWT_SECRET
    // (replaces firebase-admin.createSessionCookie())
    const expiresInSeconds = 60 * 60 * 24 * 5; // 5 days
    const secret = new TextEncoder().encode(jwtSecret);

    const sessionToken = await new SignJWT({ sub: uid, email })
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
