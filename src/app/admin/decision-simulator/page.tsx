'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  Cpu,
  HelpCircle,
  Info,
  Layers,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Truck,
  Zap,
} from 'lucide-react';
import type {
  CounterfactualDecisionType,
  CounterfactualEvaluationResult,
  CounterfactualMetric,
  UnintendedSideEffect,
} from '@/lib/intelligence/counterfactual-models';

/**
 * ============================================================================
 * DECISION SIMULATOR INTERFACE (TRACK I - PHASE 46)
 * ============================================================================
 * Dedicated administrative interactive workbench for evaluating commercial and
 * operational decisions in a sandboxed counterfactual environment.
 *
 * Guarantees:
 * 1. Sandboxed Read-Only Invariant: Zero production writes. No automated
 *    price, inventory, or shipping policy mutation.
 * 2. Visual Demarcation: High-contrast watermarks and badges separating
 *    historical measured baselines from simulated modeled projections.
 * 3. Range & Uncertainty Transparency: Highlights upper/lower margin-of-error
 *    bounds and econometric calibration assumptions.
 * 4. Human-In-The-Loop Governance: Surfaces side effects and mitigation
 *    guidance for executive review before proposing actions in Action Center.
 */

interface ScenarioConfig {
  id: CounterfactualDecisionType;
  title: string;
  category: string;
  icon: React.ComponentType<any>;
  description: string;
  defaultParams: Record<string, any>;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: 'inventory_buffer_optimization',
    title: 'Inventory Buffer Optimization',
    category: 'Inventory & Supply Chain',
    icon: Layers,
    description:
      'Model working capital vs stockout protection tradeoffs by adjusting safety stock thresholds across SKU tiers.',
    defaultParams: {
      skuCount: 25,
      averageUnitCost: 35000,
      bufferDeltaUnitsPerSku: 3,
      baselineStockoutLossMonthly: 150000,
      costOfCapitalAnnualPercent: 12,
    },
  },
  {
    id: 'tiered_pricing_elasticity',
    title: 'Tiered Pricing Elasticity',
    category: 'Pricing & Commercial',
    icon: SlidersHorizontal,
    description:
      'Evaluate volume vs margin shifts under price adjustments across entry, mid-tier, and luxury jewellery categories.',
    defaultParams: {
      priceTier: 'luxury_high_ticket',
      priceAdjustmentPercent: 5,
      baselineRevenueMonthly: 1500000,
      baselineGrossMarginPercent: 40,
    },
  },
  {
    id: 'promotional_campaign_structure',
    title: 'Promotional Campaign Structure',
    category: 'Marketing & Conversion',
    icon: Sparkles,
    description:
      'Simulate margin dilution vs conversion volume lift under site-wide or coupon discount promotions.',
    defaultParams: {
      baselineMonthlyOrders: 350,
      baselineAov: 38500,
      baselineGrossMarginPercent: 38,
      discountPercent: 10,
      expectedConversionLiftPercent: 20,
    },
  },
  {
    id: 'expedited_delivery_promise',
    title: 'Expedited Delivery Guarantee',
    category: 'Logistics & Operations',
    icon: Truck,
    description:
      'Simulate checkout conversion lift from guaranteed 2-day delivery against express carrier surcharges and RTO risk.',
    defaultParams: {
      monthlyShipmentVolume: 400,
      baselineCheckoutConversionRate: 2.5,
      expressCourierSurchargePerShipment: 150,
      averageOrderGrossProfit: 6500,
    },
  },
];

