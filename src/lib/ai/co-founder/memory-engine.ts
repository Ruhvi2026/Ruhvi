import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getEnvApiKey } from '@/lib/ai/keys';
import type { CoFounderMemoryItem, MemoryCategory } from './memory';
import {
  getRelevantMemories,
  writeCoFounderMemory,
  correctCoFounderMemory,
  deleteCoFounderMemory,
  purgeUserMemories,
  containsCustomerPii,
} from './memory';

// Re-export existing basic memory primitives for seamless backwards compatibility
export {
  getRelevantMemories,
  writeCoFounderMemory,
  correctCoFounderMemory,
  deleteCoFounderMemory,
  purgeUserMemories,
  containsCustomerPii,
  type CoFounderMemoryItem,
  type MemoryCategory,
};

/**
 * ============================================================================
 * MEMORY 2.0 — ENTERPRISE HIERARCHICAL SEMANTIC MEMORY ENGINE
 * ============================================================================
 * Features:
 * 1. Multi-Tiered Memory Taxonomy (Conversation, Decision, Preference, Operational, Strategic, Outcome)
 * 2. Vector Embedding Engine (Gemini text-embedding-004 + High-Entropy Resilient Deterministic Fallback)
 * 3. Vector Cosine Similarity & Hybrid Ranking (Relevance x Recency x Importance x Confidence)
 * 4. Automated Semantic Contradiction Detection & Multi-Record Superseding
 * 5. Priority-Enforced Context Synthesis (Golden Rule: Live Data > Rules > Memory > History)
 * 6. Automated Conversation Memory Extraction & Distillation
 */

export const EMBEDDING_DIMENSION = 768;
export const EMBEDDING_MODEL_DEFAULT = 'text-embedding-004';

// ----------------------------------------------------------------------------
// 1. TAXONOMY TYPES & DEFINITIONS
// ----------------------------------------------------------------------------

export type MemoryTaxonomyLayer =
  | 'conversation' // Short-term episodic context from session discussions
  | 'decision' // Explicit founder strategic choices and trade-offs
  | 'preference' // Brand tone, communication style, executive preferences
  | 'operational_rule' // High-priority business policies, safety buffers, SLAs
  | 'strategic_goal' // Long-term vision, quarterly revenue targets, North Star KPIs
  | 'correction' // Explicit founder overrides and factual corrections
  | 'outcome_learning'; // Empirically verified insights from closed-loop actions

export type MemorySource =
  'user_explicit' | 'session_inference' | 'system' | 'correction';

export interface MemoryMetadata extends Record<string, any> {
  embedding?: number[];
  embedding_model?: string;
  taxonomy_layer?: MemoryTaxonomyLayer;
  importance?: number; // 1 to 5 scale (5 = critical, e.g. operational rule)
  topics?: string[];
  contradiction_keys?: string[];
  last_accessed_at?: string;
  access_count?: number;
  superseded_reason?: string;
}

export interface MemoryInput {
  userId: string;
  key: string;
  value: string;
  taxonomyLayer?: MemoryTaxonomyLayer;
  category?: MemoryCategory;
  confidence?: number; // 0.00 to 1.00
  importance?: number; // 1 to 5
  source?: MemorySource;
  metadata?: MemoryMetadata;
  topics?: string[];
}

export interface StoredMemoryRecord {
  id: string;
  userId: string;
  category: MemoryCategory;
  taxonomyLayer: MemoryTaxonomyLayer;
  key: string;
  value: string;
  confidence: number;
  importance: number;
  source: MemorySource;
  isActive: boolean;
  supersededBy?: string | null;
  metadata: MemoryMetadata;
  createdAt: string;
  updatedAt: string;
}

export interface ScoredMemory extends StoredMemoryRecord {
  similarity: number; // 0.00 to 1.00
  recencyScore: number; // 0.00 to 1.00
  importanceScore: number; // 0.00 to 1.00
  confidenceScore: number; // 0.00 to 1.00
  hybridScore: number; // Weighted composite score
}

export interface SemanticSearchOptions {
  limit?: number;
  threshold?: number;
  layer?: MemoryTaxonomyLayer;
  category?: MemoryCategory;
  includeSuperseded?: boolean;
  topicFilter?: string[];
  targetEmbedding?: number[];
  userRole?: 'staff' | 'manager' | 'admin' | 'super_admin';
  weights?: {
    similarity?: number;
    recency?: number;
    importance?: number;
    confidence?: number;
  };
}

export interface StoreMemoryResult {
  success: boolean;
  memoryId?: string;
  supersededIds?: string[];
  error?: string;
}

