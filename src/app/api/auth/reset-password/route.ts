import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
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
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json(
        { error: 'Reset token and new password are required.' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long.' },
        { status: 400 }
      );
    }

    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      return NextResponse.json(
        { error: 'Authentication service is misconfigured.' },
        { status: 500 }
      );
    }

    // 1. Verify the signed password reset token
    const secretKey = new TextEncoder().encode(jwtSecret);
    let payload;
    try {
      const verified = await jwtVerify(token, secretKey);
      payload = verified.payload;
    } catch (err: any) {
      return NextResponse.json(
        {
          error:
            'Invalid or expired password reset link. Please request a new one.',
        },
        { status: 400 }
      );
    }

    if (payload.type !== 'password_reset' || !payload.uid) {
      return NextResponse.json(
        { error: 'Invalid reset token payload.' },
        { status: 400 }
      );
    }

    const uid = payload.uid as string;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!clientEmail || !rawPrivateKey || !apiKey) {
      return NextResponse.json(
        { error: 'Firebase credentials misconfigured.' },
        { status: 500 }
      );
    }

    // 2. Generate a custom Firebase token to act on behalf of the user
    const customToken = createFirebaseCustomToken(
      uid,
      clientEmail,
      rawPrivateKey
    );

    // 3. Exchange custom token for an ID token
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
        '[reset-password] Sign-in with custom token failed:',
        signInData
      );
      return NextResponse.json(
        { error: 'Failed to authenticate user for password update.' },
        { status: 500 }
      );
    }

    // 4. Update the user's password in Firebase Auth
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
      console.error('[reset-password] Password update failed:', updateData);
      return NextResponse.json(
        { error: updateData.error?.message || 'Failed to update password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Reset Password API Error]', error);
    return NextResponse.json(
      { error: error.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
