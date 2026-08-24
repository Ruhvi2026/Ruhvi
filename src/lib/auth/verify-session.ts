import { jwtVerify } from 'jose';

/**
 * Verifies the __session JWT (signed with SUPABASE_JWT_SECRET on login).
 * Safe for both Edge middleware and Node.js route handlers.
 * Returns the verified payload (JWTPayload) or null if invalid/expired.
 */
export async function verifySessionToken(
  sessionCookie: string | undefined | null
) {
  if (!sessionCookie) return null;
  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET is missing');
      return null;
    }
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(sessionCookie, secret);
    return payload;
  } catch {
    return null;
  }
}
