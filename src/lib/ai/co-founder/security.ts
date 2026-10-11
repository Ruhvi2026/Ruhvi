import 'server-only';

import type { BusinessActionResult } from './action-engine';

/**
 * ============================================================================
 * CO-FOUNDER ENTERPRISE SECURITY HARDENING & SAFEGUARDS (PHASE 10)
 * ============================================================================
 * Provides:
 * 1. Multi-tier prompt injection and adversarial jailbreak detection.
 * 2. Sensitive credential & PII data redaction (cards, PAN, Aadhaar, API keys).
 * 3. Session token budget guard preventing runaway agent loops and billing spikes.
 * 4. High-impact mutation idempotency store preventing duplicate mutations.
 * 5. Action payload sanity validation for irreversible state modifications.
 */

// ----------------------------------------------------------------------------
// 1. PROMPT INJECTION & JAILBREAK FILTER
// ----------------------------------------------------------------------------

export interface SecurityCheckResult {
  safe: boolean;
  threatLevel: 'none' | 'low' | 'medium' | 'high';
  matchedPattern?: string;
  sanitizedPrompt: string;
  reason?: string;
}

const HIGH_THREAT_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  {
    regex:
      /(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|directives|rules)/i,
    name: 'instruction_override',
  },
  {
    regex:
      /(?:reveal|show|print|display|output|tell\s+me)\s+(?:your\s+)?(?:system|developer|hidden|secret|initial)\s+(?:prompt|instructions|directive)/i,
    name: 'system_prompt_extraction',
  },
  {
    regex:
      /(?:what\s+(?:are|were)\s+your\s+(?:(?:initial|original|system)\s+)+instructions)/i,
    name: 'instructions_query',
  },
  {
    regex:
      /\b(?:dan\s+mode|jailbreak|unfiltered\s+mode|developer\s+mode\s+enabled|unrestricted\s+ai)\b/i,
    name: 'jailbreak_persona',
  },
  {
    regex:
      /(?:you\s+(?:are|must)\s+now\s+act\s+as\s+an\s+unrestricted)/i,
    name: 'unrestricted_persona',
  },
  {
    regex:
      /(?:simulate|pretend\s+to\s+be)\s+(?:a\s+hacker|an\s+evil|root\s+user|system\s+administrator\s+with\s+no\s+rules)/i,
    name: 'adversarial_roleplay',
  },
  {
    regex:
      /(?:<\|im_start\|>system|<\|start_header_id\|>system|\[SYSTEM_PROMPT\]|\[ADMIN_OVERRIDE\])/i,
    name: 'delimiter_hijack',
  },
];

const MEDIUM_THREAT_PATTERNS: Array<{ regex: RegExp; name: string }> = [
  {
    regex: /(?:bypass\s+(?:security|safety|filter|guardrail))/i,
    name: 'guardrail_bypass',
  },
  {
    regex: /(?:pretend\s+you\s+have\s+no\s+(?:limits|restrictions|ethics))/i,
    name: 'limit_removal',
  },
];

/**
 * Validates prompt input against adversarial prompt injection and jailbreak attacks.
 */
export function validatePromptSecurity(prompt: string): SecurityCheckResult {
  if (!prompt || typeof prompt !== 'string') {
    return {
      safe: true,
      threatLevel: 'none',
      sanitizedPrompt: '',
    };
  }

  // 1. Check High Threat Patterns (Immediate Rejection)
  for (const pat of HIGH_THREAT_PATTERNS) {
    if (pat.regex.test(prompt)) {
      return {
        safe: false,
        threatLevel: 'high',
        matchedPattern: pat.name,
        sanitizedPrompt: prompt,
        reason: `Potential prompt injection or safety bypass detected (${pat.name}).`,
      };
    }
  }

  // 2. Check Medium Threat Patterns
  for (const pat of MEDIUM_THREAT_PATTERNS) {
    if (pat.regex.test(prompt)) {
      return {
        safe: true,
        threatLevel: 'medium',
        matchedPattern: pat.name,
        sanitizedPrompt: prompt,
        reason: `Caution: Pattern flagged for elevated monitoring (${pat.name}).`,
      };
    }
  }

  return {
    safe: true,
    threatLevel: 'none',
    sanitizedPrompt: prompt.trim(),
  };
}

// ----------------------------------------------------------------------------
// 2. PII & SENSITIVE CREDENTIAL REDACTION
// ----------------------------------------------------------------------------

/**
 * Redacts sensitive credentials, authentication tokens, payment card numbers,
 * PAN, and Aadhaar numbers from strings before external logging or caching.
 */
