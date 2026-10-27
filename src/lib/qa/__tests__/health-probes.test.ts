jest.mock('server-only', () => ({}));

import {
  executeProbe,
  runSyntheticHealthProbes,
  PROBE_DEFINITIONS,
  type ProbeConfig,
} from '../health-probes';

describe('Synthetic Read-Only Health Probes (Track H - Phase 40)', () => {
  const baseUrl = 'http://localhost:3000';

  const mockSuccessFetch = jest.fn().mockImplementation((url: string) => {
    // If admin barrier, return 307 redirect
    if (url.includes('/admin/dashboard')) {
      return Promise.resolve({
        status: 307,
        headers: new Headers({ location: '/admin/login' }),
      });
    }
    return Promise.resolve({
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Single Probe Execution: executeProbe()', () => {
    it('returns PASS when response status matches expected and latency is within threshold', async () => {
      const config: ProbeConfig = {
        id: 'TEST_PROBE',
        name: 'Test Probe',
        path: '/test-route',
        expectedStatuses: [200],
        maxLatencyMs: 2000,
        warnLatencyMs: 1000,
      };

      const result = await executeProbe(
        config,
        baseUrl,
        mockSuccessFetch as any
      );

      expect(result.status).toBe('PASS');
      expect(result.observedStatus).toBe(200);
      expect(result.isReadOnly).toBe(true);
      expect(result.message).toContain('Probe succeeded with HTTP 200');
    });

    it('returns FAIL when HTTP status mismatches expected status', async () => {
      const config: ProbeConfig = {
        id: 'TEST_FAIL',
        name: 'Test Fail',
        path: '/missing',
        expectedStatuses: [200],
        maxLatencyMs: 2000,
        warnLatencyMs: 1000,
      };

      const mock404Fetch = jest.fn().mockResolvedValue({ status: 404 });

      const result = await executeProbe(config, baseUrl, mock404Fetch as any);

      expect(result.status).toBe('FAIL');
      expect(result.observedStatus).toBe(404);
      expect(result.message).toContain(
        'HTTP status mismatch: expected [200], observed 404'
      );
    });

    it('returns FAIL on network / fetch error', async () => {
      const config: ProbeConfig = {
        id: 'TEST_ERR',
        name: 'Test Error',
        path: '/error',
        expectedStatuses: [200],
        maxLatencyMs: 2000,
        warnLatencyMs: 1000,
      };

      const mockErrorFetch = jest
        .fn()
        .mockRejectedValue(new Error('ECONNREFUSED'));

      const result = await executeProbe(config, baseUrl, mockErrorFetch as any);

      expect(result.status).toBe('FAIL');
      expect(result.observedStatus).toBe(0);
      expect(result.message).toContain('ECONNREFUSED');
    });
  });

  describe('Security Barrier Verification', () => {
    it('returns PASS when protected admin route returns redirect (307) or forbidden (403)', async () => {
      const adminProbe = PROBE_DEFINITIONS.find(
        (p) => p.id === 'PROBE_ADMIN_BARRIER'
      )!;

      const mock307 = jest.fn().mockResolvedValue({ status: 307 });
      const result = await executeProbe(adminProbe, baseUrl, mock307 as any);

      expect(result.status).toBe('PASS');
      expect(result.observedStatus).toBe(307);
    });

    it('returns FAIL when protected admin route returns 200 OK without credentials (security breach)', async () => {
      const adminProbe = PROBE_DEFINITIONS.find(
        (p) => p.id === 'PROBE_ADMIN_BARRIER'
      )!;

      // Vulnerable route returns 200 without auth
      const mockLeaking200 = jest.fn().mockResolvedValue({ status: 200 });
      const result = await executeProbe(
        adminProbe,
        baseUrl,
        mockLeaking200 as any
      );

      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('Security breach');
    });
  });

  describe('Full Synthetic Health Suite: runSyntheticHealthProbes()', () => {
    it('runs all probes and reports overall HEALTHY when all pass', async () => {
      const report = await runSyntheticHealthProbes(
        baseUrl,
        mockSuccessFetch as any
      );

      expect(report.summary.totalProbes).toBe(PROBE_DEFINITIONS.length);
      expect(report.summary.passed).toBe(PROBE_DEFINITIONS.length);
      expect(report.summary.failed).toBe(0);
      expect(report.summary.overallStatus).toBe('HEALTHY');
      expect(report.probes.every((p) => p.isReadOnly)).toBe(true);
    });

    it('reports CRITICAL when any probe fails', async () => {
      const mockPartialFailFetch = jest
        .fn()
        .mockImplementation((url: string) => {
          if (url.includes('/api/products?search=')) {
            return Promise.resolve({ status: 500 }); // Catalog search fails
          }
          if (url.includes('/admin/dashboard')) {
            return Promise.resolve({ status: 307 });
          }
          return Promise.resolve({ status: 200 });
        });

      const report = await runSyntheticHealthProbes(
        baseUrl,
        mockPartialFailFetch as any
      );

      expect(report.summary.failed).toBe(1);
      expect(report.summary.overallStatus).toBe('CRITICAL');
      const searchProbe = report.probes.find(
        (p) => p.probeId === 'PROBE_SEARCH'
      );
      expect(searchProbe?.status).toBe('FAIL');
      expect(searchProbe?.observedStatus).toBe(500);
    });
  });
});
