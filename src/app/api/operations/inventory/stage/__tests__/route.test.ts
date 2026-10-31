import { GET, POST } from '../route';
import { requireAdminClient } from '@/lib/auth/require-admin-client';
import { NextRequest } from 'next/server';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/auth/require-admin-client', () => ({
  requireAdminClient: jest.fn(),
}));

describe('Inventory Scan & Staging Route (Phase 11 - Collision & Ownership Safety)', () => {
  const mockedRequireAdminClient = requireAdminClient as jest.Mock;

  let mockSupabase: any;
  let mockInMethod: jest.Mock;
  let mockSelectMethod: jest.Mock;
  let mockUpsertMethod: jest.Mock;
  let mockEqMethod: jest.Mock;
  let mockOrderMethod: jest.Mock;
  let mockQueryBuilder: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockInMethod = jest.fn().mockResolvedValue({ data: [], error: null });
    mockEqMethod = jest.fn();
    mockOrderMethod = jest.fn();
    mockSelectMethod = jest.fn();
    mockUpsertMethod = jest.fn();

    mockQueryBuilder = {
      order: mockOrderMethod,
      eq: mockEqMethod,
      in: mockInMethod,
      select: mockSelectMethod,
    };

    mockQueryBuilder.order.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.then = (resolve: any) =>
      resolve({
        data: [{ id: 'staging_1', owner_id: 'staff_user_alice' }],
        error: null,
      });

    mockSelectMethod.mockReturnValue(mockQueryBuilder);

    mockUpsertMethod.mockReturnValue({
      select: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'staging_1',
            client_scan_id: 'client-scan-123',
            sku: 'RUH-RNG-001',
          },
        ],
        error: null,
      }),
    });

    mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'inventory_staging') {
          return {
            select: mockSelectMethod,
            upsert: mockUpsertMethod,
          };
        }
        return {};
      }),
    };

    mockedRequireAdminClient.mockResolvedValue({
      supabase: mockSupabase,
      userId: 'staff_user_alice',
      role: 'staff',
    });
  });

  describe('1. GET /api/operations/inventory/stage', () => {
    it('rejects unauthenticated requests with 401', async () => {
      mockedRequireAdminClient.mockRejectedValueOnce(new Error('Unauthorized'));

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe('Unauthorized');
    });

    it('isolates scan queries by owner_id for non-super_admin staff', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockEqMethod).toHaveBeenCalledWith('owner_id', 'staff_user_alice');
    });

    it('allows super_admin to view all staged records without owner_id restriction', async () => {
      mockedRequireAdminClient.mockResolvedValueOnce({
        supabase: mockSupabase,
        userId: 'admin_user_bob',
        role: 'super_admin',
      });

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockEqMethod).not.toHaveBeenCalledWith(
        'owner_id',
        expect.anything()
      );
    });
  });

  describe('2. POST /api/operations/inventory/stage (Collision & Idempotency)', () => {
    const validScan = {
      client_scan_id: 'client-scan-123',
      barcode: '8901234567890',
      sku: 'RUH-RNG-001',
      weight_grams: 4.5,
      cost_price: 2500,
      stock_quantity: 1,
      product_name: 'Solitaire Gold Ring',
    };

    it('successfully stages new scan with immutable owner_id', async () => {
      mockInMethod.mockResolvedValueOnce({ data: [], error: null }); // No collision

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan: validScan }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockUpsertMethod).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            client_scan_id: 'client-scan-123',
            owner_id: 'staff_user_alice',
            sku: 'RUH-RNG-001',
          }),
        ]),
        { onConflict: 'client_scan_id' }
      );
    });

    it('allows idempotent resubmission by the same owner', async () => {
      // Existing scan belongs to the SAME user (staff_user_alice)
      mockInMethod.mockResolvedValueOnce({
        data: [
          {
            id: 'staging_1',
            client_scan_id: 'client-scan-123',
            owner_id: 'staff_user_alice',
          },
        ],
        error: null,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan: validScan }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockUpsertMethod).toHaveBeenCalled();
    });

    it('strictly rejects cross-user collision with 409 Conflict when client_scan_id belongs to another user', async () => {
      // Existing scan belongs to ANOTHER user (staff_user_bob)
      mockInMethod.mockResolvedValueOnce({
        data: [
          {
            id: 'staging_99',
            client_scan_id: 'client-scan-123',
            owner_id: 'staff_user_bob',
          },
        ],
        error: null,
      });

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan: validScan }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(409);
      expect(json.error).toMatch(/Ownership collision/);
      expect(json.conflicting_ids).toContain('client-scan-123');
      // Upsert must NOT be called on collision
      expect(mockUpsertMethod).not.toHaveBeenCalled();
    });

    it('rejects scan items with missing or invalid fields', async () => {
      const invalidScan = {
        client_scan_id: 'scan-incomplete',
        // missing barcode & sku
        weight_grams: -5, // invalid weight
      };

      const req = new NextRequest(
        'http://localhost:3000/api/operations/inventory/stage',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ scan: invalidScan }),
        }
      );

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe('All scan items failed validation');
      expect(mockUpsertMethod).not.toHaveBeenCalled();
    });
  });
});
