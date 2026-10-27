import { GET } from '../route';
import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getBusinessRadarSummary } from '@/lib/intelligence/radar-service';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/intelligence/radar-service', () => ({
  getBusinessRadarSummary: jest.fn(),
}));

describe('GET /api/business-radar (Phase 17 Endpoint)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 401 when request is unauthenticated', async () => {
    (requireAdmin as jest.Mock).mockResolvedValueOnce({
      ok: false,
      uid: '',
      role: null,
      error: 'Unauthorized',
      status: 401,
    });

    const req = new NextRequest('http://localhost:3000/api/business-radar');
    const res = await GET(req);

    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 200 with full summary for authenticated admin', async () => {
    (requireAdmin as jest.Mock).mockResolvedValueOnce({
      ok: true,
      uid: 'admin_usr_123',
      role: 'admin',
      error: null,
      status: 200,
    });

    const mockSummary = {
      overallHealth: 'healthy',
      callerRole: 'admin',
      sections: {
        financial: { gross_sales: { value: 50000 } },
        operations: { cancellation_rate: { value: 5.0 } },
      },
    };

    (getBusinessRadarSummary as jest.Mock).mockResolvedValueOnce(mockSummary);

    const req = new NextRequest(
      'http://localhost:3000/api/business-radar?preset=last_7_days'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('admin');
    expect(data.summary.sections.financial).toBeDefined();
    expect(getBusinessRadarSummary).toHaveBeenCalledWith('admin', {
      preset: 'last_7_days',
      customStart: undefined,
      customEnd: undefined,
      fresh: false,
    });
  });

  it('returns 200 with partitioned summary for staff role (no financial section)', async () => {
    (requireAdmin as jest.Mock).mockResolvedValueOnce({
      ok: true,
      uid: 'staff_usr_456',
      role: 'staff',
      error: null,
      status: 200,
    });

    const mockSummary = {
      overallHealth: 'healthy',
      callerRole: 'staff',
      sections: {
        operations: { cancellation_rate: { value: 5.0 } },
        inventory: { stock_out_rate: { value: 2.0 } },
      },
    };

    (getBusinessRadarSummary as jest.Mock).mockResolvedValueOnce(mockSummary);

    const req = new NextRequest(
      'http://localhost:3000/api/business-radar?preset=last_30_days'
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.role).toBe('staff');
    expect(data.summary.sections.financial).toBeUndefined();
    expect(data.summary.sections.operations).toBeDefined();
  });

  it('handles server exceptions cleanly with 500 status', async () => {
    (requireAdmin as jest.Mock).mockResolvedValueOnce({
      ok: true,
      uid: 'admin_usr_123',
      role: 'admin',
      error: null,
      status: 200,
    });

    (getBusinessRadarSummary as jest.Mock).mockRejectedValueOnce(
      new Error('Database cluster timeout')
    );

    const req = new NextRequest('http://localhost:3000/api/business-radar');
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.success).toBe(false);
    expect(data.error).toBe('Database cluster timeout');
  });
});
