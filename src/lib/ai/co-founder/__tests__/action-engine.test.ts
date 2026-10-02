jest.mock('server-only', () => ({}));

import { executeApprovedBusinessAction } from '../action-engine';
import { executeCoFounderTool } from '../tool-bridge';

const mockApprovals: any[] = [];
const mockProducts: any[] = [];
const mockTickets: any[] = [];
const mockCoupons: any[] = [];
const mockSignals: any[] = [];

// Mock audit
jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(async () => {}),
}));

// Mock Supabase
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_approvals') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          single: jest.fn(function (this: any) {
            const found = mockApprovals.find((a) => {
              if (this._filters?.id && a.id !== this._filters.id) return false;
              return true;
            });
            return Promise.resolve({
              data: found || null,
              error: found ? null : new Error('Not found'),
            });
          }),
          update: jest.fn(function (this: any, fields: any) {
            return {
              eq: (col: string, val: any) => {
                mockApprovals.forEach((a) => {
                  if (a[col] === val) Object.assign(a, fields);
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          }),
        };
      }
      if (table === 'products') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          maybeSingle: jest.fn(function (this: any) {
            const found = mockProducts.find((p) => {
              if (this._filters?.id && p.id !== this._filters.id) return false;
              if (this._filters?.sku && p.sku !== this._filters.sku)
                return false;
              return true;
            });
            return Promise.resolve({ data: found || null, error: null });
          }),
          update: jest.fn(function (this: any, fields: any) {
            return {
              eq: (col: string, val: any) => {
                mockProducts.forEach((p) => {
                  if (p[col] === val) Object.assign(p, fields);
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          }),
        };
      }
      if (table === 'support_tickets') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          maybeSingle: jest.fn(function (this: any) {
            const found = mockTickets.find((t) => t.id === this._filters?.id);
            return Promise.resolve({ data: found || null, error: null });
          }),
          update: jest.fn(function (this: any, fields: any) {
            return {
              eq: (col: string, val: any) => {
                mockTickets.forEach((t) => {
                  if (t[col] === val) Object.assign(t, fields);
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          }),
        };
      }
      if (table === 'coupons') {
        return {
          insert: jest.fn((row: any) => {
            const inserted = { id: `coup_${mockCoupons.length + 1}`, ...row };
            mockCoupons.push(inserted);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: inserted, error: null }),
              }),
            };
          }),
        };
      }
      if (table === 'co_founder_signals') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          then: jest.fn((resolve: any) =>
            resolve({ data: mockSignals, error: null })
          ),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ data: null, error: null }),
          })),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  })),
}));

describe('Stage 7 — Business Action Layer', () => {
  beforeEach(() => {
    mockApprovals.length = 0;
    mockProducts.length = 0;
    mockTickets.length = 0;
    mockCoupons.length = 0;
    mockSignals.length = 0;

    mockProducts.push({
      id: 'prod_1',
      name: 'Royal Heritage Kundan Choker',
      sku: 'RKC-01',
      stock_quantity: 2,
    });
  });

  describe('Approval Validation (Phase 5)', () => {
    it('blocks high-impact execution if approvalId is missing', async () => {
      const res = await executeApprovedBusinessAction({
        actionType: 'update_inventory_stock',
        actionPayload: { product_id: 'prod_1', new_stock_quantity: 25 },
        userId: 'admin_1',
        userScopes: ['inventory:write'],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('requires valid approvalId');
    });

    it('blocks execution if approval status is still pending', async () => {
      mockApprovals.push({
        id: 'app_pending',
        action_type: 'update_inventory_stock',
        status: 'pending',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const res = await executeApprovedBusinessAction({
        actionType: 'update_inventory_stock',
        actionPayload: { product_id: 'prod_1', new_stock_quantity: 25 },
        approvalId: 'app_pending',
        userId: 'admin_1',
        userScopes: ['inventory:write'],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain("Must be 'approved'");
    });

    it('blocks execution if approval is expired', async () => {
      mockApprovals.push({
        id: 'app_expired',
        action_type: 'update_inventory_stock',
        status: 'approved',
        expires_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      });

      const res = await executeApprovedBusinessAction({
        actionType: 'update_inventory_stock',
        actionPayload: { product_id: 'prod_1', new_stock_quantity: 25 },
        approvalId: 'app_expired',
        userId: 'admin_1',
        userScopes: ['inventory:write'],
      });

      expect(res.success).toBe(false);
      expect(res.error).toContain('Approval has expired');
    });
  });

  describe('Execution Success & Idempotency (Phases 7, 11)', () => {
    it('executes approved inventory update and marks approval executed', async () => {
      mockApprovals.push({
        id: 'app_valid',
        action_type: 'update_inventory_stock',
        status: 'approved',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const res = await executeApprovedBusinessAction({
        actionType: 'update_inventory_stock',
        actionPayload: { product_id: 'prod_1', new_stock_quantity: 25 },
        approvalId: 'app_valid',
        userId: 'admin_1',
        userScopes: ['inventory:write'],
      });

      expect(res.success).toBe(true);
      expect(res.status).toBe('completed');
      expect(mockProducts[0].stock_quantity).toBe(25);
      expect(mockApprovals[0].status).toBe('executed');
      expect(res.voiceSummary).toContain('updated to 25 units');

      // Duplicate execution attempt must fail (Idempotency guard)
      const duplicateAttempt = await executeApprovedBusinessAction({
        actionType: 'update_inventory_stock',
        actionPayload: { product_id: 'prod_1', new_stock_quantity: 25 },
        approvalId: 'app_valid',
        userId: 'admin_1',
        userScopes: ['inventory:write'],
      });

      expect(duplicateAttempt.success).toBe(false);
      expect(duplicateAttempt.error).toContain('already been executed');
    });

    it('executes coupon creation with proper payload', async () => {
      mockApprovals.push({
        id: 'app_coupon',
        action_type: 'create_coupon',
        status: 'approved',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const res = await executeApprovedBusinessAction({
        actionType: 'create_coupon',
        actionPayload: {
          code: 'FESTIVE25',
          discount_type: 'percentage',
          discount_value: 25,
        },
        approvalId: 'app_coupon',
        userId: 'admin_1',
        userScopes: ['coupons:write'],
      });

      expect(res.success).toBe(true);
      expect(mockCoupons.length).toBe(1);
      expect(mockCoupons[0].code).toBe('FESTIVE25');
      expect(mockCoupons[0].discount_value).toBe(25);
    });
  });

  describe('Tool Bridge Integration & Permissions (Phases 6, 22)', () => {
    it('executes approved action via tool bridge with permission', async () => {
      mockApprovals.push({
        id: 'app_bridge',
        action_type: 'update_inventory_stock',
        status: 'approved',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
      });

      const result = await executeCoFounderTool(
        'execute_approved_action',
        {
          action_type: 'update_inventory_stock',
          approval_id: 'app_bridge',
          action_payload: { product_id: 'prod_1', new_stock_quantity: 40 },
        },
        ['analytics:write', 'inventory:write']
      );

      expect(result.success).toBe(true);
      expect(mockProducts[0].stock_quantity).toBe(40);
      expect(result.summaryForVoice).toContain('updated to 40 units');
    });

    it('blocks execution when user lacks write permission', async () => {
      const blocked = await executeCoFounderTool(
        'execute_approved_action',
        { action_type: 'update_inventory_stock', approval_id: 'any' },
        ['analytics:read'] // Missing write scope
      );

      expect(blocked.success).toBe(false);
      expect(blocked.summaryForVoice).toContain("I don't have permission");
    });
  });
});
