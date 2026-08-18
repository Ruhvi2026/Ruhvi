/**
 * Firebase Admin REST Client
 *
 * Implements server-side Firebase user management (user creation, password reset link generation, user lookup)
 * using the official Google Identity Toolkit REST APIs and `jose` for service account signing.
 *
 * This completely avoids the `firebase-admin` / `jwks-rsa` ESM bundler conflicts on Vercel Serverless.
 */
import { SignJWT, importPKCS8 } from 'jose';

function formatPrivateKey(key: string): string {
  let cleaned = key.trim();
  // Strip surrounding quotes if present
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1);
  }
  // Replace literal \n with real line breaks
  cleaned = cleaned.replace(/\\n/g, '\n').trim();

  // Ensure standard PEM boundaries
  if (!cleaned.includes('-----BEGIN PRIVATE KEY-----')) {
    cleaned = `-----BEGIN PRIVATE KEY-----\n${cleaned}\n-----END PRIVATE KEY-----`;
  }
  return cleaned;
}

let cachedGoogleToken: { token: string; expiresAt: number } | null = null;

async function getGoogleAuthToken(
  clientEmail: string,
  privateKeyPem: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedGoogleToken && cachedGoogleToken.expiresAt > now + 60) {
    return cachedGoogleToken.token;
  }

  const formattedKey = formatPrivateKey(privateKeyPem);
  const privateKey = await importPKCS8(formattedKey, 'RS256');

  const jwt = await new SignJWT({
    scope:
      'https://www.googleapis.com/auth/identitytoolkit https://www.googleapis.com/auth/firebase.auth',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(clientEmail)
    .setSubject(clientEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description ||
        data.error ||
        'Failed to obtain Google service account access token'
    );
  }

  cachedGoogleToken = {
    token: data.access_token,
    expiresAt: now + (data.expires_in || 3600),
  };

  return data.access_token;
}

export interface AdminAuthUser {
  uid: string;
  email?: string;
  displayName?: string;
}

export function getAdminAuth() {
  const projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'ruhvi-f707c';
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  return {
    async getUserByEmail(email: string): Promise<AdminAuthUser> {
      let accessToken: string | null = null;
      if (clientEmail && rawPrivateKey) {
        try {
          accessToken = await getGoogleAuthToken(clientEmail, rawPrivateKey);
        } catch (e) {
          console.warn(
            'Could not get service account token for user lookup:',
            e
          );
        }
      }

      const url = accessToken
        ? `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:lookup`
        : `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ email: [email] }),
      });

      const data = await res.json();
      if (!res.ok || !data.users || data.users.length === 0) {
        const error: any = new Error(
          'No registered user found with this email address.'
        );
        error.code = 'auth/user-not-found';
        throw error;
      }

      const user = data.users[0];
      return {
        uid: user.localId,
        email: user.email,
        displayName: user.displayName,
      };
    },

    async generatePasswordResetLink(
      email: string,
      actionCodeSettings?: { url?: string }
    ): Promise<string> {
      if (clientEmail && rawPrivateKey) {
        const accessToken = await getGoogleAuthToken(
          clientEmail,
          rawPrivateKey
        );
        const res = await fetch(
          `https://identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts:sendOobCode`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              requestType: 'PASSWORD_RESET',
              email,
              returnOobLink: true,
              ...(actionCodeSettings?.url
                ? { continueUrl: actionCodeSettings.url }
                : {}),
            }),
          }
        );

        const data = await res.json();
        if (res.ok && data.oobLink) {
          return data.oobLink;
        }
        if (data.error?.message) {
          throw new Error(data.error.message);
        }
      }

      // Fallback: Use client API key
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'PASSWORD_RESET',
            email,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || 'Failed to trigger password reset'
        );
      }

      return `https://${projectId}.firebaseapp.com/__/auth/action?mode=resetPassword`;
    },

    async createUser(params: {
      email?: string;
      password?: string;
      displayName?: string;
    }): Promise<AdminAuthUser> {
      const res = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: params.email,
            password: params.password,
            displayName: params.displayName,
            returnSecureToken: true,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data.error?.message || 'Failed to create guest user in Firebase'
        );
      }

      return {
        uid: data.localId,
        email: data.email,
        displayName: data.displayName || params.displayName,
      };
    },
  };
}
