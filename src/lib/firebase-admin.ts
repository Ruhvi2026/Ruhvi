import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth, Auth } from 'firebase-admin/auth';

const initFirebaseAdmin = () => {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Handle newlines in the private key if provided as a single string
  let privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (privateKey) {
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  const credential = cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
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

