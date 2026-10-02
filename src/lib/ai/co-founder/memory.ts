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

/**
 * Intelligent Memory Retrieval
 *
 * Fetches active long-term memories relevant to the query/category.
 * Ranked by recency and relevance to prevent prompt bloat.
 */
export async function getRelevantMemories(
  userId: string,
  category?: MemoryCategory,
  limit = 10
): Promise<CoFounderMemoryItem[]> {
  const supabase = getServiceClient();

  try {
    let query = supabase
      .from('co_founder_memories')
      .select(
        'id, user_id, category, key, value, confidence, source, metadata, created_at'
      )
      .eq('is_active', true);

    if (userId) {
      query = query.eq('user_id', userId);
    }

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) {
      return [];
    }

    return data.map((d: any) => ({
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
 */
export async function writeCoFounderMemory(
  item: CoFounderMemoryItem
): Promise<{ success: boolean; memoryId?: string }> {
  const supabase = getServiceClient();

  try {
    // 1. Check if an active memory with the exact same key already exists
    const { data: existing } = await supabase
      .from('co_founder_memories')
      .select('id')
      .eq('user_id', item.userId)
      .eq('key', item.key)
      .eq('is_active', true)
      .maybeSingle();

    // 2. Insert new memory
    const { data: inserted, error } = await supabase
      .from('co_founder_memories')
      .insert({
        user_id: item.userId,
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
    return { success: false };
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
): Promise<{ success: boolean }> {
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
