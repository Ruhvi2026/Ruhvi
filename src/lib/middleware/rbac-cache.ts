import { SignJWT, jwtVerify } from 'jose';

export interface CachedRbacProfile {
  uid: string;
  role: string;
  accountStatus: string;
  allowedPortals: string[];
  department?: string | null;
}

export const RBAC_COOKIE_NAME = '__portal_rbac';
export const RBAC_CACHE_TTL_SECONDS = 300; // 5-minute cache TTL

/**
 * Verifies the cryptographically signed RBAC cache cookie.
 * Ensures the token was signed with the server secret and belongs to the current session UID.
 * Returns the cached profile or null on cache-miss / expiration / tamper.
 */
export async function verifyCachedRbac(
  token: string | undefined | null,
  expectedUid: string
): Promise<CachedRbacProfile | null> {
  if (!token) return null;
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
    });

    if (payload.sub !== expectedUid) {
      return null;
    }

    return {
      uid: payload.sub as string,
      role: (payload.role as string) || 'customer',
      accountStatus: (payload.status as string) || 'active',
      allowedPortals: Array.isArray(payload.portals)
        ? (payload.portals as string[])
        : [],
      department: (payload.dept as string) || null,
    };
  } catch {
    return null;
  }
}

/**
 * Signs user role, account status, and portal permissions into a compact JWT.
 * Valid for 5 minutes, eliminating remote Supabase database queries on every middleware edge hop.
 */
export async function signRbacProfile(
  profile: CachedRbacProfile
): Promise<string | null> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) return null;

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const now = Math.floor(Date.now() / 1000);

    return await new SignJWT({
      sub: profile.uid,
      role: profile.role,
      status: profile.accountStatus,
      portals: profile.allowedPortals,
      dept: profile.department ?? null,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(now)
      .setExpirationTime(now + RBAC_CACHE_TTL_SECONDS)
      .sign(secret);
  } catch (err) {
    console.error('[rbac-cache] Failed to sign RBAC cache token:', err);
    return null;
  }
}
