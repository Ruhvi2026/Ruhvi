import {
  signEmailVerificationToken,
  verifyEmailVerificationToken,
  getSiteUrl,
} from '../auth/email-verification';
import { getSiteUrl as getSiteUrlUtil } from '../utils/url';
import { POST as forgotPasswordHandler } from '@/app/api/auth/forgot-password/route';
import { sendFcmToTokens } from '../fcm-admin';
import { NextRequest } from 'next/server';

describe('System Flows Integration Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: 'test-supabase-jwt-secret-key-32-chars-long!',
      NEXT_PUBLIC_SITE_URL: 'https://ruhvi.in',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Email Verification & Site URL Flow', () => {
    it('should correctly sign and verify email verification JWT tokens', async () => {
      const customerId = 'cust_test_12345';
      const email = 'customer@ruhvi.in';

      const token = await signEmailVerificationToken({
        customerId,
        email,
        isEmailChange: false,
      });

      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(20);

      const verifiedPayload = await verifyEmailVerificationToken(token);
      expect(verifiedPayload).not.toBeNull();
      expect(verifiedPayload?.customer_id).toBe(customerId);
      expect(verifiedPayload?.email).toBe(email);
      expect(verifiedPayload?.type).toBe('email_verify');
    });

    it('should reject invalid or tampered email verification tokens', async () => {
      const invalidToken =
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload';
      const result = await verifyEmailVerificationToken(invalidToken);
      expect(result).toBeNull();
    });

    it('should format site URL clean of trailing slashes', () => {
      const siteUrl = getSiteUrlUtil();
      expect(siteUrl).toBe('https://ruhvi.in');
      expect(siteUrl.endsWith('/')).toBe(false);
    });
  });

  describe('2. Forgot Password Flow Validation', () => {
    it('should return 400 Bad Request for empty or invalid email format', async () => {
      const reqEmpty = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: '' }),
        }
      );
      const resEmpty = await forgotPasswordHandler(reqEmpty);
      expect(resEmpty.status).toBe(400);

      const dataEmpty = await resEmpty.json();
      expect(dataEmpty.error).toBe('Valid email address is required.');

      const reqInvalid = new NextRequest(
        'http://localhost:3000/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ email: 'invalid-email-format' }),
        }
      );
      const resInvalid = await forgotPasswordHandler(reqInvalid);
      expect(resInvalid.status).toBe(400);

      const dataInvalid = await resInvalid.json();
      expect(dataInvalid.error).toBe('Please enter a valid email address.');
    });
  });

  describe('3. Firebase Push Notification (FCM) Integration', () => {
    it('should handle empty token list gracefully without making external API calls', async () => {
      const result = await sendFcmToTokens([], {
        title: 'Test Notification',
        body: 'Testing FCM Push Flow',
      });

      expect(result).toEqual({ sent: 0, failed: 0 });
    });
  });
});
