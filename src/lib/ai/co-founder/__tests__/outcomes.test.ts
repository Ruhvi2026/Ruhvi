jest.mock('server-only', () => ({}));

import {
  recordOutcomeEvent,
  recordUserFeedback,
  verifyDelayedOutcome,
  getOutcomeAnalytics,
} from '../outcomes';
import { executeCoFounderTool } from '../tool-bridge';

const mockOutcomes: any[] = [];
const mockMemories: any[] = [];

// Mock audit
jest.mock('@/lib/audit', () => ({
  logAuditEvent: jest.fn(async () => {}),
}));

// Mock Supabase
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_outcomes') {
        return {
          insert: jest.fn(function (rows: any[]) {
            const inserted = rows.map((r, i) => ({
              id: r.id || `out_${Date.now()}_${i}`,
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
            this._filters = this._filters || {};
            return {
              eq: jest.fn(function (this: any, col: string, val: any) {
                this._filters = this._filters || {};
                this._filters[col] = val;
                return this;
              }),
              gte: jest.fn(function (this: any, col: string, val: any) {
                this._filters = this._filters || {};
                this._filters[`${col}_gte`] = val;
                const filtered = mockOutcomes.filter((o) => o[col] >= val);
                return Promise.resolve({ data: filtered, error: null });
              }),
              single: jest.fn(function (this: any) {
                const found = mockOutcomes.find((o) => {
                  if (this._filters?.id && o.id !== this._filters.id)
                    return false;
                  return true;
                });
                return Promise.resolve({
                  data: found || null,
                  error: found ? null : new Error('Not found'),
                });
              }),
            };
          }),
          update: jest.fn(function (this: any, fields: any) {
            return {
              eq: jest.fn((col: string, val: any) => {
                const item = mockOutcomes.find((o) => o[col] === val);
                if (item) Object.assign(item, fields);
                return {
                  select: jest.fn().mockReturnValue({
                    single: jest.fn().mockResolvedValue({
                      data: item,
                      error: null,
                    }),
                  }),
                };
              }),
            };
          }),
        };
      }

      if (table === 'co_founder_memories') {
        return {
          insert: jest.fn(function (rows: any[]) {
            mockMemories.push(...rows);
            return Promise.resolve({ data: rows, error: null });
          }),
        };
      }

      return {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  })),
}));