export default function DecisionSimulatorPage() {
  const [activeScenarioId, setActiveScenarioId] =
    useState<CounterfactualDecisionType>('inventory_buffer_optimization');
  const activeScenario = SCENARIOS.find((s) => s.id === activeScenarioId)!;

  const [params, setParams] = useState<Record<string, any>>(
    activeScenario.defaultParams
  );
  const [simulationResult, setSimulationResult] =
    useState<CounterfactualEvaluationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Sync parameters when changing scenarios
  const handleSelectScenario = (scenario: ScenarioConfig) => {
    setActiveScenarioId(scenario.id);
    setParams(scenario.defaultParams);
    setSimulationResult(null);
    setError(null);
  };

  const handleResetToBaseline = () => {
    setParams(activeScenario.defaultParams);
  };

  const runSimulation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch('/api/intelligence/simulator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType: activeScenarioId,
          parameters: params,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `HTTP ${res.status}: Failed to calculate simulation`
        );
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error('Malformed simulation response');
      }

      setSimulationResult(json.data);
    } catch (err: any) {
      setError(err.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  }, [activeScenarioId, params]);

  // Run on mount or when scenario changes
  useEffect(() => {
    runSimulation();
  }, [activeScenarioId]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      {/* ─── Breadcrumbs & Header ────────────────────────────────────────── */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Cpu className="h-4 w-4" />
            <span>AI Decision Intelligence • Track I</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white">
            Offline Decision Simulator
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Interactive counterfactual scenario modeling calibrated against
            retail jewellery benchmarks.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/action-center"
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-[#161b26] px-3.5 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10"
          >
            <span>Action Center</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* ─── Mandatory Non-Misleading Sandbox Banner ─────────────────────── */}
      <div className="rounded-xl border border-purple-500/30 bg-purple-950/20 p-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-purple-400" />
          <div className="space-y-1 text-xs text-purple-200/90">
            <p className="font-semibold text-purple-300">
              SANDBOXED COUNTERFACTUAL SIMULATOR — READ ONLY ENVIRONMENT
            </p>
            <p>
              Projections displayed below are deterministic counterfactual
              estimates based on historical baseline catalogs and econometric
              elasticity benchmarks. Under no circumstances do these
              calculations mutate live products, prices, stock levels, or
              shipping rules.
            </p>
          </div>
        </div>
      </div>

      {/* ─── Scenario Domain Tabs ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SCENARIOS.map((sc) => {
          const Icon = sc.icon;
          const isSelected = sc.id === activeScenarioId;
          return (
            <button
              key={sc.id}
              onClick={() => handleSelectScenario(sc)}
              className={`flex flex-col rounded-xl border p-4 text-left transition-all ${
                isSelected
                  ? 'border-amber-400/60 bg-amber-400/10 shadow-lg shadow-amber-400/5'
                  : 'border-white/10 bg-[#12161f] hover:border-white/20 hover:bg-[#161b26]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div
                  className={`rounded-lg p-2 ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {sc.category}
                </span>
              </div>
              <h3 className="mt-3 text-sm font-semibold text-white">
                {sc.title}
              </h3>
              <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                {sc.description}
              </p>
            </button>
          );
        })}
      </div>

      {/* ─── Main Two-Column Layout ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Interactive Scenario Parameters (5 cols) */}
        <div className="space-y-5 rounded-xl border border-white/10 bg-[#12161f] p-5 lg:col-span-5">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-amber-400" />
              <h2 className="text-sm font-semibold text-white">
                Scenario Levers & Inputs
              </h2>
            </div>
            <button
              onClick={handleResetToBaseline}
              className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white"
              title="Reset parameters to historical defaults"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Defaults</span>
            </button>
          </div>

          {/* Form Inputs Specific to Scenario */}
          <div className="space-y-4 text-xs">
            {activeScenarioId === 'inventory_buffer_optimization' && (
              <>
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Safety Buffer Delta Per SKU</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {params.bufferDeltaUnitsPerSku > 0 ? '+' : ''}
                      {params.bufferDeltaUnitsPerSku} units
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-10}
                    max={20}
                    step={1}
                    value={params.bufferDeltaUnitsPerSku}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        bufferDeltaUnitsPerSku: Number(e.target.value),
                      })
                    }
                    className="mt-2 w-full accent-amber-400"
                  />
                  <span className="text-[11px] text-slate-500">
                    Negative values model buffer contraction; positive values
                    add stockout protection.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300">
                    Target Catalog SKUs
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={params.skuCount}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        skuCount: Math.max(1, Number(e.target.value)),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Average Unit Cost (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={1000}
                    value={params.averageUnitCost}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        averageUnitCost: Math.max(100, Number(e.target.value)),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Baseline Monthly Stockout Loss (₹)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={5000}
                    value={params.baselineStockoutLossMonthly}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        baselineStockoutLossMonthly: Math.max(
                          0,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Cost of Capital (% Annual)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={params.costOfCapitalAnnualPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        costOfCapitalAnnualPercent: Math.max(
                          1,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}

            {activeScenarioId === 'tiered_pricing_elasticity' && (
              <>
                <div>
                  <label className="block text-slate-300">Jewellery Tier</label>
                  <select
                    value={params.priceTier}
                    onChange={(e) =>
                      setParams({ ...params, priceTier: e.target.value })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  >
                    <option value="entry_level">
                      Entry-Level Daily Wear (PED: -1.6, Elastic)
                    </option>
                    <option value="mid_tier">
                      Mid-Tier Occasion Wear (PED: -1.15, Moderate)
                    </option>
                    <option value="luxury_high_ticket">
                      Luxury High-Ticket Bridal (PED: -0.65, Inelastic)
                    </option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Price Adjustment (%)</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {params.priceAdjustmentPercent > 0 ? '+' : ''}
                      {params.priceAdjustmentPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-30}
                    max={30}
                    step={1}
                    value={params.priceAdjustmentPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        priceAdjustmentPercent: Number(e.target.value),
                      })
                    }
                    className="mt-2 w-full accent-amber-400"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>-30% (Deep Discount)</span>
                    <span>0% (Status Quo)</span>
                    <span>+30% (Premium Markup)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300">
                    Baseline Monthly Revenue (₹)
                  </label>
                  <input
                    type="number"
                    min={10000}
                    step={50000}
                    value={params.baselineRevenueMonthly}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        baselineRevenueMonthly: Math.max(
                          10000,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Baseline Gross Margin (%)
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={85}
                    value={params.baselineGrossMarginPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        baselineGrossMarginPercent: Math.max(
                          5,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}

            {activeScenarioId === 'promotional_campaign_structure' && (
              <>
                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Campaign Discount (%)</span>
                    <span className="font-mono font-semibold text-amber-400">
                      {params.discountPercent}% OFF
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={40}
                    step={1}
                    value={params.discountPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        discountPercent: Number(e.target.value),
                      })
                    }
                    className="mt-2 w-full accent-amber-400"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-slate-300">
                    <span>Expected Order Conversion Lift (%)</span>
                    <span className="font-mono font-semibold text-amber-400">
                      +{params.expectedConversionLiftPercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={params.expectedConversionLiftPercent}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        expectedConversionLiftPercent: Number(e.target.value),
                      })
                    }
                    className="mt-2 w-full accent-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Baseline Monthly Orders
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={params.baselineMonthlyOrders}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        baselineMonthlyOrders: Math.max(
                          1,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Baseline AOV (₹)
                  </label>
                  <input
                    type="number"
                    min={500}
                    step={1000}
                    value={params.baselineAov}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        baselineAov: Math.max(500, Number(e.target.value)),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}

            {activeScenarioId === 'expedited_delivery_promise' && (
              <>
                <div>
                  <label className="block text-slate-300">
                    Monthly Shipment Volume
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={params.monthlyShipmentVolume}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        monthlyShipmentVolume: Math.max(
                          1,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Express Courier Surcharge (₹ per parcel)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={25}
                    value={params.expressCourierSurchargePerShipment}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        expressCourierSurchargePerShipment: Math.max(
                          0,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300">
                    Average Gross Profit Per Order (₹)
                  </label>
                  <input
                    type="number"
                    min={100}
                    step={500}
                    value={params.averageOrderGrossProfit}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        averageOrderGrossProfit: Math.max(
                          100,
                          Number(e.target.value)
                        ),
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-[#0d1017] px-3 py-2 text-white outline-none focus:border-amber-400"
                  />
                </div>
              </>
            )}
          </div>

          {/* Action Trigger */}
          <button
            onClick={runSimulation}
            disabled={loading}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 px-4 py-2.5 text-xs font-semibold text-slate-950 transition-colors hover:bg-amber-300 disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Simulating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                <span>Calculate Counterfactual</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Projected Counterfactual Outcomes (7 cols) */}
        <div className="space-y-5 lg:col-span-7">
          {error && (
            <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-300">
              <div className="flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-4 w-4" />
                <span>Simulation Error</span>
              </div>
              <p className="mt-1">{error}</p>
            </div>
          )}

          {simulationResult && (
            <>
              {/* Executive Recommendation Banner */}
              <div
                className={`rounded-xl border p-4 ${
                  simulationResult.netBusinessRecommendation ===
                  'STRONGLY_FAVORABLE'
                    ? 'border-emerald-500/40 bg-emerald-950/20'
                    : simulationResult.netBusinessRecommendation ===
                        'FAVORABLE_WITH_CONDITIONS'
                      ? 'border-amber-500/40 bg-amber-950/20'
                      : 'border-rose-500/40 bg-rose-950/20'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span
                      className={`inline-block rounded-md px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
                        simulationResult.netBusinessRecommendation ===
                        'STRONGLY_FAVORABLE'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : simulationResult.netBusinessRecommendation ===
                              'FAVORABLE_WITH_CONDITIONS'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-rose-500/20 text-rose-400'
                      }`}
                    >
                      Recommendation:{' '}
                      {simulationResult.netBusinessRecommendation.replace(
                        /_/g,
                        ' '
                      )}
                    </span>
                    <p className="mt-2 text-sm font-semibold text-white">
                      {simulationResult.summary}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] uppercase tracking-wider text-slate-400">
                      Model Confidence
                    </span>
                    <div className="text-base font-bold text-white">
                      {Math.round(simulationResult.confidenceScore * 100)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Side-by-Side Comparative Metrics Cards */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {simulationResult.metrics.map((m, idx) => {
                  const isPositive = m.verdict === 'POSITIVE';
                  const isNegative = m.verdict === 'NEGATIVE';
                  return (
                    <div
                      key={idx}
                      className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4 text-xs"
                    >
                      <div className="flex items-center justify-between text-slate-400">
                        <span className="font-medium text-slate-300">
                          {m.name}
                        </span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                          {m.category}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <div>
                          <span className="block text-[10px] text-slate-400">
                            Baseline
                          </span>
                          <span className="font-mono text-sm text-slate-300">
                            {m.unit === '₹' ? '₹' : ''}
                            {m.baseline.toLocaleString('en-IN')}
                            {m.unit !== '₹' ? ` ${m.unit}` : ''}
                          </span>
                        </div>

                        <ArrowRight className="h-3.5 w-3.5 text-slate-600" />

                        <div className="text-right">
                          <span className="block text-[10px] font-semibold text-purple-300">
                            Simulated
                          </span>
                          <span className="font-mono text-base font-bold text-white">
                            {m.unit === '₹' ? '₹' : ''}
                            {m.projected.toLocaleString('en-IN')}
                            {m.unit !== '₹' ? ` ${m.unit}` : ''}
                          </span>
                        </div>
                      </div>

                      {/* Delta Indicator */}
                      <div
                        className={`flex items-center justify-between border-t border-white/5 pt-2 font-mono text-[11px] ${
                          isPositive
                            ? 'text-emerald-400'
                            : isNegative
                              ? 'text-rose-400'
                              : 'text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1">
                          {isPositive ? (
                            <TrendingUp className="h-3.5 w-3.5" />
                          ) : isNegative ? (
                            <TrendingDown className="h-3.5 w-3.5" />
                          ) : null}
                          <span>
                            {m.absoluteDelta > 0 ? '+' : ''}
                            {m.unit === '₹' ? '₹' : ''}
                            {m.absoluteDelta.toLocaleString('en-IN')}
                            {m.unit !== '₹' ? ` ${m.unit}` : ''}
                          </span>
                        </div>
                        <span>
                          ({m.percentageDelta > 0 ? '+' : ''}
                          {m.percentageDelta}%)
                        </span>
                      </div>

                      {/* Uncertainty Spread */}
                      <div className="pt-1 text-[10px] text-slate-500">
                        Range: {m.unit === '₹' ? '₹' : ''}
                        {m.projectedLowerBound.toLocaleString('en-IN')} –{' '}
                        {m.unit === '₹' ? '₹' : ''}
                        {m.projectedUpperBound.toLocaleString('en-IN')}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Unintended Side Effects & Mitigations */}
              {simulationResult.sideEffects &&
                simulationResult.sideEffects.length > 0 && (
                  <div className="space-y-3 rounded-xl border border-amber-500/20 bg-[#161b26] p-4 text-xs">
                    <div className="flex items-center gap-2 font-semibold text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                      <span>
                        Potential Unintended Side Effects & Mitigations
                      </span>
                    </div>

                    <div className="space-y-2">
                      {simulationResult.sideEffects.map((se, idx) => (
                        <div
                          key={idx}
                          className="space-y-1 rounded-lg border border-white/5 bg-[#0d1017] p-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">
                              {se.title}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${
                                se.severity === 'HIGH'
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}
                            >
                              {se.severity} RISK
                            </span>
                          </div>
                          <p className="text-slate-300">{se.description}</p>
                          <div className="pt-1 text-[11px] text-slate-400">
                            <span className="font-medium text-amber-300">
                              Recommended Mitigation:{' '}
                            </span>
                            {se.mitigationSuggestion}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Econometric Calibration & Assumptions */}
              <div className="space-y-2 rounded-xl border border-white/10 bg-[#12161f] p-4 text-xs text-slate-400">
                <div className="flex items-center gap-2 font-semibold text-slate-300">
                  <Info className="h-4 w-4 text-purple-400" />
                  <span>Econometric Calibration & Assumptions</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  {simulationResult.uncertaintyBasis}
                </p>
                <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-slate-500">
                  {simulationResult.assumptions.map((asm, idx) => (
                    <li key={idx}>{asm}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
