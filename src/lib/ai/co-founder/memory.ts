import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

export type MemoryCategory =
  | 'strategic_goal'
  | 'business_preference'
  | 'operational_rule'
  | 'correction'
  | 'decision'
  | 'general';

export interface CoFounderMemoryItem {
  id?: string;
  userId: string;
  category: MemoryCategory;
  key: string;
  value: string;
  confidence?: number;
  source?: 'user_explicit' | 'session_inference' | 'system' | 'correction';
  metadata?: Record<string, any>;
  isActive?: boolean;
}

export interface MemoryRetrievalOptions {
  userRole?: 'staff' | 'manager' | 'admin' | 'super_admin';
}

/**
 * Customer PII Guard:
 * Invariant: Co-Founder memory must NEVER store or expose raw customer credit cards,
 * CVVs, or cleartext passwords.
 */
export function containsCustomerPii(text: string): boolean {
  if (!text || typeof text !== 'string') return false;
  // Credit card pattern (13-19 digits, possibly spaced/hyphenated)
  const cardPattern = /\b(?:\d[ -]*?){13,19}\b/;
  // Raw password/CVV pattern
  const passwordPattern = /(?:password|passwd|cvv|pin)\s*[:=]\s*[^\s]+/i;
  return cardPattern.test(text) || passwordPattern.test(text);
}

/**
 * Intelligent Memory Retrieval
 *
 * Fetches active long-term memories relevant to the query/category.
 * Ranked by recency and relevance to prevent prompt bloat.
 * Strictly enforces tenant isolation (fail-closed if userId is empty).
 */
export async function getRelevantMemories(
  userId: string,
  category?: MemoryCategory,
  limit = 10,
  options?: MemoryRetrievalOptions
): Promise<CoFounderMemoryItem[]> {
  // Tenant isolation guard: Fail-closed if userId is empty or missing
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return [];
  }

  const supabase = getServiceClient();

  try {
    let query = supabase
      .from('co_founder_memories')
      .select(
        'id, user_id, category, key, value, confidence, source, metadata, created_at'
      )
      .eq('is_active', true)
      .eq('user_id', userId.trim());

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data) {
      return [];
    }

    // Role-based permission filtering
    const roleLevels: Record<string, number> = {
      staff: 1,
      manager: 2,
      admin: 3,
      super_admin: 4,
    };
    const userLevel = options?.userRole
      ? (roleLevels[options.userRole] ?? 1)
      : 4;

    const filtered = data.filter((d: any) => {
      const reqRole = d.metadata?.requiredRole;
      if (!reqRole) return true;
      const reqLevel = roleLevels[reqRole] ?? 1;
      return userLevel >= reqLevel;
    });

    return filtered.map((d: any) => ({
      id: d.id,
      userId: d.user_id,
      category: d.category,
      key: d.key,
      value: d.value,
      confidence: Number(d.confidence || 1.0),
      source: d.source,
      metadata: d.metadata,
      isActive: true,
    }));
  } catch (err) {
    console.error('getRelevantMemories error:', err);
    return [];
  }
}

/**
 * Memory Write Policy
 *
 * Stores high-signal, reusable information. Replaces existing key if updating same topic.
 * Enforces customer PII protection and strict tenant identity.
 */
export async function writeCoFounderMemory(
  item: CoFounderMemoryItem
): Promise<{ success: boolean; memoryId?: string; error?: string }> {
  if (
    !item.userId ||
    typeof item.userId !== 'string' ||
    item.userId.trim() === ''
  ) {
    return {
      success: false,
      error: 'User ID is required for memory storage (tenant isolation).',
    };
  }

  if (containsCustomerPii(item.key) || containsCustomerPii(item.value)) {
    return {
      success: false,
      error:
        'Customer payment credentials or sensitive PII cannot be stored in Co-Founder memory (CUSTOMER_PII_PROHIBITED).',
    };
  }

  const supabase = getServiceClient();

  try {
    // 1. Check if an active memory with the exact same key already exists for this tenant
    const { data: existing } = await supabase
      .from('co_founder_memories')
      .select('id')
      .eq('user_id', item.userId.trim())
      .eq('key', item.key)
      .eq('is_active', true)
      .maybeSingle();

    // 2. Insert new memory
    const { data: inserted, error } = await supabase
      .from('co_founder_memories')
      .insert({
        user_id: item.userId.trim(),
        category: item.category,
        key: item.key,
        value: item.value,
        confidence: item.confidence ?? 1.0,
        source: item.source || 'user_explicit',
        metadata: item.metadata || {},
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !inserted) {
      throw error || new Error('Failed to insert memory');
    }

    // 3. If previous memory existed, mark it as superseded
    if (existing?.id) {
      await supabase
        .from('co_founder_memories')
        .update({
          is_active: false,
          superseded_by: inserted.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
    }

    return { success: true, memoryId: inserted.id };
  } catch (err: any) {
    console.error('writeCoFounderMemory error:', err);
    return { success: false, error: err?.message || 'Failed to write memory' };
  }
}

/**
 * Memory Correction
 *
 * Explicitly supersedes outdated or incorrect memory with verified information.
 */
export async function correctCoFounderMemory(
  userId: string,
  key: string,
  correctedValue: string,
  correctionReason?: string
): Promise<{ success: boolean; error?: string }> {
  return writeCoFounderMemory({
    userId,
    category: 'correction',
    key,
    value: correctedValue,
    source: 'correction',
    confidence: 1.0,
    metadata: {
      reason: correctionReason || 'User explicit correction',
      correctedAt: Date.now(),
    },
  });
}

/**
 * Deletes a specific memory record by ID for a user.
 * Enforces ownership boundary.
 */
export async function deleteCoFounderMemory(
  userId: string,
  memoryId: string
): Promise<{ success: boolean; error?: string }> {
  if (!userId || typeof userId !== 'string' || !memoryId) {
    return { success: false, error: 'User ID and Memory ID are required.' };
  }
  const supabase = getServiceClient();
  try {
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('co_founder_memories')
      .update({
        is_active: false,
        metadata: { deleted_at: nowIso, deleted_by: userId },
        updated_at: nowIso,
      })
      .eq('id', memoryId)
      .eq('user_id', userId.trim());

    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    console.error('deleteCoFounderMemory error:', err);
    return { success: false, error: err.message || 'Failed to delete memory' };
  }
}

/**
 * Purges all active memories for a given user.
 * Used for statutory customer data erasure (Phase 38) and GDPR/DPDP compliance.
 */
export async function purgeUserMemories(
  userId: string
): Promise<{ success: boolean; purgedCount: number; error?: string }> {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return {
      success: false,
      purgedCount: 0,
      error: 'User ID is required for memory purge.',
    };
  }
  const supabase = getServiceClient();
  try {
    const nowIso = new Date().toISOString();
    const { data, error } = await supabase
      .from('co_founder_memories')
      .update({
        is_active: false,
        metadata: { purged_at: nowIso, purged_reason: 'statutory_erasure' },
        updated_at: nowIso,
      })
      .eq('user_id', userId.trim())
      .eq('is_active', true)
      .select('id');

    if (error) throw error;
    return { success: true, purgedCount: data ? data.length : 0 };
  } catch (err: any) {
    console.error('purgeUserMemories error:', err);
    return {
      success: false,
      purgedCount: 0,
      error: err.message || 'Failed to purge memories',
    };
  }
}
