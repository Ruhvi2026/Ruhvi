'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  AlertCircle,
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ExternalLink,
  Filter,
  Info,
  Layers,
  Lock,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';
import type {
  SelfAuditFinding,
  FindingStatus,
} from '@/lib/audit/self-audit-store';
import type {
  AuditCheckCategory,
  AuditSeverity,
} from '@/lib/audit/self-audit-registry';
import type {
  AuditRunReport,
  OverallAuditStatus,
} from '@/lib/audit/self-audit-runner';
import type { RemediationProposal } from '@/lib/audit/self-audit-remediation';

/**
 * ============================================================================
 * SELF-AUDIT REPORT VIEW INTERFACE (TRACK J - PHASE 50)
 * ============================================================================
 * Staff-facing dashboard for reviewing self-audit runs, persistent findings,
 * system health diagnostics, and allowlisted check boundaries.
 *
 * Guarantees:
 * 1. Read-Only Safety: Never exposes raw secret values or offers automatic,
 *    unvalidated repair controls that mutate production systems.
 * 2. Complete Health Visibility: Renders latest run outcome, execution duration,
 *    and category breakdowns.
 * 3. Human-in-the-Loop Lifecycle: Allows staff to acknowledge and resolve
 *    findings with full attribution.
 * 4. Transparent Boundaries: Displays all 19 registered checks and their known
 *    limitations so staff understand test coverage bounds.
 */

function formatTimestamp(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return isoString;
  }
}

const CATEGORY_LABELS: Record<AuditCheckCategory, string> = {
  architecture: 'Architecture & Routes',
  integration: 'Third-Party Integrations',
  configuration: 'Configuration & Secrets',
  security: 'Security & Authorization',
  performance: 'Performance & Latency',
  ai_health: 'AI Engine & Models',
};

const REGISTERED_CHECKS_METADATA = [
  {
    id: 'chk_arch_app_router_routes',
    name: 'App Router Route Integrity',
    category: 'architecture',
    severity: 'HIGH',
    timeout: '1500ms',
    mode: 'Passive Inspection',
    limit: 'Inspects static routes; does not verify dynamic rendering',
  },
  {
    id: 'chk_arch_package_dependencies',
    name: 'Dependency Manifest Integrity',
    category: 'architecture',
    severity: 'MEDIUM',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Does not execute remote npm network audit',
  },
  {
    id: 'chk_int_supabase_connection',
    name: 'Supabase Postgres Connectivity',
    category: 'integration',
    severity: 'CRITICAL',
    timeout: '3000ms',
    mode: 'Read-only Synthetic',
    limit: 'Lightweight ping; does not test heavy analytic locks',
  },
  {
    id: 'chk_int_firebase_auth_rest',
    name: 'Firebase Auth REST Service',
    category: 'integration',
    severity: 'CRITICAL',
    timeout: '2500ms',
    mode: 'Read-only Synthetic',
    limit: 'Does not trigger live SMS OTP dispatches',
  },
  {
    id: 'chk_int_cloudinary_access',
    name: 'Cloudinary Storage & CDN',
    category: 'integration',
    severity: 'HIGH',
    timeout: '2000ms',
    mode: 'Read-only Synthetic',
    limit: 'Does not upload test media assets',
  },
  {
    id: 'chk_int_transactional_email_provider',
    name: 'Resend / Brevo Email Provider',
    category: 'integration',
    severity: 'HIGH',
    timeout: '1500ms',
    mode: 'Passive Inspection',
    limit: 'Does not dispatch actual emails to customer inboxes',
  },
  {
    id: 'chk_int_shiprocket_logistics',
    name: 'Shiprocket Logistics API',
    category: 'integration',
    severity: 'HIGH',
    timeout: '1500ms',
    mode: 'Passive Inspection',
    limit: 'Does not generate live shipping AWBs or pickups',
  },
  {
    id: 'chk_int_payment_gateway_config',
    name: 'Payment Gateway Configuration',
    category: 'integration',
    severity: 'CRITICAL',
    timeout: '1500ms',
    mode: 'Passive Inspection',
    limit: 'Does not initiate test bank transactions',
  },
  {
    id: 'chk_cfg_required_env_presence',
    name: 'Runtime Environment Audit',
    category: 'configuration',
    severity: 'CRITICAL',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Checks presence only; never logs secret values',
  },
  {
    id: 'chk_cfg_public_secret_hygiene',
    name: 'Client Secret Leakage Guard',
    category: 'configuration',
    severity: 'CRITICAL',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Pattern-based heuristic variable scanning',
  },
  {
    id: 'chk_cfg_cors_security_headers',
    name: 'HTTP Security Headers Policy',
    category: 'configuration',
    severity: 'MEDIUM',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Static configuration review of middleware headers',
  },
  {
    id: 'chk_sec_rbac_admin_route_guards',
    name: 'Admin RBAC Route Protection',
    category: 'security',
    severity: 'CRITICAL',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Static code path assertion of requireAdmin',
  },
  {
    id: 'chk_sec_customer_pii_isolation',
    name: 'Customer PII Redaction Audit',
    category: 'security',
    severity: 'HIGH',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Verifies regex sanitization patterns',
  },
  {
    id: 'chk_sec_csrf_webhook_signatures',
    name: 'Webhook Signature Enforcement',
    category: 'security',
    severity: 'HIGH',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Validates HMAC signature validation code paths',
  },
  {
    id: 'chk_perf_api_latency_budget',
    name: 'API Route Latency Budget',
    category: 'performance',
    severity: 'MEDIUM',
    timeout: '1500ms',
    mode: 'Telemetry Query',
    limit: 'Sample size dependent on active production traffic',
  },
  {
    id: 'chk_perf_circuit_breaker_status',
    name: 'Upstream Circuit Breakers',
    category: 'performance',
    severity: 'HIGH',
    timeout: '1000ms',
    mode: 'Telemetry Query',
    limit: 'Memory-resident breaker states',
  },
  {
    id: 'chk_ai_anomaly_rule_registry',
    name: 'Anomaly Detection Rule Registry',
    category: 'ai_health',
    severity: 'MEDIUM',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Validates rule registration, not data finding volume',
  },
  {
    id: 'chk_ai_decision_simulator_fixtures',
    name: 'Decision Simulator Baselines',
    category: 'ai_health',
    severity: 'MEDIUM',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Inspects baseline schema; does not run full optimization',
  },
  {
    id: 'chk_ai_provider_failover_readiness',
    name: 'AI Provider Failover Readiness',
    category: 'ai_health',
    severity: 'HIGH',
    timeout: '1000ms',
    mode: 'Passive Inspection',
    limit: 'Inspects credentials; does not execute prompt calls',
  },
];

