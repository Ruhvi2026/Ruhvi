import { NextRequest } from 'next/server';
import { GET } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getCustomer360Profile,
  Customer360ForbiddenError,
  Customer360NotFoundError,
} from '@/lib/intelligence/customer-360-service';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/intelligence/customer-360-service', () => ({
  getCustomer360Profile: jest.fn(),
  Customer360ForbiddenError: class Customer360ForbiddenError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'Customer360ForbiddenError';
    }
  },
  Customer360NotFoundError: class Customer360NotFoundError extends Error {
    constructor(msg: string) {
      super(msg);
      this.name = 'Customer360NotFoundError';
    }
  },
}));

describe('GET /api/customer-360/[id] (Track F - Phase 32)', () => {
  const customerId = 'usr_alice_001';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createRequest = () => {
    return new NextRequest(
      `http://localhost:3000/api/customer-360/${customerId}`,
      {
        method: 'GET',
      }
    );
  };

  const createContext = (id = customerId) => {
    return {
      params: Promise.resolve({ id }),
    };
  };

  it('returns 401 when request is unauthenticated', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: false,
      uid: '',
      role: null,
      error: 'Unauthorized',
      status: 401,
    });

    const res = await GET(createRequest(), createContext());
    expect(res.status).toBe(401);

    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
    expect(getCustomer360Profile).not.toHaveBeenCalled();
  });

  it('returns 404 when customer is not found', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin_123',
      role: 'admin',
      error: null,
      status: 200,
    });

    (getCustomer360Profile as jest.Mock).mockRejectedValue(
      new Customer360NotFoundError('Customer not found')
    );

    const res = await GET(createRequest(), createContext());
    expect(res.status).toBe(404);

    const data = await res.json();
    expect(data.error).toContain('Customer not found');
  });

  it('returns 403 when service reports forbidden access', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'staff_123',
      role: 'staff',
      error: null,
      status: 200,
    });

    (getCustomer360Profile as jest.Mock).mockRejectedValue(
      new Customer360ForbiddenError('Access forbidden')
    );

    const res = await GET(createRequest(), createContext());
    expect(res.status).toBe(403);

    const data = await res.json();
    expect(data.error).toBe('Access forbidden');
  });

  it('returns 200 with customer360 payload when authorized', async () => {
    (requireAdmin as jest.Mock).mockResolvedValue({
      ok: true,
      uid: 'admin_123',
      role: 'admin',
      error: null,
      status: 200,
    });

    const mockProfile = {
      profile: { id: customerId, fullName: 'Alice Roy' },
      orderSummary: { totalOrders: 5, totalLifetimeSpend: 45000 },
      metadata: { piiMasked: false },
    };

    (getCustomer360Profile as jest.Mock).mockResolvedValue(mockProfile);

    const res = await GET(createRequest(), createContext());
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.customer360).toEqual(mockProfile);
    expect(getCustomer360Profile).toHaveBeenCalledWith({
      targetCustomerId: customerId,
      requestedByActor: {
        actorId: 'admin_123',
        role: 'admin',
      },
    });
  });
});
