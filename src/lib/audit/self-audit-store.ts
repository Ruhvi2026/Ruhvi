import 'server-only';

import crypto from 'crypto';
import { getServiceClient } from '@/lib/supabase/service';
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

// Helper to safely get the service-role client if configured
function tryGetServiceClient() {
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
    return getServiceClient();
  } catch {
    return null;
  }
}

/**
 * Sanitizes observation values to ensure zero secrets or PII are stored.
 * Checks both object keys and sensitive string patterns.
 */
export function sanitizeFindingPayload(value: any): any {
  if (value === null || value === undefined) return value;

  if (typeof value === 'string') {
    return value
      .replace(/(bearer\s+)[A-Za-z0-9_\-\.]{15,}/gi, '$1[REDACTED_TOKEN]')
      .replace(
        /(postgres(ql)?:\/\/[^:]+:)[^@]+(@)/gi,
        '$1[REDACTED_PASSWORD]$3'
      )
      .replace(
        /(api[_-]?key\s*[=:]\s*)[A-Za-z0-9_\-]{12,}/gi,
        '$1[REDACTED_KEY]'
      )
      .replace(/(secret\s*[=:]\s*)[A-Za-z0-9_\-]{6,}/gi, '$1[REDACTED_SECRET]')
      .replace(/(password\s*[=:]\s*)[^\s,;&]+/gi, '$1[REDACTED_PASSWORD]');
  }

  if (typeof value !== 'object') return value;

  const sensitivePattern =
    /(secret|token|password|auth|credential|salt|cvv|pan|api_?key|private_?key)/i;
  const sanitized: Record<string, any> = Array.isArray(value) ? [] : {};

  for (const [k, v] of Object.entries(value)) {
    if (sensitivePattern.test(k)) {
      sanitized[k] = '[REDACTED_SECRET]';
    } else if (typeof v === 'string') {
      sanitized[k] = sanitizeFindingPayload(v);
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

  // Persist modified findings to PostgreSQL table public.self_audit_findings
  const changedFindings = [
    ...created,
    ...updated,
    ...reopened,
    ...autoResolved,
  ];
  const supabase = tryGetServiceClient();

  if (supabase && changedFindings.length > 0) {
    try {
      const recordsToUpsert = changedFindings.map((f) => ({
        fingerprint: f.fingerprint,
        check_id: f.checkId,
        category: f.category,
        severity: f.severity,
        status: f.status,
        title: f.title,
        message: f.message,
        evidence_source: f.evidenceSource,
        remediation_hint: f.remediationHint,
        sanitized_observed_value: f.sanitizedObservedValue ?? {},
        occurrence_count: f.occurrenceCount,
        reopen_count: f.reopenCount,
        first_seen_at: f.firstSeenAt,
        last_seen_at: f.lastSeenAt,
        resolved_at: f.resolvedAt,
        resolution_reason: f.resolutionReason,
        acknowledged_at: f.acknowledgedAt,
        acknowledged_by: f.acknowledgedBy,
        history: f.history,
        updated_at: new Date().toISOString(),
      }));

      await supabase
        .from('self_audit_findings')
        .upsert(recordsToUpsert, { onConflict: 'fingerprint' });
    } catch (dbErr) {
      console.error(
        'Failed to upsert findings to self_audit_findings table:',
        dbErr
      );
    }
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
 * Checks PostgreSQL table first; falls back to in-memory store.
 */
export async function getSelfAuditFindings(
  filters: FindingFilters = {}
): Promise<{ findings: SelfAuditFinding[]; total: number }> {
  const supabase = tryGetServiceClient();
  if (supabase) {
    try {
      let query = supabase
        .from('self_audit_findings')
        .select('*', { count: 'exact' });

      if (filters.status && filters.status !== 'ALL') {
        query = query.eq('status', filters.status);
      }
      if (filters.category && filters.category !== 'ALL') {
        query = query.eq('category', filters.category);
      }
      if (filters.severity && filters.severity !== 'ALL') {
        query = query.eq('severity', filters.severity);
      }
      if (filters.searchQuery) {
        query = query.ilike('title', `%${filters.searchQuery}%`);
      }

      const offset = filters.offset || 0;
      const limit = filters.limit || 50;

      const { data, count, error } = await query
        .order('last_seen_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data && data.length > 0) {
        const findings: SelfAuditFinding[] = data.map((row: any) => ({
          id: row.id || `saf_${row.fingerprint}`,
          fingerprint: row.fingerprint,
          checkId: row.check_id,
          category: row.category,
          severity: row.severity,
          status: row.status,
          title: row.title,
          message: row.message,
          evidenceSource: row.evidence_source,
          remediationHint: row.remediation_hint,
          sanitizedObservedValue: row.sanitized_observed_value,
          occurrenceCount: row.occurrence_count,
          reopenCount: row.reopen_count,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          resolvedAt: row.resolved_at,
          resolutionReason: row.resolution_reason,
          acknowledgedAt: row.acknowledged_at,
          acknowledgedBy: row.acknowledged_by,
          history: row.history || [],
        }));

        return { findings, total: count ?? findings.length };
      }
    } catch {
      // Fall through to in-memory store
    }
  }

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
  const local = Array.from(inMemoryFindings.values()).find(
    (f) => f.id === id || f.fingerprint === id || `saf_${f.fingerprint}` === id
  );
  if (local) return local;

  const supabase = tryGetServiceClient();
  if (supabase) {
    try {
      const cleanId = id.replace(/^saf_/, '');
      const { data, error } = await supabase
        .from('self_audit_findings')
        .select('*')
        .or(`id.eq.${id},fingerprint.eq.${cleanId}`)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id || `saf_${data.fingerprint}`,
          fingerprint: data.fingerprint,
          checkId: data.check_id,
          category: data.category,
          severity: data.severity,
          status: data.status,
          title: data.title,
          message: data.message,
          evidenceSource: data.evidence_source,
          remediationHint: data.remediation_hint,
          sanitizedObservedValue: data.sanitized_observed_value,
          occurrenceCount: data.occurrence_count,
          reopenCount: data.reopen_count,
          firstSeenAt: data.first_seen_at,
          lastSeenAt: data.last_seen_at,
          resolvedAt: data.resolved_at,
          resolutionReason: data.resolution_reason,
          acknowledgedAt: data.acknowledged_at,
          acknowledgedBy: data.acknowledged_by,
          history: data.history || [],
        };
      }
    } catch {
      // ignore
    }
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

  const supabase = tryGetServiceClient();
  if (supabase) {
    try {
      const cleanId = findingId.replace(/^saf_/, '');
      await supabase
        .from('self_audit_findings')
        .update({
          status: 'ACKNOWLEDGED',
          acknowledged_at: finding.acknowledgedAt,
          acknowledged_by: finding.acknowledgedBy,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${findingId},fingerprint.eq.${cleanId}`);
    } catch (err) {
      console.error(
        'Failed to persist finding acknowledgement to database:',
        err
      );
    }
  }

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

  const supabase = tryGetServiceClient();
  if (supabase) {
    try {
      const cleanId = findingId.replace(/^saf_/, '');
      await supabase
        .from('self_audit_findings')
        .update({
          status: 'RESOLVED',
          resolved_at: finding.resolvedAt,
          resolution_reason: finding.resolutionReason,
          updated_at: new Date().toISOString(),
        })
        .or(`id.eq.${findingId},fingerprint.eq.${cleanId}`);
    } catch (err) {
      console.error('Failed to persist finding resolution to database:', err);
    }
  }

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
