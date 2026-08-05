/**
 * Firebase Admin SDK — used ONLY for server-side Firebase user management
 * (e.g., creating guest users during checkout).
 *
 * NOT used for session creation or token verification — those now use
 * jose@4.x directly to avoid the jwks-rsa/jose ESM conflict.
 */
import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

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
  return cleaned.replace(/\\n/g, '\n');
}

let _app: App | null = null;

export function getAdminApp(): App {
  if (_app) return _app;

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!clientEmail || !rawPrivateKey || !projectId) {
    throw new Error(
      `Firebase Admin SDK missing credentials — ` +
        `FIREBASE_CLIENT_EMAIL: ${clientEmail ? 'SET' : 'MISSING'}, ` +
        `FIREBASE_PRIVATE_KEY: ${rawPrivateKey ? 'SET' : 'MISSING'}, ` +
        `NEXT_PUBLIC_FIREBASE_PROJECT_ID: ${projectId ? 'SET' : 'MISSING'}`
    );
  }

  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }

  _app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: formatPrivateKey(rawPrivateKey),
    }),
  });

  return _app;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}