export function redactSensitiveData(text: string): string {
  if (!text || typeof text !== 'string') return text;

  let redacted = text;

  // 1. Credit / Debit Cards (13-19 digits formatted)
  redacted = redacted.replace(
    /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    '[REDACTED_CARD]'
  );

  // 2. Indian Aadhaar Card (4 4 4 digits)
  redacted = redacted.replace(
    /\b\d{4}\s\d{4}\s\d{4}\b/g,
    '[REDACTED_AADHAAR]'
  );

  // 3. Indian PAN Card (5 uppercase letters, 4 digits, 1 uppercase letter)
  redacted = redacted.replace(
    /\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g,
    '[REDACTED_PAN]'
  );

  // 4. Bearer Tokens & Known API Key prefixes (Gemini AIza, OpenAI sk-, GitHub ghp)
  redacted = redacted.replace(
    /\b(?:Bearer\s+[A-Za-z0-9_\-\.]{15,}|(?:sk[-_]|AIza|ghp)[A-Za-z0-9_\-]{15,})\b/g,
    '[REDACTED_SECRET]'
  );

  // 5. JSON password / secret fields
  redacted = redacted.replace(
    /"(password|secret|apiKey|serviceRoleKey)"\s*:\s*"[^"]+"/gi,
    '"$1": "[REDACTED]"'
  );

  return redacted;
}

// ----------------------------------------------------------------------------
// 3. SESSION & USER TOKEN BUDGET GUARDS
// ----------------------------------------------------------------------------

export interface SessionBudgetStatus {
  allowed: boolean;
  remainingTokens: number;
  consumedTokens: number;
  limit: number;
  resetAt: number;
  reason?: string;
}

interface SessionEntry {
  consumedTokens: number;
  createdAt: number;
  lastUpdated: number;
}

export class TokenBudgetManager {
  private sessions: Map<string, SessionEntry> = new Map();
  private defaultSessionCap: number;
  private sessionWindowMs: number;
  private pruneTimer: NodeJS.Timeout | null = null;

  constructor(options?: {
    defaultSessionCap?: number;
    sessionWindowMs?: number;
  }) {
    this.defaultSessionCap = options?.defaultSessionCap || 100_000;
    this.sessionWindowMs = options?.sessionWindowMs || 3600_000 * 4; // 4-hour session window

    if (typeof setInterval !== 'undefined') {
      this.pruneTimer = setInterval(() => {
        this.pruneExpiredSessions();
      }, 600_000);
      if (this.pruneTimer && typeof this.pruneTimer.unref === 'function') {
        this.pruneTimer.unref();
      }
    }
  }

  checkBudget(
    sessionId: string,
    estimatedTokens: number = 0,
    roleLimitOverride?: number
  ): SessionBudgetStatus {
    const now = Date.now();
    const entry = this.sessions.get(sessionId);
    const limit = roleLimitOverride || this.defaultSessionCap;

    if (!entry) {
      return {
        allowed: estimatedTokens <= limit,
        remainingTokens: Math.max(0, limit - estimatedTokens),
        consumedTokens: 0,
        limit,
        resetAt: now + this.sessionWindowMs,
      };
    }

    // Check if session has expired
    if (now - entry.createdAt > this.sessionWindowMs) {
      this.sessions.delete(sessionId);
      return {
        allowed: estimatedTokens <= limit,
        remainingTokens: Math.max(0, limit - estimatedTokens),
        consumedTokens: 0,
        limit,
        resetAt: now + this.sessionWindowMs,
      };
    }

    const projected = entry.consumedTokens + estimatedTokens;
    const allowed = projected <= limit;

    return {
      allowed,
      remainingTokens: Math.max(0, limit - entry.consumedTokens),
      consumedTokens: entry.consumedTokens,
      limit,
      resetAt: entry.createdAt + this.sessionWindowMs,
      reason: allowed
        ? undefined
        : `Token budget limit of ${limit.toLocaleString()} exceeded. (Consumed: ${entry.consumedTokens.toLocaleString()})`,
    };
  }

  consumeTokens(
    sessionId: string,
    tokens: number,
    roleLimitOverride?: number
  ): SessionBudgetStatus {
    const now = Date.now();
    let entry = this.sessions.get(sessionId);
    const limit = roleLimitOverride || this.defaultSessionCap;

    if (!entry || now - entry.createdAt > this.sessionWindowMs) {
      entry = {
        consumedTokens: 0,
        createdAt: now,
        lastUpdated: now,
      };
      this.sessions.set(sessionId, entry);
    }

    entry.consumedTokens += tokens;
    entry.lastUpdated = now;

    const allowed = entry.consumedTokens <= limit;

    return {
      allowed,
      remainingTokens: Math.max(0, limit - entry.consumedTokens),
      consumedTokens: entry.consumedTokens,
      limit,
      resetAt: entry.createdAt + this.sessionWindowMs,
      reason: allowed
        ? undefined
        : `Token budget limit exceeded after consuming ${tokens.toLocaleString()} tokens.`,
    };
  }

