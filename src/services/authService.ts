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
 */
export async function upsertUserProfile(user: User) {
  const supabase = createClient();
  const { error } = await supabase.rpc('sync_firebase_user', {
    p_uid: user.uid,
    p_email: user.email || null,
    p_name: user.displayName || null,
    p_phone: user.phoneNumber || null,
  });

  if (error) {
    console.error('Supabase profile sync error:', error);
  }
}

/**
 * Handle "account-exists-with-different-credential" collision.
 */
function handleAuthCollision(error: any): never {
  if (error.code === 'auth/account-exists-with-different-credential') {
    const email = error.customData?.email;
    if (email) {
      throw new Error(
        `An account already exists with the same email address (${email}). ` +
          `Please sign in using your existing provider to link this new credential.`
      );
    }
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
