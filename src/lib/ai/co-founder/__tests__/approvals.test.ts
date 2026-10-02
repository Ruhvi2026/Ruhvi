jest.mock('server-only', () => ({}));

import {
  createRecommendation,
  createApprovalRequest,
  reviewApproval,
  getPendingApprovals,
  formatApprovalForVoice,
  formatApprovalForChat,
} from '../approvals';
import { executeCoFounderTool } from '../tool-bridge';

const mockRecommendationsTable: any[] = [];
const mockApprovalsTable: any[] = [];

// Mock audit
jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(async () => {}),
}));

// Mock Supabase
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_recommendations') {
        return {
          insert: jest.fn((row: any) => {
            const inserted = {
              id: `rec_${mockRecommendationsTable.length + 1}`,
              ...row,
            };
            mockRecommendationsTable.push(inserted);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: inserted, error: null }),
              }),
            };
          }),
        };
      }
      if (table === 'co_founder_approvals') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          gt: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[`${col}_gt`] = val;
            return this;
          }),
          order: jest.fn().mockReturnThis(),
          single: jest.fn(function (this: any) {
            const row = mockApprovalsTable.find((a) => {
              if (this._filters?.id && a.id !== this._filters.id) return false;
              return true;
            });
            return Promise.resolve({
              data: row || null,
              error: row ? null : new Error('Not found'),
            });
          }),
          maybeSingle: jest.fn(function (this: any) {
            const row = mockApprovalsTable.find((a) => {
              if (
                this._filters?.idempotency_key &&
                a.idempotency_key !== this._filters.idempotency_key
              )
                return false;
              if (this._filters?.status && a.status !== this._filters.status)
                return false;
              return true;
            });
            return Promise.resolve({ data: row || null, error: null });
          }),
          insert: jest.fn((row: any) => {
            const inserted = {
              id: `app_${mockApprovalsTable.length + 1}`,
              ...row,
              created_at: new Date().toISOString(),
            };
            mockApprovalsTable.push(inserted);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: inserted, error: null }),
              }),
            };
          }),
          update: jest.fn((fields: any) => ({
            eq: (col: string, val: any) => {
              mockApprovalsTable.forEach((a) => {
                if (a[col] === val) Object.assign(a, fields);
              });
              return Promise.resolve({ data: null, error: null });
            },
          })),
          then: jest.fn(function (this: any, resolve: any) {
            const res = mockApprovalsTable.filter((a) => {
              if (this._filters?.status && a.status !== this._filters.status)
                return false;
              if (
                this._filters?.expires_at_gt &&
                new Date(a.expires_at) <= new Date(this._filters.expires_at_gt)
              )
                return false;
              return true;
            });
            return resolve({ data: res, error: null });
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      };
    }),
  })),
}));

