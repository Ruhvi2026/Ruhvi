import { type BusinessAnomalyFinding } from './anomaly-detector';
import { type BusinessRecommendation } from './recommendation-schema';
import { type CanonicalMetric } from './metrics-service';

/**
 * ============================================================================
 * ANOMALY DEDUPLICATION & LIFECYCLE ENGINE (TRACK C - PHASE 21)
 * ============================================================================
 * Prevents alert fatigue and redundant findings by enforcing stable incident
 * identity fingerprinting, cooldown windows, deduplication, auto-resolution,
 * and state transition rules.
 *
 * Guarantees:
 * 1. Stable Identity: Fingerprint computed from `ruleId` + `metric` + `dimension`
 *    ensures identical underlying issues resolve to the same record.
 * 2. Deduplication: Repeated scans of ongoing issues update the existing incident,
 *    incrementing observation counts rather than creating duplicate findings.
 * 3. Alert Storm Cooldown: Suppresses external staff notifications within a
 *    configurable cooldown window (default: 6 hours / 360 mins).
 * 4. Deterministic State Machine: Validates state transitions across
 *    'open', 'acknowledged', 'resolved', and 'expired'.
 * 5. Reopen Logic: Reopens resolved findings when a metric relapses beyond thresholds.
 * 6. Auto-Resolution: Automatically transitions active findings to 'resolved' when
 *    subsequent evaluations confirm the metric has returned to healthy levels.
 */

export type AnomalyState = 'open' | 'acknowledged' | 'resolved' | 'expired';

export interface AnomalyObservationEntry {
  observedAt: string;
  value: number;
  severity: 'warning' | 'critical';
}

export interface AnomalyRecord {
  id: string;
  fingerprint: string;
  ruleId: string;
  metric: CanonicalMetric;
  dimension: string;
  state: AnomalyState;
  severity: 'warning' | 'critical';
  title: string;
  firstDetectedAt: string;
  lastObservedAt: string;
  resolvedAt?: string;
  resolutionReason?: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  occurrenceCount: number;
  reopenCount: number;
  latestValue: number;
  thresholdValue: number;
  cooldownUntil: string;
  shouldNotify: boolean;
  history: AnomalyObservationEntry[];
  recommendation: BusinessRecommendation;
}

export interface ProcessLifecycleOptions {
  cooldownMinutes?: number; // Default 360 (6 hours)
  autoResolveIfHealthy?: boolean; // Default true
  now?: Date;
  evaluatedRuleIds?: string[]; // IDs of rules evaluated in this run
}

export interface LifecycleProcessingResult {
  processedAt: string;
  created: AnomalyRecord[];
  updated: AnomalyRecord[];
  reopened: AnomalyRecord[];
  resolved: AnomalyRecord[];
  unchanged: AnomalyRecord[];
  activeCount: number;
  records: AnomalyRecord[];
}

// ─── Allowed State Transitions ───────────────────────────────────────────────
const VALID_TRANSITIONS: Record<AnomalyState, AnomalyState[]> = {
  open: ['acknowledged', 'resolved', 'expired'],
  acknowledged: ['resolved', 'expired'],
  resolved: ['open', 'expired'], // 'open' represents reopening
  expired: [], // terminal state
};

/**
 * Validates whether a state transition is permitted by the state machine.
 */
export function canTransitionAnomalyState(
  from: AnomalyState,
  to: AnomalyState
): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Computes a deterministic identity fingerprint for an anomaly.
 */
export function computeAnomalyFingerprint(
  ruleId: string,
  metric: CanonicalMetric,
  dimension = 'global'
): string {
  return `fp_${ruleId}_${metric}_${dimension}`.toLowerCase();
}

/**
 * Reconciles incoming anomaly findings against existing records,
 * performing deduplication, cooldown updates, reopening, and auto-resolution.
 */
