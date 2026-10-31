jest.mock('server-only', () => ({}));

import {
  getRelevantMemories,
  writeCoFounderMemory,
  correctCoFounderMemory,
  deleteCoFounderMemory,
  purgeUserMemories,
  containsCustomerPii,
} from '../memory';
import {
  searchSemanticMemories,
  storeMemoryWithContradictionCheck,
  synthesizePrioritizedMemoryContext,
  type ScoredMemory,
} from '../memory-engine';

// Mock Supabase service client
const mockMemoriesTable: any[] = [];

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((tableName: string) => {
      if (tableName !== 'co_founder_memories') {
        throw new Error(`Unexpected table ${tableName}`);
      }

      let activeFilter: boolean | undefined = undefined;
      let userFilter: string | undefined = undefined;
      let categoryFilter: string | undefined = undefined;
      let keyFilter: string | undefined = undefined;
      let idFilter: string | undefined = undefined;
      let limitCount = 50;

      const queryBuilder: any = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((col: string, val: any) => {
          if (col === 'is_active') activeFilter = val;
          if (col === 'user_id') userFilter = val;
          if (col === 'category') categoryFilter = val;
          if (col === 'key') keyFilter = val;
          if (col === 'id') idFilter = val;
          return queryBuilder;
        }),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn((l: number) => {
          limitCount = l;
          return queryBuilder;
        }),
        maybeSingle: jest.fn(async () => {
          const match = mockMemoriesTable.find(
            (m) =>
              (activeFilter === undefined || m.is_active === activeFilter) &&
              (!userFilter || m.user_id === userFilter) &&
              (!keyFilter || m.key === keyFilter) &&
              (!idFilter || m.id === idFilter)
          );
          return { data: match || null, error: null };
        }),
        single: jest.fn(async () => {
          const match = mockMemoriesTable.find(
            (m) =>
              (activeFilter === undefined || m.is_active === activeFilter) &&
              (!userFilter || m.user_id === userFilter) &&
              (!keyFilter || m.key === keyFilter) &&
              (!idFilter || m.id === idFilter)
          );
          return {
            data: match || null,
            error: match ? null : new Error('Not found'),
          };
        }),
        insert: jest.fn((record: any) => {
          const newRecord = {
            id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...record,
          };
          mockMemoriesTable.push(newRecord);
          return {
            select: jest.fn().mockReturnValue({
              single: jest.fn(async () => ({ data: newRecord, error: null })),
            }),
          };
        }),
        update: jest.fn((updates: any) => {
          const filterCriteria: Record<string, any> = {};
          const updateBuilder: any = {
            eq: jest.fn((col: string, val: any) => {
              filterCriteria[col] = val;
              return updateBuilder;
            }),
            select: jest.fn((_cols?: string) => {
              const updatedRows: any[] = [];
              mockMemoriesTable.forEach((m) => {
                const matches = Object.entries(filterCriteria).every(
                  ([k, v]) => m[k] === v
                );
                if (matches) {
                  Object.assign(m, updates);
                  updatedRows.push(m);
                }
              });
              return Promise.resolve({ data: updatedRows, error: null });
            }),
            then: (resolve: any) => {
              let updated = 0;
              mockMemoriesTable.forEach((m) => {
                const matches = Object.entries(filterCriteria).every(
                  ([k, v]) => m[k] === v
                );
                if (matches) {
                  Object.assign(m, updates);
                  updated++;
                }
              });
              resolve({ data: updated, error: null });
            },
          };
          return updateBuilder;
        }),
        then: (resolve: any) => {
          const rows = mockMemoriesTable.filter((m) => {
            if (activeFilter !== undefined && m.is_active !== activeFilter)
              return false;
            if (userFilter && m.user_id !== userFilter) return false;
            if (categoryFilter && m.category !== categoryFilter) return false;
            return true;
          });
          resolve({ data: rows.slice(0, limitCount), error: null });
        },
      };

      return queryBuilder;
    }),
  })),
}));