export default function SelfAuditReportPage() {
  const [activeTab, setActiveTab] = useState<'findings' | 'registry'>(
    'findings'
  );
  const [findings, setFindings] = useState<SelfAuditFinding[]>([]);
  const [latestRun, setLatestRun] = useState<AuditRunReport | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [runningSweep, setRunningSweep] = useState<boolean>(false);
  const [actionInProgressId, setActionInProgressId] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [statusFilter, setStatusFilter] = useState<FindingStatus | 'ALL'>(
    'ALL'
  );
  const [categoryFilter, setCategoryFilter] = useState<
    AuditCheckCategory | 'ALL'
  >('ALL');
  const [severityFilter, setSeverityFilter] = useState<AuditSeverity | 'ALL'>(
    'ALL'
  );
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchFindings = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.set('status', statusFilter);
      if (categoryFilter !== 'ALL') params.set('category', categoryFilter);
      if (severityFilter !== 'ALL') params.set('severity', severityFilter);
      if (searchQuery) params.set('q', searchQuery);

      const res = await fetch(
        `/api/admin/self-audit/findings?${params.toString()}`
      );
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to fetch findings`);

      const json = await res.json();
      if (json.success && json.data) {
        setFindings(json.data.findings || []);
      }
    } catch (err: any) {
      console.error('Failed to load findings:', err);
    }
  }, [statusFilter, categoryFilter, severityFilter, searchQuery]);

  const fetchRunHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/self-audit/run');
      if (!res.ok)
        throw new Error(`HTTP ${res.status}: Failed to fetch run history`);

      const json = await res.json();
      if (json.success && json.data) {
        setLatestRun(json.data.latestRun);
      }
    } catch (err: any) {
      console.error('Failed to load run history:', err);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([fetchFindings(), fetchRunHistory()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load self-audit data');
    } finally {
      setLoading(false);
    }
  }, [fetchFindings, fetchRunHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Execute full audit sweep manually
  const handleTriggerSweep = async () => {
    try {
      setRunningSweep(true);
      setError(null);

      const res = await fetch('/api/admin/self-audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}: Audit sweep failed`);
      }

      await loadData();
    } catch (err: any) {
      setError(err.message || 'Manual audit sweep failed');
    } finally {
      setRunningSweep(false);
    }
  };

  // Status transitions: Acknowledge or Resolve
  const handleUpdateFindingStatus = async (
    findingId: string,
    action: 'ACKNOWLEDGE' | 'RESOLVE'
  ) => {
    try {
      setActionInProgressId(findingId);
      const res = await fetch(`/api/admin/self-audit/findings/${findingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update finding status');
      }

      await fetchFindings();
    } catch (err: any) {
      alert(`Action failed: ${err.message}`);
    } finally {
      setActionInProgressId(null);
    }
  };

  // Remediation Proposal Modal State
  const [selectedFindingForRemediation, setSelectedFindingForRemediation] =
    useState<SelfAuditFinding | null>(null);
  const [remediationProposal, setRemediationProposal] =
    useState<RemediationProposal | null>(null);
  const [loadingRemediation, setLoadingRemediation] = useState<boolean>(false);
  const [publishingActionCenter, setPublishingActionCenter] =
    useState<boolean>(false);
  const [actionCenterSuccessProposalId, setActionCenterSuccessProposalId] =
    useState<string | null>(null);

  const handleOpenRemediationModal = async (finding: SelfAuditFinding) => {
    try {
      setSelectedFindingForRemediation(finding);
      setLoadingRemediation(true);
      setActionCenterSuccessProposalId(null);
      const res = await fetch(
        `/api/admin/self-audit/remediation/${finding.id}`
      );
      if (!res.ok)
        throw new Error(
          `HTTP ${res.status}: Failed to generate remediation plan`
        );
      const json = await res.json();
      if (json.success && json.data) {
        setRemediationProposal(json.data);
      }
    } catch (err: any) {
      alert(`Failed to load remediation plan: ${err.message}`);
      setSelectedFindingForRemediation(null);
    } finally {
      setLoadingRemediation(false);
    }
  };

  const handlePublishRemediationToActionCenter = async () => {
    if (!selectedFindingForRemediation) return;
    try {
      setPublishingActionCenter(true);
      const res = await fetch(
        `/api/admin/self-audit/remediation/${selectedFindingForRemediation.id}`,
        {
          method: 'POST',
        }
      );
      if (!res.ok)
        throw new Error(
          `HTTP ${res.status}: Failed to publish to Action Center`
        );
      const json = await res.json();
      if (json.success && json.data) {
        setActionCenterSuccessProposalId(json.data.actionCenterProposalId);
      }
    } catch (err: any) {
      alert(`Action Center publication failed: ${err.message}`);
    } finally {
      setPublishingActionCenter(false);
    }
  };

  const activeCount = findings.filter(
    (f) => f.status === 'ACTIVE' || f.status === 'ACKNOWLEDGED'
  ).length;
  const criticalCount = findings.filter(
    (f) =>
      (f.status === 'ACTIVE' || f.status === 'ACKNOWLEDGED') &&
      f.severity === 'CRITICAL'
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ─── Breadcrumbs & Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <ShieldCheck className="h-4 w-4" />
            <span>Architecture Self-Audit • Track J</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            System Self-Audit & Health Diagnostics
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Continuous read-only architecture, integration, configuration,
            security, and AI health monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/action-center"
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-[#161b26] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            <span>Action Center</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          <button
            onClick={handleTriggerSweep}
            disabled={runningSweep}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-4 py-2 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${runningSweep ? 'animate-spin' : ''}`}
            />
            <span>
              {runningSweep ? 'Auditing System...' : 'Run Audit Sweep'}
            </span>
          </button>
        </div>
      </div>

      {/* ─── Top Metric Cards: System Health Overview ───────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Overall System Status */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>System Health State</span>
            <Activity className="h-4 w-4 text-slate-500" />
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                latestRun?.overallStatus === 'HEALTHY'
                  ? 'animate-pulse bg-emerald-400'
                  : latestRun?.overallStatus === 'DEGRADED'
                    ? 'bg-amber-400'
                    : 'bg-rose-500'
              }`}
            />
            <span className="text-lg font-bold text-white">
              {latestRun
                ? latestRun.overallStatus.replace(/_/g, ' ')
                : 'STANDBY'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Last evaluated: {formatTimestamp(latestRun?.completedAt)}
          </p>
        </div>

        {/* Card 2: Active Diagnostic Incidents */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Active Audit Findings</span>
            <AlertCircle className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{activeCount}</span>
            {criticalCount > 0 && (
              <span className="text-xs font-semibold text-rose-400">
                ({criticalCount} critical)
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500">
            Deduplicated operational and security alerts
          </p>
        </div>

        {/* Card 3: Check Execution Latency */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Latest Sweep Duration</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            {latestRun ? `${latestRun.durationMs}ms` : '—'}
          </div>
          <p className="text-[11px] text-slate-500">
            Executed in {latestRun?.trigger.replace(/_/g, ' ') || 'read-only'}{' '}
            mode
          </p>
        </div>

        {/* Card 4: Registered Coverage */}
        <div className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Audit Check Coverage</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl font-bold text-white">
            19 Checks
          </div>
          <p className="text-[11px] text-slate-500">
            Across 6 architecture & integration tiers
          </p>
        </div>
      </div>

      {/* ─── Navigation Tabs ─────────────────────────────────────────────── */}
      <div className="flex border-b border-white/10 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('findings')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'findings'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          <span>Active Findings & History ({findings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('registry')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 transition-colors ${
            activeTab === 'registry'
              ? 'border-amber-400 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>Allowlisted Checks Registry & Limitations (19)</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
          <div className="flex items-center gap-2 font-semibold">
            <XCircle className="h-4 w-4" />
            <span>Audit Error</span>
          </div>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* ─── Tab 1: Findings & Incidents List ────────────────────────────── */}
      {activeTab === 'findings' && (
        <div className="space-y-4">
          {/* Filters Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#12161f] p-4 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              {/* Search */}
              <div className="relative min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search check ID or message..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0d1017] py-1.5 pl-8 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-400"
                />
              </div>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-[#0d1017] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="RESOLVED">Resolved</option>
                <option value="EXPIRED">Expired</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-[#0d1017] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                <option value="ALL">All Categories</option>
                <option value="architecture">Architecture</option>
                <option value="integration">Integration</option>
                <option value="configuration">Configuration</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="ai_health">AI Health</option>
              </select>

              {/* Severity Filter */}
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="rounded-lg border border-white/10 bg-[#0d1017] px-3 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-400"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="text-slate-400">
              Showing{' '}
              <span className="font-semibold text-white">
                {findings.length}
              </span>{' '}
              findings
            </div>
          </div>

          {/* Findings Cards List */}
          {loading ? (
            <div className="flex h-48 items-center justify-center text-xs text-slate-400">
              <RefreshCw className="mr-2 h-4 w-4 animate-spin text-amber-400" />
              <span>Loading self-audit diagnostics...</span>
            </div>
          ) : findings.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-[#12161f] p-12 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-400" />
              <h3 className="mt-3 text-base font-semibold text-white">
                All Systems Healthy
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                Zero active architectural anomalies or integration failures
                detected.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {findings.map((f) => {
                const isCritical = f.severity === 'CRITICAL';
                const isHigh = f.severity === 'HIGH';
                const isResolved = f.status === 'RESOLVED';
                const isAcked = f.status === 'ACKNOWLEDGED';

                return (
                  <div
                    key={f.id}
                    className={`rounded-xl border p-5 transition-colors ${
                      isResolved
                        ? 'border-white/5 bg-[#12161f]/50 opacity-70'
                        : isCritical
                          ? 'border-rose-500/30 bg-[#161318]'
                          : isHigh
                            ? 'border-amber-500/30 bg-[#181613]'
                            : 'border-white/10 bg-[#12161f]'
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Severity Pill */}
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              isCritical
                                ? 'bg-rose-500/20 text-rose-300'
                                : isHigh
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-blue-500/20 text-blue-300'
                            }`}
                          >
                            {f.severity}
                          </span>

                          {/* Status Pill */}
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                              isResolved
                                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                : isAcked
                                  ? 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                                  : 'border-rose-500/30 bg-rose-500/10 text-rose-300'
                            }`}
                          >
                            {f.status}
                          </span>

                          <span className="font-mono text-[11px] text-slate-400">
                            {f.checkId}
                          </span>

                          <span className="text-[11px] text-slate-500">
                            • {CATEGORY_LABELS[f.category] || f.category}
                          </span>
                        </div>

                        <h3 className="pt-1 text-sm font-semibold text-white">
                          {f.title}
                        </h3>
                        <p className="text-xs text-slate-300">{f.message}</p>
                      </div>

                      {/* Action Buttons for Staff */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => handleOpenRemediationModal(f)}
                          className="inline-flex items-center gap-1 rounded-lg border border-purple-500/40 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300 transition-colors hover:bg-purple-500/20"
                          title="Generate Approval-Gated Remediation Plan"
                        >
                          <Sparkles className="h-3 w-3" />
                          <span>Remediation Plan</span>
                        </button>

                        {!isResolved && (
                          <>
                            {f.status === 'ACTIVE' && (
                              <button
                                onClick={() =>
                                  handleUpdateFindingStatus(f.id, 'ACKNOWLEDGE')
                                }
                                disabled={actionInProgressId === f.id}
                                className="inline-flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-300 hover:bg-white/10 disabled:opacity-50"
                              >
                                <UserCheck className="h-3 w-3" />
                                <span>Acknowledge</span>
                              </button>
                            )}

                            <button
                              onClick={() =>
                                handleUpdateFindingStatus(f.id, 'RESOLVE')
                              }
                              disabled={actionInProgressId === f.id}
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3 w-3" />
                              <span>Mark Resolved</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Remediation & Evidence Block */}
                    <div className="mt-3 grid grid-cols-1 gap-2 rounded-lg border border-white/5 bg-[#0d1017] p-3 text-xs text-slate-400 sm:grid-cols-2">
                      <div>
                        <span className="block text-slate-500">
                          Evidence Source:
                        </span>
                        <span className="font-mono text-[11px] text-slate-300">
                          {f.evidenceSource}
                        </span>
                      </div>

                      {f.remediationHint && (
                        <div>
                          <span className="block font-medium text-amber-400">
                            Remediation Guidance:
                          </span>
                          <span className="text-[11px] text-slate-300">
                            {f.remediationHint}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Timestamps and Occurrence Count */}
                    <div className="mt-3 flex flex-wrap items-center justify-between border-t border-white/5 pt-2 font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-4">
                        <span>
                          First seen: {formatTimestamp(f.firstSeenAt)}
                        </span>
                        <span>Last seen: {formatTimestamp(f.lastSeenAt)}</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span>Occurrences: {f.occurrenceCount}</span>
                        {f.reopenCount > 0 && (
                          <span className="text-rose-400">
                            Reopened: {f.reopenCount}x
                          </span>
                        )}
                        {f.acknowledgedBy && (
                          <span className="text-amber-400">
                            Ack by: {f.acknowledgedBy}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ─── Tab 2: Allowlisted Checks Registry & Limitations ────────────── */}
      {activeTab === 'registry' && (
        <div className="space-y-4">
          <div className="space-y-1 rounded-xl border border-white/10 bg-[#12161f] p-4 text-xs text-slate-300">
            <p className="font-semibold text-white">
              Deterministic Allowlist & Non-Destructive Boundaries
            </p>
            <p className="text-slate-400">
              Every self-audit check is strictly read-only (
              <code className="text-amber-300">isDestructive: false</code>),
              bounded by explicit timeouts, and isolated from production
              mutations.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {REGISTERED_CHECKS_METADATA.map((chk) => (
              <div
                key={chk.id}
                className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4 text-xs"
              >
                <div className="flex items-start justify-between">
                  <span className="font-semibold text-white">{chk.name}</span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                      chk.severity === 'CRITICAL'
                        ? 'bg-rose-500/20 text-rose-300'
                        : chk.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-blue-500/20 text-blue-300'
                    }`}
                  >
                    {chk.severity}
                  </span>
                </div>

                <div className="font-mono text-[10px] text-slate-500">
                  {chk.id}
                </div>

                <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[11px] text-slate-400">
                  <span>Mode: {chk.mode}</span>
                  <span>Budget: {chk.timeout}</span>
                </div>

                <div className="border-t border-white/5 pt-1 text-[11px] text-slate-500">
                  <span className="text-slate-400">Coverage Boundary: </span>
                  {chk.limit}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Remediation Plan Modal (Track J - Phase 51) ───────────────── */}
      {selectedFindingForRemediation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-3xl space-y-5 overflow-y-auto rounded-2xl border border-white/10 bg-[#12161f] p-6 shadow-2xl">
            <div className="flex items-start justify-between border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-purple-300">
                    Remediation Plan
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {selectedFindingForRemediation.checkId}
                  </span>
                </div>
                <h2 className="mt-2 text-lg font-bold text-white">
                  {remediationProposal?.title ||
                    'Generating Remediation Plan...'}
                </h2>
              </div>

              <button
                onClick={() => {
                  setSelectedFindingForRemediation(null);
                  setRemediationProposal(null);
                }}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {loadingRemediation ? (
              <div className="flex h-48 items-center justify-center text-xs text-slate-400">
                <RefreshCw className="mr-2 h-4 w-4 animate-spin text-purple-400" />
                <span>
                  Evaluating diagnostic telemetry and formulating remediation
                  procedure...
                </span>
              </div>
            ) : remediationProposal ? (
              <div className="space-y-4 text-xs">
                {/* Banner */}
                <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-3 text-xs text-purple-200">
                  <p className="font-semibold text-purple-300">
                    ⚠️ APPROVAL-GATED REMEDIATION PLAN — REVIEW ONLY
                  </p>
                  <p className="text-[11px] text-purple-200/80">
                    This remediation procedure is strictly non-destructive
                    during generation. No files, environment settings, or
                    services have been altered.
                  </p>
                </div>

                {/* Risk and Approver Badges */}
                <div className="grid grid-cols-2 gap-3 rounded-xl border border-white/5 bg-[#0d1017] p-3 text-[11px] sm:grid-cols-4">
                  <div>
                    <span className="block text-slate-500">Risk Level</span>
                    <span className="font-bold text-amber-400">
                      {remediationProposal.impactAndRisk.riskLevel}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">
                      Required Approver
                    </span>
                    <span className="font-bold uppercase text-white">
                      {remediationProposal.requiredApproverRole}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Downtime</span>
                    <span className="font-bold text-slate-300">
                      {remediationProposal.impactAndRisk.downtimeExpected
                        ? 'Yes'
                        : 'Zero Downtime'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-slate-500">Cost Impact</span>
                    <span className="font-mono font-bold text-emerald-400">
                      ₹{remediationProposal.costImpact.estimatedAmount}
                    </span>
                  </div>
                </div>

                {/* Summary */}
                <div>
                  <h3 className="font-semibold text-white">Summary</h3>
                  <p className="mt-1 text-slate-300">
                    {remediationProposal.summary}
                  </p>
                </div>

                {/* Affected Modules */}
                <div>
                  <h3 className="font-semibold text-white">
                    Affected Modules & Configs
                  </h3>
                  <div className="mt-1 flex flex-wrap gap-1.5 font-mono text-[11px]">
                    {remediationProposal.affectedModules.map((m, idx) => (
                      <span
                        key={idx}
                        className="rounded border border-white/5 bg-white/5 px-2 py-0.5 text-slate-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Steps */}
                <div>
                  <h3 className="font-semibold text-white">
                    Step-by-Step Remediation Procedure
                  </h3>
                  <div className="mt-2 space-y-2">
                    {remediationProposal.remediationSteps.map((step) => (
                      <div
                        key={step.order}
                        className="flex items-start gap-3 rounded-lg border border-white/5 bg-[#0d1017] p-3 text-xs"
                      >
                        <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-purple-500/20 text-[10px] font-bold text-purple-300">
                          {step.order}
                        </span>
                        <div>
                          <div className="font-semibold text-white">
                            {step.action}
                          </div>
                          <p className="mt-0.5 text-slate-300">
                            {step.description}
                          </p>
                          <div className="mt-1 font-mono text-[10px] text-slate-500">
                            Target: {step.targetFileOrService}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification & Rollback */}
                <div className="grid grid-cols-1 gap-3 border-t border-white/5 pt-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/5 bg-[#0d1017] p-3">
                    <span className="mb-1 block font-semibold text-emerald-400">
                      Test & Verification Plan
                    </span>
                    <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-400">
                      {remediationProposal.testPlan.map((tp, idx) => (
                        <li key={idx}>{tp}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-lg border border-white/5 bg-[#0d1017] p-3">
                    <span className="mb-1 block font-semibold text-amber-400">
                      Safe Rollback Plan
                    </span>
                    <ul className="list-disc space-y-1 pl-4 text-[11px] text-slate-400">
                      {remediationProposal.rollbackPlan.map((rp, idx) => (
                        <li key={idx}>{rp}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="flex items-center justify-between border-t border-white/10 pt-4">
                  {actionCenterSuccessProposalId ? (
                    <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        Published to Action Center:{' '}
                        {actionCenterSuccessProposalId}
                      </span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500">
                      Publish to Action Center to require formal executive
                      signoff before execution.
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedFindingForRemediation(null);
                        setRemediationProposal(null);
                      }}
                      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-white/10"
                    >
                      Close
                    </button>

                    {!actionCenterSuccessProposalId && (
                      <button
                        onClick={handlePublishRemediationToActionCenter}
                        disabled={publishingActionCenter}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
                      >
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {publishingActionCenter
                            ? 'Publishing...'
                            : 'Publish to Action Center'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
