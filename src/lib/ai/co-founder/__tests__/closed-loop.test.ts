jest.mock('server-only', () => ({}));

import {
  isValidLifecycleTransition,
  registerActionProposal,
  recordActionApproval,
  recordActionRejection,
  recordActionExecutionResult,
  measureAuthoritativeMetric,
  verifyActionOutcome,
  commitOutcomeLearning,
  scanAndVerifyDueActions,
  getActionLifecycle,
  getClosedLoopAnalytics,
  type TrackedClosedLoopAction,
  type MetricExpectation,
  type ActionLifecycleState,
} from '../closed-loop';
import { executeCoFounderTool } from '../tool-bridge';

// In-memory mock databases
const mockOutcomes: any[] = [];
const mockMemories: any[] = [];
const mockOrders: any[] = [];
const mockProducts: any[] = [];
const mockSupportTickets: any[] = [];

// Mock audit logger
jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(async () => {}),
}));

// Mock Supabase service client
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_outcomes') {
        return {
          insert: jest.fn((rows: any[]) => {
            const inserted = rows.map((r, i) => ({
              id:
                r.id ||
                `out_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 7)}`,
              ...r,
            }));
            mockOutcomes.push(...inserted);
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: inserted[0],
                  error: null,
                }),
              }),
            };
          }),
          select: jest.fn(function (this: any) {
            const filters: Record<string, any> = {};
            let limitVal: number | undefined;

            const chain: any = {
              eq: jest.fn((col: string, val: any) => {
                filters[col] = val;
                return chain;
              }),
              gte: jest.fn((col: string, val: any) => {
                filters[`${col}_gte`] = val;
                return chain;
              }),
              lte: jest.fn((col: string, val: any) => {
                filters[`${col}_lte`] = val;
                return chain;
              }),
              order: jest.fn(() => chain),
              limit: jest.fn((n: number) => {
                limitVal = n;
                return chain;
              }),
              maybeSingle: jest.fn(() => {
                const found = mockOutcomes.find((o) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (k.endsWith('_gte')) {
                      const field = k.replace('_gte', '');
                      if (o[field] < v) return false;
                    } else if (k.endsWith('_lte')) {
                      const field = k.replace('_lte', '');
                      if (o[field] > v) return false;
                    } else if (o[k] !== v) {
                      return false;
                    }
                  }
                  return true;
                });
                return Promise.resolve({ data: found || null, error: null });
              }),
              single: jest.fn(() => {
                const found = mockOutcomes.find((o) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (k.endsWith('_gte')) {
                      const field = k.replace('_gte', '');
                      if (o[field] < v) return false;
                    } else if (k.endsWith('_lte')) {
                      const field = k.replace('_lte', '');
                      if (o[field] > v) return false;
                    } else if (o[k] !== v) {
                      return false;
                    }
                  }
                  return true;
                });
                return Promise.resolve({
                  data: found || null,
                  error: found ? null : new Error('Not found'),
                });
              }),
              then: (resolve: any) => {
                let filtered = mockOutcomes.filter((o) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (k.endsWith('_gte')) {
                      const field = k.replace('_gte', '');
                      if (o[field] < v) return false;
                    } else if (k.endsWith('_lte')) {
                      const field = k.replace('_lte', '');
                      if (o[field] > v) return false;
                    } else if (o[k] !== v) {
                      return false;
                    }
                  }
                  return true;
                });
                if (limitVal) filtered = filtered.slice(0, limitVal);
                return resolve({ data: filtered, error: null });
              },
            };
            return chain;
          }),
          update: jest.fn((fields: any) => ({
            eq: jest.fn((col: string, val: any) => {
              const item = mockOutcomes.find((o) => o[col] === val);
              if (item) {
                Object.assign(item, fields);
              }
              return {
                select: jest.fn().mockReturnValue({
                  single: jest.fn().mockResolvedValue({
                    data: item || null,
                    error: item ? null : new Error('Not found'),
                  }),
                }),
              };
            }),
          })),
        };
      }

      if (table === 'co_founder_memories') {
        return {
          select: jest.fn(() => {
            const filters: Record<string, any> = {};
            const chain: any = {
              eq: jest.fn((col: string, val: any) => {
                filters[col] = val;
                return chain;
              }),
              maybeSingle: jest.fn(() => {
                const found = mockMemories.find((m) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (m[k] !== v) return false;
                  }
                  return true;
                });
                return Promise.resolve({ data: found || null, error: null });
              }),
            };
            return chain;
          }),
          insert: jest.fn((row: any) => {
            const item = {
              id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              ...row,
            };
            mockMemories.push(item);
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: { id: item.id },
                  error: null,
                }),
              }),
            };
          }),
          update: jest.fn(() => ({
            eq: jest.fn().mockResolvedValue({ error: null }),
          })),
        };
      }

      if (table === 'orders') {
        return {
          select: jest.fn(() => {
            const filters: Record<string, any> = {};
            const chain: any = {
              gte: jest.fn((col: string, val: any) => {
                filters[`${col}_gte`] = val;
                return chain;
              }),
              lte: jest.fn((col: string, val: any) => {
                filters[`${col}_lte`] = val;
                return chain;
              }),
              order: jest.fn(() => chain),
              then: (resolve: any) => {
                const filtered = mockOrders.filter((o) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (k.endsWith('_gte')) {
                      const field = k.replace('_gte', '');
                      if (o[field] < v) return false;
                    } else if (k.endsWith('_lte')) {
                      const field = k.replace('_lte', '');
                      if (o[field] > v) return false;
                    }
                  }
                  return true;
                });
                return resolve({ data: filtered, error: null });
              },
            };
            return chain;
          }),
        };
      }

      if (table === 'products') {
        return {
          select: jest.fn(() => {
            const filters: Record<string, any> = {};
            const chain: any = {
              eq: jest.fn((col: string, val: any) => {
                filters[col] = val;
                return chain;
              }),
              then: (resolve: any) => {
                const filtered = mockProducts.filter((p) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (p[k] !== v) return false;
                  }
                  return true;
                });
                return resolve({ data: filtered, error: null });
              },
            };
            return chain;
          }),
        };
      }

      if (table === 'support_tickets') {
        return {
          select: jest.fn(() => ({
            in: jest.fn((col: string, vals: any[]) => {
              const filtered = mockSupportTickets.filter((t) =>
                vals.includes(t[col])
              );
              return Promise.resolve({ data: filtered, error: null });
            }),
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

describe('Closed-Loop Operational Traceability Engine (Phase 3)', () => {
  beforeEach(() => {
    mockOutcomes.length = 0;
    mockMemories.length = 0;
    mockOrders.length = 0;
    mockProducts.length = 0;
    mockSupportTickets.length = 0;
  });

  describe('1. Lifecycle State Machine (isValidLifecycleTransition)', () => {
    it('allows valid forward state transitions', () => {
      expect(isValidLifecycleTransition('PROPOSED', 'APPROVED')).toBe(true);
      expect(isValidLifecycleTransition('PROPOSED', 'REJECTED')).toBe(true);
      expect(isValidLifecycleTransition('PROPOSED', 'EXECUTING')).toBe(true);
      expect(isValidLifecycleTransition('APPROVED', 'EXECUTING')).toBe(true);
      expect(
        isValidLifecycleTransition('EXECUTING', 'EXECUTION_SUCCEEDED')
      ).toBe(true);
      expect(isValidLifecycleTransition('EXECUTING', 'EXECUTION_FAILED')).toBe(
        true
      );
      expect(
        isValidLifecycleTransition('EXECUTION_SUCCEEDED', 'OUTCOME_EXPECTED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('EXECUTION_SUCCEEDED', 'OUTCOME_VERIFIED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_EXPECTED', 'OUTCOME_ACHIEVED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_EXPECTED', 'OUTCOME_REGRESSED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_EXPECTED', 'OUTCOME_CONFLICTED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_ACHIEVED', 'OUTCOME_VERIFIED')
      ).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_REGRESSED', 'OUTCOME_VERIFIED')
      ).toBe(true);
    });

    it('allows same-state self transitions', () => {
      expect(isValidLifecycleTransition('PROPOSED', 'PROPOSED')).toBe(true);
      expect(
        isValidLifecycleTransition('OUTCOME_EXPECTED', 'OUTCOME_EXPECTED')
      ).toBe(true);
    });

    it('rejects invalid or illegal transitions', () => {
      expect(isValidLifecycleTransition('PROPOSED', 'OUTCOME_ACHIEVED')).toBe(
        false
      );
      expect(isValidLifecycleTransition('EXECUTING', 'OUTCOME_VERIFIED')).toBe(
        false
      );
      expect(isValidLifecycleTransition('OUTCOME_VERIFIED', 'EXECUTING')).toBe(
        false
      );
      expect(isValidLifecycleTransition('OUTCOME_VERIFIED', 'PROPOSED')).toBe(
        false
      );
    });
  });

  describe('2. Proposal Registration (registerActionProposal)', () => {
    it('registers an action proposal with expected metrics and pending status', async () => {
      const expectation: MetricExpectation = {
        metricKey: 'order_revenue',
        baselineValue: 50000,
        targetValue: 75000,
        unit: 'INR',
        direction: 'increase',
        measurementWindowDays: 14,
        toleranceThresholdPercent: 20,
      };

      const tracked = await registerActionProposal({
        actionType: 'create_festive_campaign',
        description: 'Launch Diwali festive discount campaign',
        expectedOutcome: 'Increase festive sales by 50% within 14 days',
        metricExpectation: expectation,
        actionId: 'act_diwali_101',
        approvalId: 'e8b0a1d4-2e91-4c22-8b63-0f7e9142b581',
        userId: 'founder_ash',
      });

      expect(tracked.id).toBeDefined();
      expect(tracked.actionType).toBe('create_festive_campaign');
      expect(tracked.lifecycleState).toBe('PROPOSED');
      expect(tracked.verificationStatus).toBe('pending');
      expect(tracked.metricExpectation?.metricKey).toBe('order_revenue');
      expect(tracked.metricExpectation?.targetValue).toBe(75000);
      expect(tracked.measurementWindowEnd).toBeDefined();

      // Ensure window end is roughly 14 days in future
      const windowEnd = new Date(tracked.measurementWindowEnd!);
      const now = new Date();
      const diffDays = Math.round(
        (windowEnd.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
      );
      expect(diffDays).toBe(14);
      expect(mockOutcomes.length).toBe(1);
    });
  });

  describe('3. Action Approval & Rejection Hooks', () => {
    it('transitions proposal to APPROVED on founder approval', async () => {
      const registered = await registerActionProposal({
        actionType: 'restock_inventory',
        expectedOutcome: 'Replenish low stock items',
        actionId: 'act_stock_99',
        userId: 'founder_ash',
      });

      const approved = await recordActionApproval(registered.id, 'founder_ash');
      expect(approved.lifecycleState).toBe('APPROVED');
      expect(approved.evidence?.approvedBy).toBe('founder_ash');
    });

    it('transitions proposal to REJECTED with reason and unverified status', async () => {
      const registered = await registerActionProposal({
        actionType: 'discount_premium_products',
        expectedOutcome: 'Discount silk collection by 30%',
        actionId: 'act_discount_88',
        userId: 'system',
      });

      const rejected = await recordActionRejection(
        registered.id,
        'Brand policy forbids discounting premium silk collections.',
        'founder_ash'
      );

      expect(rejected.lifecycleState).toBe('REJECTED');
      expect(rejected.verificationStatus).toBe('unverified');
      expect(rejected.actualOutcome).toContain(
        'Brand policy forbids discounting'
      );
    });

    it('throws error when approving an action with illegal transition', async () => {
      mockOutcomes.push({
        id: 'out_executed_1',
        entity_id: 'act_executed_1',
        verification_status: 'verified',
        evidence: {
          lifecycleState: 'OUTCOME_VERIFIED' as ActionLifecycleState,
        },
      });

      await expect(
        recordActionApproval('out_executed_1', 'founder_ash')
      ).rejects.toThrow(/Invalid lifecycle transition/);
    });
  });

  describe('4. Execution Result Recording (Execution Success != Business Success)', () => {
    it('records execution failure and sets state to EXECUTION_FAILED and unverified', async () => {
      const registered = await registerActionProposal({
        actionType: 'send_whatsapp_broadcast',
        expectedOutcome: 'Send recovery broadcast to 500 cart abandoners',
        actionId: 'act_wa_failed',
      });

      const failed = await recordActionExecutionResult({
        actionId: 'act_wa_failed',
        success: false,
        error: 'WhatsApp Gateway API rate limit exceeded (HTTP 429)',
      });

      expect(failed.lifecycleState).toBe('EXECUTION_FAILED');
      expect(failed.verificationStatus).toBe('unverified');
      expect(failed.actualOutcome).toContain(
        'WhatsApp Gateway API rate limit exceeded'
      );
    });

    it('STRICT CLOSED-LOOP: execution success with metric expectation transitions to OUTCOME_EXPECTED (pending verification)', async () => {
      const registered = await registerActionProposal({
        actionType: 'launch_referral_bonus',
        expectedOutcome: 'Gain 25 new customer referrals in 7 days',
        metricExpectation: {
          metricKey: 'order_count',
          baselineValue: 10,
          targetValue: 35,
          direction: 'increase',
          measurementWindowDays: 7,
        },
        actionId: 'act_referral_77',
      });

      // Business mutation executed successfully (200 OK)
      const executionResult = await recordActionExecutionResult({
        actionId: 'act_referral_77',
        success: true,
        resultData: { referralCodesCreated: 100 },
      });

      // Core rule test: Execution success DOES NOT mark business outcome achieved!
      expect(executionResult.lifecycleState).toBe('OUTCOME_EXPECTED');
      expect(executionResult.verificationStatus).toBe('pending');
      expect(executionResult.actualOutcome).toContain(
        'Business metric progression pending measurement window (7d)'
      );
    });

    it('operational action with NO metric expectation transitions directly to OUTCOME_VERIFIED', async () => {
      const registered = await registerActionProposal({
        actionType: 'clear_app_cache',
        expectedOutcome: 'Clear server-side cache',
        actionId: 'act_clear_cache',
      });

      const res = await recordActionExecutionResult({
        actionId: 'act_clear_cache',
        success: true,
      });

      expect(res.lifecycleState).toBe('OUTCOME_VERIFIED');
      expect(res.verificationStatus).toBe('verified');
      expect(res.actualOutcome).toContain('Operational state verified');
    });

    it('initializes just-in-time tracked action if no prior proposal was registered', async () => {
      const res = await recordActionExecutionResult({
        actionId: 'act_unregistered_jit',
        actionType: 'sync_third_party_catalog',
        success: true,
        resultData: { syncedCount: 42 },
      });

      expect(res.actionId).toBe('act_unregistered_jit');
      expect(res.lifecycleState).toBe('OUTCOME_VERIFIED');
      expect(res.verificationStatus).toBe('verified');
      expect(mockOutcomes.length).toBe(1);
    });
  });

  describe('5. Authoritative Database Metric Measurement (measureAuthoritativeMetric)', () => {
    it('measures order_revenue by summing valid non-cancelled orders', async () => {
      mockOrders.push(
        {
          id: 'o1',
          total: 1500,
          status: 'completed',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: 'o2',
          total: 2500,
          status: 'delivered',
          created_at: '2026-10-02T10:00:00Z',
        },
        {
          id: 'o3',
          total: 1000,
          status: 'cancelled',
          created_at: '2026-10-03T10:00:00Z',
        }, // Excluded!
        {
          id: 'o4',
          total: 500,
          status: 'refunded',
          created_at: '2026-10-04T10:00:00Z',
        } // Excluded!
      );

      const m = await measureAuthoritativeMetric('order_revenue');
      expect(m.sourceTable).toBe('orders');
      expect(m.currentValue).toBe(4000); // 1500 + 2500
      expect(m.details.validOrdersCount).toBe(2);
    });

    it('measures order_count excluding cancelled and failed orders', async () => {
      mockOrders.push(
        { id: 'o1', status: 'completed', created_at: '2026-10-01T10:00:00Z' },
        { id: 'o2', status: 'processing', created_at: '2026-10-02T10:00:00Z' },
        { id: 'o3', status: 'failed', created_at: '2026-10-03T10:00:00Z' }
      );

      const m = await measureAuthoritativeMetric('order_count');
      expect(m.sourceTable).toBe('orders');
      expect(m.currentValue).toBe(2);
    });

    it('measures inventory_stock by summing stock_quantity from products', async () => {
      mockProducts.push(
        { id: 'p1', name: 'Banarasi Saree', stock_quantity: 12 },
        { id: 'p2', name: 'Kanjivaram Saree', stock_quantity: 8 }
      );

      const m = await measureAuthoritativeMetric('inventory_stock');
      expect(m.sourceTable).toBe('products');
      expect(m.currentValue).toBe(20);
    });

    it('measures support_ticket_count from support_tickets table', async () => {
      mockSupportTickets.push(
        { id: 't1', status: 'open' },
        { id: 't2', status: 'in_progress' },
        { id: 't3', status: 'resolved' } // Excluded!
      );

      const m = await measureAuthoritativeMetric('support_ticket_count');
      expect(m.sourceTable).toBe('support_tickets');
      expect(m.currentValue).toBe(2);
    });
  });

  describe('6. Truthful Outcome Verification (verifyActionOutcome)', () => {
    it('REFUSES FALSE SUCCESS when measurement window is active and forceImmediate is false', async () => {
      const futureWindow = new Date(
        Date.now() + 5 * 24 * 60 * 60 * 1000
      ).toISOString(); // 5 days in future

      mockOutcomes.push({
        id: 'out_active_window',
        entity_id: 'act_active_window',
        verification_status: 'pending',
        measurement_window_end: futureWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          metricExpectation: {
            metricKey: 'order_revenue',
            baselineValue: 10000,
            targetValue: 20000,
            direction: 'increase',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date().toISOString(),
      });

      const res = await verifyActionOutcome('out_active_window');

      // Strict verification guard: False success refused!
      expect(res.verified).toBe(false);
      expect(res.state).toBe('OUTCOME_EXPECTED');
      expect(res.reason).toContain('Measurement window is active');
      expect(res.reason).toContain(
        'Execution success does not equal business success'
      );
    });

    it('verifies OUTCOME_ACHIEVED when target is reached after measurement window expires', async () => {
      const pastWindow = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // Expired 1h ago

      mockOutcomes.push({
        id: 'out_target_hit',
        entity_id: 'act_target_hit',
        verification_status: 'pending',
        measurement_window_end: pastWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          actionType: 'festive_discount',
          metricExpectation: {
            metricKey: 'order_revenue',
            baselineValue: 20000,
            targetValue: 30000,
            unit: 'INR',
            direction: 'increase',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Authoritative DB has 35,000 INR revenue (target: 30,000)
      mockOrders.push({
        id: 'o1',
        total: 35000,
        status: 'completed',
        created_at: pastWindow,
      });

      const res = await verifyActionOutcome('out_target_hit');

      expect(res.verified).toBe(true);
      expect(res.state).toBe('OUTCOME_ACHIEVED');
      expect(res.currentValue).toBe(35000);
      expect(res.reason).toContain('Target reached or exceeded');
      // Memory learning auto-committed
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('decision');
      expect(mockMemories[0].value).toContain(
        'Verified success for festive_discount'
      );
    });

    it('detects OUTCOME_REGRESSED when metric worsens below baseline', async () => {
      const pastWindow = new Date(Date.now() - 1000 * 60).toISOString();

      mockOutcomes.push({
        id: 'out_regressed_case',
        entity_id: 'act_regressed_case',
        verification_status: 'pending',
        measurement_window_end: pastWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          actionType: 'price_increase_test',
          metricExpectation: {
            metricKey: 'order_revenue',
            baselineValue: 50000,
            targetValue: 65000,
            direction: 'increase',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Revenue only reached 30,000 (declined below baseline 50,000!)
      mockOrders.push({
        id: 'o1',
        total: 30000,
        status: 'completed',
        created_at: pastWindow,
      });

      const res = await verifyActionOutcome('out_regressed_case');

      expect(res.verified).toBe(false);
      expect(res.state).toBe('OUTCOME_REGRESSED');
      expect(res.reason).toContain('Business regression detected');
      // Auto-committed correction warning
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('correction');
      expect(mockMemories[0].value).toContain('Performance regression warning');
    });

    it('detects OUTCOME_CONFLICTED when shortfall exceeds 25% tolerance threshold', async () => {
      const pastWindow = new Date(Date.now() - 1000 * 60).toISOString();

      mockOutcomes.push({
        id: 'out_conflicted_case',
        entity_id: 'act_conflicted_case',
        verification_status: 'pending',
        measurement_window_end: pastWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          actionType: 'influencer_campaign',
          metricExpectation: {
            metricKey: 'order_revenue',
            baselineValue: 10000,
            targetValue: 50000, // Expected +40,000 gain
            direction: 'increase',
            measurementWindowDays: 7,
            toleranceThresholdPercent: 25,
          },
        },
        created_at: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Revenue reached 20,000 (actual gain 10,000 vs required 40,000 => 75% shortfall > 25% tolerance)
      mockOrders.push({
        id: 'o1',
        total: 20000,
        status: 'completed',
        created_at: pastWindow,
      });

      const res = await verifyActionOutcome('out_conflicted_case');

      expect(res.verified).toBe(false);
      expect(res.state).toBe('OUTCOME_CONFLICTED');
      expect(res.reason).toContain('Shortfall exceeds 25% tolerance threshold');
      expect(res.shortfallPercentage).toBe(75);
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('operational_rule');
      expect(mockMemories[0].value).toContain(
        'Outcome conflicted for influencer_campaign'
      );
    });

    it('evaluates direction = "decrease" metrics (e.g. reducing open support tickets)', async () => {
      const pastWindow = new Date(Date.now() - 1000 * 60).toISOString();

      mockOutcomes.push({
        id: 'out_reduce_tickets',
        entity_id: 'act_reduce_tickets',
        verification_status: 'pending',
        measurement_window_end: pastWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          actionType: 'faq_bot_deployment',
          metricExpectation: {
            metricKey: 'support_ticket_count',
            baselineValue: 20,
            targetValue: 5,
            direction: 'decrease',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date(
          Date.now() - 8 * 24 * 60 * 60 * 1000
        ).toISOString(),
      });

      // Support tickets reduced to 3 (target was <= 5)
      mockSupportTickets.push(
        { id: 't1', status: 'open' },
        { id: 't2', status: 'open' },
        { id: 't3', status: 'in_progress' }
      );

      const res = await verifyActionOutcome('out_reduce_tickets');

      expect(res.verified).toBe(true);
      expect(res.state).toBe('OUTCOME_ACHIEVED');
      expect(res.reason).toContain('Target reduction achieved');
    });

    it('forces immediate verification override when forceImmediate is true', async () => {
      const futureWindow = new Date(
        Date.now() + 7 * 24 * 60 * 60 * 1000
      ).toISOString();

      mockOutcomes.push({
        id: 'out_forced_verify',
        entity_id: 'act_forced_verify',
        verification_status: 'pending',
        measurement_window_end: futureWindow,
        evidence: {
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          actionType: 'flash_sale',
          metricExpectation: {
            metricKey: 'order_count',
            baselineValue: 5,
            targetValue: 10,
            direction: 'increase',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date().toISOString(),
      });

      mockOrders.push(
        { id: 'o1', status: 'completed' },
        { id: 'o2', status: 'completed' },
        { id: 'o3', status: 'completed' },
        { id: 'o4', status: 'completed' },
        { id: 'o5', status: 'completed' },
        { id: 'o6', status: 'completed' },
        { id: 'o7', status: 'completed' },
        { id: 'o8', status: 'completed' },
        { id: 'o9', status: 'completed' },
        { id: 'o10', status: 'completed' },
        { id: 'o11', status: 'completed' }
      );

      const res = await verifyActionOutcome('out_forced_verify', {
        forceImmediate: true,
      });

      expect(res.verified).toBe(true);
      expect(res.state).toBe('OUTCOME_ACHIEVED');
      expect(res.currentValue).toBe(11);
    });
  });

  describe('7. Continuous Organizational Learning Loop (commitOutcomeLearning)', () => {
    it('commits verified success to decision memory', async () => {
      const action: TrackedClosedLoopAction = {
        id: 'out_learn_1',
        actionType: 'cart_abandonment_sms',
        lifecycleState: 'OUTCOME_ACHIEVED',
        actualOutcome: 'Recovered 15 abandoned carts (INR 45,000)',
        verificationStatus: 'verified',
        userId: 'founder_ash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await commitOutcomeLearning(action);
      expect(res.success).toBe(true);
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('decision');
      expect(mockMemories[0].confidence).toBe(0.98);
      expect(mockMemories[0].value).toContain('cart_abandonment_sms');
    });

    it('commits performance regression warning to correction memory', async () => {
      const action: TrackedClosedLoopAction = {
        id: 'out_learn_2',
        actionType: 'checkout_step_reorder',
        lifecycleState: 'OUTCOME_REGRESSED',
        actualOutcome: 'Conversion dropped from 2.8% to 1.9%',
        verificationStatus: 'unverified',
        userId: 'founder_ash',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const res = await commitOutcomeLearning(action);
      expect(res.success).toBe(true);
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('correction');
      expect(mockMemories[0].confidence).toBe(0.92);
      expect(mockMemories[0].value).toContain('Performance regression warning');
    });
  });

  describe('8. Batch Scanner for Due Actions (scanAndVerifyDueActions)', () => {
    it('scans and processes multiple expired action outcomes in batch', async () => {
      const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

      mockOutcomes.push(
        {
          id: 'due_1',
          entity_id: 'act_due_1',
          verification_status: 'pending',
          measurement_window_end: pastDate,
          evidence: {
            lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
            actionType: 'batch_item_1',
            metricExpectation: {
              metricKey: 'order_count',
              baselineValue: 5,
              targetValue: 10,
              direction: 'increase',
              measurementWindowDays: 7,
            },
          },
          created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        },
        {
          id: 'due_2',
          entity_id: 'act_due_2',
          verification_status: 'pending',
          measurement_window_end: pastDate,
          evidence: {
            lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
            actionType: 'batch_item_2',
            // No metric expectation -> operational confirmation
          },
          created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
        }
      );

      // 12 orders placed -> due_1 achieved
      for (let i = 0; i < 12; i++) {
        mockOrders.push({ id: `o_${i}`, status: 'completed' });
      }

      const scanResult = await scanAndVerifyDueActions();

      expect(scanResult.scannedCount).toBe(2);
      expect(scanResult.verifiedCount).toBe(2);
      expect(scanResult.regressedCount).toBe(0);
      expect(scanResult.conflictedCount).toBe(0);
    });

    it('returns zeroes gracefully when no outcomes are due', async () => {
      const scanResult = await scanAndVerifyDueActions();
      expect(scanResult.scannedCount).toBe(0);
      expect(scanResult.verifiedCount).toBe(0);
    });
  });

  describe('9. Status Lookups & Closed-Loop Analytics', () => {
    it('retrieves lifecycle state by entity ID or action ID', async () => {
      mockOutcomes.push({
        id: 'out_lookup_test',
        entity_id: 'act_lookup_123',
        verification_status: 'pending',
        evidence: {
          actionId: 'act_lookup_123',
          actionType: 'inventory_rebalance',
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const found = await getActionLifecycle('act_lookup_123');
      expect(found).not.toBeNull();
      expect(found?.actionId).toBe('act_lookup_123');
      expect(found?.lifecycleState).toBe('OUTCOME_EXPECTED');
    });

    it('computes quantitative KPIs and crisp executive voice summary', async () => {
      const now = new Date().toISOString();
      mockOutcomes.push(
        {
          id: '1',
          evidence: {
            lifecycleState: 'OUTCOME_ACHIEVED' as ActionLifecycleState,
          },
          created_at: now,
        },
        {
          id: '2',
          evidence: {
            lifecycleState: 'OUTCOME_VERIFIED' as ActionLifecycleState,
          },
          created_at: now,
        },
        {
          id: '3',
          evidence: {
            lifecycleState: 'OUTCOME_REGRESSED' as ActionLifecycleState,
          },
          created_at: now,
        },
        {
          id: '4',
          evidence: {
            lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
          },
          created_at: now,
        }
      );

      const analytics = await getClosedLoopAnalytics(30);

      expect(analytics.totalTracked).toBe(4);
      expect(analytics.verifiedRate).toBe(50); // 2 out of 4 verified = 50%
      expect(analytics.regressionCount).toBe(1);
      expect(analytics.pendingCount).toBe(1);
      expect(analytics.executiveSummary).toContain(
        'Over the past 30 days, 4 closed-loop actions'
      );
      expect(analytics.executiveSummary).toContain('50% success rate');
      expect(analytics.executiveSummary).toContain(
        '1 regressions were identified'
      );
    });
  });

  describe('10. Tool Bridge Integration for Closed-Loop Tools', () => {
    it('executes verify_action_outcome via tool bridge with permission', async () => {
      mockOutcomes.push({
        id: 'out_bridge_1',
        entity_id: 'act_bridge_1',
        verification_status: 'pending',
        measurement_window_end: new Date(
          Date.now() - 3600 * 1000
        ).toISOString(),
        evidence: {
          actionId: 'act_bridge_1',
          actionType: 'restock_bangles',
          metricExpectation: {
            metricKey: 'inventory_stock',
            baselineValue: 5,
            targetValue: 20,
            direction: 'increase',
            measurementWindowDays: 7,
          },
        },
        created_at: new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString(),
      });

      mockProducts.push({
        id: 'p_bangles',
        name: 'Gold Bangles',
        stock_quantity: 25,
      });

      const res = await executeCoFounderTool(
        'verify_action_outcome',
        { action_id: 'act_bridge_1' },
        ['analytics:write']
      );

      expect(res.success).toBe(true);
      expect(res.summaryForVoice).toContain('Target reached or exceeded');
      expect(res.data.state).toBe('OUTCOME_ACHIEVED');
    });

    it('blocks verify_action_outcome when user lacks write permission', async () => {
      const res = await executeCoFounderTool(
        'verify_action_outcome',
        { action_id: 'act_bridge_1' },
        ['orders:read'] // Missing analytics:write or admin:full
      );

      expect(res.success).toBe(false);
      expect(res.summaryForVoice).toContain('permission');
    });

    it('executes get_action_lifecycle_status via tool bridge', async () => {
      mockOutcomes.push({
        id: 'out_bridge_2',
        entity_id: 'act_bridge_2',
        verification_status: 'pending',
        evidence: {
          actionId: 'act_bridge_2',
          lifecycleState: 'OUTCOME_EXPECTED' as ActionLifecycleState,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const res = await executeCoFounderTool(
        'get_action_lifecycle_status',
        { action_id: 'act_bridge_2' },
        ['analytics:read']
      );

      expect(res.success).toBe(true);
      expect(res.data.lifecycleState).toBe('OUTCOME_EXPECTED');
      expect(res.summaryForVoice).toContain(
        'Action act_bridge_2 is in OUTCOME_EXPECTED state'
      );
    });

    it('executes get_closed_loop_analytics via tool bridge', async () => {
      mockOutcomes.push({
        id: 'out_bridge_3',
        evidence: {
          lifecycleState: 'OUTCOME_ACHIEVED' as ActionLifecycleState,
        },
        created_at: new Date().toISOString(),
      });

      const res = await executeCoFounderTool(
        'get_closed_loop_analytics',
        { days: 30 },
        ['analytics:read']
      );

      expect(res.success).toBe(true);
      expect(res.data.totalTracked).toBe(1);
      expect(res.summaryForVoice).toContain('Over the past 30 days');
    });
  });
});
