import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import * as jose from 'jose';

export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 401 });
    }

    // Verify the Firebase ID token
    const adminAuth = getAdminAuth();
    const decodedIdToken = await adminAuth.verifyIdToken(idToken);
    const firebaseUid = decodedIdToken.uid;

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
    const payload = {
      iss: 'supabase',
      sub: firebaseUid,
      aud: 'authenticated',
      role: 'authenticated',
      email: decodedIdToken.email || '',
      phone: decodedIdToken.phone_number || '',
      app_metadata: {
        provider: 'firebase',
      },
      user_metadata: {
        email: decodedIdToken.email || '',
        phone: decodedIdToken.phone_number || '',
      },
      exp: Math.floor(Date.now() / 1000) + 60 * 60, // Expires in 1 hour
    };

    const supabaseToken = await new jose.SignJWT(payload)
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .sign(encodedSecret);

    return NextResponse.json({ supabaseToken }, { status: 200 });
  } catch (error) {
    console.error('Token sync error:', error);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
