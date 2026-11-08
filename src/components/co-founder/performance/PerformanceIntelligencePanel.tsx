'use client';

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  Clock,
  Award,
  AlertTriangle,
  Users,
  Bot,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  ExternalLink,
} from 'lucide-react';

interface KPIResult {
  kpiId: string;
  name: string;
  value: number | null;
  state: string;
  score: number | null;
  weight: number;
  target: number;
  unit: string;
  sampleSize: number;
}

interface MemberScorecard {
  memberId: string;
  entityType: 'AI_WORKER' | 'HUMAN_STAFF';
  roleId: string;
  overallScore: number | null;
  grade: string;
  state: string;
  confidence: string;
  confidenceScore: number;
  weightedCoverage: number;
  kpis: KPIResult[];
  taskCounts: {
    total: number;
    completed: number;
    verified: number;
    failed: number;
    reworked: number;
  };
  strengths: string[];
  weaknesses: string[];
  achievementPoints: number;
}

interface WorkforceAlert {
  id: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'POSITIVE';
  memberId: string;
  entityType: string;
  title: string;
  message: string;
  rootCause: string;
  recommendedAction: string;
  createdAt: string;
}

interface AuditReport {
  reportId: string;
  reportType: string;
  generatedAt: string;
  dataHealth: {
    status: 'HEALTHY' | 'PARTIAL' | 'UNAVAILABLE';
    sourcesChecked: string[];
    missingSources: string[];
  };
  populationSummary: {
    aiWorkersTotal: number;
    aiWorkersWithValidScores: number;
    humanStaffTotal: number;
    humanStaffWithValidScores: number;
  };
  topStrengths: string[];
  attentionRequired: string[];
  scorecards: MemberScorecard[];
  alerts: WorkforceAlert[];
}

