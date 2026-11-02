'use client';

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Receipt,
  FileCheck,
  ArrowRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WorkerAuditResult {
  workerId: string;
  workerName: string;
  task: string;
  findings: string[];
  evidence: string[];
  problems: string[];
  opportunities: string[];
  recommendations: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  timestamp?: string;
}

export function AccountsAiCopilot() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<WorkerAuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/co-founder/workers/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'Perform comprehensive Indian GST Rule 46 audit, GSTR-3B position calculation, Section 17(5) ITC evaluation, and Section 44AB Income Tax review.',
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(
          errJson.error || 'Failed to dispatch Accounts AI Worker'
        );
      }

      const json = await res.json();
      setData(json);
    } catch (err: any) {
      console.warn('Accounts AI Copilot audit warning:', err);
      setError(err?.message || 'Could not reach Accounts Worker');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/20 shadow-2xl transition-all">
      {/* Header Bar */}
      <div className="flex flex-col justify-between gap-4 border-b border-amber-500/20 bg-slate-900/60 p-5 sm:flex-row sm:items-center">
        <div className="flex items-center space-x-3.5">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-tr from-amber-500/20 to-amber-400/10 text-amber-400 shadow-inner">
            <Sparkles className="h-5 w-5 animate-pulse" />
            <span className="absolute -bottom-1 -right-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-slate-950 bg-emerald-500" />
            </span>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-white sm:text-lg">
                Accounts & Tax AI Worker
              </h2>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300">
                Worker 14 • Live Copilot
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Autonomous GST Rule 46 Invoicing, Section 17(5) ITC, and Section
              44AB Tax Guard
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 self-end sm:self-auto">
          <button
            onClick={runAudit}
            disabled={loading}
            className="inline-flex items-center space-x-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500 hover:text-slate-950 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
            />
            <span>{loading ? 'Auditing Books...' : 'Re-run AI Audit'}</span>
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-slate-400 transition-colors hover:text-white"
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="space-y-6 p-6">
          {error && (
            <div className="flex items-center space-x-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-xs text-red-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          )}

          {loading && !data ? (
            <div className="flex flex-col items-center justify-center space-y-3 py-10">
              <RefreshCw className="h-8 w-8 animate-spin text-amber-400" />
              <p className="font-mono text-xs text-slate-400">
                Worker 14 is auditing store orders, GSTR-3B tax offset, and
                purchase bills...
              </p>
            </div>
          ) : data ? (
            <>
              {/* Findings Section */}
              <div className="space-y-2.5">
                <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>Key Financial & Tax Findings</span>
                </div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {data.findings.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-200 transition-colors hover:border-slate-700"
                    >
                      <div className="flex items-start space-x-2">
                        <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        <span>{item}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compliance Alerts & Opportunities Grid */}
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {/* Problems / Compliance Alerts */}
                {data.problems.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-amber-500/20 bg-amber-950/10 p-4">
                    <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
                      <span>Compliance Notices ({data.problems.length})</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {data.problems.map((prob, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                          <span>{prob}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Opportunities */}
                {data.opportunities.length > 0 && (
                  <div className="space-y-2 rounded-2xl border border-emerald-500/20 bg-emerald-950/10 p-4">
                    <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
                      <Lightbulb className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Tax Optimization Opportunities</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {data.opportunities.map((opp, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                          <span>{opp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Actionable Recommendations */}
              {data.recommendations.length > 0 && (
                <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
                  <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
                    <ShieldCheck className="h-3.5 w-3.5 text-blue-400" />
                    <span>Actionable Compliance Checklist</span>
                  </div>
                  <div className="divide-y divide-slate-800">
                    {data.recommendations.map((rec, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 text-xs text-slate-300"
                      >
                        <div className="flex items-center space-x-2.5">
                          <ArrowRight className="h-3 w-3 shrink-0 text-amber-400" />
                          <span>{rec}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-4 text-center text-xs text-slate-500">
              Click &quot;Re-run AI Audit&quot; to inspect your books with
              Worker 14.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
