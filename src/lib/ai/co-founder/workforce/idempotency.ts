// src/lib/ai/co-founder/workforce/idempotency.ts
//
// Authoritative Idempotency & Nonce Ledger for Workforce Governance.
// Prevents duplicate mutations, double-spends, and approval replay attacks.
// Section 7 (Phase 8) of the Upgrade Guide.

import 'server-only';
import { getServiceClient } from '@/lib/supabase/service';

interface IdempotencyRecord {
  key: string;
  result: any;
  timestamp: number;
  expiresAt: number;
}

class DistributedIdempotencyStore {
  private inMemoryIdempotency = new Map<string, IdempotencyRecord>();
  private consumedNonces = new Map<
    string,
    { approvalId: string; consumedAt: number }
  >();
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Checks whether a cryptographic approval nonce has already been consumed.
   */
  isNonceConsumed(nonce: string): boolean {
    if (!nonce) return false;
    return this.consumedNonces.has(nonce);
  }

  /**
   * Consumes an approval nonce, ensuring single-use execution.
   */
  consumeNonce(nonce: string, approvalId: string): void {
    if (!nonce) return;
    this.consumedNonces.set(nonce, {
      approvalId,
      consumedAt: Date.now(),
    });
  }

  /**
   * Checks if an operation with this idempotency key has already completed.
   */
  async checkIdempotency(key: string): Promise<any | undefined> {
    if (!key) return undefined;
    const now = Date.now();

    // 1. Check local cache
    const cached = this.inMemoryIdempotency.get(key);
    if (cached) {
      if (now <= cached.expiresAt) {
        return cached.result;
      }
      this.inMemoryIdempotency.delete(key);
    }

    // 2. Check Supabase persistent store
    try {
      const supabase = getServiceClient();
      const { data, error } = await supabase
        .from('co_founder_approvals')
        .select('execution_result, status, expires_at')
        .eq('idempotency_key', key)
        .maybeSingle();

      if (!error && data && data.execution_result) {
        return data.execution_result;
      }
    } catch {
      // Fallback in-memory
    }

    return undefined;
  }

  /**
   * Records completed mutation result under its idempotency key.
   */
  async recordIdempotency(
    key: string,
    result: any,
    ttlMs: number = this.DEFAULT_TTL_MS
  ): Promise<void> {
    if (!key) return;
    const now = Date.now();
    const expiresAt = now + ttlMs;

    this.inMemoryIdempotency.set(key, {
      key,
      result,
      timestamp: now,
      expiresAt,
    });

    try {
      const supabase = getServiceClient();
      await supabase
        .from('co_founder_approvals')
        .update({
          execution_result: result,
          status: 'executed',
        })
        .eq('idempotency_key', key);
    } catch {
      // Best effort DB write
    }
  }

  /**
   * Resets local state for testing teardown.
   */
  reset(): void {
    this.inMemoryIdempotency.clear();
    this.consumedNonces.clear();
  }
}

export const distributedIdempotencyStore = new DistributedIdempotencyStore();