export function reconcileAnomalyFindings(
  findings: BusinessAnomalyFinding[],
  existingRecords: AnomalyRecord[],
  options: ProcessLifecycleOptions = {}
): LifecycleProcessingResult {
  const now = options.now || new Date();
  const nowIso = now.toISOString();
  const cooldownMinutes = options.cooldownMinutes ?? 360; // 6 hours default
  const autoResolve = options.autoResolveIfHealthy ?? true;

  const recordsMap = new Map<string, AnomalyRecord>();
  for (const r of existingRecords) {
    recordsMap.set(r.fingerprint, { ...r, history: [...r.history] });
  }

  const created: AnomalyRecord[] = [];
  const updated: AnomalyRecord[] = [];
  const reopened: AnomalyRecord[] = [];
  const resolved: AnomalyRecord[] = [];
  const unchanged: AnomalyRecord[] = [];

  const findingsProcessedFingerprints = new Set<string>();

  // 1. Process current scan findings
  for (const finding of findings) {
    const dimension = 'global';
    const fingerprint = computeAnomalyFingerprint(
      finding.ruleId,
      finding.metric,
      dimension
    );
    findingsProcessedFingerprints.add(fingerprint);

    const existing = recordsMap.get(fingerprint);

    if (!existing) {
      // ── New Incident ──
      const cooldownUntil = new Date(
        now.getTime() + cooldownMinutes * 60 * 1000
      ).toISOString();

      const newRecord: AnomalyRecord = {
        id: `anom_inc_${finding.ruleId}_${now.getTime()}`,
        fingerprint,
        ruleId: finding.ruleId,
        metric: finding.metric,
        dimension,
        state: 'open',
        severity: finding.severity,
        title: finding.ruleName,
        firstDetectedAt: nowIso,
        lastObservedAt: nowIso,
        occurrenceCount: 1,
        reopenCount: 0,
        latestValue: finding.actualValue,
        thresholdValue: finding.thresholdValue,
        cooldownUntil,
        shouldNotify: true, // First detection always warrants notification
        history: [
          {
            observedAt: nowIso,
            value: finding.actualValue,
            severity: finding.severity,
          },
        ],
        recommendation: finding.recommendation,
      };

      recordsMap.set(fingerprint, newRecord);
      created.push(newRecord);
    } else if (existing.state === 'open' || existing.state === 'acknowledged') {
      // ── Ongoing Incident (Deduplication) ──
      const inCooldown =
        now.getTime() < new Date(existing.cooldownUntil).getTime();
      let shouldNotify = false;
      let nextCooldownUntil = existing.cooldownUntil;

      // Check if severity escalated from warning to critical
      const severityEscalated =
        existing.severity === 'warning' && finding.severity === 'critical';

      if (!inCooldown || severityEscalated) {
        shouldNotify = true;
        nextCooldownUntil = new Date(
          now.getTime() + cooldownMinutes * 60 * 1000
        ).toISOString();
      }

      // Append history bounded to last 10 entries
      const updatedHistory = [
        ...existing.history,
        {
          observedAt: nowIso,
          value: finding.actualValue,
          severity: finding.severity,
        },
      ].slice(-10);

      const updatedRecord: AnomalyRecord = {
        ...existing,
        lastObservedAt: nowIso,
        occurrenceCount: existing.occurrenceCount + 1,
        latestValue: finding.actualValue,
        thresholdValue: finding.thresholdValue,
        severity: finding.severity,
        cooldownUntil: nextCooldownUntil,
        shouldNotify,
        history: updatedHistory,
        recommendation: finding.recommendation,
      };

      recordsMap.set(fingerprint, updatedRecord);
      updated.push(updatedRecord);
    } else if (existing.state === 'resolved' || existing.state === 'expired') {
      // ── Reopened Incident ──
      const cooldownUntil = new Date(
        now.getTime() + cooldownMinutes * 60 * 1000
      ).toISOString();

      const updatedHistory = [
        ...existing.history,
        {
          observedAt: nowIso,
          value: finding.actualValue,
          severity: finding.severity,
        },
      ].slice(-10);

      const reopenedRecord: AnomalyRecord = {
        ...existing,
        state: 'open',
        severity: finding.severity,
        lastObservedAt: nowIso,
        resolvedAt: undefined,
        resolutionReason: undefined,
        occurrenceCount: existing.occurrenceCount + 1,
        reopenCount: existing.reopenCount + 1,
        latestValue: finding.actualValue,
        thresholdValue: finding.thresholdValue,
        cooldownUntil,
        shouldNotify: true, // Reopened issue warrants immediate notification
        history: updatedHistory,
        recommendation: finding.recommendation,
      };

      recordsMap.set(fingerprint, reopenedRecord);
      reopened.push(reopenedRecord);
    }
  }

  // 2. Auto-Resolution for previously open/acknowledged incidents not seen in this evaluation
  if (
    autoResolve &&
    options.evaluatedRuleIds &&
    options.evaluatedRuleIds.length > 0
  ) {
    const evaluatedSet = new Set(options.evaluatedRuleIds);

    for (const [fp, record] of recordsMap.entries()) {
      if (
        (record.state === 'open' || record.state === 'acknowledged') &&
        evaluatedSet.has(record.ruleId) &&
        !findingsProcessedFingerprints.has(fp)
      ) {
        const resolvedRecord: AnomalyRecord = {
          ...record,
          state: 'resolved',
          resolvedAt: nowIso,
          resolutionReason:
            'Metric deterministically returned within safe thresholds on subsequent evaluation.',
          shouldNotify: false,
        };

        recordsMap.set(fp, resolvedRecord);
        resolved.push(resolvedRecord);
      }
    }
  }

  // Collate all records and determine unchanged count
  const allRecords = Array.from(recordsMap.values());
  for (const r of allRecords) {
    if (
      !created.some((c) => c.id === r.id) &&
      !updated.some((u) => u.id === r.id) &&
      !reopened.some((ro) => ro.id === r.id) &&
      !resolved.some((res) => res.id === r.id)
    ) {
      unchanged.push(r);
    }
  }

  const activeCount = allRecords.filter(
    (r) => r.state === 'open' || r.state === 'acknowledged'
  ).length;

  return {
    processedAt: nowIso,
    created,
    updated,
    reopened,
    resolved,
    unchanged,
    activeCount,
    records: allRecords,
  };
}

