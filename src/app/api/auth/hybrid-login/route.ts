import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { SignJWT, importPKCS8 } from 'jose';

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

async function createFirebaseCustomToken(
  uid: string,
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const formattedKey = formatPrivateKey(privateKeyPem);
  const privateKey = await importPKCS8(formattedKey, 'RS256');

  return new SignJWT({ uid, claims: {} })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience(
      'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit'
    )
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co';
    const supabaseAnonKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlncmtya3hkYW50cm9sYmxkYXBqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MzQ0NDIsImV4cCI6MjEwMTAxMDQ0Mn0.Ks0ZUolRtSKa57knTkV0GP5wDKS3kWKLcAzAKxSD2ko';
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

    // 1. Attempt authentication with Supabase Auth
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: supaAuthData, error: supaAuthError } =
      await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: password,
      });

    if (supaAuthError || !supaAuthData?.user) {
      console.warn(
        '[hybrid-login] Supabase auth check failed for:',
        normalizedEmail,
        supaAuthError?.message
      );
      return NextResponse.json(
        { error: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    const supaUser = supaAuthData.user;
    const supaUserId = supaUser.id;

    // 2. If Firebase credentials are available, create/sync the user in Firebase Auth
    if (apiKey) {
      try {
        // Try creating the account in Firebase Auth with the same credentials
        const signUpRes = await fetch(
          `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: normalizedEmail,
              password: password,
              returnSecureToken: true,
            }),
          }
        );

        const signUpData = await signUpRes.json();

        if (signUpRes.ok && signUpData.idToken) {
          // Successfully registered in Firebase Auth on the fly
          return NextResponse.json({
            success: true,
            idToken: signUpData.idToken,
            firebaseUid: signUpData.localId,
            email: normalizedEmail,
          });
        }

        // If email already exists in Firebase Auth, we update its password or sign in with custom token
        if (clientEmail && rawPrivateKey) {
          const customToken = await createFirebaseCustomToken(
            supaUserId,
            clientEmail,
            rawPrivateKey
          );

          // Exchange custom token for an ID token
          const tokenRes = await fetch(
            `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                token: customToken,
                returnSecureToken: true,
              }),
            }
          );

          const tokenData = await tokenRes.json();
          if (tokenRes.ok && tokenData.idToken) {
            // Update password in Firebase so future logins are direct
            try {
              await fetch(
                `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${apiKey}`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    idToken: tokenData.idToken,
                    password: password,
                    returnSecureToken: true,
                  }),
                }
              );
            } catch (updateErr) {
              console.warn(
                '[hybrid-login] Could not update password in Firebase:',
                updateErr
              );
            }

            return NextResponse.json({
              success: true,
              customToken: customToken,
              idToken: tokenData.idToken,
              firebaseUid: tokenData.localId || supaUserId,
              email: normalizedEmail,
            });
          }

          return NextResponse.json({
            success: true,
            customToken: customToken,
            firebaseUid: supaUserId,
            email: normalizedEmail,
          });
        }
      } catch (fbErr: any) {
        console.error('[hybrid-login] Firebase bridge error:', fbErr);
      }
    }

    // Fallback: Return Supabase Auth user ID if Firebase keys are absent
    return NextResponse.json({
      success: true,
      supabaseUserId: supaUserId,
      email: normalizedEmail,
    });
  } catch (error: any) {
    console.error('[hybrid-login] Unexpected error:', error);
    return NextResponse.json(
      { error: error?.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
