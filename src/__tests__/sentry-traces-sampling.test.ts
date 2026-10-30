import {
  getSentryTracesSampleRate,
  beforeSendSentry,
} from '../lib/sentry-ignore';
import type { ErrorEvent } from '@sentry/nextjs';

describe('Sentry Server & Edge Trace Sampling Guard (Finding B2)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.SENTRY_TRACES_SAMPLE_RATE;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getSentryTracesSampleRate()', () => {
    it('defaults to 0.1 (10%) in production to protect quota', () => {
      (process.env as any).NODE_ENV = 'production';
      expect(getSentryTracesSampleRate()).toBe(0.1);
    });

    it('defaults to 1.0 (100%) in development/test for full local debugging', () => {
      (process.env as any).NODE_ENV = 'development';
      expect(getSentryTracesSampleRate()).toBe(1.0);
    });

    it('respects valid custom SENTRY_TRACES_SAMPLE_RATE in production', () => {
      (process.env as any).NODE_ENV = 'production';
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0.25';
      expect(getSentryTracesSampleRate()).toBe(0.25);
    });

    it('supports 0 (complete trace disabling) if explicitly set', () => {
      process.env.SENTRY_TRACES_SAMPLE_RATE = '0';
      expect(getSentryTracesSampleRate()).toBe(0);
    });

    it('ignores invalid non-numeric or out-of-bounds strings and falls back safely', () => {
      (process.env as any).NODE_ENV = 'production';

      process.env.SENTRY_TRACES_SAMPLE_RATE = 'invalid_number';
      expect(getSentryTracesSampleRate()).toBe(0.1);

      process.env.SENTRY_TRACES_SAMPLE_RATE = '1.5'; // > 1
      expect(getSentryTracesSampleRate()).toBe(0.1);

      process.env.SENTRY_TRACES_SAMPLE_RATE = '-0.1'; // < 0
      expect(getSentryTracesSampleRate()).toBe(0.1);
    });
  });

  describe('beforeSendSentry() PII scrubbing verification', () => {
    it('redacts sensitive credentials and customer PII in request payloads', () => {
      const mockEvent: any = {
        event_id: 'test-event-1',
        type: 'error',
        message: 'Payment verification error',
        request: {
          data: {
            password: 'superSecretPassword123',
            otp: '654321',
            email: 'customer@example.com',
            phone: '+91 9876543210',
            orderId: 'ORD_123',
          },
        },
        user: {
          id: 'user_1',
          email: 'customer@example.com',
          ip_address: '192.168.1.1',
        },
      };

      const sanitized: any = beforeSendSentry(mockEvent as ErrorEvent);
      expect(sanitized).not.toBeNull();
      expect(sanitized?.request?.data.password).toBe('[REDACTED]');
      expect(sanitized?.request?.data.otp).toBe('[REDACTED]');
      expect(sanitized?.request?.data.email).toBe('[REDACTED_EMAIL]');
      expect(sanitized?.request?.data.phone).toBe('[REDACTED_PHONE]');
      expect(sanitized?.request?.data.orderId).toBe('ORD_123');

      expect(sanitized?.user?.email).toBe('[REDACTED_EMAIL]');
      expect(sanitized?.user?.ip_address).toBeUndefined();
    });

    it('drops ignored noisy exceptions matching ignore patterns', () => {
      const mockEvent: any = {
        event_id: 'test-event-2',
        type: 'error',
        message: 'Failed to fetch',
      };
      expect(beforeSendSentry(mockEvent as ErrorEvent)).toBeNull();
    });
  });
});