// ─── Manual State Transition Actions ─────────────────────────────────────────

/**
 * Staff manual action: Acknowledge an open anomaly.
 */
export function acknowledgeAnomaly(
  record: AnomalyRecord,
  actorId: string
): AnomalyRecord {
  if (!canTransitionAnomalyState(record.state, 'acknowledged')) {
    throw new Error(
      `Cannot transition anomaly '${record.id}' from '${record.state}' to 'acknowledged'`
    );
  }

  return {
    ...record,
    state: 'acknowledged',
    acknowledgedAt: new Date().toISOString(),
    acknowledgedBy: actorId,
    shouldNotify: false,
  };
}

/**
 * Staff manual action: Mark an anomaly as resolved with reason.
 */
export function resolveAnomaly(
  record: AnomalyRecord,
  reason: string
): AnomalyRecord {
  if (!canTransitionAnomalyState(record.state, 'resolved')) {
    throw new Error(
      `Cannot transition anomaly '${record.id}' from '${record.state}' to 'resolved'`
    );
  }

  return {
    ...record,
    state: 'resolved',
    resolvedAt: new Date().toISOString(),
    resolutionReason: reason,
    shouldNotify: false,
  };
}

/**
 * Lifecycle action: Mark an anomaly as expired.
 */
export function expireAnomaly(record: AnomalyRecord): AnomalyRecord {
  if (!canTransitionAnomalyState(record.state, 'expired')) {
    throw new Error(
      `Cannot transition anomaly '${record.id}' from '${record.state}' to 'expired'`
    );
  }

  return {
    ...record,
    state: 'expired',
    shouldNotify: false,
  };
}

// ─── Anomaly Lifecycle Registry Singleton ────────────────────────────────────
class AnomalyLifecycleRegistry {
  private records = new Map<string, AnomalyRecord>();

  public getRecordById(id: string): AnomalyRecord | undefined {
    for (const record of this.records.values()) {
      if (record.id === id) return record;
    }
    return undefined;
  }

  public getRecords(filter?: {
    state?: AnomalyState | 'all';
    severity?: 'warning' | 'critical' | 'all';
  }): AnomalyRecord[] {
    let list = Array.from(this.records.values());

    if (filter?.state && filter.state !== 'all') {
      list = list.filter((r) => r.state === filter.state);
    }
    if (filter?.severity && filter.severity !== 'all') {
      list = list.filter((r) => r.severity === filter.severity);
    }

    // Sort: open first, critical first, newest lastObservedAt first
    return list.sort((a, b) => {
      const stateWeight = (s: AnomalyState) =>
        s === 'open' ? 0 : s === 'acknowledged' ? 1 : 2;
      const severityWeight = (s: string) => (s === 'critical' ? 0 : 1);

      const sw = stateWeight(a.state) - stateWeight(b.state);
      if (sw !== 0) return sw;

      const sew = severityWeight(a.severity) - severityWeight(b.severity);
      if (sew !== 0) return sew;

      return (
        new Date(b.lastObservedAt).getTime() -
        new Date(a.lastObservedAt).getTime()
      );
    });
  }

  public reconcileWithScan(
    findings: BusinessAnomalyFinding[],
    options: ProcessLifecycleOptions = {}
  ): LifecycleProcessingResult {
    const existing = Array.from(this.records.values());
    const result = reconcileAnomalyFindings(findings, existing, options);

    // Update in-memory registry with reconciled records
    for (const rec of result.records) {
      this.records.set(rec.fingerprint, rec);
    }

    return result;
  }

  public acknowledge(id: string, actorId: string): AnomalyRecord {
    const record = this.getRecordById(id);
    if (!record) {
      throw new Error(`Anomaly record with id '${id}' not found`);
    }

    const updated = acknowledgeAnomaly(record, actorId);
    this.records.set(updated.fingerprint, updated);
    return updated;
  }

  public resolve(id: string, reason: string): AnomalyRecord {
    const record = this.getRecordById(id);
    if (!record) {
      throw new Error(`Anomaly record with id '${id}' not found`);
    }

    const updated = resolveAnomaly(record, reason);
    this.records.set(updated.fingerprint, updated);
    return updated;
  }

  public seedRecord(record: AnomalyRecord): void {
    this.records.set(record.fingerprint, record);
  }

  public clear(): void {
    this.records.clear();
  }
}

// Global process-wide singleton
const globalRegistry = new AnomalyLifecycleRegistry();

export function getAnomalyLifecycleRegistry(): AnomalyLifecycleRegistry {
  return globalRegistry;
}
