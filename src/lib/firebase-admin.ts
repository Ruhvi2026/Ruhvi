import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

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

const app = initFirebaseAdmin();
export const adminAuth = getAuth(app);
