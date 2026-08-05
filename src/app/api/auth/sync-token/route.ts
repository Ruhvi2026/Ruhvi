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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!secret || !supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables for sync-token.');
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // Lookup the real Supabase UUID for this user to avoid RLS casting errors
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userProfile, error: dbError } = await supabaseAdmin
      .rpc('get_user_profile', { p_user_id: firebaseUid })
      .maybeSingle();

    if (dbError) {
      console.error('Supabase DB Error in sync-token route:', dbError);
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

    const encodedSecret = new TextEncoder().encode(secret);

    // Create a Custom Supabase JWT that maps the Supabase UUID to the Supabase Subject
    const supabaseToken = await new SignJWT({
      iss: 'supabase',
      sub: supabaseUserId,
      firebase_uid: firebaseUid,
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
