import { NextRequest } from 'next/server';
import { GET } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getAnomalyLifecycleRegistry } from '@/lib/intelligence/anomaly-lifecycle';
import { detectBusinessAnomalies } from '@/lib/intelligence/anomaly-detector';
import { createClient } from '@supabase/supabase-js';

jest.mock('server-only', () => ({}));

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/intelligence/anomaly-detector', () => ({
  detectBusinessAnomalies: jest.fn(),
  ENABLED_ANOMALY_RULES: {
    rule_payment_failure_spike: { id: 'rule_payment_failure_spike' },
  },
}));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(),
}));

describe('GET /api/action-center (Track D - Phase 24)', () => {
  const mockedRequireAdmin = requireAdmin as jest.Mock;
  const mockedDetectAnomalies = detectBusinessAnomalies as jest.Mock;
  const mockedCreateClient = createClient as jest.Mock;
  const registry = getAnomalyLifecycleRegistry();

  // Helper to build fluent Supabase mock
  const buildMockSupabase = (overrides?: {
    auditLogs?: { data: any[] | null; error: any };
    aiDiagnostics?: { data: any[] | null; error: any };
    returns?: { data: any[] | null; error: any };
  }) => {
    const auditLogsResult = overrides?.auditLogs ?? {
      data: [
        {
          id: 'log_del_1',
          actor_email: 'admin@ruhvi.in',
          action: 'delete_user_secret',
          entity_type: 'credential',
          entity_id: 'cred_44',
          changes: null,
          created_at: '2026-10-26T12:00:00.000Z',
        },
      ],
      error: null,
    };

    const aiDiagResult = overrides?.aiDiagnostics ?? {
      data: [
        {
          id: 'diag_1',
          provider: 'vertex_ai',
          model: 'gemini-1.5-pro',
          error_message: 'Quota exceeded 429',
          created_at: '2026-10-26T11:00:00.000Z',
        },
      ],
      error: null,
    };

    const returnsResult = overrides?.returns ?? {
      data: [
        {
          id: 'ret_abc_123',
          order_id: 'ord_987654321',
          reason: 'Size too small',
          status: 'requested',
          created_at: '2026-10-26T10:00:00.000Z',
        },
      ],
      error: null,
    };

    return {
      from: jest.fn((table: string) => {
        if (table === 'audit_logs') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest
                  .fn()
                  .mockImplementation(() =>
                    auditLogsResult.error
                      ? Promise.reject(new Error(auditLogsResult.error.message))
                      : Promise.resolve(auditLogsResult)
                  ),
              }),
            }),
          };
        }
        if (table === 'ai_failure_diagnostics') {
          return {
            select: jest.fn().mockReturnValue({
              order: jest.fn().mockReturnValue({
                limit: jest
                  .fn()
                  .mockImplementation(() =>
                    aiDiagResult.error
                      ? Promise.reject(new Error(aiDiagResult.error.message))
                      : Promise.resolve(aiDiagResult)
                  ),
              }),
            }),
          };
        }
        if (table === 'returns') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                order: jest.fn().mockReturnValue({
                  limit: jest
                    .fn()
                    .mockImplementation(() =>
                      returnsResult.error
                        ? Promise.reject(new Error(returnsResult.error.message))
                        : Promise.resolve(returnsResult)
                    ),
                }),
              }),
            }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        };
      }),
    };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    registry.clear();

    // Default mock auth: super_admin
    mockedRequireAdmin.mockResolvedValue({
      ok: true,
      uid: 'superadmin_1',
      role: 'super_admin',
    });

    // Default mock anomalies
    mockedDetectAnomalies.mockResolvedValue({
      anomalies: [
        {
          id: 'anom_payment_spike',
          ruleId: 'rule_payment_failure_spike',
          ruleName: 'Payment Gateway Failure Rate Spike',
          severity: 'critical',
          category: 'financial',
          priority: 'critical',
          metric: 'payment_failure_rate',
          condition: 'gt',
          actualValue: 45.0,
          thresholdValue: 20.0,
          sampleSize: { count: 20 },
          minSampleRequired: 10,
          observationWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          explanation:
            'Payment gateway failure rate reached 45% breaching 20% limit.',
          recommendation: {
            id: 'rec_pay_fail_1',
            title: 'Inspect PhonePe Gateway Outage',
            category: 'financial',
            priority: 'critical',
            evidenceType: 'deterministic_rule',
            supportingMetrics: [
              {
                metric: 'payment_failure_rate',
                value: 45.0,
                unit: '%',
                timeWindow: {
                  start: '2026-10-20T00:00:00.000Z',
                  end: '2026-10-27T00:00:00.000Z',
                  timezone: 'Asia/Kolkata',
                },
              },
            ],
            observationWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
            },
            explanation:
              'Payment gateway failure rate reached 45% breaching 20% limit.',
            uncertaintyBasis: {
              confidence: 0.95,
              confidenceReason:
                'Calculated directly from transactional database table',
              assumptions: ['PhonePe gateway webhook data is up to date'],
            },
            suggestedNextStep: {
              actionTitle: 'Inspect Gateway Status',
              actionType: 'investigate_root_cause',
              safeDeepLink: '/admin/payments',
              requiresApproval: true,
            },
            reviewState: 'pending_review',
            createdAt: '2026-10-26T14:00:00.000Z',
            expiresAt: '2026-10-28T14:00:00.000Z',
          },
          detectedAt: '2026-10-26T14:00:00.000Z',
        },
        {
          id: 'anom_low_stock',
          ruleId: 'rule_stockout_rate_breach',
          ruleName: 'Catalog Stock-Out Rate Breach',
          severity: 'warning',
          category: 'inventory',
          priority: 'high',
          metric: 'stock_out_rate',
          condition: 'gt',
          actualValue: 15.0,
          thresholdValue: 10.0,
          sampleSize: { count: 10 },
          minSampleRequired: 5,
          observationWindow: {
            start: '2026-10-20T00:00:00.000Z',
            end: '2026-10-27T00:00:00.000Z',
            timezone: 'Asia/Kolkata',
            preset: 'last_7_days',
          },
          explanation:
            'Stock-out rate reached 15% exceeding 10% safety margin.',
          recommendation: {
            id: 'rec_stock_breach_1',
            title: 'Initiate Vendor Restock',
            category: 'inventory',
            priority: 'high',
            evidenceType: 'deterministic_rule',
            supportingMetrics: [
              {
                metric: 'stock_out_rate',
                value: 15.0,
                unit: '%',
                timeWindow: {
                  start: '2026-10-20T00:00:00.000Z',
                  end: '2026-10-27T00:00:00.000Z',
                  timezone: 'Asia/Kolkata',
                },
              },
            ],
            observationWindow: {
              start: '2026-10-20T00:00:00.000Z',
              end: '2026-10-27T00:00:00.000Z',
              timezone: 'Asia/Kolkata',
            },
            explanation:
              'Stock-out rate reached 15% exceeding 10% safety margin.',
            uncertaintyBasis: {
              confidence: 0.9,
              confidenceReason:
                'Calculated directly from product inventory stock levels',
              assumptions: ['Vendor lead time is 7 business days'],
            },
            suggestedNextStep: {
              actionTitle: 'Restock SKU Inventory',
              actionType: 'adjust_inventory_safety_stock',
              safeDeepLink: '/admin/reports/inventory',
              requiresApproval: true,
            },
            reviewState: 'pending_review',
            createdAt: '2026-10-26T13:00:00.000Z',
            expiresAt: '2026-10-28T13:00:00.000Z',
          },
          detectedAt: '2026-10-26T13:00:00.000Z',
        },
      ],
    });

    mockedCreateClient.mockReturnValue(buildMockSupabase());
  });

  // 1. Authentication & Authorization
  describe('Authorization and RBAC', () => {
    it('returns 401 when caller is unauthenticated', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('Unauthorized');
    });

    it('filters out financial and security items for staff role', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'staff_user_1',
        role: 'staff',
      });

      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.callerRole).toBe('staff');

      const returnedCategories = json.data.items.map((i: any) => i.category);
      expect(returnedCategories).not.toContain('financial');
      expect(returnedCategories).not.toContain('security');
      // Should still contain inventory and operations
      expect(returnedCategories).toContain('inventory');
      expect(returnedCategories).toContain('operations');
    });

    it('allows financial items but filters out security items for manager role', async () => {
      mockedRequireAdmin.mockResolvedValue({
        ok: true,
        uid: 'manager_user_1',
        role: 'manager',
      });

      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.callerRole).toBe('manager');

      const returnedCategories = json.data.items.map((i: any) => i.category);
      expect(returnedCategories).toContain('financial');
      expect(returnedCategories).not.toContain('security');
    });

    it('grants full visibility to super_admin', async () => {
      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const returnedCategories = json.data.items.map((i: any) => i.category);
      expect(returnedCategories).toContain('financial');
      expect(returnedCategories).toContain('security');
      expect(returnedCategories).toContain('infrastructure');
      expect(returnedCategories).toContain('operations');
    });
  });

  // 2. Query Filtering
  describe('Query Parameters Filtering', () => {
    it('filters by category', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/action-center?category=operations'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.items.length).toBeGreaterThan(0);
      for (const item of json.data.items) {
        expect(item.category).toBe('operations');
      }
    });

    it('filters by priority', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/action-center?priority=critical'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      for (const item of json.data.items) {
        expect(item.priority).toBe('critical');
      }
    });

    it('filters by source type', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/action-center?source=anomaly'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      for (const item of json.data.items) {
        expect(item.sourceType).toBe('anomaly');
      }
    });
  });

  // 3. Sorting & Deterministic Prioritization
  describe('Sorting and Counts', () => {
    it('orders critical items before high and medium items', async () => {
      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      const priorities = json.data.items.map((i: any) => i.priority);
      const firstCriticalIndex = priorities.indexOf('critical');
      const firstMediumIndex = priorities.indexOf('medium');

      expect(firstCriticalIndex).toBeGreaterThanOrEqual(0);
      if (firstMediumIndex !== -1) {
        expect(firstCriticalIndex).toBeLessThan(firstMediumIndex);
      }
    });

    it('provides accurate summary counts', async () => {
      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(json.data.counts).toHaveProperty('total');
      expect(json.data.counts).toHaveProperty('critical');
      expect(json.data.counts).toHaveProperty('high');
      expect(json.data.counts).toHaveProperty('pending');
      expect(json.data.counts.total).toBe(json.data.items.length);
    });
  });

  // 4. Pagination
  describe('Pagination', () => {
    it('paginates results correctly with limit and page params', async () => {
      const req = new NextRequest(
        'http://localhost:3000/api/action-center?page=1&limit=2'
      );
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.data.items.length).toBe(2);
      expect(json.data.pagination.page).toBe(1);
      expect(json.data.pagination.limit).toBe(2);
      expect(json.data.pagination.hasMore).toBe(true);
    });
  });

  // 5. Graceful Degradation
  describe('Graceful Degradation', () => {
    it('recovers cleanly when audit_logs query fails', async () => {
      mockedCreateClient.mockReturnValue(
        buildMockSupabase({
          auditLogs: {
            data: null,
            error: { message: 'Database query timeout' },
          },
        })
      );

      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.degradedSources).toContain('audit_logs');
      // Other sources still returned
      expect(json.data.items.length).toBeGreaterThan(0);
    });

    it('recovers cleanly when ai_failure_diagnostics query fails', async () => {
      mockedCreateClient.mockReturnValue(
        buildMockSupabase({
          aiDiagnostics: {
            data: null,
            error: { message: 'relation does not exist' },
          },
        })
      );

      const req = new NextRequest('http://localhost:3000/api/action-center');
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.degradedSources).toContain('ai_failure_diagnostics');
      expect(json.data.items.length).toBeGreaterThan(0);
    });
  });
});
