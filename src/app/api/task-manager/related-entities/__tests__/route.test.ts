import { GET } from '../route';

jest.mock('@/lib/auth/task-auth', () => ({
  getAuthenticatedStaff: jest.fn(),
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import { getAuthenticatedStaff } from '@/lib/auth/task-auth';
import { getServiceClient } from '@/lib/supabase/service';

describe('GET /api/task-manager/related-entities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated requests with 401', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue(null);
    const req = new Request(
      'http://localhost/api/task-manager/related-entities?type=order'
    );
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('validates required entity type', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      role: 'admin',
    });
    const req = new Request(
      'http://localhost/api/task-manager/related-entities?type=invalid'
    );
    const res = await GET(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/Valid type/);
  });

  it('fetches order details and line items when id provided', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      role: 'admin',
    });

    const mockOrder = {
      id: '00000000-0000-0000-0000-000000000001',
      order_number: 'ORD-1001',
      status: 'shipped',
      total: 2500,
      user_id: 'user-1',
    };

    const mockItems = [
      {
        id: 'item-1',
        product_id: 'prod-1',
        sku: 'SKU-A',
        quantity: 2,
        price_at_purchase: 1250,
      },
    ];

    const mockSupabase: any = {
      from: jest.fn((table: string) => {
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: mockOrder, error: null }),
          };
        }
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            maybeSingle: jest
              .fn()
              .mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null,
              }),
          };
        }
        if (table === 'order_items') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ data: mockItems, error: null }),
          };
        }
        if (table === 'products') {
          return {
            select: jest.fn().mockReturnThis(),
            in: jest
              .fn()
              .mockResolvedValue({
                data: [{ id: 'prod-1', name: 'Gold Ring', slug: 'gold-ring' }],
                error: null,
              }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
        };
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const req = new Request(
      'http://localhost/api/task-manager/related-entities?type=order&id=ORD-1001'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.order_number).toBe('ORD-1001');
    expect(json.data.customer.full_name).toBe('John Doe');
    expect(json.data.items[0].product_name).toBe('Gold Ring');
  });

  it('searches products list for selection picker', async () => {
    (getAuthenticatedStaff as jest.Mock).mockResolvedValue({
      id: 'staff-1',
      role: 'admin',
    });

    const mockProducts = [
      {
        id: 'p1',
        name: 'Solitaire Ring',
        sku: 'SR-01',
        price: 9999,
        stock_quantity: 10,
      },
    ];

    const mockSupabase: any = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        or: jest.fn().mockResolvedValue({ data: mockProducts, error: null }),
      }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);

    const req = new Request(
      'http://localhost/api/task-manager/related-entities?type=product&search=Solitaire'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.list).toHaveLength(1);
    expect(json.list[0].name).toBe('Solitaire Ring');
  });
});