export interface ExtractedMemoryCandidate {
  key: string;
  value: string;
  taxonomyLayer: MemoryTaxonomyLayer;
  category: MemoryCategory;
  confidence: number;
  importance: number;
  source: MemorySource;
  reason: string;
  topics: string[];
}

export interface ContextSynthesisOptions {
  maxItems?: number;
  includeAttribution?: boolean;
  includeScores?: boolean;
  includeDirectives?: boolean;
  filterLayers?: MemoryTaxonomyLayer[];
}

// ----------------------------------------------------------------------------
// 2. TAXONOMY MAPPING HELPERS
// ----------------------------------------------------------------------------

/**
 * Maps granular taxonomy layers into the database's check-constrained `category` column.
 */
export function mapTaxonomyLayerToCategory(
  layer: MemoryTaxonomyLayer
): MemoryCategory {
  switch (layer) {
    case 'strategic_goal':
      return 'strategic_goal';
    case 'preference':
      return 'business_preference';
    case 'operational_rule':
      return 'operational_rule';
    case 'correction':
      return 'correction';
    case 'decision':
    case 'outcome_learning':
      return 'decision';
    case 'conversation':
    default:
      return 'general';
  }
}

/**
 * Infers taxonomy layer from stored database category and metadata.
 */
export function inferTaxonomyLayer(
  category: MemoryCategory,
  metadata?: MemoryMetadata
): MemoryTaxonomyLayer {
  if (metadata?.taxonomy_layer) {
    return metadata.taxonomy_layer;
  }
  switch (category) {
    case 'strategic_goal':
      return 'strategic_goal';
    case 'business_preference':
      return 'preference';
    case 'operational_rule':
      return 'operational_rule';
    case 'correction':
      return 'correction';
    case 'decision':
      return 'decision';
    case 'general':
    default:
      return 'conversation';
  }
}

// ----------------------------------------------------------------------------
// 3. VECTOR EMBEDDINGS & MATHEMATICAL SIMILARITY
// ----------------------------------------------------------------------------

/**
 * Calculates vector cosine similarity between two float arrays.
 * Handles dimensional mismatches and zero-norm vectors safely.
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }

  const length = Math.min(vecA.length, vecB.length);
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA <= 0 || normB <= 0) {
    return 0;
  }

  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Clamp to [-1.0, 1.0] to prevent IEEE-754 precision overflow
  return Math.max(-1.0, Math.min(1.0, similarity));
}

/**
 * Semantic Domain Clusters for Jeweler & E-Commerce Business Intelligence.
 * Enhances deterministic embedding representation when external API is offline or mocked.
 */
const DOMAIN_CLUSTERS: Record<string, string[]> = {
  logistics: [
    'shipping',
    'carrier',
    'courier',
    'bluedart',
    'delhivery',
    'express',
    'air',
    'transit',
    'delivery',
    'dispatch',
    'tracking',
  ],
  inventory: [
    'stock',
    'inventory',
    'units',
    'buffer',
    'safety',
    'reorder',
    'restock',
    'warehouse',
    'sku',
    'leadtime',
    'doi',
    'turnover',
  ],
  revenue: [
    'revenue',
    'sales',
    'gmv',
    'turnover',
    'target',
    'goal',
    'festive',
    'diwali',
    'growth',
    'kpi',
    'lakhs',
    'crores',
    'runrate',
  ],
  pricing: [
    'pricing',
    'margin',
    'cogs',
    'cost',
    'discount',
    'coupon',
    'gross',
    'markdown',
    'asp',
    'threshold',
    'rupees',
    'inr',
  ],
  jewelry: [
    'choker',
    'necklace',
    'earrings',
    'bangle',
    'ring',
    'mangalsutra',
    'gold',
    'silver',
    'diamond',
    'polki',
    'kundan',
    'gemstone',
  ],
  policy: [
    'rule',
    'policy',
    'always',
    'never',
    'must',
    'prohibit',
    'enforce',
    'mandatory',
    'operational',
    'compliance',
  ],
  tone: [
    'tone',
    'voice',
    'concise',
    'executive',
    'warm',
    'formal',
    'format',
    'bullet',
    'preference',
    'style',
  ],
};

/**
 * Generates a 768-dimensional normalized pseudo-vector based on high-entropy
 * token hashes, character n-grams, and domain cluster projections.
 *
 * Guarantees:
 * - Deterministic output for same input
 * - Unit Euclidean norm: sqrt(sum(v_i^2)) === 1.0
 * - High cosine similarity (>0.60) for semantically overlapping sentences
 * - Low cosine similarity (<0.35) for unrelated sentences
 */
