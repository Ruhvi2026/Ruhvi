import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

function formatPrivateKey(key: string): string {
  let cleaned = key.trim().replace(/\\n/g, '\n');
  const beginMarker = '-----BEGIN PRIVATE KEY-----';
  const endMarker = '-----END PRIVATE KEY-----';

  const beginIndex = cleaned.indexOf(beginMarker);
  const endIndex = cleaned.indexOf(endMarker);

  if (beginIndex !== -1 && endIndex !== -1) {
    const rawBody = cleaned
      .substring(beginIndex + beginMarker.length, endIndex)
      .replace(/\s+/g, '');
    return `${beginMarker}\n${rawBody}\n${endMarker}\n`;
  }

  return cleaned;
}

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !rawPrivateKey) {
    throw new Error(
      `Firebase Admin missing credentials: FIREBASE_CLIENT_EMAIL is ${clientEmail ? 'SET' : 'MISSING'}, FIREBASE_PRIVATE_KEY is ${rawPrivateKey ? 'SET' : 'MISSING'}`
    );
  }

  const formattedPrivateKey = formatPrivateKey(rawPrivateKey);

  const credential = cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: clientEmail,
    privateKey: formattedPrivateKey,
  });

  return initializeApp({
    credential,
  });
};

let _adminAuth: Auth | null = null;

export const getAdminAuth = (): Auth => {
  if (!_adminAuth) {
    const app = initFirebaseAdmin();
    _adminAuth = getAuth(app);
  }
  return _adminAuth;
};

export const adminAuth = new Proxy({} as Auth, {
  get(_target, prop) {
    const auth = getAdminAuth();
    const value = (auth as any)[prop];
    return typeof value === 'function' ? value.bind(auth) : value;
  },
});
