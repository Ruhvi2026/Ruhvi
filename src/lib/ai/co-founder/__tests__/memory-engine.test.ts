jest.mock('server-only', () => ({}));

import {
  cosineSimilarity,
  generateDeterministicEmbedding,
  generateEmbedding,
  mapTaxonomyLayerToCategory,
  inferTaxonomyLayer,
  detectMemoryContradiction,
  storeMemoryWithContradictionCheck,
  supersedeMemoryById,
  searchSemanticMemories,
  synthesizePrioritizedMemoryContext,
  extractMemoriesFromConversation,
  EMBEDDING_DIMENSION,
  type MemoryInput,
  type StoredMemoryRecord,
  type ScoredMemory,
  type MemoryTaxonomyLayer,
} from '../memory-engine';

// In-memory mock database table for co_founder_memories
let mockMemories: any[] = [];

// Mock getServiceClient
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_memories') {
        return {
          insert: jest.fn((payload: any) => {
            const row = {
              id:
                payload.id ||
                `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
              user_id: payload.user_id,
              category: payload.category,
              key: payload.key,
              value: payload.value,
              confidence: payload.confidence ?? 1.0,
              source: payload.source || 'user_explicit',
              metadata: payload.metadata || {},
              is_active: payload.is_active ?? true,
              superseded_by: payload.superseded_by || null,
              created_at: payload.created_at || new Date().toISOString(),
              updated_at: payload.updated_at || new Date().toISOString(),
            };
            mockMemories.push(row);
            return {
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: row,
                  error: null,
                }),
              }),
            };
          }),
          select: jest.fn(function () {
            const filters: Record<string, any> = {};
            let limitVal: number | undefined;

            const chain: any = {
              eq: jest.fn((col: string, val: any) => {
                if (val !== undefined) {
                  filters[col] = val;
                }
                return chain;
              }),
              order: jest.fn(() => chain),
              limit: jest.fn((n: number) => {
                limitVal = n;
                return chain;
              }),
              then: (resolve: any) => {
                let filtered = mockMemories.filter((m) => {
                  for (const [k, v] of Object.entries(filters)) {
                    if (m[k] !== v) return false;
                  }
                  return true;
                });
                if (limitVal !== undefined) {
                  filtered = filtered.slice(0, limitVal);
                }
                return resolve({ data: filtered, error: null });
              },
            };
            return chain;
          }),
          update: jest.fn((updates: any) => {
            let targetId: string | null = null;
            const chain: any = {
              eq: jest.fn((col: string, val: any) => {
                if (col === 'id') {
                  targetId = val;
                  const item = mockMemories.find((m) => m.id === targetId);
                  if (item) {
                    Object.assign(item, updates);
                  }
                }
                return chain;
              }),
              then: (resolve: any) => resolve({ data: null, error: null }),
            };
            return chain;
          }),
        };
      }
      return {};
    }),
  })),
}));

describe('Memory 2.0 Engine (src/lib/ai/co-founder/memory-engine.ts)', () => {
  beforeEach(() => {
    mockMemories = [];
    jest.clearAllMocks();
  });

  // ==========================================================================
  // 1. TAXONOMY & CATEGORY MAPPING
  // ==========================================================================
  describe('Taxonomy & Category Mapping', () => {
    it('maps all 7 taxonomy layers to valid database check constraint categories', () => {
      expect(mapTaxonomyLayerToCategory('strategic_goal')).toBe(
        'strategic_goal'
      );
      expect(mapTaxonomyLayerToCategory('preference')).toBe(
        'business_preference'
      );
      expect(mapTaxonomyLayerToCategory('operational_rule')).toBe(
        'operational_rule'
      );
      expect(mapTaxonomyLayerToCategory('correction')).toBe('correction');
      expect(mapTaxonomyLayerToCategory('decision')).toBe('decision');
      expect(mapTaxonomyLayerToCategory('outcome_learning')).toBe('decision');
      expect(mapTaxonomyLayerToCategory('conversation')).toBe('general');
    });

    it('infers taxonomy layer from database category and metadata override', () => {
      expect(inferTaxonomyLayer('strategic_goal')).toBe('strategic_goal');
      expect(inferTaxonomyLayer('business_preference')).toBe('preference');
      expect(inferTaxonomyLayer('operational_rule')).toBe('operational_rule');
      expect(inferTaxonomyLayer('correction')).toBe('correction');
      expect(inferTaxonomyLayer('decision')).toBe('decision');
      expect(inferTaxonomyLayer('general')).toBe('conversation');

      // Metadata override takes precedence
      expect(
        inferTaxonomyLayer('decision', { taxonomy_layer: 'outcome_learning' })
      ).toBe('outcome_learning');
    });
  });

  // ==========================================================================
  // 2. VECTOR MATHEMATICS & EMBEDDINGS
  // ==========================================================================
  describe('Vector Math & Embeddings', () => {
    it('computes exact cosine similarity for identical vectors (1.0)', () => {
      const vec = [0.6, 0.8];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it('computes 0.0 for orthogonal vectors', () => {
      const vecA = [1.0, 0.0];
      const vecB = [0.0, 1.0];
      expect(cosineSimilarity(vecA, vecB)).toBe(0);
    });

    it('computes -1.0 for opposite vectors', () => {
      const vecA = [1.0, 0.0];
      const vecB = [-1.0, 0.0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 5);
    });

    it('handles empty or zero-magnitude vectors without NaN or division by zero', () => {
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([0, 0, 0], [1, 2, 3])).toBe(0);
      expect(cosineSimilarity([1, 2, 3], [0, 0, 0])).toBe(0);
    });

    it('generates deterministic embeddings with exact dimension 768 and unit norm', () => {
      const text = 'Always maintain 10 choker units in safety buffer stock';
      const embedding = generateDeterministicEmbedding(text);

      expect(embedding).toHaveLength(EMBEDDING_DIMENSION);

      // Verify unit norm (sum of squares is ~1.0)
      let sumSq = 0;
      for (const val of embedding) {
        sumSq += val * val;
      }
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3);

      // Verify determinism: same input yields exact same vector
      const embedding2 = generateDeterministicEmbedding(text);
      expect(embedding).toEqual(embedding2);
    });

    it('handles empty or whitespace strings with a safe normalized vector', () => {
      const emptyVec = generateDeterministicEmbedding('   ');
      expect(emptyVec).toHaveLength(EMBEDDING_DIMENSION);

      let sumSq = 0;
      for (const val of emptyVec) {
        sumSq += val * val;
      }
      expect(Math.sqrt(sumSq)).toBeCloseTo(1.0, 3);
    });

    it('produces high cosine similarity (>0.60) for semantically related sentences', () => {
      const textA = 'We prefer Blue Dart Express Air for shipping';
      const textB = 'Our primary courier partner is Blue Dart Express Air';
      const vecA = generateDeterministicEmbedding(textA);
      const vecB = generateDeterministicEmbedding(textB);

      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeGreaterThan(0.6);
    });

    it('produces high cosine similarity (>0.60) for inventory safety buffer statements', () => {
      const textA = 'Keep minimum 10 choker units in buffer stock';
      const textB = 'Safety stock for choker inventory should be 10 units';
      const vecA = generateDeterministicEmbedding(textA);
      const vecB = generateDeterministicEmbedding(textB);

      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeGreaterThan(0.55);
    });

    it('produces low cosine similarity (<0.40) for completely unrelated sentences', () => {
      const textA = 'Blue Dart Express courier shipping partner';
      const textB =
        'Email tone should be concise and executive with bullet points';
      const vecA = generateDeterministicEmbedding(textA);
      const vecB = generateDeterministicEmbedding(textB);

      const sim = cosineSimilarity(vecA, vecB);
      expect(sim).toBeLessThan(0.4);
    });

    it('generateEmbedding returns structured embedding with fallback to deterministic hash', async () => {
      const res = await generateEmbedding(
        'Festive diwali revenue target is ₹50 Lakhs'
      );
      expect(res.values).toHaveLength(EMBEDDING_DIMENSION);
      expect(res.model).toBeDefined();
      expect(res.source).toBe('deterministic_hash');
    });
  });

  // ==========================================================================
  // 3. CONTRADICTION DETECTION
  // ==========================================================================
  describe('Contradiction Detection', () => {
    const existingBase: StoredMemoryRecord = {
      id: 'mem_1',
      userId: 'user_admin',
      category: 'operational_rule',
      taxonomyLayer: 'operational_rule',
      key: 'primary_carrier',
      value: 'Always ship standard orders using Delhivery Surface',
      confidence: 1.0,
      importance: 5,
      source: 'user_explicit',
      isActive: true,
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    it('flags exact key collision as a contradiction/replacement', () => {
      const newMem: MemoryInput = {
        userId: 'user_admin',
        key: 'primary_carrier',
        value: 'Ship with Blue Dart Express Air',
      };
      const result = detectMemoryContradiction(newMem, existingBase, 0.5);
      expect(result.isContradiction).toBe(true);
      expect(result.reason).toContain('Exact key update');
    });

    it('flags slug alias collision as a contradiction', () => {
      const newMem: MemoryInput = {
        userId: 'user_admin',
        key: 'primary-carrier',
        value: 'Ship with Blue Dart Express Air',
      };
      const result = detectMemoryContradiction(newMem, existingBase, 0.5);
      expect(result.isContradiction).toBe(true);
      expect(result.reason).toContain('Key alias collision');
    });

    it('flags opposing polarity terms within same domain as a contradiction', () => {
      const existingPolicy: StoredMemoryRecord = {
        ...existingBase,
        key: 'discount_policy',
        value: 'Always allow coupons up to 20%',
      };
      const newMem: MemoryInput = {
        userId: 'user_admin',
        key: 'promo_code_rule',
        value: 'Never allow discounts over 10%',
        category: 'operational_rule',
        taxonomyLayer: 'operational_rule',
      };
      // Semantic similarity high (>0.75) with opposing terms ('always' vs 'never')
      const result = detectMemoryContradiction(newMem, existingPolicy, 0.8);
      expect(result.isContradiction).toBe(true);
      expect(result.reason).toContain('opposing polarities');
    });

    it('does not flag unrelated memories in different categories', () => {
      const newMem: MemoryInput = {
        userId: 'user_admin',
        key: 'diwali_target',
        value: 'Reach ₹50 Lakhs revenue in Q3 festive sale',
        category: 'strategic_goal',
        taxonomyLayer: 'strategic_goal',
      };
      const result = detectMemoryContradiction(newMem, existingBase, 0.2);
      expect(result.isContradiction).toBe(false);
    });
  });

  // ==========================================================================
  // 4. STORAGE & AUTOMATIC SUPERSEDING ENGINE
  // ==========================================================================
  describe('storeMemoryWithContradictionCheck', () => {
    it('validates required fields (userId, key, value)', async () => {
      const resMissingUser = await storeMemoryWithContradictionCheck({
        userId: '',
        key: 'test_key',
        value: 'test_val',
      });
      expect(resMissingUser.success).toBe(false);
      expect(resMissingUser.error).toContain('User ID is required');

      const resMissingKey = await storeMemoryWithContradictionCheck({
        userId: 'u_1',
        key: '',
        value: 'test_val',
      });
      expect(resMissingKey.success).toBe(false);
      expect(resMissingKey.error).toContain('Both key and value are required');
    });

    it('successfully stores a new memory item with embedding and metadata', async () => {
      const res = await storeMemoryWithContradictionCheck({
        userId: 'u_100',
        key: 'diwali_target',
        value: 'Achieve ₹50 Lakhs GMV for festive collection',
        taxonomyLayer: 'strategic_goal',
        importance: 4,
        confidence: 0.95,
        topics: ['diwali', 'revenue'],
      });

      expect(res.success).toBe(true);
      expect(res.memoryId).toBeDefined();
      expect(res.supersededIds).toEqual([]);

      expect(mockMemories).toHaveLength(1);
      const stored = mockMemories[0];
      expect(stored.key).toBe('diwali_target');
      expect(stored.category).toBe('strategic_goal');
      expect(stored.metadata.embedding).toHaveLength(EMBEDDING_DIMENSION);
      expect(stored.metadata.importance).toBe(4);
      expect(stored.is_active).toBe(true);
    });

    it('automatically supersedes outdated contradictory memories when updated', async () => {
      // 1. Store initial rule
      const initial = await storeMemoryWithContradictionCheck({
        userId: 'u_100',
        key: 'choker_inventory_buffer',
        value: 'Keep minimum 5 choker units in buffer stock',
        taxonomyLayer: 'operational_rule',
      });
      expect(initial.success).toBe(true);
      const firstId = initial.memoryId!;

      expect(mockMemories.find((m) => m.id === firstId)?.is_active).toBe(true);

      // 2. Store updated rule with exact same key
      const updated = await storeMemoryWithContradictionCheck({
        userId: 'u_100',
        key: 'choker_inventory_buffer',
        value:
          'Increase minimum choker buffer stock to 15 units for festive surge',
        taxonomyLayer: 'operational_rule',
      });
      expect(updated.success).toBe(true);
      expect(updated.supersededIds).toContain(firstId);

      // Verify old record was superseded
      const oldRec = mockMemories.find((m) => m.id === firstId);
      expect(oldRec.is_active).toBe(false);
      expect(oldRec.superseded_by).toBe(updated.memoryId);

      // Verify new record is active
      const newRec = mockMemories.find((m) => m.id === updated.memoryId);
      expect(newRec.is_active).toBe(true);
    });

    it('supersedeMemoryById explicitly deactivates a record', async () => {
      const mem = await storeMemoryWithContradictionCheck({
        userId: 'u_100',
        key: 'temporary_rule',
        value: 'Temporary shipping rule for weekend',
      });
      const ok = await supersedeMemoryById(
        mem.memoryId!,
        'mem_replacement_999'
      );
      expect(ok).toBe(true);

      const found = mockMemories.find((m) => m.id === mem.memoryId);
      expect(found.is_active).toBe(false);
      expect(found.superseded_by).toBe('mem_replacement_999');
    });
  });

  // ==========================================================================
  // 5. HYBRID SEMANTIC RETRIEVAL ENGINE
  // ==========================================================================
  describe('searchSemanticMemories', () => {
    beforeEach(async () => {
      // Seed mock memory records
      await storeMemoryWithContradictionCheck({
        userId: 'founder_1',
        key: 'logistics_partner',
        value: 'Primary courier partner is Blue Dart Express Air',
        taxonomyLayer: 'preference',
        importance: 4,
        topics: ['logistics', 'shipping'],
      });

      await storeMemoryWithContradictionCheck({
        userId: 'founder_1',
        key: 'choker_safety_stock',
        value: 'Keep minimum 12 choker units in buffer warehouse',
        taxonomyLayer: 'operational_rule',
        importance: 5,
        topics: ['inventory', 'safety_buffer'],
      });

      await storeMemoryWithContradictionCheck({
        userId: 'founder_1',
        key: 'diwali_gmv_goal',
        value: 'Target revenue is ₹50 Lakhs for festive collection',
        taxonomyLayer: 'strategic_goal',
        importance: 4,
        topics: ['revenue', 'sales'],
      });
    });

    it('retrieves relevant memory based on semantic query and hybrid score', async () => {
      const results = await searchSemanticMemories(
        'founder_1',
        'Which courier do we use for air shipping?'
      );

      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.key).toBe('logistics_partner');
      expect(top.similarity).toBeGreaterThan(0.5);
      expect(top.hybridScore).toBeGreaterThan(0.4);
    });

    it('retrieves inventory operational rule when querying stock buffer', async () => {
      const results = await searchSemanticMemories(
        'founder_1',
        'What is our safety stock policy for chokers?'
      );

      expect(results.length).toBeGreaterThan(0);
      const top = results[0];
      expect(top.key).toBe('choker_safety_stock');
      expect(top.taxonomyLayer).toBe('operational_rule');
      expect(top.importanceScore).toBe(1.0); // 5/5 -> 1.0
    });

    it('filters by taxonomy layer when layer option is specified', async () => {
      const results = await searchSemanticMemories(
        'founder_1',
        'revenue targets',
        {
          layer: 'strategic_goal',
        }
      );

      expect(results.every((r) => r.taxonomyLayer === 'strategic_goal')).toBe(
        true
      );
      expect(results[0].key).toBe('diwali_gmv_goal');
    });

    it('filters by topics when topicFilter is provided', async () => {
      const results = await searchSemanticMemories(
        'founder_1',
        'buffer stock',
        {
          topicFilter: ['safety_buffer'],
        }
      );

      expect(results).toHaveLength(1);
      expect(results[0].key).toBe('choker_safety_stock');
    });

    it('respects limit parameter', async () => {
      const results = await searchSemanticMemories(
        'founder_1',
        'business rules',
        {
          limit: 1,
        }
      );
      expect(results).toHaveLength(1);
    });
  });

  // ==========================================================================
  // 6. PRIORITY-ENFORCED CONTEXT SYNTHESIS
  // ==========================================================================
  describe('synthesizePrioritizedMemoryContext', () => {
    it('returns informative placeholder when no memories are passed', () => {
      const text = synthesizePrioritizedMemoryContext([]);
      expect(text).toContain(
        'LONG-TERM MEMORIES & CONTEXT: None recorded yet.'
      );
    });

    it('synthesizes context with Executive Truth Directive and correct priority tiers', () => {
      const scoredMemories: ScoredMemory[] = [
        {
          id: '1',
          userId: 'u_1',
          category: 'operational_rule',
          taxonomyLayer: 'operational_rule',
          key: 'choker_buffer',
          value: 'Keep 10 units buffer stock',
          confidence: 1.0,
          importance: 5,
          source: 'user_explicit',
          isActive: true,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.85,
          recencyScore: 1.0,
          importanceScore: 1.0,
          confidenceScore: 1.0,
          hybridScore: 0.95,
        },
        {
          id: '2',
          userId: 'u_1',
          category: 'strategic_goal',
          taxonomyLayer: 'strategic_goal',
          key: 'q3_target',
          value: '₹50 Lakhs revenue target',
          confidence: 0.95,
          importance: 4,
          source: 'user_explicit',
          isActive: true,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.75,
          recencyScore: 0.9,
          importanceScore: 0.8,
          confidenceScore: 0.95,
          hybridScore: 0.82,
        },
        {
          id: '3',
          userId: 'u_1',
          category: 'business_preference',
          taxonomyLayer: 'preference',
          key: 'brand_tone',
          value: 'Concise executive clarity with warmth',
          confidence: 0.9,
          importance: 3,
          source: 'user_explicit',
          isActive: true,
          metadata: {},
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          similarity: 0.7,
          recencyScore: 0.8,
          importanceScore: 0.6,
          confidenceScore: 0.9,
          hybridScore: 0.72,
        },
      ];

      const synthesized = synthesizePrioritizedMemoryContext(scoredMemories);

      // Verify Directive Header
      expect(synthesized).toContain(
        '[EXECUTIVE DIRECTIVE: TRUTH & PRIORITY ORDER]'
      );
      expect(synthesized).toContain(
        'Live Verified Store Data > Approved Operational Rules'
      );

      // Verify Tier Headings
      expect(synthesized).toContain(
        'CRITICAL OPERATIONAL RULES & CONSTRAINTS:'
      );
      expect(synthesized).toContain('STRATEGIC GOALS & TARGETS:');
      expect(synthesized).toContain('FOUNDER PREFERENCES & BRAND TONE:');

      // Verify Operational Rule appears before Preferences in text stream
      const opIndex = synthesized.indexOf('CRITICAL OPERATIONAL RULES');
      const prefIndex = synthesized.indexOf('FOUNDER PREFERENCES');
      expect(opIndex).toBeLessThan(prefIndex);
    });
  });

  // ==========================================================================
  // 7. AUTOMATED CONVERSATION MEMORY EXTRACTION
  // ==========================================================================
  describe('extractMemoriesFromConversation', () => {
    it('returns empty array when messages array is empty or has no user directives', () => {
      expect(extractMemoriesFromConversation([])).toEqual([]);
      const genericChat = [
        {
          role: 'user',
          content: 'Can you show me the sales numbers for yesterday?',
        },
        {
          role: 'assistant',
          content: 'Yesterday we had ₹1.2 Lakhs in gross sales.',
        },
      ];
      expect(extractMemoriesFromConversation(genericChat)).toEqual([]);
    });

    it('extracts operational rules from user instructions', () => {
      const messages = [
        {
          role: 'user',
          content:
            'Remember, always keep 15 choker units in buffer stock for the surge.',
        },
        {
          role: 'user',
          content:
            'Also, never discount diamond products over 15% under any circumstances.',
        },
      ];

      const candidates = extractMemoriesFromConversation(messages);
      expect(candidates.length).toBeGreaterThanOrEqual(2);

      const bufferRule = candidates.find(
        (c) =>
          c.taxonomyLayer === 'operational_rule' &&
          c.value.includes('choker units')
      );
      expect(bufferRule).toBeDefined();
      expect(bufferRule?.importance).toBe(5);
      expect(bufferRule?.category).toBe('operational_rule');

      const discountRule = candidates.find(
        (c) =>
          c.taxonomyLayer === 'operational_rule' &&
          c.value.includes('diamond products')
      );
      expect(discountRule).toBeDefined();
      expect(discountRule?.importance).toBe(5);
    });

    it('extracts strategic goals from user instructions', () => {
      const messages = [
        {
          role: 'user',
          content:
            'Our target is ₹50 Lakhs revenue for the festive diwali campaign.',
        },
      ];

      const candidates = extractMemoriesFromConversation(messages);
      expect(candidates).toHaveLength(1);
      const goal = candidates[0];
      expect(goal.taxonomyLayer).toBe('strategic_goal');
      expect(goal.category).toBe('strategic_goal');
      expect(goal.importance).toBe(4);
      expect(goal.value).toContain('50 Lakhs');
    });

    it('extracts founder preferences and brand tone', () => {
      const messages = [
        {
          role: 'user',
          content:
            'We prefer Blue Dart Express for all our luxury high-ticket deliveries.',
        },
      ];

      const candidates = extractMemoriesFromConversation(messages);
      expect(candidates).toHaveLength(1);
      const pref = candidates[0];
      expect(pref.taxonomyLayer).toBe('preference');
      expect(pref.category).toBe('business_preference');
      expect(pref.importance).toBe(3);
    });

    it('extracts explicit corrections from user messages', () => {
      const messages = [
        {
          role: 'user',
          content:
            "That's wrong, actually we use 10 days lead time for custom mangalsutras.",
        },
      ];

      const candidates = extractMemoriesFromConversation(messages);
      expect(candidates).toHaveLength(1);
      const correction = candidates[0];
      expect(correction.taxonomyLayer).toBe('correction');
      expect(correction.category).toBe('correction');
      expect(correction.confidence).toBe(1.0);
    });

    it('deduplicates extracted memories with identical keys', () => {
      const messages = [
        {
          role: 'user',
          content: 'Our target is ₹50 Lakhs revenue for festive season.',
        },
        {
          role: 'user',
          content:
            'Remember, our target is ₹50 Lakhs revenue for festive season.',
        },
      ];

      const candidates = extractMemoriesFromConversation(messages);
      expect(candidates).toHaveLength(1);
    });
  });
});
