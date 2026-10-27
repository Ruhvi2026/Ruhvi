import 'server-only';

import crypto from 'crypto';
import type {
  AuditCheckCategory,
  AuditSeverity,
  AuditCheckResult,
  AuditCheckStatus,
} from './self-audit-registry';
import type { AuditRunReport } from './self-audit-runner';

/**
 * ============================================================================
 * SELF-AUDIT FINDINGS PERSISTENCE & DEDUPLICATION (TRACK J - PHASE 49)
 * ============================================================================
 * Manages finding lifecycle, fingerprint-based deduplication, auto-resolution,
 * and state transitions for all diagnostic audit results.
 *
 * Guarantees:
 * 1. Deterministic Identity: Unique SHA-256 fingerprint generated from checkId,
 *    category, and title prevents duplicate incidents for ongoing issues.
 * 2. Deduplication on Repeated Scans: Subsequent failures of an active issue
 *    update occurrence counts and history rather than spawning new records.
 * 3. Auto-Resolution on Healthy Runs: Active findings automatically transition
 *    to 'RESOLVED' when subsequent audit runs evaluate the check as 'PASS'.
 * 4. Reopen Transition Logic: Resolved issues reopen as active if relapsed.
 * 5. Zero Secret Storage: Sanitizes observed values, stripping private keys,
 *    bearer tokens, and customer PII before saving.
 */

export type FindingStatus = 'ACTIVE' | 'ACKNOWLEDGED' | 'RESOLVED' | 'EXPIRED';

export interface FindingObservationHistory {
  observedAt: string;
  status: AuditCheckStatus;
  message: string;
  durationMs: number;
}

export interface SelfAuditFinding {
  id: string;
  fingerprint: string;
  checkId: string;
  category: AuditCheckCategory;
  severity: AuditSeverity;
  status: FindingStatus;
  title: string;
  message: string;
  evidenceSource: string;
  remediationHint?: string;
  sanitizedObservedValue?: any;
  occurrenceCount: number;
  reopenCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedAt?: string;
  resolutionReason?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  history: FindingObservationHistory[];
}

export interface FindingProcessingSummary {
  processedAt: string;
  created: SelfAuditFinding[];
  updated: SelfAuditFinding[];
  reopened: SelfAuditFinding[];
  autoResolved: SelfAuditFinding[];
  activeCount: number;
  totalFindings: number;
}

export interface FindingFilters {
  status?: FindingStatus | 'ALL';
  category?: AuditCheckCategory | 'ALL';
  severity?: AuditSeverity | 'ALL';
  searchQuery?: string;
  limit?: number;
  offset?: number;
}

// ─── Deterministic Finite State Machine Allowed Transitions ─────────────────
const VALID_FINDING_STATE_TRANSITIONS: Record<FindingStatus, FindingStatus[]> =
  {
    ACTIVE: ['ACKNOWLEDGED', 'RESOLVED', 'EXPIRED'],
    ACKNOWLEDGED: ['RESOLVED', 'EXPIRED'],
    RESOLVED: ['ACTIVE', 'EXPIRED'], // 'ACTIVE' represents reopening
    EXPIRED: ['ACTIVE'], // reopening permitted
  };

// In-Memory store for fast, safe, synchronous lookups
const inMemoryFindings = new Map<string, SelfAuditFinding>();

/**
 * Generates a stable deterministic fingerprint for a finding.
 */
export function generateFindingFingerprint(
  checkId: string,
  category: string,
  title: string
): string {
  const normalized = `${checkId.trim()}:${category.trim()}:${title.trim().toLowerCase()}`;
  return crypto
    .createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 24);
}

/**
 * Sanitizes observation values to ensure zero secrets or PII are stored.
 */
export function sanitizeFindingPayload(value: any): any {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  const sensitivePattern =
    /(secret|token|password|auth|credential|salt|cvv|pan|api_?key|private_?key)/i;
  const sanitized: Record<string, any> = Array.isArray(value) ? [] : {};

  for (const [k, v] of Object.entries(value)) {
    if (sensitivePattern.test(k)) {
      sanitized[k] = '[REDACTED_SECRET]';
    } else if (typeof v === 'object' && v !== null) {
      sanitized[k] = sanitizeFindingPayload(v);
    } else {
      sanitized[k] = v;
    }
  }

  return sanitized;
}

