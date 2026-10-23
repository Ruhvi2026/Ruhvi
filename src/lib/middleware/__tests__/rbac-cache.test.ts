import {
  signRbacProfile,
  verifyCachedRbac,
  RBAC_COOKIE_NAME,
  RBAC_CACHE_TTL_SECONDS,
  CachedRbacProfile,
} from '../rbac-cache';

describe('Portal RBAC Cache Module', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      SUPABASE_JWT_SECRET: 'test-supabase-jwt-secret-key-32-chars-long!',
    };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('signs and verifies an RBAC profile correctly', async () => {
    const profile: CachedRbacProfile = {
      uid: 'user_admin_123',
      role: 'admin',
      accountStatus: 'active',
      allowedPortals: ['admin', 'portal-orders'],
      department: 'operations',
    };

    const token = await signRbacProfile(profile);
    expect(token).toBeTruthy();
    expect(typeof token).toBe('string');

    const verified = await verifyCachedRbac(token, 'user_admin_123');
    expect(verified).not.toBeNull();
    expect(verified?.uid).toBe('user_admin_123');
    expect(verified?.role).toBe('admin');
    expect(verified?.accountStatus).toBe('active');
    expect(verified?.allowedPortals).toEqual(['admin', 'portal-orders']);
    expect(verified?.department).toBe('operations');
  });

  it('rejects token when expected UID does not match', async () => {
    const profile: CachedRbacProfile = {
      uid: 'user_admin_123',
      role: 'admin',
      accountStatus: 'active',
      allowedPortals: ['admin'],
    };

    const token = await signRbacProfile(profile);
    expect(token).toBeTruthy();

    const verified = await verifyCachedRbac(token, 'different_user_999');
    expect(verified).toBeNull();
  });

  it('rejects tampered or malformed tokens safely', async () => {
    const invalid = 'eyJhbGciOiJIUzI1NiJ9.invalid.payload';
    const verified = await verifyCachedRbac(invalid, 'user_admin_123');
    expect(verified).toBeNull();
  });

  it('returns null when token is missing or empty', async () => {
    expect(await verifyCachedRbac('', 'user_admin_123')).toBeNull();
    expect(await verifyCachedRbac(null, 'user_admin_123')).toBeNull();
    expect(await verifyCachedRbac(undefined, 'user_admin_123')).toBeNull();
  });

  it('exports valid cookie name and TTL constants', () => {
    expect(RBAC_COOKIE_NAME).toBe('__portal_rbac');
    expect(RBAC_CACHE_TTL_SECONDS).toBe(300);
  });
});
