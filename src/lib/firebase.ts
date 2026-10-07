// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let appInstance: FirebaseApp;

if (!getApps().length) {
  if (firebaseConfig.apiKey) {
    appInstance = initializeApp(firebaseConfig);
  } else {
    // Fallback for SSR / build-phase to prevent auth/invalid-api-key exceptions
    appInstance = initializeApp({
      apiKey: 'AIzaSyDummyKeyForBuildPhaseOnly0000000',
      projectId: firebaseConfig.projectId || 'ruhvi-dummy',
      appId: firebaseConfig.appId || '1:000000000000:web:0000000000000000000000',
    });
  }
} else {
  appInstance = getApp();
}

export const app: FirebaseApp = appInstance;
export const auth: Auth = getAuth(appInstance);
export default app;

