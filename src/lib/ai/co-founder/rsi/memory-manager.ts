/**
 * Ruhvi AI Co-Founder — Persistent Memory Manager
 * Phase 2: Explicit owner instructions, versioned memories, strict scope conflict resolution,
 * and graceful fallback.
 */

import { getCofounderDataClient } from '../data-client';
import { RsiMemoryItem } from './types';
import { assertRsiOperationAllowed } from './governance';

export interface RememberOptions {
  scope?: string;
  normalizedKey?: string;
  priority?: number;
  memoryType?:
    | 'user_instruction'
    | 'user_preference'
    | 'project_memory'
    | 'episodic_memory';
  source?: string;
}

export class RsiMemoryManager {
  private client = getCofounderDataClient();

  /**
   * 1. Remember: Explicit owner instruction
   */
  async remember(
    content: string,
    options: RememberOptions = {}
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    assertRsiOperationAllowed('memory_write');

    if (!content || !content.trim()) {
      return { success: false, error: 'Memory content cannot be empty' };
    }

    const payload = {
      content: content.trim(),
      scope: options.scope || 'global',
      normalized_key: options.normalizedKey,
      priority: options.priority ?? 1,
      memory_type: options.memoryType || 'user_instruction',
      source: options.source || 'user_explicit',
    };

    const res = await this.client.saveExplicitMemory(payload);
    if (!res.success) {
      return { success: false, error: res.error || 'Failed to persist memory' };
    }

    return { success: true, id: res.data?.id };
  }

  /**
   * 2. Search: Filter by scope, type, and keyword matching
   */
  async search(params: {
    query?: string;
    scope?: string;
    type?: RsiMemoryItem['memory_type'];
    limit?: number;
  }): Promise<RsiMemoryItem[]> {
    assertRsiOperationAllowed('memory_read');

    const res = await this.client.searchMemories({
      type: params.type,
      scope: params.scope,
      limit: params.limit || 20,
    });

    if (!res.success || !Array.isArray(res.data)) {
      return [];
    }

    let items: RsiMemoryItem[] = res.data;

    // In-memory filter for query relevance (case-insensitive & whitespace trimmed)
    if (params.query) {
      const q = params.query.toLowerCase().trim();
      items = items.filter(
        (m) =>
          m.content.toLowerCase().includes(q) ||
          (m.normalized_key && m.normalized_key.toLowerCase().includes(q))
      );
    }

    return items;
  }

  /**
   * 3. Show: Retrieve active memories formatted for human inspection
   */
  async show(scope = 'global'): Promise<RsiMemoryItem[]> {
    return this.search({ scope, limit: 100 });
  }

  /**
   * 4. Update: Update existing memory while preserving version history
   */
  async update(
    id: string,
    newContent: string,
    changeReason: string = 'User instruction update'
  ): Promise<{ success: boolean; error?: string }> {
    assertRsiOperationAllowed('memory_write');

    const res = await this.client.saveExplicitMemory({
      id,
      content: newContent,
      source: 'user_update',
    });

    return { success: res.success, error: res.error };
  }

  /**
   * 5. Forget: Archive memory with audit trail
   */
  async forget(id: string): Promise<{ success: boolean; error?: string }> {
    assertRsiOperationAllowed('memory_write');

    const res = await this.client.forgetMemory(id);
    return { success: res.success, error: res.error };
  }

  /**
   * 6. Resolve Conflict: Determine precedence between overlapping instructions.
   * Rule: Narrower scope supersedes broader scope.
   * If scopes are equal, returns a conflict alert without silent overwrite.
   */
  resolveConflict(
    memoryA: RsiMemoryItem,
    memoryB: RsiMemoryItem
  ): {
    winner?: RsiMemoryItem;
    hasConflict: boolean;
    reason: string;
  } {
    // 1. User instructions have absolute precedence over candidate lessons and verified lessons (RSI-GAP-009)
    if (
      memoryA.memory_type === 'user_instruction' &&
      (memoryB.memory_type === 'candidate_lesson' ||
        memoryB.memory_type === 'verified_lesson')
    ) {
      return {
        winner: memoryA,
        hasConflict: false,
        reason:
          'Explicit user instruction has absolute precedence over candidate/verified lessons',
      };
    }
    if (
      memoryB.memory_type === 'user_instruction' &&
      (memoryA.memory_type === 'candidate_lesson' ||
        memoryA.memory_type === 'verified_lesson')
    ) {
      return {
        winner: memoryB,
        hasConflict: false,
        reason:
          'Explicit user instruction has absolute precedence over candidate/verified lessons',
      };
    }

    // 2. Scope precedence: specific scope (e.g., 'task:123' or 'user:1') beats 'global'
    const isASpecific = memoryA.scope !== 'global';
    const isBSpecific = memoryB.scope !== 'global';

    if (isASpecific && !isBSpecific) {
      return {
        winner: memoryA,
        hasConflict: false,
        reason: `Narrow scope (${memoryA.scope}) overrides global preference`,
      };
    }
    if (isBSpecific && !isASpecific) {
      return {
        winner: memoryB,
        hasConflict: false,
        reason: `Narrow scope (${memoryB.scope}) overrides global preference`,
      };
    }

    // 3. Priority precedence if scopes are identical
    if (memoryA.priority > memoryB.priority) {
      return {
        winner: memoryA,
        hasConflict: false,
        reason: `Higher priority (${memoryA.priority} vs ${memoryB.priority})`,
      };
    }
    if (memoryB.priority > memoryA.priority) {
      return {
        winner: memoryB,
        hasConflict: false,
        reason: `Higher priority (${memoryB.priority} vs ${memoryA.priority})`,
      };
    }

    // 4. Equal scope and equal priority -> genuine conflict detected
    return {
      hasConflict: true,
      reason:
        'Equal scope and priority instructions conflict. Clarification required.',
    };
  }
}