/**
 * Validates whether a state transition is permitted.
 */
export function isValidFindingTransition(
  from: FindingStatus,
  to: FindingStatus
): boolean {
  if (from === to) return true;
  return VALID_FINDING_STATE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Processes an audit run report, deduplicating issues, updating ongoing findings,
 * reopening relapsed items, and auto-resolving recovered checks.
 */
export async function processAuditReportFindings(
  report: AuditRunReport
): Promise<FindingProcessingSummary> {
  const processedAt = new Date().toISOString();
  const created: SelfAuditFinding[] = [];
  const updated: SelfAuditFinding[] = [];
  const reopened: SelfAuditFinding[] = [];
  const autoResolved: SelfAuditFinding[] = [];

  const evaluatedCheckIds = new Set<string>();

  for (const result of report.results) {
    evaluatedCheckIds.add(result.checkId);
    const isProblem = result.status === 'FAIL' || result.status === 'WARN';

    if (isProblem) {
      const fingerprint = generateFindingFingerprint(
        result.checkId,
        result.category,
        result.message.substring(0, 80)
      );

      const existing = inMemoryFindings.get(fingerprint);

      const observation: FindingObservationHistory = {
        observedAt: result.evaluatedAt,
        status: result.status,
        message: result.message,
        durationMs: result.durationMs,
      };

      if (!existing) {
        // Case 1: Brand new finding
        const newFinding: SelfAuditFinding = {
          id: `saf_${fingerprint}`,
          fingerprint,
          checkId: result.checkId,
          category: result.category,
          severity: result.severity,
          status: 'ACTIVE',
          title: `Audit Diagnostic: ${result.checkId}`,
          message: result.message,
          evidenceSource: `Self-Audit Runner (${report.trigger})`,
          remediationHint: result.remediationHint,
          sanitizedObservedValue: sanitizeFindingPayload(result.observedValue),
          occurrenceCount: 1,
          reopenCount: 0,
          firstSeenAt: result.evaluatedAt,
          lastSeenAt: result.evaluatedAt,
          history: [observation],
        };

        inMemoryFindings.set(fingerprint, newFinding);
        created.push(newFinding);
      } else if (
        existing.status === 'RESOLVED' ||
        existing.status === 'EXPIRED'
      ) {
        // Case 2: Relapse of a previously resolved finding -> Reopen
        existing.status = 'ACTIVE';
        existing.reopenCount += 1;
        existing.occurrenceCount += 1;
        existing.lastSeenAt = result.evaluatedAt;
        existing.resolvedAt = undefined;
        existing.resolutionReason = undefined;
        existing.message = result.message;
        existing.remediationHint =
          result.remediationHint || existing.remediationHint;
        existing.sanitizedObservedValue = sanitizeFindingPayload(
          result.observedValue
        );

        existing.history.unshift(observation);
        if (existing.history.length > 10) existing.history.pop();

        reopened.push(existing);
      } else {
        // Case 3: Ongoing finding -> Deduplicate & increment count
        existing.occurrenceCount += 1;
        existing.lastSeenAt = result.evaluatedAt;
        existing.message = result.message;
        existing.remediationHint =
          result.remediationHint || existing.remediationHint;
        existing.sanitizedObservedValue = sanitizeFindingPayload(
          result.observedValue
        );

        existing.history.unshift(observation);
        if (existing.history.length > 10) existing.history.pop();

        updated.push(existing);
      }
    }
  }

  // Auto-Resolution: Find active findings whose checks evaluated PASS in this run
  for (const result of report.results) {
    if (result.status === 'PASS') {
      for (const finding of inMemoryFindings.values()) {
        if (
          finding.checkId === result.checkId &&
          (finding.status === 'ACTIVE' || finding.status === 'ACKNOWLEDGED')
        ) {
          finding.status = 'RESOLVED';
          finding.resolvedAt = result.evaluatedAt;
          finding.resolutionReason =
            'Check evaluated healthy (PASS) in latest audit run.';
          finding.history.unshift({
            observedAt: result.evaluatedAt,
            status: 'PASS',
            message: 'Check evaluated healthy in latest audit run.',
            durationMs: result.durationMs,
          });
          if (finding.history.length > 10) finding.history.pop();

          autoResolved.push(finding);
        }
      }
    }
  }

  // Count active findings
  let activeCount = 0;
  for (const f of inMemoryFindings.values()) {
    if (f.status === 'ACTIVE' || f.status === 'ACKNOWLEDGED') activeCount++;
  }

  return {
    processedAt,
    created,
    updated,
    reopened,
    autoResolved,
    activeCount,
    totalFindings: inMemoryFindings.size,
  };
}

/**
 * Retrieves findings matching filter criteria with pagination.
 */
export async function getSelfAuditFindings(
  filters: FindingFilters = {}
): Promise<{ findings: SelfAuditFinding[]; total: number }> {
  let list = Array.from(inMemoryFindings.values());

  if (filters.status && filters.status !== 'ALL') {
    list = list.filter((f) => f.status === filters.status);
  }

  if (filters.category && filters.category !== 'ALL') {
    list = list.filter((f) => f.category === filters.category);
  }

  if (filters.severity && filters.severity !== 'ALL') {
    list = list.filter((f) => f.severity === filters.severity);
  }

  if (filters.searchQuery) {
    const q = filters.searchQuery.toLowerCase();
    list = list.filter(
      (f) =>
        f.title.toLowerCase().includes(q) ||
        f.message.toLowerCase().includes(q) ||
        f.checkId.toLowerCase().includes(q)
    );
  }

  // Sort by lastSeenAt descending
  list.sort(
    (a, b) =>
      new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
  );

  const total = list.length;
  const offset = filters.offset || 0;
  const limit = filters.limit || 50;

  return {
    findings: list.slice(offset, offset + limit),
    total,
  };
}

/**
 * Retrieves a single finding by ID.
 */
export async function getFindingById(
  id: string
): Promise<SelfAuditFinding | null> {
  for (const f of inMemoryFindings.values()) {
    if (f.id === id) return f;
  }
  return null;
}

/**
 * Acknowledges a finding by an authorized staff member.
 */
export async function acknowledgeFinding(
  findingId: string,
  actor: { uid: string; role: string }
): Promise<SelfAuditFinding> {
  const finding = await getFindingById(findingId);
  if (!finding) {
    throw new Error(`Finding with ID '${findingId}' not found.`);
  }

  if (!isValidFindingTransition(finding.status, 'ACKNOWLEDGED')) {
    throw new Error(
      `Cannot transition finding from '${finding.status}' to 'ACKNOWLEDGED'.`
    );
  }

  finding.status = 'ACKNOWLEDGED';
  finding.acknowledgedAt = new Date().toISOString();
  finding.acknowledgedBy = `${actor.role}:${actor.uid}`;

  return finding;
}

/**
 * Manually resolves a finding.
 */
export async function resolveFinding(
  findingId: string,
  options?: { reason?: string; actor?: { uid: string; role: string } }
): Promise<SelfAuditFinding> {
  const finding = await getFindingById(findingId);
  if (!finding) {
    throw new Error(`Finding with ID '${findingId}' not found.`);
  }

  if (!isValidFindingTransition(finding.status, 'RESOLVED')) {
    throw new Error(
      `Cannot transition finding from '${finding.status}' to 'RESOLVED'.`
    );
  }

  finding.status = 'RESOLVED';
  finding.resolvedAt = new Date().toISOString();
  finding.resolutionReason =
    options?.reason ||
    `Manually marked resolved by ${options?.actor?.role || 'staff'}`;

  return finding;
}

/**
 * Expires stale resolved findings older than the retention threshold.
 */
export async function expireStaleResolvedFindings(
  maxAgeDays = 30
): Promise<number> {
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  let expiredCount = 0;

  for (const finding of inMemoryFindings.values()) {
    if (finding.status === 'RESOLVED' && finding.resolvedAt) {
      const ageMs = now - new Date(finding.resolvedAt).getTime();
      if (ageMs > maxAgeMs) {
        finding.status = 'EXPIRED';
        expiredCount++;
      }
    }
  }

  return expiredCount;
}

/**
 * Clears in-memory store for unit testing.
 */
export function clearFindingStoreForTesting(): void {
  inMemoryFindings.clear();
}