describe('Phase 49: Co-Founder Memory and Context Accuracy Verification', () => {
  beforeEach(() => {
    mockMemoriesTable.length = 0;
  });

  // ==========================================================================
  // 1. TENANT & USER ISOLATION BOUNDARIES (FAIL-CLOSED)
  // ==========================================================================
  describe('1. Tenant and User Isolation Boundaries', () => {
    it('getRelevantMemories fails closed (returns empty array) when userId is empty or whitespace', async () => {
      const emptyResults = await getRelevantMemories('');
      const spaceResults = await getRelevantMemories('   ');
      const nullResults = await getRelevantMemories(null as any);

      expect(emptyResults).toEqual([]);
      expect(spaceResults).toEqual([]);
      expect(nullResults).toEqual([]);
    });

    it('searchSemanticMemories fails closed (returns empty array) when userId is empty or whitespace', async () => {
      const emptyResults = await searchSemanticMemories(
        '',
        'buffer stock policies'
      );
      const spaceResults = await searchSemanticMemories(
        '   ',
        'buffer stock policies'
      );
      const nullResults = await searchSemanticMemories(
        undefined as any,
        'buffer stock policies'
      );

      expect(emptyResults).toEqual([]);
      expect(spaceResults).toEqual([]);
      expect(nullResults).toEqual([]);
    });

    it('strictly isolates memories between tenants (User A never sees User B memories)', async () => {
      await writeCoFounderMemory({
        userId: 'tenant_user_A',
        category: 'strategic_goal',
        key: 'confidential_q4_plan',
        value: 'Expand handcrafted temple jewellery line into Mumbai flagship',
        confidence: 1.0,
      });

      await writeCoFounderMemory({
        userId: 'tenant_user_B',
        category: 'strategic_goal',
        key: 'kolkata_exhibition_plan',
        value: 'Host exclusive jewellery showcase at Park Street gallery',
        confidence: 1.0,
      });

      // User A retrieval
      const memoriesA = await getRelevantMemories('tenant_user_A');
      expect(memoriesA.length).toBe(1);
      expect(memoriesA[0].key).toBe('confidential_q4_plan');
      expect(memoriesA.some((m) => m.key === 'kolkata_exhibition_plan')).toBe(
        false
      );

      // User B retrieval
      const memoriesB = await getRelevantMemories('tenant_user_B');
      expect(memoriesB.length).toBe(1);
      expect(memoriesB[0].key).toBe('kolkata_exhibition_plan');
      expect(memoriesB.some((m) => m.key === 'confidential_q4_plan')).toBe(
        false
      );
    });
  });

  // ==========================================================================
  // 2. CUSTOMER DATA ISOLATION & PII PROTECTION
  // ==========================================================================
  describe('2. Customer Data Isolation & PII Protection', () => {
    it('detects and flags customer credit card patterns', () => {
      expect(containsCustomerPii('Customer card is 4532-1234-5678-9012')).toBe(
        true
      );
      expect(containsCustomerPii('Card 5105105105105100')).toBe(true);
      expect(containsCustomerPii('Customer CVV: 789')).toBe(true);
      expect(containsCustomerPii('password: SuperSecretPassword123')).toBe(
        true
      );
      expect(
        containsCustomerPii('Keep 10 units of Bridal Choker in safety buffer')
      ).toBe(false);
      expect(
        containsCustomerPii('Standard Blue Dart Air courier SLA is 48 hours')
      ).toBe(false);
    });

    it('writeCoFounderMemory strictly blocks storage of customer credit cards or PII', async () => {
      const piiAttempt = await writeCoFounderMemory({
        userId: 'staff_1',
        category: 'general',
        key: 'customer_card_data',
        value: 'Customer card: 4111-2222-3333-4444',
      });

      expect(piiAttempt.success).toBe(false);
      expect(piiAttempt.error).toContain('CUSTOMER_PII_PROHIBITED');
      expect(mockMemoriesTable.length).toBe(0);
    });

    it('storeMemoryWithContradictionCheck strictly blocks storage of customer sensitive credentials', async () => {
      const piiAttempt = await storeMemoryWithContradictionCheck({
        userId: 'staff_1',
        key: 'customer_pin',
        value: 'Customer account pin: 1234',
      });

      expect(piiAttempt.success).toBe(false);
      expect(piiAttempt.error).toContain('CUSTOMER_PII_PROHIBITED');
      expect(mockMemoriesTable.length).toBe(0);
    });

    it('permits legitimate operational rules and founder preferences without false positives', async () => {
      const validRule = await writeCoFounderMemory({
        userId: 'founder_1',
        category: 'operational_rule',
        key: 'minimum_safety_buffer',
        value:
          'Maintain a minimum safety buffer of 8 units for all 22K gold chokers',
        confidence: 1.0,
      });

      expect(validRule.success).toBe(true);
      expect(validRule.memoryId).toBeDefined();
      expect(mockMemoriesTable.length).toBe(1);
    });
  });

  // ==========================================================================
  // 3. ROLE & PERMISSION-FILTERED RETRIEVAL
  // ==========================================================================
  describe('3. Role & Permission-Filtered Retrieval', () => {
    it('filters out admin-restricted memories when queried by staff role', async () => {
      // 1. Staff-visible rule
      await writeCoFounderMemory({
        userId: 'tenant_1',
        category: 'operational_rule',
        key: 'packaging_rule',
        value:
          'Every package must include microfiber polishing cloth and warranty certificate',
        metadata: { requiredRole: 'staff' },
      });

      // 2. Admin-only executive goal
      await writeCoFounderMemory({
        userId: 'tenant_1',
        category: 'strategic_goal',
        key: 'executive_compensation_plan',
        value: 'Target ₹2.5 Crore EBITDA for FY27 management profit share pool',
        metadata: { requiredRole: 'admin' },
      });

      // Staff retrieval: sees packaging rule, cannot see executive compensation
      const staffMemories = await getRelevantMemories(
        'tenant_1',
        undefined,
        10,
        {
          userRole: 'staff',
        }
      );
      expect(staffMemories.length).toBe(1);
      expect(staffMemories[0].key).toBe('packaging_rule');

      // Admin retrieval: sees both
      const adminMemories = await getRelevantMemories(
        'tenant_1',
        undefined,
        10,
        {
          userRole: 'admin',
        }
      );
      expect(adminMemories.length).toBe(2);
      expect(adminMemories.map((m) => m.key)).toEqual(
        expect.arrayContaining([
          'packaging_rule',
          'executive_compensation_plan',
        ])
      );
    });
  });

  // ==========================================================================
  // 4. SOURCE PROVENANCE, TIMESTAMP & FRESHNESS
  // ==========================================================================
  describe('4. Source Provenance, Timestamp & Freshness Indication', () => {
    it('synthesizes memory context with explicit provenance, recorded date, and zero-hallucination directive', () => {
      const testMemories: ScoredMemory[] = [
        {
          id: 'mem_fresh',
          userId: 'user_1',
          category: 'operational_rule',
          taxonomyLayer: 'operational_rule',
          key: 'shipping_sla',
          value:
            'All orders placed before 2 PM IST must ship same day via Blue Dart Air',
          confidence: 1.0,
          importance: 5,
          source: 'user_explicit',
          isActive: true,
          metadata: {},
          createdAt: '2026-10-31T08:00:00.000Z',
          updatedAt: '2026-10-31T08:00:00.000Z',
          similarity: 0.9,
          recencyScore: 1.0,
          importanceScore: 1.0,
          confidenceScore: 1.0,
          hybridScore: 0.95,
        },
        {
          id: 'mem_stale',
          userId: 'user_1',
          category: 'strategic_goal',
          taxonomyLayer: 'strategic_goal',
          key: 'archived_diwali_projection',
          value: 'Target 500 orders during Dhanteras flash preview',
          confidence: 0.9,
          importance: 4,
          source: 'session_inference',
          isActive: true,
          metadata: {},
          createdAt: '2025-10-01T00:00:00.000Z', // > 365 days old
          updatedAt: '2025-10-01T00:00:00.000Z',
          similarity: 0.8,
          recencyScore: 0.1,
          importanceScore: 0.8,
          confidenceScore: 0.9,
          hybridScore: 0.65,
        },
      ];

      const synthesized = synthesizePrioritizedMemoryContext(testMemories);

      // Verify Zero Hallucination Executive Directive
      expect(synthesized).toContain(
        '[EXECUTIVE DIRECTIVE: TRUTH & PRIORITY ORDER]'
      );
      expect(synthesized).toContain(
        'When no relevant memory or store data exists, explicitly state that no data is on record; NEVER fabricate, invent, or assume unverified business facts or customer details.'
      );

      // Verify Provenance and Date on Fresh Operational Rule
      expect(synthesized).toContain('source: user_explicit');
      expect(synthesized).toContain('recorded: 2026-10-31');
      const lines = synthesized.split('\n');
      const freshLine = lines.find((l) => l.includes('shipping_sla')) || '';
      expect(freshLine).not.toContain('POTENTIALLY STALE');

      // Verify Stale Detection Flag on Old Memory
      const staleLine =
        lines.find((l) => l.includes('archived_diwali_projection')) || '';
      expect(staleLine).toContain('POTENTIALLY STALE: >90d');
      expect(staleLine).toContain('source: session_inference');
    });

    it('returns standardized fallback when no memory records exist', () => {
      const fallback = synthesizePrioritizedMemoryContext([]);
      expect(fallback).toBe('LONG-TERM MEMORIES & CONTEXT: None recorded yet.');
    });
  });

  // ==========================================================================
  // 5. DURABLE RETENTION, DELETION & PURGING (GDPR/DPDP COMPLIANCE)
  // ==========================================================================
  describe('5. Durable Retention, Deletion & Purging (GDPR/DPDP Compliance)', () => {
    it('deleteCoFounderMemory deactivates a specific memory record with ownership check', async () => {
      const created = await writeCoFounderMemory({
        userId: 'founder_1',
        category: 'operational_rule',
        key: 'temporary_rule',
        value: 'Temporary festive packaging note',
      });

      expect(created.success).toBe(true);
      expect(created.memoryId).toBeDefined();

      // Delete by owner
      const deleteRes = await deleteCoFounderMemory(
        'founder_1',
        created.memoryId!
      );
      expect(deleteRes.success).toBe(true);

      const target = mockMemoriesTable.find((m) => m.id === created.memoryId);
      expect(target.is_active).toBe(false);
      expect(target.metadata.deleted_at).toBeDefined();
      expect(target.metadata.deleted_by).toBe('founder_1');
    });

    it('purgeUserMemories deactivates all active memories for statutory customer data erasure', async () => {
      // Create multiple memories for user_purge
      await writeCoFounderMemory({
        userId: 'user_purge',
        category: 'strategic_goal',
        key: 'goal_1',
        value: 'Goal 1 description',
      });
      await writeCoFounderMemory({
        userId: 'user_purge',
        category: 'business_preference',
        key: 'pref_1',
        value: 'Preference 1 description',
      });
      // Memory for another user
      await writeCoFounderMemory({
        userId: 'user_retain',
        category: 'strategic_goal',
        key: 'retain_goal',
        value: 'Retained goal description',
      });

      expect(mockMemoriesTable.filter((m) => m.is_active).length).toBe(3);

      // Purge memories for user_purge
      const purgeRes = await purgeUserMemories('user_purge');
      expect(purgeRes.success).toBe(true);

      // Check remaining active records
      const activePurged = mockMemoriesTable.filter(
        (m) => m.user_id === 'user_purge' && m.is_active
      );
      expect(activePurged.length).toBe(0);

      const retained = mockMemoriesTable.filter(
        (m) => m.user_id === 'user_retain' && m.is_active
      );
      expect(retained.length).toBe(1);
    });
  });
});
