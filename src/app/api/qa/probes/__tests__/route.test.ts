jest.mock('server-only', () => ({}));

import { GET, getTrustedProbeTarget } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { runSyntheticHealthProbes } from '@/lib/qa/health-probes';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/qa/health-probes', () => ({
  runSyntheticHealthProbes: jest.fn().mockResolvedValue({
    summary: { overallStatus: 'HEALTHY' },
    probes: [],
  }),
}));

describe('QA Probes Route Security & Authorization (/api/qa/probes)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects unauthenticated requests with 401 when neither session nor cron token is provided', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({ ok: false });
    const req = new Request('http://localhost/api/qa/probes');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('allows access when authorized via valid CRON_SECRET Bearer header', async () => {
    process.env.CRON_SECRET = 'secret_test_key_xyz';
    const req = new Request('http://localhost/api/qa/probes', {
      headers: { authorization: 'Bearer secret_test_key_xyz' },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(runSyntheticHealthProbes).toHaveBeenCalledWith('http://localhost');
  });

  it('allows access when authorized via requireAdmin session', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin_123',
      role: 'admin',
    });
    const req = new Request('https://ruhvi.in/api/qa/probes');
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(runSyntheticHealthProbes).toHaveBeenCalledWith('https://ruhvi.in');
  });

  it('rejects untrusted/malicious host targets that are not in the allowlist', () => {
    const maliciousReq = new Request('http://evil-attacker.com/api/qa/probes');
    const target = getTrustedProbeTarget(maliciousReq);
    expect(target).toBeNull();
  });

  it('accepts allowlisted host targets (localhost, ruhvi.in, vercel.app)', () => {
    expect(
      getTrustedProbeTarget(new Request('http://localhost:3000/api/qa/probes'))
    ).toBe('http://localhost:3000');
    expect(
      getTrustedProbeTarget(new Request('https://ruhvi.in/api/qa/probes'))
    ).toBe('https://ruhvi.in');
    expect(
      getTrustedProbeTarget(
        new Request('https://staging.ruhvi.in/api/qa/probes')
      )
    ).toBe('https://staging.ruhvi.in');
    expect(
      getTrustedProbeTarget(
        new Request('https://ruhvi-preview.vercel.app/api/qa/probes')
      )
    ).toBe('https://ruhvi-preview.vercel.app');
  });
});
