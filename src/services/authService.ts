import { auth } from '@/lib/firebase';
import { createClient } from '@/lib/supabase/client';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  FacebookAuthProvider,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPopup,
  linkWithCredential,
  EmailAuthProvider,
  User,
  ConfirmationResult,
  PhoneAuthProvider,
  linkWithPhoneNumber,
} from 'firebase/auth';

/**
 * Sync user profile to Supabase after successful login/linking.
 * This explicitly calls the sync-token route to resolve identities via Path B.
 */
export async function upsertUserProfile(user: User) {
  try {
    const idToken = await user.getIdToken(true);
    const response = await fetch('/api/auth/sync-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!response.ok) {
      console.error(
        'Failed to sync profile via sync-token',
        await response.text()
      );
    }
  } catch (error) {
    console.error('Profile sync error:', error);
  }
}

/**
 * Handle "account-exists-with-different-credential" collision.
 */
export function handleAuthCollision(error: any): never {
  if (
    error.code === 'auth/account-exists-with-different-credential' ||
    error.code === 'auth/email-already-in-use' ||
    error.code === 'auth/credential-already-in-use'
  ) {
    const email = error.customData?.email || 'this email';
    throw new Error(
      `Looks like you already have an account with ${email}. Sign in instead, or use a different email.`
    );
  }

  if (error.code === 'auth/provider-already-linked') {
    throw new Error('This is already connected to your account');
  }
  if (error.code === 'auth/invalid-verification-code') {
    throw new Error("That code didn't match — try again");
  }
  if (error.code === 'auth/too-many-requests') {
    throw new Error('Too many attempts — try again in a few minutes');
  }

  throw error;
}

// ------------------------------------------------------------------
// INDIVIDUAL AUTH FLOWS
// ------------------------------------------------------------------

export async function signUpWithEmail(email: string, pass: string) {
  try {
    const res = await createUserWithEmailAndPassword(auth, email, pass);
    await upsertUserProfile(res.user);
    return res;
  } catch (error) {
    handleAuthCollision(error);
  }
}

export async function signInWithEmail(email: string, pass: string) {
  const res = await signInWithEmailAndPassword(auth, email, pass);
  await upsertUserProfile(res.user);
  return res;
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const res = await signInWithPopup(auth, provider);
    await upsertUserProfile(res.user);
    return res;
  } catch (error) {
    handleAuthCollision(error);
  }
}

export async function signInWithFacebook() {
  try {
    const provider = new FacebookAuthProvider();
    const res = await signInWithPopup(auth, provider);
    await upsertUserProfile(res.user);
    return res;
  } catch (error) {
    handleAuthCollision(error);
  }
}

let recaptchaVerifier: RecaptchaVerifier | null = null;

export function setupRecaptcha(containerId: string) {
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    });
  }
  return recaptchaVerifier;
}

export async function sendPhoneVerification(
  phoneNumber: string,
  containerId: string
) {
  try {
    const verifier = setupRecaptcha(containerId);
    return await signInWithPhoneNumber(auth, phoneNumber, verifier);
  } catch (error) {
    handleAuthCollision(error);
  }
}

export async function verifyPhoneCode(
  confirmationResult: ConfirmationResult,
  code: string
) {
  try {
    const res = await confirmationResult.confirm(code);
    await upsertUserProfile(res.user);
    return res;
  } catch (error) {
    handleAuthCollision(error);
  }
}

// ------------------------------------------------------------------
// LINKING UTILITIES
// ------------------------------------------------------------------

export async function linkGoogleToSession() {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  const provider = new GoogleAuthProvider();
  const res = await linkWithPopup(auth.currentUser, provider);
  await upsertUserProfile(res.user);
  return res;
}

export async function linkFacebookToSession() {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  const provider = new FacebookAuthProvider();
  const res = await linkWithPopup(auth.currentUser, provider);
  await upsertUserProfile(res.user);
  return res;
}

export async function linkEmailPasswordToSession(email: string, pass: string) {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  const credential = EmailAuthProvider.credential(email, pass);
  const res = await linkWithCredential(auth.currentUser, credential);
  await upsertUserProfile(res.user);
  return res;
}

export async function linkPhoneToSession(
  phoneNumber: string,
  containerId: string
) {
  if (!auth.currentUser) throw new Error('No user is currently signed in.');
  const verifier = setupRecaptcha(containerId);

  // Start linking phone number
  const res = await linkWithPhoneNumber(
    auth.currentUser,
    phoneNumber,
    verifier
  );
  return res; // caller will need to call .confirm(code) on the returned confirmationResult
}