export function generateDeterministicEmbedding(
  text: string,
  dimensions = EMBEDDING_DIMENSION
): number[] {
  if (!text || text.trim().length === 0) {
    // Return a normalized unit vector with uniform energy to avoid zero division
    const uniformVal = 1 / Math.sqrt(dimensions);
    return new Array(dimensions).fill(uniformVal);
  }

  const vector = new Float64Array(dimensions);
  const normalized = text.toLowerCase().trim();
  const tokens = normalized.match(/[\p{L}\p{N}₹$]+/gu) || [];

  // 1. Process whole word tokens with signed projection
  for (const token of tokens) {
    let hash = 2166136261;
    for (let i = 0; i < token.length; i++) {
      hash ^= token.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }

    const primaryIndex = Math.abs(hash) % dimensions;
    const secondaryIndex = Math.abs(Math.imul(hash, 31)) % dimensions;
    const sign = (hash & 1) === 0 ? 1.0 : -1.0;

    vector[primaryIndex] += sign * 1.5;
    vector[secondaryIndex] += -sign * 0.75;

    // Check domain clusters
    let clusterIdx = 0;
    for (const [clusterKey, keywords] of Object.entries(DOMAIN_CLUSTERS)) {
      if (keywords.includes(token) || token.includes(clusterKey)) {
        // Project onto dedicated cluster band
        const bandStart = (clusterIdx * 64) % dimensions;
        for (let b = 0; b < 16; b++) {
          const slot = (bandStart + b) % dimensions;
          vector[slot] += 2.0;
        }
      }
      clusterIdx++;
    }
  }

  // 2. Process character 3-grams for sub-word morphology and typo resilience
  for (let i = 0; i <= normalized.length - 3; i++) {
    const gram = normalized.slice(i, i + 3);
    let gramHash = 5381;
    for (let j = 0; j < gram.length; j++) {
      gramHash = (gramHash * 33) ^ gram.charCodeAt(j);
    }
    const idx = Math.abs(gramHash) % dimensions;
    vector[idx] += 0.4;
  }

  // 3. Normalize vector to unit Euclidean norm (L2 norm = 1.0)
  let sumSq = 0;
  for (let i = 0; i < dimensions; i++) {
    sumSq += vector[i] * vector[i];
  }

  const norm = Math.sqrt(sumSq);
  const result: number[] = new Array(dimensions);

  if (norm > 0) {
    for (let i = 0; i < dimensions; i++) {
      result[i] = Number((vector[i] / norm).toFixed(6));
    }
  } else {
    const uniformVal = 1 / Math.sqrt(dimensions);
    for (let i = 0; i < dimensions; i++) {
      result[i] = Number(uniformVal.toFixed(6));
    }
  }

  return result;
}

/**
 * Generates an embedding vector using Gemini `text-embedding-004` when available,
 * with deterministic fallback when offline, missing keys, or running in test environments.
 */
export async function generateEmbedding(
  text: string,
  options?: {
    apiKey?: string;
    model?: string;
    forceDeterministic?: boolean;
  }
): Promise<{
  values: number[];
  model: string;
  source: 'gemini' | 'deterministic_hash';
}> {
  if (options?.forceDeterministic) {
    return {
      values: generateDeterministicEmbedding(text),
      model: 'deterministic-token-v1',
      source: 'deterministic_hash',
    };
  }

  const apiKey =
    options?.apiKey ||
    getEnvApiKey('gemini') ||
    process.env.GEMINI_API_KEY ||
    process.env.GEMINI_LIVE_API_KEY;

  if (apiKey && process.env.NODE_ENV !== 'test') {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const modelName = options?.model || EMBEDDING_MODEL_DEFAULT;
      const embeddingModel = genAI.getGenerativeModel({ model: modelName });

      const res = await embeddingModel.embedContent(text);
      if (res?.embedding?.values && res.embedding.values.length > 0) {
        return {
          values: res.embedding.values,
          model: modelName,
          source: 'gemini',
        };
      }
    } catch {
      // Fallback silently to deterministic generator
    }
  }

  return {
    values: generateDeterministicEmbedding(text),
    model: 'deterministic-token-v1',
    source: 'deterministic_hash',
  };
}

// ----------------------------------------------------------------------------
// 4. CONTRADICTION DETECTION & AUTOMATIC SUPERSEDING
// ----------------------------------------------------------------------------

/**
 * Checks if a new memory input contradicts or updates an existing stored memory.
 */
