'use client';

import React from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  TrendingUp,
  X,
} from 'lucide-react';
import type { ProposalSimulationReview } from '@/lib/intelligence/simulator-review-service';

interface Props {
  review: ProposalSimulationReview | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (proposalId: string) => void;
  onReject?: (proposalId: string) => void;
}

export default function SimulatorComparisonModal({
  review,
  isOpen,
  onClose,
  onApprove,
  onReject,
}: Props) {
  if (!isOpen || !review) return null;

  const sim = review.simulation;
  const isDirectSimulation = 'comparisons' in sim;
  const comparisons = isDirectSimulation ? sim.comparisons : sim.metrics;
  const confidenceScore = sim.confidenceScore;
  const assumptions = sim.assumptions || [];
  const tradeoffs = isDirectSimulation ? sim.keyTradeoffs : [];
  const sideEffects = !isDirectSimulation ? sim.sideEffects : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-purple-500/30 bg-[#121620] shadow-2xl">
        {/* Header with Visual Distinction Badge */}
        <div className="border-b border-purple-500/20 bg-gradient-to-r from-purple-950/40 via-[#161b26] to-[#121620] px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                    Simulated Counterfactual Projection
                  </span>
                  <span className="font-mono text-xs text-slate-400">
                    {review.actionType}
                  </span>
                </div>
                <h2 className="mt-1 text-base font-bold text-white">
                  {review.proposalTitle}
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Mandatory Non-Misleading Disclaimer Banner */}
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
            <p className="font-medium leading-relaxed">{review.disclaimer}</p>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 space-y-6 overflow-y-auto p-6 text-sm text-slate-300">
          {/* ─── 1. Before / After Comparison Table ─────────────────────────── */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Metric Impact Comparison (Baseline vs Simulated)
            </h3>
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10 bg-[#0d1017]">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/10 bg-white/[0.02] text-slate-400">
                  <tr>
                    <th className="px-4 py-3 font-medium">Metric</th>
                    <th className="px-4 py-3 font-medium">
                      Historical Baseline
                    </th>
                    <th className="px-4 py-3 font-medium">Simulated Outcome</th>
                    <th className="px-4 py-3 font-medium">Projected Delta</th>
                    <th className="px-4 py-3 font-medium">Verdict</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono">
                  {comparisons.map((c: any, idx: number) => {
                    const isPositive = c.verdict === 'POSITIVE';
                    const isNegative = c.verdict === 'NEGATIVE';
                    const deltaColor = isPositive
                      ? 'text-emerald-400'
                      : isNegative
                        ? 'text-rose-400'
                        : 'text-slate-400';

                    return (
                      <tr key={idx} className="hover:bg-white/[0.01]">
                        <td className="px-4 py-3 font-sans font-medium text-white">
                          {c.label || c.name}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {c.unit === '₹'
                            ? `₹${c.baseline.toLocaleString('en-IN')}`
                            : `${c.baseline} ${c.unit}`}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white">
                          {c.unit === '₹'
                            ? `₹${(c.simulated ?? c.projected).toLocaleString('en-IN')}`
                            : `${c.simulated ?? c.projected} ${c.unit}`}
                          {c.projectedLowerBound !== undefined && (
                            <span className="block font-sans text-[10px] font-normal text-slate-500">
                              Uncertainty: {c.projectedLowerBound} –{' '}
                              {c.projectedUpperBound}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-3 font-bold ${deltaColor}`}>
                          <div className="flex items-center gap-1">
                            {isPositive && (
                              <TrendingUp className="h-3.5 w-3.5" />
                            )}
                            {isNegative && (
                              <TrendingDown className="h-3.5 w-3.5" />
                            )}
                            <span>
                              {c.absoluteDelta > 0 ? '+' : ''}
                              {c.unit === '₹'
                                ? `₹${c.absoluteDelta.toLocaleString('en-IN')}`
                                : `${c.absoluteDelta} ${c.unit}`}{' '}
                              (
                              {(c.percentDelta ?? c.percentageDelta > 0)
                                ? '+'
                                : ''}
                              {c.percentDelta ?? c.percentageDelta}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-sans">
                          <span
                            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              isPositive
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : isNegative
                                  ? 'bg-rose-500/10 text-rose-400'
                                  : 'bg-slate-500/10 text-slate-400'
                            }`}
                          >
                            {c.verdict}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ─── 2. Key Tradeoffs & Side Effects ────────────────────────────── */}
          {(tradeoffs.length > 0 || sideEffects.length > 0) && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Key Tradeoffs & Potential Side Effects
              </h3>
              <div className="mt-3 space-y-2">
                {tradeoffs.map((t, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-white/5 bg-[#0d1017] p-3 text-xs text-slate-300"
                  >
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
                    <span>{t}</span>
                  </div>
                ))}
                {sideEffects.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-rose-500/20 bg-rose-500/5 p-3 text-xs text-slate-300"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-rose-300">
                        {s.severity} Severity
                      </span>
                      <span className="font-semibold text-white">
                        {s.title}
                      </span>
                    </div>
                    <p className="mt-1 text-slate-300">{s.description}</p>
                    <p className="mt-1 text-[11px] font-medium text-amber-300/90">
                      Mitigation: {s.mitigationSuggestion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── 3. Confidence & Assumptions ────────────────────────────────── */}
          <div className="rounded-xl border border-white/10 bg-[#0d1017] p-4 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-medium text-slate-400">
                Model Projection Confidence:
              </span>
              <span className="font-mono font-bold text-purple-400">
                {Math.round(confidenceScore * 100)}%
              </span>
            </div>
            {assumptions.length > 0 && (
              <div className="mt-3 border-t border-white/5 pt-2">
                <span className="text-[11px] font-semibold uppercase text-slate-400">
                  Model Assumptions:
                </span>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-slate-400">
                  {assumptions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between border-t border-white/10 bg-[#161b26] px-6 py-4">
          <div className="text-xs text-slate-400">
            Review Readiness:{' '}
            <span
              className={`font-semibold capitalize ${
                review.reviewReadiness === 'READY_FOR_APPROVAL'
                  ? 'text-emerald-400'
                  : review.reviewReadiness === 'NEEDS_REVISION'
                    ? 'text-amber-400'
                    : 'text-rose-400'
              }`}
            >
              {review.reviewReadiness.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-xl bg-white/10 px-4 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-white/20"
            >
              Close Preview
            </button>
            {onReject && (
              <button
                onClick={() => onReject(review.proposalId)}
                className="rounded-xl border border-rose-500/40 bg-rose-500/20 px-4 py-2 text-xs font-semibold text-rose-300 transition-colors hover:bg-rose-500/30"
              >
                Reject Proposal
              </button>
            )}
            {onApprove && (
              <button
                onClick={() => onApprove(review.proposalId)}
                className="rounded-xl bg-amber-400 px-5 py-2 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-300"
              >
                Approve Proposal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
