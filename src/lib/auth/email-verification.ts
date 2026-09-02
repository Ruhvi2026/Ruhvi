import { createClient } from '@supabase/supabase-js';
import { SignJWT, jwtVerify } from 'jose';

const FALLBACK_SUPABASE_URL = 'https://igrkrkxdantrolbldapj.supabase.co';

export async function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL;
  let supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    const jwtSecret = process.env.SUPABASE_JWT_SECRET;
    if (jwtSecret) {
      const secretKey = new TextEncoder().encode(jwtSecret);
      supabaseServiceKey = await new SignJWT({
        iss: 'supabase',
        ref: 'igrkrkxdantrolbldapj',
        role: 'service_role',
      })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setIssuedAt()
        .setExpirationTime('10y')
        .sign(secretKey);
    } else {
      console.error(
        '[email-verification] CRITICAL: Both SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET are missing on server.'
      );
    }
  }

  return createClient(supabaseUrl, supabaseServiceKey || 'dummy_key', {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getSecretKey() {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error('[email-verification] SUPABASE_JWT_SECRET is missing');
    throw new Error('Authentication service is misconfigured.');
  }
  return new TextEncoder().encode(jwtSecret);
}

export interface EmailVerificationTokenPayload {
  type: string;
  email: string;
  customer_id: string;
  email_change: boolean;
}

export async function signEmailVerificationToken(params: {
  customerId: string;
  email: string;
  isEmailChange: boolean;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    type: 'email_verify',
    email: params.email,
    customer_id: params.customerId,
    email_change: params.isEmailChange,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(params.customerId)
    .setIssuedAt(now)
    .setExpirationTime(now + 24 * 3600) // 24 hour validity
    .sign(await getSecretKey());
}

export async function verifyEmailVerificationToken(
  token: string
): Promise<EmailVerificationTokenPayload | null> {
  try {
    const verified = await jwtVerify(token, await getSecretKey());
    const payload =
      verified.payload as unknown as EmailVerificationTokenPayload;
    if (
      payload.type !== 'email_verify' ||
      !payload.customer_id ||
      !payload.email
    ) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'https://ruhvi.vercel.app'
  );
}
