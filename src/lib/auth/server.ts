import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase-admin';

/**
 * Retrieves the current authenticated user on the server side using the Firebase session cookie.
 */
export async function getServerUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, true);
    
    // Construct a user object that mimics the Supabase user structure where necessary
    const user = {
      id: decodedClaims.uid,
      email: decodedClaims.email,
      phone: decodedClaims.phone_number,
      app_metadata: { provider: 'firebase' },
      user_metadata: {
        full_name: decodedClaims.name || decodedClaims.email?.split('@')[0],
      },
    };

    return { user };
  } catch (error) {
    console.error('Error verifying Firebase session cookie:', error);
    return { user: null };
  }
}
