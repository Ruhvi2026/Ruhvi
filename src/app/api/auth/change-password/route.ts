import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/auth/verify-session';
import crypto from 'crypto';

function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  cleaned = cleaned.replace(/\\n/g, '\n').trim();
  if (!cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    cleaned = `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
  }
  return cleaned;
}

function base64url(input: string): string {
  return Buffer.from(input).toString('base64url');
}

function createFirebaseCustomToken(
  uid: string,
  clientEmail: string,
  privateKeyPem: string
): string {
  const now = Math.floor(Date.now() / 1000);
  const formattedKey = formatPrivateKey(privateKeyPem);

  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit',
    iat: now,
    exp: now + 3600,
    uid: uid,
    claims: {},
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signatureInput);
  const signature = signer.sign(formattedKey, 'base64url');

  return `${signatureInput}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const sessionCookie = request.cookies.get('__session')?.value;
    const decoded = await verifySessionToken(sessionCookie);

    if (!decoded) {
      return NextResponse.json(
        { error: 'Your session has expired. Please sign in again.' },
        { status: 401 }
      );
    }

    const supabaseUserId = decoded.sub as string;
    const firebaseUid = decoded.firebase_uid as string | undefined;
    const uid = firebaseUid || supabaseUserId;

    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!clientEmail || !rawPrivateKey || !apiKey) {
      return NextResponse.json(
        { error: 'Firebase credentials misconfigured.' },
        { status: 500 }
      );
    }

    // 1. Generate a custom Firebase token to act on behalf of the user
    const customToken = createFirebaseCustomToken(
      uid,
      clientEmail,
      rawPrivateKey
    );

    // 2. Exchange custom token for an ID token
    const signInRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: customToken, returnSecureToken: true }),
      }
    );

    const signInData = await signInRes.json();
    if (!signInRes.ok || !signInData.idToken) {
      console.error(
        '[change-password] Sign-in with custom token failed:',
        signInData
      );
      return NextResponse.json(
        { error: 'Failed to authenticate user for password update.' },
        { status: 500 }
      );
    }

    // 3. Update the user's password in Firebase Auth
    const updateRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: signInData.idToken,
          password: password,
          returnSecureToken: true,
        }),
      }
    );

    const updateData = await updateRes.json();
    if (!updateRes.ok) {
      console.error(
        '[change-password] Firebase password update failed:',
        updateData
      );
      return NextResponse.json(
        { error: 'Failed to update password. Please try again.' },
        { status: 500 }
      );
    }

    // 4. Also synchronize password update with Supabase Auth
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (supabaseUrl && supabaseServiceKey && supabaseUserId) {
        const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        await supabaseAdmin.auth.admin.updateUserById(supabaseUserId, {
          password: password,
        });
      }
    } catch (supaErr) {
      console.warn(
        '[change-password] Supabase Auth sync note (can be ignored if user is purely in Firebase):',
        supaErr
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Change Password API Error]', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
