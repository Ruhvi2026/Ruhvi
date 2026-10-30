import fs from 'fs';
import path from 'path';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { SignJWT } from 'jose';

describe('Environment Variable Integrity & Fallbacks (P2.1)', () => {
  const envExamplePath = path.resolve(process.cwd(), '.env.example');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');

  it('.env.example contains correct variable names without typos', () => {
    // Verify typo with 3 's' is gone
    expect(envExampleContent).not.toContain(
      'NEXT_PUBLIC_FIREBASE_MESSSENDER_ID'
    );
    // Verify correct messaging sender id is documented
    expect(envExampleContent).toContain(
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'
    );
    // Verify SUPABASE_JWT_SECRET is documented
    expect(envExampleContent).toContain('SUPABASE_JWT_SECRET');
  });

  it('verifySessionToken falls back gracefully to JWT_SECRET if SUPABASE_JWT_SECRET is unset', async () => {
    const originalSupabaseSecret = process.env.SUPABASE_JWT_SECRET;
    const originalJwtSecret = process.env.JWT_SECRET;

    try {
      delete process.env.SUPABASE_JWT_SECRET;
      process.env.JWT_SECRET = 'fallback-legacy-secret-32-chars-long!';

      const secret = new TextEncoder().encode(process.env.JWT_SECRET);
      const token = await new SignJWT({
        sub: 'user_123',
        email: 'test@ruhvi.in',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret);

      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user_123');
      expect(payload?.email).toBe('test@ruhvi.in');
    } finally {
      process.env.SUPABASE_JWT_SECRET = originalSupabaseSecret;
      process.env.JWT_SECRET = originalJwtSecret;
    }
  });

  it('verifySessionToken accepts SUPABASE_JWT_SECRET primarily', async () => {
    const originalSupabaseSecret = process.env.SUPABASE_JWT_SECRET;

    try {
      process.env.SUPABASE_JWT_SECRET =
        'primary-supabase-secret-32-chars-long!';

      const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET);
      const token = await new SignJWT({
        sub: 'user_456',
        email: 'primary@ruhvi.in',
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('1h')
        .sign(secret);

      const payload = await verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.sub).toBe('user_456');
    } finally {
      process.env.SUPABASE_JWT_SECRET = originalSupabaseSecret;
    }
  });
});