describe('Stage 6 — Recommendation & Approval State Machine', () => {
  beforeEach(() => {
    mockRecommendationsTable.length = 0;
    mockApprovalsTable.length = 0;
  });

  describe('Recommendation Model (Phases 3-4)', () => {
    it('separates Fact, Interpretation, Recommendation, and Action', async () => {
      const recRes = await createRecommendation({
        title: 'Restock Festive Kundan Inventory',
        category: 'OPERATIONS',
        fact: 'Current inventory is 2 units and 7-day sales velocity is 14 units.',
        interpretation:
          'Stock will be completely depleted within 24 to 48 hours.',
        recommendation:
          'Place an expedited purchase order for 25 units with artisan suppliers.',
        confidence: 'high',
        alternatives: [
          {
            title: 'Temporarily pause festive ad spend',
            description:
              'Reduces demand pressure but causes lost potential revenue.',
            tradeoff: 'Protects customer SLA at cost of sales volume.',
          },
        ],
        impactAnalysis: {
          expectedBenefit:
            'Avoids stockout and protects ₹75,000 projected festive revenue.',
          potentialDownside: 'Commitment of ₹35,000 supplier capital.',
          operationalRisk: 'low',
          isReversible: false,
        },
        suggestedAction: {
          actionType: 'supplier_purchase_order',
          targetEntity: 'prod_kundan_choker',
          payload: { units: 25, supplier: 'Jaipur Crafts' },
          requiredScope: 'inventory:write',
          scopeDescription: 'Order 25 units from Jaipur Crafts',
        },
      });

      expect(recRes.success).toBe(true);
      expect(recRes.recommendationId).toBeDefined();
      expect(mockRecommendationsTable[0].fact).toContain(
        'inventory is 2 units'
      );
      expect(mockRecommendationsTable[0].recommendation).toContain(
        'expedited purchase order'
      );
    });
  });

  describe('Approval State Machine & Explicit Consent (Phases 10-14)', () => {
    it('creates an approval request with deterministic idempotency', async () => {
      const req1 = await createApprovalRequest({
        actionType: 'supplier_purchase_order',
        actionPayload: { units: 25, sku: 'RKC-01' },
        scopeDescription: 'Purchase 25 units of RKC-01 for ₹35,000',
        riskLevel: 'high',
        requestedBy: 'founder_1',
      });

      expect(req1.success).toBe(true);

      // Duplicate request with identical payload returns existing approval ID
      const req2 = await createApprovalRequest({
        actionType: 'supplier_purchase_order',
        actionPayload: { units: 25, sku: 'RKC-01' },
        scopeDescription: 'Purchase 25 units of RKC-01 for ₹35,000',
      });

      expect(req2.approvalId).toBe(req1.approvalId);
      expect(mockApprovalsTable.length).toBe(1); // No duplicate DB row
    });

    it('transitions state from pending to approved upon explicit user consent', async () => {
      const { approvalId } = await createApprovalRequest({
        actionType: 'send_whatsapp_broadcast',
        actionPayload: { template: 'festive_preview', customerCount: 40 },
        scopeDescription: 'Send WhatsApp broadcast to 40 VIP customers',
        riskLevel: 'medium',
      });

      const reviewRes = await reviewApproval({
        approvalId: approvalId!,
        decision: 'approved',
        reviewedBy: 'founder_1',
      });

      expect(reviewRes.success).toBe(true);
      expect(reviewRes.status).toBe('approved');
      expect(mockApprovalsTable[0].status).toBe('approved');
      expect(mockApprovalsTable[0].reviewed_by).toBe('founder_1');
    });

    it('prevents transitioning an already reviewed approval', async () => {
      const { approvalId } = await createApprovalRequest({
        actionType: 'price_update',
        actionPayload: { sku: 'RKC-01', newPrice: 5999 },
        scopeDescription: 'Update price of RKC-01 to ₹5,999',
        riskLevel: 'critical',
      });

      await reviewApproval({
        approvalId: approvalId!,
        decision: 'rejected',
        reviewedBy: 'founder_1',
        rejectionReason: 'Margin calculation needs recalculation',
      });

      // Second attempt to approve rejected action must fail
      const secondAttempt = await reviewApproval({
        approvalId: approvalId!,
        decision: 'approved',
        reviewedBy: 'founder_1',
      });

      expect(secondAttempt.success).toBe(false);
      expect(secondAttempt.error).toContain(
        'Cannot approved approval with status'
      );
    });

    it('rejects execution of expired approvals', async () => {
      // Create approval with negative expiration
      const { approvalId } = await createApprovalRequest({
        actionType: 'refund_order',
        actionPayload: { orderId: 'ord-101', amount: 4500 },
        scopeDescription: 'Refund ₹4,500 to customer',
        expirationHours: -1, // Expired immediately
      });

      const res = await reviewApproval({
        approvalId: approvalId!,
        decision: 'approved',
        reviewedBy: 'founder_1',
      });

      expect(res.success).toBe(false);
      expect(res.status).toBe('expired');
      expect(mockApprovalsTable[0].status).toBe('expired');
    });
  });

  describe('Voice & Chat Formatting (Phases 17-19)', () => {
    it('formats crisp spoken voice summary and markdown chat preview', () => {
      const approval = {
        actionType: 'customer_coupon_create',
        actionPayload: { code: 'DIWALI20', discount: 20 },
        scopeDescription: 'Create 20% discount coupon for 100 VIP customers',
        riskLevel: 'high' as const,
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 86400000).toISOString(),
        idempotencyKey: 'test_key',
      };

      const voice = formatApprovalForVoice(approval);
      expect(voice).toContain('Approval requested');
      expect(voice).toContain('high risk action');
      expect(voice).toContain('Would you like me to proceed with execution?');

      const chat = formatApprovalForChat(approval);
      expect(chat).toContain('### Action Approval Required');
      expect(chat).toContain('customer_coupon_create');
      expect(chat).toContain('```json');
    });
  });

  describe('Tool Bridge Integration & Security (Phases 15, 21)', () => {
    it('retrieves and submits approval decisions through tool bridge with permission', async () => {
      const { approvalId } = await createApprovalRequest({
        actionType: 'inventory_restock',
        actionPayload: { sku: 'RC-01', units: 10 },
        scopeDescription: 'Restock 10 units',
      });

      // Query pending approvals
      const listRes = await executeCoFounderTool('get_pending_approvals', {}, [
        'analytics:read',
      ]);
      expect(listRes.success).toBe(true);
      expect(listRes.summaryForVoice).toContain(
        'pending actions awaiting review'
      );

      // Submit decision with write scope
      const decRes = await executeCoFounderTool(
        'submit_approval_decision',
        { approval_id: approvalId, decision: 'approved', user_id: 'founder_1' },
        ['analytics:write']
      );
      expect(decRes.success).toBe(true);
      expect(decRes.summaryForVoice).toContain('marked as approved');

      // Blocked without write scope
      const blockedRes = await executeCoFounderTool(
        'submit_approval_decision',
        { approval_id: approvalId, decision: 'rejected' },
        ['analytics:read']
      );
      expect(blockedRes.success).toBe(false);
    });
  });
});
