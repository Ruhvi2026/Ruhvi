import { NextRequest, NextResponse } from 'next/server';
import { createRemoteJWKSet, jwtVerify, SignJWT } from 'jose';

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

    if (!projectId) {
      return NextResponse.json(
        {
          error:
            'Server misconfiguration: NEXT_PUBLIC_FIREBASE_PROJECT_ID is missing',
        },
        { status: 500 }
      );
    }

    // Verify the Firebase ID token using Google's public JWKs via jose (no firebase-admin)
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const firebaseUid = payload.sub!;
    const secret = process.env.SUPABASE_JWT_SECRET;

    if (!secret) {
      console.error(
        'SUPABASE_JWT_SECRET is missing from environment variables.'
      );
      return NextResponse.json(
        { error: 'Server misconfiguration: SUPABASE_JWT_SECRET is required.' },
        { status: 500 }
      );
    }

    const encodedSecret = new TextEncoder().encode(secret);

    // Create a Custom Supabase JWT that maps the Firebase UID to the Supabase Subject
    const supabaseToken = await new SignJWT({
      iss: 'supabase',
      sub: firebaseUid,
      aud: 'authenticated',
      role: 'authenticated',
      email: (payload.email as string) || '',
      phone: (payload.phone_number as string) || '',
      app_metadata: { provider: 'firebase' },
      user_metadata: {
        email: (payload.email as string) || '',
        phone: (payload.phone_number as string) || '',
      },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime('1h')
      .sign(encodedSecret);

    return NextResponse.json({ supabaseToken }, { status: 200 });
  } catch (error) {
    console.error('Token sync error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