  resetBudget(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  pruneExpiredSessions(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of this.sessions.entries()) {
      if (now - entry.createdAt > this.sessionWindowMs) {
        this.sessions.delete(key);
        pruned++;
      }
    }
    return pruned;
  }

  clear(): void {
    this.sessions.clear();
  }

  destroy(): void {
    if (this.pruneTimer) {
      clearInterval(this.pruneTimer);
      this.pruneTimer = null;
    }
    this.clear();
  }
}

// Global Singleton for Token Budget
export const tokenBudgetManager = new TokenBudgetManager();

// ----------------------------------------------------------------------------
// 4. MUTATION IDEMPOTENCY & SANITY SAFEGUARDS
// ----------------------------------------------------------------------------

interface IdempotencyRecord {
  result: BusinessActionResult;
  timestamp: number;
  expiresAt: number;
}

const idempotencyStore = new Map<string, IdempotencyRecord>();

/**
 * Checks if a mutating business action with idempotencyKey has already executed.
 */
export function checkActionIdempotency(
  key: string
): BusinessActionResult | undefined {
  if (!key) return undefined;
  const now = Date.now();
  const record = idempotencyStore.get(key);

  if (!record) return undefined;
  if (now > record.expiresAt) {
    idempotencyStore.delete(key);
    return undefined;
  }

  return record.result;
}

/**
 * Caches an executed business action by its idempotency key.
 */
export function recordActionIdempotency(
  key: string,
  result: BusinessActionResult,
  ttlMs: number = 300_000 // 5-minute idempotency cache
): void {
  if (!key) return;
  const now = Date.now();
  idempotencyStore.set(key, {
    result,
    timestamp: now,
    expiresAt: now + ttlMs,
  });
}

/**
 * Resets idempotency store (clean for testing).
 */
export function resetIdempotencyStore(): void {
  idempotencyStore.clear();
}

/**
 * Validates payload parameters before executing irreversible state actions.
 */
export function validateActionPayloadSanity(
  actionType: string,
  payload: Record<string, any>
): { valid: boolean; error?: string } {
  if (!payload || typeof payload !== 'object') {
    return { valid: false, error: 'Action payload must be a valid object.' };
  }

  switch (actionType) {
    case 'update_inventory_stock': {
      const qty =
        payload.new_stock_quantity !== undefined
          ? payload.new_stock_quantity
          : payload.quantity !== undefined
            ? payload.quantity
            : payload.stock_quantity;

      if (qty === undefined || qty === null) {
        return { valid: false, error: 'Inventory quantity is required.' };
      }
      if (typeof qty !== 'number' || isNaN(qty) || qty < 0) {
        return {
          valid: false,
          error: 'Inventory quantity must be a non-negative number.',
        };
      }
      return { valid: true };
    }

    case 'refund_order': {
      if (!payload.orderId && !payload.order_id) {
        return { valid: false, error: 'Order ID is required for refunds.' };
      }
      if (payload.amount !== undefined) {
        if (
          typeof payload.amount !== 'number' ||
          isNaN(payload.amount) ||
          payload.amount <= 0
        ) {
          return {
            valid: false,
            error: 'Refund amount must be a positive number.',
          };
        }
      }
      return { valid: true };
    }

    case 'create_coupon': {
      if (!payload.code || typeof payload.code !== 'string') {
        return { valid: false, error: 'Coupon code is required.' };
      }
      if (payload.discount_percent !== undefined) {
        if (
          typeof payload.discount_percent !== 'number' ||
          payload.discount_percent <= 0 ||
          payload.discount_percent > 100
        ) {
          return {
            valid: false,
            error: 'Discount percentage must be between 1 and 100.',
          };
        }
      }
      return { valid: true };
    }

    case 'update_product': {
      if (payload.price !== undefined) {
        if (
          typeof payload.price !== 'number' ||
          isNaN(payload.price) ||
          payload.price < 0
        ) {
          return {
            valid: false,
            error: 'Product price must be a non-negative number.',
          };
        }
      }
      return { valid: true };
    }

    default:
      return { valid: true };
  }
}
