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
    const secret = process.env.SUPABASE_JWT_SECRET;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!projectId || !secret || !supabaseUrl || !supabaseServiceKey) {
      console.error('[sync-token] Missing required environment variables.');
      return NextResponse.json(
        { error: 'Server misconfiguration.' },
        { status: 500 }
      );
    }

    // Verify the Firebase ID token using Google's public JWKs (no firebase-admin needed)
    const { payload } = await jwtVerify(idToken, FIREBASE_JWKS, {
      audience: projectId,
      issuer: `https://securetoken.google.com/${projectId}`,
    });

    const firebaseUid = payload.sub!;
    const email = (payload.email as string) || null;
    const phone = (payload.phone_number as string) || null;
    const name = (payload.name as string) || null;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert the user profile — creates it if it doesn't exist, updates it if it does.
    // This is the permanent, self-healing fix: no more 404 for missing profiles.
    const { data: supabaseUserId, error: upsertError } =
      await supabaseAdmin.rpc('upsert_firebase_user', {
        p_uid: firebaseUid,
        p_email: email,
        p_name: name,
        p_phone: phone,
      });

    if (upsertError || !supabaseUserId) {
      console.error('[sync-token] Failed to upsert user profile:', upsertError);
      return NextResponse.json(
        { error: 'Failed to sync user profile.' },
        { status: 500 }
      );
    }

    const encodedSecret = new TextEncoder().encode(secret);

    // Mint a custom Supabase JWT that maps the Firebase UID to the Supabase UUID
    const supabaseToken = await new SignJWT({
      iss: 'supabase',
      sub: supabaseUserId,
      firebase_uid: firebaseUid,
      aud: 'authenticated',
      role: 'authenticated',
      email: email || '',
      phone: phone || '',
      app_metadata: { provider: 'firebase' },
      user_metadata: {
        email: email || '',
        phone: phone || '',
      },
    })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setExpirationTime('1h')
      .sign(encodedSecret);

    return NextResponse.json({ supabaseToken }, { status: 200 });
  } catch (error) {
    console.error('[sync-token] Token sync error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
