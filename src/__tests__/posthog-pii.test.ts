import { evaluatePostHogIdentity } from '@/components/PostHogProvider';

describe('PostHog Identity Sync & PII Minimization (Finding G2)', () => {
  it('identifies user with pseudonymized UID and role only, strictly excluding email or names', () => {
    const result = evaluatePostHogIdentity({
      uid: 'user_cust_123',
      prevUid: null,
      role: 'customer',
      doNotTrack: false,
      hasKey: true,
    });

    expect(result.action).toBe('identify');
    expect(result.uid).toBe('user_cust_123');
    expect(result.properties).toEqual({
      role: 'customer',
      is_staff: false,
    });

    // Verify raw email and PII fields are not included
    expect(result.properties).not.toHaveProperty('email');
    expect(result.properties).not.toHaveProperty('full_name');
    expect(result.properties).not.toHaveProperty('phone');
  });

  it('correctly sets is_staff: true for administrative and internal roles', () => {
    const roles = ['super_admin', 'admin', 'manager', 'staff'];
    for (const role of roles) {
      const result = evaluatePostHogIdentity({
        uid: `staff_${role}_id`,
        prevUid: null,
        role,
        doNotTrack: false,
        hasKey: true,
      });

      expect(result.action).toBe('identify');
      expect(result.properties?.is_staff).toBe(true);
      expect(result.properties?.role).toBe(role);
      expect(result.properties).not.toHaveProperty('email');
    }
  });

  it('triggers reset on user logout (uid is null and prevUid was present)', () => {
    const result = evaluatePostHogIdentity({
      uid: null,
      prevUid: 'user_cust_123',
      role: undefined,
      doNotTrack: false,
      hasKey: true,
    });

    expect(result.action).toBe('reset');
    expect(result.properties).toBeUndefined();
  });

  it('returns noop when user remains the same (uid === prevUid)', () => {
    const result = evaluatePostHogIdentity({
      uid: 'user_cust_123',
      prevUid: 'user_cust_123',
      role: 'customer',
      doNotTrack: false,
      hasKey: true,
    });

    expect(result.action).toBe('noop');
  });

  it('respects Do Not Track (DNT) header and skips identification', () => {
    const result = evaluatePostHogIdentity({
      uid: 'user_privacy_conscious',
      prevUid: null,
      role: 'customer',
      doNotTrack: true,
      hasKey: true,
    });

    expect(result.action).toBe('skipped_dnt');
    expect(result.properties).toBeUndefined();
  });

  it('skips identification when PostHog key is unconfigured', () => {
    const result = evaluatePostHogIdentity({
      uid: 'user_cust_123',
      prevUid: null,
      role: 'customer',
      doNotTrack: false,
      hasKey: false,
    });

    expect(result.action).toBe('skipped_no_key');
  });
});