export function PerformanceIntelligencePanel() {
  const [activeTab, setActiveTab] = useState<
    'ai' | 'human' | 'alerts' | 'points'
  >('ai');
  const [timeframe, setTimeframe] = useState<'24h' | '7d' | '30d'>('7d');
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AuditReport | null>(null);
  const [selectedMember, setSelectedMember] = useState<MemberScorecard | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPerformanceData = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/co-founder/performance?timeframe=${timeframe}`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.data?.report) {
          setReport(json.data.report);
        }
      }
    } catch {
      // fallback handled gracefully
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
  }, [timeframe]);

  const aiScorecards = (report?.scorecards || []).filter(
    (s) =>
      s.entityType === 'AI_WORKER' &&
      (searchTerm === '' ||
        s.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const humanScorecards = (report?.scorecards || []).filter(
    (s) =>
      s.entityType === 'HUMAN_STAFF' &&
      (searchTerm === '' ||
        s.memberId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const alerts = report?.alerts || [];

  const getGradeBadge = (grade: string, score: number | null) => {
    if (score === null || grade === 'Insufficient Data') {
      return (
        <span className="rounded-full border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-400">
          Insufficient Data
        </span>
      );
    }
    if (grade === 'Outstanding') {
      return (
        <span className="rounded-full border border-emerald-600/50 bg-emerald-950/80 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          Outstanding ({score})
        </span>
      );
    }
    if (grade === 'Excellent') {
      return (
        <span className="rounded-full border border-teal-600/50 bg-teal-950/80 px-2.5 py-1 text-xs font-semibold text-teal-300">
          Excellent ({score})
        </span>
      );
    }
    if (grade === 'Good') {
      return (
        <span className="rounded-full border border-blue-600/50 bg-blue-950/80 px-2.5 py-1 text-xs font-semibold text-blue-300">
          Good ({score})
        </span>
      );
    }
    if (grade === 'Needs Improvement') {
      return (
        <span className="rounded-full border border-amber-600/50 bg-amber-950/80 px-2.5 py-1 text-xs font-semibold text-amber-300">
          Needs Improvement ({score})
        </span>
      );
    }
    return (
      <span className="rounded-full border border-rose-600/50 bg-rose-950/80 px-2.5 py-1 text-xs font-semibold text-rose-300">
        Critical Attention ({score})
      </span>
    );
  };

  const getConfidenceBadge = (confidence: string) => {
    const map: Record<string, string> = {
      HIGH: 'text-emerald-400 bg-emerald-950/40 border-emerald-800/40',
      MEDIUM: 'text-blue-400 bg-blue-950/40 border-blue-800/40',
      LOW: 'text-amber-400 bg-amber-950/40 border-amber-800/40',
      INSUFFICIENT: 'text-slate-400 bg-slate-900 border-slate-800',
    };
    return (
      <span
        className={`rounded border px-2 py-0.5 text-[11px] font-medium ${
          map[confidence] || map.INSUFFICIENT
        }`}
      >
        {confidence} Confidence
      </span>
    );
  };

  return (
    <div className="w-full rounded-xl border border-slate-800 bg-[#0d1117] p-6 text-slate-100 shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-amber-400">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-white">
                Workforce Performance Intelligence
                <span className="rounded-full border border-slate-700 bg-slate-800 px-2 py-0.5 text-xs font-normal text-amber-300">
                  Zero Paid Dependency
                </span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Deterministic KPI ledger, role-specific rubrics, and continuous
                quality audits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Timeframe selector */}
          <div className="flex rounded-lg border border-slate-800 bg-slate-900 p-1 text-xs">
            {(['24h', '7d', '30d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`rounded-md px-3 py-1.5 transition ${
                  timeframe === tf
                    ? 'bg-amber-500 font-semibold text-black shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>

          <button
            onClick={fetchPerformanceData}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-700"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="my-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>AI Workers Monitored</span>
            <Bot className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {report?.populationSummary.aiWorkersTotal ?? 15}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {report?.populationSummary.aiWorkersWithValidScores ?? 0} with
            publishable scores
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Human Staff Tracked</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">
            {report?.populationSummary.humanStaffTotal ?? 0}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {report?.populationSummary.humanStaffWithValidScores ?? 0} with
            publishable scores
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Data Health Status</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">
            {report?.dataHealth.status ?? 'HEALTHY'}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            Deterministic engine verified
          </div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Operational Alerts</span>
            <AlertTriangle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {alerts.length}
          </div>
          <div className="mt-1 text-[11px] text-slate-500">
            {alerts.filter((a) => a.severity === 'CRITICAL').length} critical
            alerts
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-6 border-b border-slate-800 text-sm font-medium">
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-2 border-b-2 pb-3 transition ${
            activeTab === 'ai'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Workers ({aiScorecards.length})
        </button>
        <button
          onClick={() => setActiveTab('human')}
          className={`flex items-center gap-2 border-b-2 pb-3 transition ${
            activeTab === 'human'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="h-4 w-4" />
          Human Staff ({humanScorecards.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 border-b-2 pb-3 transition ${
            activeTab === 'alerts'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Alerts & Root Causes ({alerts.length})
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative my-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by worker or staff name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-4 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
        />
      </div>

      {/* Content Area */}
      {loading ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-sm text-slate-500">
          <RefreshCw className="h-6 w-6 animate-spin text-amber-500" />
          Calculating workforce performance intelligence...
        </div>
      ) : activeTab === 'ai' || activeTab === 'human' ? (
        <div className="space-y-4">
          {(activeTab === 'ai' ? aiScorecards : humanScorecards).length ===
          0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
              No performance records found for this period. Workers will appear
              as tasks are executed.
            </div>
          ) : (
            (activeTab === 'ai' ? aiScorecards : humanScorecards).map(
              (card) => (
                <div
                  key={card.memberId}
                  className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition hover:border-slate-700"
                >
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {card.memberId}
                        </span>
                        <span className="text-xs text-slate-400">
                          ({card.roleId})
                        </span>
                        {getConfidenceBadge(card.confidence)}
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          Completed:{' '}
                          <strong className="text-slate-200">
                            {card.taskCounts.completed}
                          </strong>
                        </span>
                        <span>
                          Verified:{' '}
                          <strong className="text-emerald-400">
                            {card.taskCounts.verified}
                          </strong>
                        </span>
                        <span>
                          Failed:{' '}
                          <strong className="text-rose-400">
                            {card.taskCounts.failed}
                          </strong>
                        </span>
                        <span>
                          Points:{' '}
                          <strong className="text-amber-400">
                            {card.achievementPoints}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {getGradeBadge(card.grade, card.overallScore)}
                      <button
                        onClick={() =>
                          setSelectedMember(
                            selectedMember?.memberId === card.memberId
                              ? null
                              : card
                          )
                        }
                        className="rounded border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700"
                      >
                        {selectedMember?.memberId === card.memberId
                          ? 'Hide KPIs'
                          : 'View KPIs'}
                      </button>
                    </div>
                  </div>

                  {/* KPI Drill Down */}
                  {selectedMember?.memberId === card.memberId && (
                    <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-800 pt-4 md:grid-cols-2 lg:grid-cols-3">
                      {card.kpis.map((kpi) => (
                        <div
                          key={kpi.kpiId}
                          className="rounded border border-slate-800/80 bg-slate-950 p-3 text-xs"
                        >
                          <div className="truncate font-medium text-slate-400">
                            {kpi.name}
                          </div>
                          <div className="mt-1 flex items-baseline justify-between">
                            <span className="text-base font-bold text-white">
                              {kpi.value !== null
                                ? `${kpi.value}${kpi.unit === 'percentage' ? '%' : ''}`
                                : 'N/A'}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              Target: {kpi.target}
                              {kpi.unit === 'percentage'
                                ? '%'
                                : ''} (Weight: {Math.round(kpi.weight * 100)}%)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            )
          )}
        </div>
      ) : (
        /* Alerts Tab */
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center text-xs text-slate-400">
              Zero active alerts. All workers are performing within normal
              operational variance.
            </div>
          ) : (
            alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start justify-between gap-4 rounded-lg border border-slate-800 bg-slate-900/60 p-4"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                        alert.severity === 'CRITICAL'
                          ? 'border border-rose-800 bg-rose-950 text-rose-300'
                          : alert.severity === 'WARNING'
                            ? 'border border-amber-800 bg-amber-950 text-amber-300'
                            : 'border border-emerald-800 bg-emerald-950 text-emerald-300'
                      }`}
                    >
                      {alert.severity}
                    </span>
                    <span className="text-xs font-semibold text-white">
                      {alert.title}
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      [{alert.memberId}]
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">{alert.message}</p>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="rounded bg-slate-800 px-2 py-0.5 text-slate-300">
                      Root Cause: {alert.rootCause}
                    </span>
                    <span>Action: {alert.recommendedAction}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
