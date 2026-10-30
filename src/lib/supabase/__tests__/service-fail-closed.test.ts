import { getServiceClient } from '../service';

describe('Supabase Production Fail-Closed Behavior (P2.4)', () => {
  const originalEnv = process.env.NODE_ENV;
  const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock-service-role-key-secret';
  });

  afterEach(() => {
    (process.env as any).NODE_ENV = originalEnv;
    process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  it('fails closed and throws error when NEXT_PUBLIC_SUPABASE_URL is missing in production', () => {
    (process.env as any).NODE_ENV = 'production';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    expect(() => getServiceClient()).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL is not set in production/i
    );
  });

  it('succeeds when NEXT_PUBLIC_SUPABASE_URL is explicitly set in production', () => {
    (process.env as any).NODE_ENV = 'production';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://custom-project.supabase.co';

    const client = getServiceClient();
    expect(client).toBeDefined();
  });

  it('allows fallback in non-production environments (development/test)', () => {
    (process.env as any).NODE_ENV = 'test';
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;

    const client = getServiceClient();
    expect(client).toBeDefined();
  });
});
