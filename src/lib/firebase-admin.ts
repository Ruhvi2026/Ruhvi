import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error(
      `Firebase Admin missing credentials: FIREBASE_CLIENT_EMAIL is ${clientEmail ? 'SET' : 'MISSING'}, FIREBASE_PRIVATE_KEY is ${privateKey ? 'SET' : 'MISSING'}`
    );
  }

  // Handle newlines and surrounding quotes if provided as a string
  privateKey = privateKey.trim();
  if (
    (privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))
  ) {
    privateKey = privateKey.slice(1, -1);
  }
  privateKey = privateKey.replace(/\\n/g, '\n');

  const credential = cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: clientEmail,
    privateKey: privateKey,
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
