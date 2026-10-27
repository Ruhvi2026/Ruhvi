'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Radar,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  ArrowRight,
  DollarSign,
  PackageCheck,
  ShoppingBag,
  CreditCard,
  RotateCcw,
  Truck,
  Layers,
  Activity,
  Calendar,
  Lock,
} from 'lucide-react';
import type {
  BusinessRadarSummary,
  DateRangePreset,
  RadarMetricItem,
  MetricSeverity,
} from '@/lib/intelligence/radar-service';

/**
 * ============================================================================
 * BUSINESS RADAR DASHBOARD VIEW (TRACK C - PHASE 18)
 * ============================================================================
 * Read-only Business Radar interface rendered inside the Ruhvi Admin Portal.
 *
 * Guarantees & Features:
 * 1. Read-Only Telemetry: Strictly visualizes verified canonical metrics.
 * 2. Honest Freshness: Clearly indicates evaluation time and 60-second cache TTL.
 * 3. Comparative Multi-Window: Current vs Previous equivalent period deltas & % changes.
 * 4. Deterministic Severities: Healthy (emerald), Warning (amber), Critical (rose).
 * 5. Complete State Machine: Loading skeletons, Error boundaries, 401/403 Permission
 *    denied states, and Empty window notices.
 * 6. Departmental RBAC: Staff roles cleanly observe an RBAC boundary notice for
 *    restricted financial KPIs.
 * 7. Deep Linking: Links directly to authoritative admin management screens.
 */

const PRESETS: { id: DateRangePreset; label: string }[] = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last_7_days', label: 'Last 7 Days' },
  { id: 'last_30_days', label: 'Last 30 Days' },
  { id: 'this_month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

function formatCurrency(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(val);
}

function formatNumber(val: number): string {
  return new Intl.NumberFormat('en-IN').format(val);
}

function formatPercent(val: number): string {
  return `${val.toFixed(1)}%`;
}

function formatIsoDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso;
  }
}

function formatIsoTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata',
    });
  } catch {
    return iso;
  }
}

// ─── Severity Badge ──────────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: MetricSeverity }) {
  switch (severity) {
    case 'healthy':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          Healthy
        </span>
      );
    case 'warning':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          Warning
        </span>
      );
    case 'critical':
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-rose-500/20 bg-rose-500/10 px-2.5 py-0.5 text-xs font-medium text-rose-400">
          <AlertOctagon className="h-3 w-3" />
          Critical
        </span>
      );
    case 'insufficient_data':
    default:
      return (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-0.5 text-xs font-medium text-slate-400">
          <HelpCircle className="h-3 w-3" />
          Insufficient Data
        </span>
      );
  }
}

// ─── Metric Card ─────────────────────────────────────────────────────────────
interface MetricCardProps {
  item: RadarMetricItem;
  icon: React.ComponentType<{ className?: string }>;
  deepLink?: { label: string; href: string };
  isCurrency?: boolean;
  isPercent?: boolean;
}