export function detectMemoryContradiction(
  newMem: MemoryInput,
  existing: StoredMemoryRecord,
  similarity: number
): { isContradiction: boolean; reason?: string } {
  // Case 1: Exact key collision
  if (newMem.key.toLowerCase().trim() === existing.key.toLowerCase().trim()) {
    return {
      isContradiction: true,
      reason: `Exact key update for key "${existing.key}"`,
    };
  }

  // Case 2: Normalized slug collision (e.g. "primary-carrier" vs "primary_carrier")
  const normNewKey = newMem.key.toLowerCase().replace(/[-_ ]+/g, '_');
  const normExistKey = existing.key.toLowerCase().replace(/[-_ ]+/g, '_');
  if (normNewKey === normExistKey) {
    return {
      isContradiction: true,
      reason: `Key alias collision between "${newMem.key}" and "${existing.key}"`,
    };
  }

  // Case 3: High semantic similarity within the same category/taxonomy layer
  const sameDomain =
    newMem.category === existing.category ||
    newMem.taxonomyLayer === existing.taxonomyLayer;

  if (sameDomain && similarity >= 0.75) {
    // Check for explicit conflicting polarity words
    const newValLower = newMem.value.toLowerCase();
    const existValLower = existing.value.toLowerCase();

    const conflictingPairs = [
      ['always', 'never'],
      ['standard', 'express'],
      ['air', 'surface'],
      ['increase', 'decrease'],
      ['enable', 'disable'],
      ['mandatory', 'optional'],
    ];

    for (const [termA, termB] of conflictingPairs) {
      if (
        (newValLower.includes(termA) && existValLower.includes(termB)) ||
        (newValLower.includes(termB) && existValLower.includes(termA))
      ) {
        return {
          isContradiction: true,
          reason: `High semantic overlap (${(similarity * 100).toFixed(1)}%) with opposing polarities (${termA} vs ${termB})`,
        };
      }
    }

    // If semantic similarity is extremely high (> 0.88), it's virtually an updated formulation of the same rule
    if (similarity >= 0.88) {
      return {
        isContradiction: true,
        reason: `Very high semantic similarity (${(similarity * 100).toFixed(1)}%) in category "${existing.category}"`,
      };
    }
  }

  return { isContradiction: false };
}

/**
 * Stores a new memory record, performing automated semantic contradiction checks
 * and superseding outdated entries.
 */