describe('Stage 10 — Outcome Tracking & Learning Loop Engine', () => {
  beforeEach(() => {
    mockOutcomes.length = 0;
    mockMemories.length = 0;
  });

  describe('recordOutcomeEvent (Phases 3, 4, 5, 7)', () => {
    it('records recommendation rejection with strategy adjustment and confidence penalty', async () => {
      const outcome = await recordOutcomeEvent({
        recommendationId: 'rec_101',
        entityType: 'recommendation',
        entityId: 'rec_101',
        eventType: 'recommendation_rejected',
        expectedOutcome: 'Boost conversion by 12%',
        userId: 'founder_1',
      });

      expect(outcome.id).toBeDefined();
      expect(outcome.event_type).toBe('recommendation_rejected');
      expect(outcome.learning_signal?.strategyAdjustment).toBe(
        'reduce_frequency'
      );
      expect(outcome.learning_signal?.confidencePenalty).toBe(0.15);
      expect(mockOutcomes.length).toBe(1);
    });

    it('records recommendation acceptance with strategy reinforcement', async () => {
      const outcome = await recordOutcomeEvent({
        recommendationId: 'rec_102',
        entityType: 'recommendation',
        entityId: 'rec_102',
        eventType: 'recommendation_accepted',
        expectedOutcome: 'Restock 50 units before weekend flash sale',
        userId: 'founder_1',
      });

      expect(outcome.learning_signal?.strategyReinforcement).toBe(
        'prioritize_similar'
      );
      expect(outcome.learning_signal?.confidenceBoost).toBe(0.05);
    });

    it('preserves strict separation between execution success and business outcome', async () => {
      const actionOutcome = await recordOutcomeEvent({
        actionId: 'act_201',
        entityType: 'action',
        entityId: 'act_201',
        eventType: 'action_executed',
        expectedOutcome: 'Send email blast with 20% discount code',
        actualOutcome: 'Email delivery succeeded to 1,200 contacts',
        verificationStatus: 'pending', // Downstream conversion is still pending!
        userId: 'founder_1',
      });

      expect(actionOutcome.verification_status).toBe('pending');
      expect(actionOutcome.actual_outcome).toContain(
        'Email delivery succeeded'
      );
      expect(actionOutcome.expected_outcome).toContain('Send email blast');
    });
  });

  describe('recordUserFeedback & Corrections (Phases 9, 12, 17)', () => {
    it('records founder correction as unverified and saves to persistent memory', async () => {
      const res = await recordUserFeedback({
        entityType: 'recommendation',
        entityId: 'rec_205',
        feedbackText: 'Do not discount silk sarees under any circumstance.',
        feedbackType: 'correction',
        updateMemory: true,
        userId: 'founder_1',
      });

      expect(res.outcome.event_type).toBe('user_correction');
      expect(res.outcome.verification_status).toBe('unverified');
      expect(res.voiceSummary).toContain('I have noted your correction');
      expect(mockMemories.length).toBe(1);
      expect(mockMemories[0].category).toBe('founder_preference');
      expect(mockMemories[0].content).toContain('Do not discount silk sarees');
    });

    it('records positive founder praise without corrupting business ground truth', async () => {
      const res = await recordUserFeedback({
        entityType: 'action',
        entityId: 'act_300',
        feedbackText: 'Great inventory suggestion, order arrived on time.',
        feedbackType: 'positive',
        userId: 'founder_1',
      });

      expect(res.outcome.event_type).toBe('user_feedback');
      expect(res.outcome.feedback_sentiment).toBe('positive');
      expect(res.voiceSummary).toContain('Thank you for the feedback');
    });
  });

  describe('verifyDelayedOutcome (Phases 6, 7, 8)', () => {
    it('verifies outcome when measured data matches expected targets', async () => {
      mockOutcomes.push({
        id: 'out_delayed_1',
        entity_type: 'action',
        expected_outcome: 'Generate 50 orders',
        verification_status: 'pending',
        evidence: {},
      });

      const verified = await verifyDelayedOutcome('out_delayed_1', {
        metricName: 'orders',
        expectedValue: 50,
        measuredValue: 54,
      });

      expect(verified.verification_status).toBe('verified');
      expect(verified.verification_source).toBe('authoritative_db');
      expect(verified.evidence?.measuredData.measuredValue).toBe(54);
    });

    it('marks outcome conflicted when measured data significantly underperforms expectations', async () => {
      mockOutcomes.push({
        id: 'out_delayed_2',
        entity_type: 'action',
        expected_outcome: 'Generate 100 orders',
        verification_status: 'pending',
        evidence: {},
      });

      const conflicted = await verifyDelayedOutcome('out_delayed_2', {
        metricName: 'orders',
        expectedValue: 100,
        measuredValue: 30, // 70% shortfall
      });

      expect(conflicted.verification_status).toBe('conflicted');
    });
  });

  describe('getOutcomeAnalytics (Phase 20)', () => {
    it('computes acceptance rates, verified results, and voice summary', async () => {
      const now = new Date().toISOString();
      mockOutcomes.push(
        {
          id: '1',
          event_type: 'recommendation_accepted',
          verification_status: 'verified',
          learning_signal: { boost: true },
          created_at: now,
        },
        {
          id: '2',
          event_type: 'recommendation_accepted',
          verification_status: 'verified',
          learning_signal: { boost: true },
          created_at: now,
        },
        {
          id: '3',
          event_type: 'recommendation_rejected',
          verification_status: 'pending',
          learning_signal: { penalty: true },
          created_at: now,
        },
        {
          id: '4',
          event_type: 'action_executed',
          verification_status: 'conflicted',
          learning_signal: {},
          created_at: now,
        }
      );

      const stats = await getOutcomeAnalytics(30);
      expect(stats.totalOutcomesTracked).toBe(4);
      expect(stats.acceptanceRate).toBe(67); // 2 out of 3 = 67%
      expect(stats.rejectionRate).toBe(33); // 1 out of 3 = 33%
      expect(stats.conflictedOutcomes).toBe(1);
      expect(stats.executiveVoiceSummary).toContain('Over the last 30 days');
      expect(stats.executiveVoiceSummary).toContain('67 percent');
      expect(stats.executiveVoiceSummary).toContain(
        '1 outcome has conflicting data'
      );
    });
  });

  describe('Tool Bridge Integration (Phases 21, 22)', () => {
    it('executes record_outcome_feedback via tool bridge with permission', async () => {
      const res = await executeCoFounderTool(
        'record_outcome_feedback',
        {
          feedback_text:
            'The coupon strategy increased festive cart completions.',
          feedback_type: 'positive',
          entity_type: 'recommendation',
        },
        ['analytics:write']
      );

      expect(res.success).toBe(true);
      expect(res.summaryForVoice).toContain('Thank you for the feedback');
      expect(mockOutcomes.length).toBe(1);
    });

    it('blocks record_outcome_feedback when write permission is missing', async () => {
      const blocked = await executeCoFounderTool(
        'record_outcome_feedback',
        { feedback_text: 'Test without scope' },
        ['analytics:read']
      );

      expect(blocked.success).toBe(false);
      expect(blocked.error).toContain('Forbidden');
    });

    it('executes get_outcome_analytics via tool bridge with read scope', async () => {
      const res = await executeCoFounderTool(
        'get_outcome_analytics',
        { days: 14 },
        ['analytics:read']
      );

      expect(res.success).toBe(true);
      expect(res.summaryForVoice).toBeDefined();
    });
  });
});