function MetricCard({
  item,
  icon: Icon,
  deepLink,
  isCurrency = false,
  isPercent = false,
}: MetricCardProps) {
  const currentVal = item.current.value;
  const previousVal = item.previous?.value;

  let displayValue = '—';
  if (currentVal !== null && currentVal !== undefined) {
    if (isCurrency) displayValue = formatCurrency(currentVal);
    else if (isPercent) displayValue = formatPercent(currentVal);
    else displayValue = formatNumber(currentVal);
  }

  let displayPrevious = '—';
  if (previousVal !== null && previousVal !== undefined) {
    if (isCurrency) displayPrevious = formatCurrency(previousVal);
    else if (isPercent) displayPrevious = formatPercent(previousVal);
    else displayPrevious = formatNumber(previousVal);
  }

  // Trend styling
  let trendIcon = <Minus className="h-3.5 w-3.5 text-slate-400" />;
  let trendColor = 'text-slate-400 bg-slate-500/10 border-slate-500/20';

  if (item.trendQuality === 'improving') {
    trendIcon = <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />;
    trendColor = 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
  } else if (item.trendQuality === 'deteriorating') {
    trendIcon = <TrendingDown className="h-3.5 w-3.5 text-rose-400" />;
    trendColor = 'text-rose-400 bg-rose-500/10 border-rose-500/20';
  }

  // Delta display
  let deltaText = '';
  if (item.pctChange !== null && item.pctChange !== undefined) {
    const sign = item.pctChange > 0 ? '+' : '';
    deltaText = `${sign}${item.pctChange.toFixed(1)}%`;
  }

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-white/10 bg-[#131726] p-5 shadow-lg transition-all hover:border-white/20">
      <div>
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-amber-300">
            <Icon className="h-5 w-5" />
          </div>
          <SeverityBadge severity={item.severity} />
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            {item.label}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-white">
              {displayValue}
            </span>
            {item.current.status === 'insufficient_data' && (
              <span className="text-xs text-slate-400">(no activity)</span>
            )}
          </div>
        </div>

        {/* Comparison Details */}
        <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-3 text-xs">
          <span className="text-slate-400">
            Prev Period:{' '}
            <span className="text-slate-200">{displayPrevious}</span>
          </span>
          {deltaText && (
            <div
              className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${trendColor}`}
            >
              {trendIcon}
              <span>{deltaText}</span>
            </div>
          )}
        </div>

        {/* Numerator / Denominator Metadata */}
        {item.current.metadata && (
          <div className="mt-2 text-[11px] text-slate-400">
            {item.current.metadata.numerator !== undefined &&
              item.current.metadata.denominator !== undefined && (
                <span>
                  Sample: {item.current.metadata.numerator} /{' '}
                  {item.current.metadata.denominator} events
                </span>
              )}
            {item.current.metadata.count !== undefined && (
              <span>Count: {item.current.metadata.count} transactions</span>
            )}
          </div>
        )}
      </div>

      {/* Deep Link */}
      {deepLink && (
        <div className="mt-4 border-t border-white/5 pt-3">
          <Link
            href={deepLink.href}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-300 transition-colors hover:text-amber-200"
          >
            {deepLink.label}
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BusinessRadarPage() {
  const [preset, setPreset] = useState<DateRangePreset>('last_7_days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [data, setData] = useState<BusinessRadarSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [httpStatus, setHttpStatus] = useState<number | null>(null);

  const fetchRadarData = useCallback(
    async (isFresh = false) => {
      try {
        if (isFresh) setRefreshing(true);
        else setLoading(true);
        setError(null);
        setHttpStatus(null);

        const params = new URLSearchParams();
        params.set('preset', preset);
        if (preset === 'custom') {
          if (customStart) params.set('start', customStart);
          if (customEnd) params.set('end', customEnd);
        }
        if (isFresh) params.set('fresh', 'true');

        const res = await fetch(`/api/business-radar?${params.toString()}`);
        setHttpStatus(res.status);

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          throw new Error(
            errBody.error || `Request failed with status ${res.status}`
          );
        }

        const json = await res.json();
        if (!json.success || !json.data) {
          throw new Error(json.error || 'Invalid API response structure');
        }

        setData(json.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load business radar data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [preset, customStart, customEnd]
  );

  useEffect(() => {
    fetchRadarData(false);
  }, [fetchRadarData]);

  // Overall Health Pill
  const renderOverallHealthBadge = (health: MetricSeverity) => {
    switch (health) {
      case 'healthy':
        return (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-emerald-400">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
            </span>
            <span className="text-sm font-semibold">
              All Core Telemetry Healthy
            </span>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Threshold Warning Detected
            </span>
          </div>
        );
      case 'critical':
        return (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-2 text-rose-400">
            <AlertOctagon className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Critical Threshold Breached
            </span>
          </div>
        );
      case 'insufficient_data':
      default:
        return (
          <div className="flex items-center gap-2 rounded-xl border border-slate-500/30 bg-slate-500/10 px-4 py-2 text-slate-400">
            <HelpCircle className="h-5 w-5" />
            <span className="text-sm font-semibold">
              Awaiting Baseline Telemetry
            </span>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0f1a] p-4 text-slate-100 sm:p-6 lg:p-8">
      {/* ─── Header Section ──────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col gap-4 border-b border-white/10 pb-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                Business Radar
              </h1>
              <p className="text-sm text-slate-400">
                Canonical business telemetry, comparative window trends, and
                deterministic operational health.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {data && renderOverallHealthBadge(data.overallHealth)}

          <button
            onClick={() => fetchRadarData(true)}
            disabled={loading || refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-50"
            title="Refresh verified telemetry bypassing in-memory cache"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`}
            />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* ─── Filter Bar ──────────────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#131726] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => setPreset(p.id)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                preset === p.id
                  ? 'bg-amber-400 font-semibold text-slate-900'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom Date Inputs */}
        {preset === 'custom' && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1 text-slate-400">
              <Calendar className="h-3.5 w-3.5" />
              <span>From:</span>
            </div>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <span className="text-slate-400">To:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            />
            <button
              onClick={() => fetchRadarData(false)}
              className="rounded-lg bg-amber-400 px-3 py-1 font-semibold text-slate-900 transition-colors hover:bg-amber-300"
            >
              Apply
            </button>
          </div>
        )}

        {/* Freshness & Metadata Notice */}
        {data && (
          <div className="text-right text-xs text-slate-400">
            <div>
              Window:{' '}
              <span className="text-slate-200">
                {formatIsoDate(data.timeWindow.start)} –{' '}
                {formatIsoDate(data.timeWindow.end)}
              </span>
            </div>
            <div className="text-[11px] text-slate-500">
              Evaluated {formatIsoTime(data.generatedAt)} IST • Cache TTL 60s
            </div>
          </div>
        )}
      </div>

      {/* ─── State: Permission Denied (401/403) ───────────────────────────── */}
      {httpStatus && (httpStatus === 401 || httpStatus === 403) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#131726] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <Lock className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Administrative Session Required
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">
            You do not have permission to view Business Radar telemetry. Please
            log in with an authorized internal administrator or manager session.
          </p>
          <Link
            href="/login"
            className="mt-6 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-amber-300"
          >
            Go to Portal Login
          </Link>
        </div>
      )}

      {/* ─── State: Error Boundary ───────────────────────────────────────── */}
      {error && (!httpStatus || (httpStatus !== 401 && httpStatus !== 403)) && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-rose-500/20 bg-[#131726] p-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400">
            <ShieldAlert className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-lg font-bold text-white">
            Failed to Load Business Radar
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-400">{error}</p>
          <button
            onClick={() => fetchRadarData(false)}
            className="mt-6 rounded-xl bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            Retry Telemetry Fetch
          </button>
        </div>
      )}

      {/* ─── State: Loading Skeletons ─────────────────────────────────────── */}
      {loading && (
        <div className="space-y-8">
          {[1, 2, 3].map((sectionIndex) => (
            <div key={sectionIndex} className="space-y-4">
              <div className="h-6 w-48 animate-pulse rounded bg-white/5" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[1, 2, 3, 4].map((cardIndex) => (
                  <div
                    key={cardIndex}
                    className="h-44 animate-pulse rounded-2xl border border-white/5 bg-[#131726] p-5"
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── State: Populated Dashboard ──────────────────────────────────── */}
      {!loading && !error && data && (
        <div className="space-y-10">
          {/* 1. FINANCIAL TELEMETRY SECTION */}
          <section aria-labelledby="heading-financial">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-400" />
                <h2
                  id="heading-financial"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Executive & Financial Telemetry
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Audited against transactional order ledger
              </span>
            </div>

            {data.sections.financial ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.sections.financial.gross_sales && (
                  <MetricCard
                    item={data.sections.financial.gross_sales}
                    icon={DollarSign}
                    isCurrency={true}
                    deepLink={{
                      label: 'View Sales Report',
                      href: '/admin/reports/sales',
                    }}
                  />
                )}
                {data.sections.financial.net_sales && (
                  <MetricCard
                    item={data.sections.financial.net_sales}
                    icon={CreditCard}
                    isCurrency={true}
                    deepLink={{
                      label: 'View Sales Ledger',
                      href: '/admin/reports/sales',
                    }}
                  />
                )}
                {data.sections.financial.average_order_value && (
                  <MetricCard
                    item={data.sections.financial.average_order_value}
                    icon={ShoppingBag}
                    isCurrency={true}
                    deepLink={{
                      label: 'Order Analytics',
                      href: '/admin/orders',
                    }}
                  />
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-[#131726] p-5 text-sm text-slate-400">
                <Lock className="h-5 w-5 text-amber-400" />
                <span>
                  Financial revenue metrics are partitioned and restricted to
                  administrative roles ({data.callerRole}).
                </span>
              </div>
            )}
          </section>

          {/* 2. OPERATIONS & FULFILLMENT SECTION */}
          <section aria-labelledby="heading-operations">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-400" />
                <h2
                  id="heading-operations"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Operations & Fulfillment Telemetry
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Order transitions, cancellations & courier returns
              </span>
            </div>

            {data.sections.operations && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {data.sections.operations.paid_orders_count && (
                  <MetricCard
                    item={data.sections.operations.paid_orders_count}
                    icon={PackageCheck}
                    deepLink={{
                      label: 'All Orders',
                      href: '/admin/orders',
                    }}
                  />
                )}
                {data.sections.operations.cancellation_rate && (
                  <MetricCard
                    item={data.sections.operations.cancellation_rate}
                    icon={AlertTriangle}
                    isPercent={true}
                    deepLink={{
                      label: 'Investigate Orders',
                      href: '/admin/orders',
                    }}
                  />
                )}
                {data.sections.operations.rto_rate && (
                  <MetricCard
                    item={data.sections.operations.rto_rate}
                    icon={RotateCcw}
                    isPercent={true}
                    deepLink={{
                      label: 'Courier Dispatches',
                      href: '/admin/orders',
                    }}
                  />
                )}
                {data.sections.operations.return_rate && (
                  <MetricCard
                    item={data.sections.operations.return_rate}
                    icon={RotateCcw}
                    isPercent={true}
                    deepLink={{
                      label: 'Refunds & Returns',
                      href: '/admin/refunds',
                    }}
                  />
                )}
              </div>
            )}
          </section>

          {/* 3. INVENTORY & INFRASTRUCTURE SECTION */}
          <section aria-labelledby="heading-inventory-infra">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-amber-400" />
                <h2
                  id="heading-inventory-infra"
                  className="text-lg font-semibold tracking-tight text-white"
                >
                  Catalog & Infrastructure Health
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                Stock availability & payment gateway resilience
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.sections.inventory?.stock_out_rate && (
                <MetricCard
                  item={data.sections.inventory.stock_out_rate}
                  icon={Layers}
                  isPercent={true}
                  deepLink={{
                    label: 'Inventory Control',
                    href: '/admin/reports/inventory',
                  }}
                />
              )}
              {data.sections.infrastructure?.payment_failure_rate && (
                <MetricCard
                  item={data.sections.infrastructure.payment_failure_rate}
                  icon={Activity}
                  isPercent={true}
                  deepLink={{
                    label: 'Payment Gateway Logs',
                    href: '/admin/payments',
                  }}
                />
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