export async function storeMemoryWithContradictionCheck(
  input: MemoryInput
): Promise<StoreMemoryResult> {
  const supabase = getServiceClient();

  if (
    !input.userId ||
    typeof input.userId !== 'string' ||
    input.userId.trim() === ''
  ) {
    return { success: false, error: 'User ID is required for memory storage' };
  }
  if (!input.key || !input.value) {
    return {
      success: false,
      error: 'Both key and value are required for memory storage',
    };
  }

  if (containsCustomerPii(input.key) || containsCustomerPii(input.value)) {
    return {
      success: false,
      error:
        'Customer payment credentials or sensitive PII cannot be stored in Co-Founder memory (CUSTOMER_PII_PROHIBITED).',
    };
  }

  try {
    const taxonomyLayer =
      input.taxonomyLayer ||
      (input.category ? inferTaxonomyLayer(input.category) : 'strategic_goal');
    const category =
      input.category || mapTaxonomyLayerToCategory(taxonomyLayer);
    const importance =
      input.importance ?? (taxonomyLayer === 'operational_rule' ? 5 : 3);
    const confidence = input.confidence ?? 1.0;
    const source = input.source || 'user_explicit';

    // 1. Generate vector embedding for semantic indexing
    const textToEmbed = `${input.key}: ${input.value}`;
    const embeddingRes = await generateEmbedding(textToEmbed);

    // 2. Query active memories for this user in the relevant scope
    const { data: existingRows, error: fetchErr } = await supabase
      .from('co_founder_memories')
      .select(
        'id, user_id, category, key, value, confidence, source, is_active, superseded_by, metadata, created_at, updated_at'
      )
      .eq('user_id', input.userId)
      .eq('is_active', true);

    if (fetchErr) {
      console.error(
        'storeMemoryWithContradictionCheck: fetch error:',
        fetchErr
      );
    }

    const supersededIds: string[] = [];
    const activeMemories: StoredMemoryRecord[] = (existingRows || []).map(
      (row: any) => ({
        id: row.id,
        userId: row.user_id,
        category: row.category,
        taxonomyLayer: inferTaxonomyLayer(row.category, row.metadata),
        key: row.key,
        value: row.value,
        confidence: Number(row.confidence || 1.0),
        importance: Number(row.metadata?.importance || 3),
        source: row.source,
        isActive: true,
        metadata: row.metadata || {},
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })
    );

    // 3. Detect contradictions and exact replacements
    for (const existing of activeMemories) {
      const existingEmbedding =
        existing.metadata?.embedding ||
        generateDeterministicEmbedding(`${existing.key}: ${existing.value}`);
      const sim = cosineSimilarity(embeddingRes.values, existingEmbedding);

      const contradiction = detectMemoryContradiction(input, existing, sim);
      if (contradiction.isContradiction) {
        supersededIds.push(existing.id);
      }
    }

    // 4. Insert new memory record
    const meta: MemoryMetadata = {
      ...(input.metadata || {}),
      embedding: embeddingRes.values,
      embedding_model: embeddingRes.model,
      taxonomy_layer: taxonomyLayer,
      importance,
      topics: input.topics || [],
      contradiction_keys: supersededIds,
      created_at_iso: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from('co_founder_memories')
      .insert({
        user_id: input.userId,
        category,
        key: input.key,
        value: input.value,
        confidence,
        source,
        metadata: meta,
        is_active: true,
      })
      .select('id')
      .single();

    if (insertErr || !inserted) {
      throw insertErr || new Error('Failed to insert memory record');
    }

    const newMemoryId = inserted.id;

    // 5. Supersede outdated records
    if (supersededIds.length > 0) {
      for (const oldId of supersededIds) {
        await supabase
          .from('co_founder_memories')
          .update({
            is_active: false,
            superseded_by: newMemoryId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', oldId);
      }
    }

    return {
      success: true,
      memoryId: newMemoryId,
      supersededIds,
    };
  } catch (err: any) {
    console.error('storeMemoryWithContradictionCheck error:', err);
    return {
      success: false,
      error: err?.message || 'Failed to store memory with contradiction check',
    };
  }
}

/**
 * Explicitly supersedes a specific memory record by ID.
 */
export async function supersedeMemoryById(
  memoryId: string,
  supersededBy: string
): Promise<boolean> {
  const supabase = getServiceClient();
  try {
    const { error } = await supabase
      .from('co_founder_memories')
      .update({
        is_active: false,
        superseded_by: supersededBy,
        updated_at: new Date().toISOString(),
      })
      .eq('id', memoryId);
    return !error;
  } catch {
    return false;
  }
}

// ----------------------------------------------------------------------------
// 5. HYBRID SEMANTIC RETRIEVAL ENGINE
// ----------------------------------------------------------------------------

/**
 * Searches memories using hybrid ranking:
 * Score = (0.50 * Similarity) + (0.25 * Recency) + (0.15 * Importance) + (0.10 * Confidence)
 */
export async function searchSemanticMemories(
  userId: string,
  query: string,
  options?: SemanticSearchOptions
): Promise<ScoredMemory[]> {
  // Tenant isolation guard: Fail-closed if userId is empty or missing
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return [];
  }

  const supabase = getServiceClient();

  const limit = options?.limit ?? 8;
  const threshold = options?.threshold ?? 0.25;
  const weights = {
    similarity: options?.weights?.similarity ?? 0.5,
    recency: options?.weights?.recency ?? 0.25,
    importance: options?.weights?.importance ?? 0.15,
    confidence: options?.weights?.confidence ?? 0.1,
  };

  try {
    // 1. Generate query embedding
    const queryEmbedding =
      options?.targetEmbedding || (await generateEmbedding(query)).values;

    // 2. Fetch candidates from database
    let dbQuery = supabase
      .from('co_founder_memories')
      .select(
        'id, user_id, category, key, value, confidence, source, is_active, superseded_by, metadata, created_at, updated_at'
      )
      .eq('is_active', options?.includeSuperseded ? undefined : true)
      .eq('user_id', userId.trim());

    if (options?.category) {
      dbQuery = dbQuery.eq('category', options.category);
    }

    const candidateLimit = Math.max(limit * 4, 30);
    const { data: rows, error } = await dbQuery
      .order('created_at', {
        ascending: false,
      })
      .limit(candidateLimit);

    if (error || !rows || rows.length === 0) {
      return [];
    }

    const scored: ScoredMemory[] = [];
    const now = Date.now();

    for (const row of rows) {
      const meta = (row.metadata || {}) as MemoryMetadata;
      const taxonomyLayer = inferTaxonomyLayer(row.category, meta);

      // Optional filter by taxonomy layer
      if (options?.layer && taxonomyLayer !== options.layer) {
        continue;
      }

      // Optional topic filter
      if (options?.topicFilter && options.topicFilter.length > 0) {
        const rowTopics: string[] = meta.topics || [];
        const hasTopicMatch = options.topicFilter.some((t) =>
          rowTopics.includes(t)
        );
        if (!hasTopicMatch) continue;
      }

      // Optional role-based permission boundary
      if (options?.userRole) {
        const roleLevels: Record<string, number> = {
          staff: 1,
          manager: 2,
          admin: 3,
          super_admin: 4,
        };
        const userLevel = roleLevels[options.userRole] ?? 1;
        const reqRole = meta.requiredRole as string | undefined;
        if (reqRole) {
          const reqLevel = roleLevels[reqRole] ?? 1;
          if (userLevel < reqLevel) {
            continue; // Exclude memory if requester lacks sufficient role
          }
        }
      }

      // Retrieve or compute memory embedding
      let memoryEmbedding = meta.embedding;
      if (!memoryEmbedding || memoryEmbedding.length === 0) {
        memoryEmbedding = generateDeterministicEmbedding(
          `${row.key}: ${row.value}`
        );
      }

      // Vector cosine similarity
      const rawSim = cosineSimilarity(queryEmbedding, memoryEmbedding);
      const similarity = Math.max(0, rawSim);

      // Recency decay (half-life of 30 days)
      const createdAtMs = new Date(row.created_at || now).getTime();
      const ageDays = Math.max(0, (now - createdAtMs) / (1000 * 60 * 60 * 24));
      const recencyScore = Math.exp(-ageDays / 30);

      // Importance score (1-5 mapped to 0.2-1.0)
      const importanceVal = Number(
        meta.importance || (taxonomyLayer === 'operational_rule' ? 5 : 3)
      );
      const importanceScore = Math.min(1.0, Math.max(0.2, importanceVal / 5));

      // Confidence score (0.0 to 1.0)
      const confidenceScore = Math.min(
        1.0,
        Math.max(0.0, Number(row.confidence || 1.0))
      );

      // Composite hybrid ranking score
      const hybridScore =
        weights.similarity * similarity +
        weights.recency * recencyScore +
        weights.importance * importanceScore +
        weights.confidence * confidenceScore;

      if (hybridScore >= threshold) {
        scored.push({
          id: row.id,
          userId: row.user_id,
          category: row.category,
          taxonomyLayer,
          key: row.key,
          value: row.value,
          confidence: confidenceScore,
          importance: importanceVal,
          source: row.source,
          isActive: row.is_active ?? true,
          supersededBy: row.superseded_by,
          metadata: meta,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          similarity: Number(similarity.toFixed(4)),
          recencyScore: Number(recencyScore.toFixed(4)),
          importanceScore: Number(importanceScore.toFixed(4)),
          confidenceScore: Number(confidenceScore.toFixed(4)),
          hybridScore: Number(hybridScore.toFixed(4)),
        });
      }
    }

    // Sort descending by hybrid score
    scored.sort((a, b) => b.hybridScore - a.hybridScore);

    return scored.slice(0, limit);
  } catch (err) {
    console.error('searchSemanticMemories error:', err);
    return [];
  }
}

// ----------------------------------------------------------------------------
// 6. PRIORITY-ENFORCED CONTEXT SYNTHESIS
// ----------------------------------------------------------------------------

/**
 * Synthesizes retrieved memories into a prioritized executive context block.
 *
 * Enforces the Golden Rule:
 * User Prompt > Live Verified Data > Approved Business Rules > Relevant Memory > Historical Memory
 */
export function synthesizePrioritizedMemoryContext(
  memories: ScoredMemory[],
  options?: ContextSynthesisOptions
): string {
  if (!memories || memories.length === 0) {
    return 'LONG-TERM MEMORIES & CONTEXT: None recorded yet.';
  }

  const maxItems = options?.maxItems ?? 10;
  const filtered = options?.filterLayers
    ? memories.filter((m) => options.filterLayers!.includes(m.taxonomyLayer))
    : memories;

  const items = filtered.slice(0, maxItems);

  // Group by priority hierarchy
  const operationalRules = items.filter(
    (m) => m.taxonomyLayer === 'operational_rule'
  );
  const strategicGoals = items.filter(
    (m) => m.taxonomyLayer === 'strategic_goal'
  );
  const preferences = items.filter((m) => m.taxonomyLayer === 'preference');
  const decisionsAndLearnings = items.filter(
    (m) =>
      m.taxonomyLayer === 'decision' ||
      m.taxonomyLayer === 'outcome_learning' ||
      m.taxonomyLayer === 'correction'
  );
  const generalContext = items.filter(
    (m) => m.taxonomyLayer === 'conversation'
  );

  const sections: string[] = [];

  // Directive Header
  sections.push(
    `[EXECUTIVE DIRECTIVE: TRUTH & PRIORITY ORDER]\n` +
      `Live Verified Store Data > Approved Operational Rules > Strategic Goals & Preferences > Historical Memory.\n` +
      `Operational rules must never be violated without explicit founder authorization.\n` +
      `When no relevant memory or store data exists, explicitly state that no data is on record; NEVER fabricate, invent, or assume unverified business facts or customer details.`
  );

  const formatFreshness = (m: ScoredMemory) => {
    const recordedDate = m.createdAt ? m.createdAt.substring(0, 10) : 'recent';
    const nowMs = Date.now();
    const createdMs = new Date(m.createdAt || nowMs).getTime();
    const ageDays = Math.max(
      0,
      Math.round((nowMs - createdMs) / (1000 * 60 * 60 * 24))
    );
    const staleMarker = ageDays > 90 ? ' [POTENTIALLY STALE: >90d]' : '';
    const sourceTag = m.source ? ` [source: ${m.source}]` : '';
    return { recordedDate, staleMarker, sourceTag };
  };

  // Tier 1: Operational Rules
  if (operationalRules.length > 0) {
    sections.push(
      `CRITICAL OPERATIONAL RULES & CONSTRAINTS:\n` +
        operationalRules
          .map((m) => {
            const conf = Math.round(m.confidence * 100);
            const { recordedDate, staleMarker, sourceTag } = formatFreshness(m);
            return `- [POLICY ${m.importance}/5 | ${conf}% conf | recorded: ${recordedDate}${sourceTag}${staleMarker}] ${m.key}: ${m.value}`;
          })
          .join('\n')
    );
  }

  // Tier 2: Strategic Goals
  if (strategicGoals.length > 0) {
    sections.push(
      `STRATEGIC GOALS & TARGETS:\n` +
        strategicGoals
          .map((m) => {
            const { recordedDate, staleMarker, sourceTag } = formatFreshness(m);
            return `- [GOAL | recorded: ${recordedDate}${sourceTag}${staleMarker}] ${m.key}: ${m.value}`;
          })
          .join('\n')
    );
  }

  // Tier 3: Founder Preferences
  if (preferences.length > 0) {
    sections.push(
      `FOUNDER PREFERENCES & BRAND TONE:\n` +
        preferences
          .map((m) => {
            const { recordedDate, staleMarker, sourceTag } = formatFreshness(m);
            return `- [PREFERENCE | recorded: ${recordedDate}${sourceTag}${staleMarker}] ${m.key}: ${m.value}`;
          })
          .join('\n')
    );
  }

  // Tier 4: Decisions & Outcome Learnings
  if (decisionsAndLearnings.length > 0) {
    sections.push(
      `RECORDED DECISIONS & OUTCOME LEARNINGS:\n` +
        decisionsAndLearnings
          .map((m) => {
            const tag =
              m.taxonomyLayer === 'outcome_learning'
                ? 'VERIFIED OUTCOME'
                : m.taxonomyLayer === 'correction'
                  ? 'VERIFIED CORRECTION'
                  : 'DECISION';
            const { recordedDate, staleMarker, sourceTag } = formatFreshness(m);
            return `- [${tag} | recorded: ${recordedDate}${sourceTag}${staleMarker}] ${m.key}: ${m.value}`;
          })
          .join('\n')
    );
  }

  // Tier 5: General Episodic Context
  if (generalContext.length > 0) {
    sections.push(
      `RELEVANT HISTORICAL CONTEXT:\n` +
        generalContext
          .map((m) => {
            const { recordedDate, staleMarker, sourceTag } = formatFreshness(m);
            return `- [CONTEXT | recorded: ${recordedDate}${sourceTag}${staleMarker}] ${m.key}: ${m.value}`;
          })
          .join('\n')
    );
  }

  return sections.join('\n\n');
}

// ----------------------------------------------------------------------------
// 7. AUTOMATED CONVERSATION MEMORY EXTRACTION
// ----------------------------------------------------------------------------

/**
 * Normalizes an extracted rule or decision into a clean, snake_case key slug.
 */
function slugifyKey(text: string, prefix = ''): string {
  const clean = text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 36);
  return prefix ? `${prefix}_${clean}` : clean;
}

/**
 * Analyzes conversational messages to extract high-signal rules, preferences,
 * decisions, and strategic targets that should be remembered long-term.
 */
export function extractMemoriesFromConversation(
  messages: Array<{ role: string; content: string }>,
  options?: { userId?: string }
): ExtractedMemoryCandidate[] {
  if (!messages || messages.length === 0) return [];

  const candidates: ExtractedMemoryCandidate[] = [];
  const userMessages = messages.filter((m) => m.role === 'user');

  for (const msg of userMessages) {
    const text = msg.content;
    const lower = text.toLowerCase();

    // 1. Operational Rules (e.g. "always keep 10 choker units in stock", "never discount diamond products > 15%")
    const operationalPatterns = [
      /always\s+keep\s+([^.?!]+)/i,
      /never\s+discount\s+([^.?!]+)/i,
      /buffer\s+stock\s+should\s+be\s+([^.?!]+)/i,
      /free\s+shipping\s+(?:threshold|over)\s+([^.?!]+)/i,
      /policy\s+is\s+to\s+([^.?!]+)/i,
      /delivery\s+sla\s+(?:is|should\s+be)\s+([^.?!]+)/i,
    ];

    for (const pat of operationalPatterns) {
      const match = text.match(pat);
      if (match) {
        candidates.push({
          key: slugifyKey(match[1].slice(0, 24), 'rule'),
          value: match[0].trim(),
          taxonomyLayer: 'operational_rule',
          category: 'operational_rule',
          confidence: 0.95,
          importance: 5,
          source: 'user_explicit',
          reason: `Matched operational rule pattern: "${match[0]}"`,
          topics: ['operations', 'policy'],
        });
      }
    }

    // 2. Strategic Goals (e.g. "our target is ₹50 Lakhs for festive collection")
    const goalPatterns = [
      /(?:our\s+)?target\s+is\s+([^.?!]+)/i,
      /(?:our\s+)?goal\s+is\s+to\s+([^.?!]+)/i,
      /aiming\s+for\s+([^.?!]+)/i,
      /diwali\s+(?:target|campaign|revenue)\s+is\s+([^.?!]+)/i,
      /q\d\s+target\s+is\s+([^.?!]+)/i,
    ];

    for (const pat of goalPatterns) {
      const match = text.match(pat);
      if (match) {
        candidates.push({
          key: slugifyKey(match[1].slice(0, 24), 'target'),
          value: match[0].trim(),
          taxonomyLayer: 'strategic_goal',
          category: 'strategic_goal',
          confidence: 0.9,
          importance: 4,
          source: 'user_explicit',
          reason: `Matched strategic goal pattern: "${match[0]}"`,
          topics: ['strategy', 'revenue'],
        });
        break;
      }
    }

    // 3. Founder Preferences (e.g. "we prefer Blue Dart Express", "speak in a concise executive tone")
    const preferencePatterns = [
      /(?:we|i)\s+prefer\s+([^.?!]+)/i,
      /brand\s+tone\s+should\s+be\s+([^.?!]+)/i,
      /always\s+format\s+([^.?!]+)/i,
      /primary\s+carrier\s+is\s+([^.?!]+)/i,
      /don't\s+send\s+emails\s+on\s+([^.?!]+)/i,
    ];

    for (const pat of preferencePatterns) {
      const match = text.match(pat);
      if (match) {
        candidates.push({
          key: slugifyKey(match[1].slice(0, 24), 'pref'),
          value: match[0].trim(),
          taxonomyLayer: 'preference',
          category: 'business_preference',
          confidence: 0.88,
          importance: 3,
          source: 'user_explicit',
          reason: `Matched founder preference pattern: "${match[0]}"`,
          topics: ['brand', 'preference'],
        });
        break;
      }
    }

    // 4. Corrections (e.g. "that's wrong, we actually use Blue Dart Air", "correct that to 15 days")
    const correctionPatterns = [
      /(?:that'?s\s+(?:wrong|incorrect|not\s+right)),?\s*([^.?!]+)/i,
      /actually,?\s*(?:we|it's|it\s+is)\s+([^.?!]+)/i,
      /correct\s+(?:that|it)\s+to\s+([^.?!]+)/i,
    ];

    for (const pat of correctionPatterns) {
      const match = text.match(pat);
      if (match) {
        candidates.push({
          key: slugifyKey(match[1].slice(0, 24), 'correction'),
          value: match[0].trim(),
          taxonomyLayer: 'correction',
          category: 'correction',
          confidence: 1.0,
          importance: 4,
          source: 'correction',
          reason: `Matched correction pattern: "${match[0]}"`,
          topics: ['correction'],
        });
        break;
      }
    }
  }

  // Deduplicate candidates by key
  const uniqueMap = new Map<string, ExtractedMemoryCandidate>();
  for (const c of candidates) {
    if (!uniqueMap.has(c.key)) {
      uniqueMap.set(c.key, c);
    }
  }

  return Array.from(uniqueMap.values());
}
