import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

/**
 * Retrieves the current authenticated user on the server side using the
 * signed session cookie verified with SUPABASE_JWT_SECRET.
 */
export async function getServerUser() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;

  if (!sessionCookie) {
    return { user: null };
  }

  try {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (!jwtSecret) {
      console.error('SUPABASE_JWT_SECRET is missing');
      return { user: null };
    }

    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(sessionCookie, secret, {
      algorithms: ['HS256'],
    });

    const user = {
      id: payload.sub,
      email: payload.email as string | undefined,
      phone: payload.phone as string | undefined,
      app_metadata: { provider: 'firebase' },
      user_metadata: {
        full_name:
          (payload.name as string | undefined) ||
          (payload.email as string | undefined)?.split('@')[0],
      },
    };

    return { user };
  } catch (error) {
    // Token expired or invalid — treat as unauthenticated
    return { user: null };
  }
}
