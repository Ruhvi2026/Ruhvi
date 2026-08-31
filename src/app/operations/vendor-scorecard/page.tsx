'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  ArrowLeft,
  Star,
  Clock,
  TrendingUp,
  TrendingDown,
  Loader2,
  Award,
} from 'lucide-react';
import Link from 'next/link';
import {
  getInventoryThresholds,
  DEFAULT_INVENTORY_THRESHOLDS,
  InventoryThresholds,
} from '@/lib/inventory';

export default function VendorScorecardPage() {
  const [loading, setLoading] = useState(true);
  const [scorecard, setScorecard] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<InventoryThresholds>(
    DEFAULT_INVENTORY_THRESHOLDS
  );

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const config = await getInventoryThresholds(supabase);
      setThresholds(config);

      // Suppliers
      const { data: suppliers } = await supabase
        .from('suppliers')
        .select('*')
        .order('name');

      // Cost history per supplier: latest cost, previous cost, compute cost trend
      const { data: costs } = await supabase
        .from('product_supplier_costs')
        .select(
          'supplier_id, cost_price, effective_date, product:products!inner(id, name)'
        )
        .order('effective_date', { ascending: false });

      // Group costs by supplier, then by product for latest vs previous
      const costBySupplier = new Map<
        string,
        { latest: number; prev: number; productCount: number }
      >();
      const productSeen = new Set<string>();
      (costs || []).forEach((c: any) => {
        if (!c.supplier_id) return;
        const key = `${c.supplier_id}::${c.product?.id}`;
        if (!productSeen.has(key)) {
          productSeen.add(key);
          if (!costBySupplier.has(c.supplier_id)) {
            costBySupplier.set(c.supplier_id, {
              latest: 0,
              prev: 0,
              productCount: 0,
            });
          }
          const entry = costBySupplier.get(c.supplier_id)!;
          entry.productCount++;
          // First entry for this product is the latest (sorted desc)
          if (entry.latest === 0) {
            entry.latest = c.cost_price;
          } else if (entry.prev === 0) {
            entry.prev = c.cost_price;
          }
        }
      });

      const rows = (suppliers || []).map((s: any) => {
        const costData = costBySupplier.get(s.id) || {
          latest: 0,
          prev: 0,
          productCount: 0,
        };
        const trendPct =
          costData.prev > 0
            ? Math.round(
                ((costData.latest - costData.prev) / costData.prev) * 100 * 10
              ) / 10
            : null;
        const leadScore = s.lead_time_days
          ? Math.max(0, Math.min(5, 5 - (s.lead_time_days - 1) * 0.25))
          : null;
        const qualityScore = s.quality_rating ?? null;
        const costTrendScore =
          trendPct !== null
            ? Math.max(0, Math.min(5, 5 - Math.max(0, trendPct) * 0.5))
            : null;
        const scores = [leadScore, qualityScore, costTrendScore].filter(
          (x) => x !== null
        );
        const overall =
          scores.length > 0
            ? Math.round(
                (scores.reduce((a, b) => a + b, 0) / scores.length) * 10
              ) / 10
            : null;

        return {
          id: s.id,
          name: s.name,
          contact_person: s.contact_person,
          phone: s.phone,
          email: s.email,
          lead_time_days: s.lead_time_days,
          quality_rating: s.quality_rating,
          product_count: costData.productCount,
          cost_trend_pct: trendPct,
          lead_score: leadScore ? Math.round(leadScore * 10) / 10 : null,
          quality_score: qualityScore ?? null,
          cost_trend_score: costTrendScore
            ? Math.round(costTrendScore * 10) / 10
            : null,
          overall_score: overall,
        };
      });

      setScorecard(rows);
      setLoading(false);
    };
    fetchData();
  }, []);

  const sorted = useMemo(
    () =>
      [...scorecard].sort(
        (a, b) => (b.overall_score ?? 0) - (a.overall_score ?? 0)
      ),
    [scorecard]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/dashboard"
          className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">
            Vendor Performance Scorecard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Computed from lead time, quality rating, and cost trend.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#151520] shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 bg-black/20 text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Lead Time
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Lead Score
                </th>
                <th className="px-4 py-3 text-right font-semibold">Quality</th>
                <th className="px-4 py-3 text-right font-semibold">
                  Quality Score
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Cost Trend
                </th>
                <th className="px-4 py-3 text-right font-semibold">
                  Trend Score
                </th>
                <th className="px-4 py-3 text-right font-semibold">Overall</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-10 text-center text-slate-500"
                  >
                    <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
                    Loading...
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    No suppliers configured yet.
                  </td>
                </tr>
              ) : (
                sorted.map((s) => {
                  const scoreColor = (sc: number | null) => {
                    if (sc === null) return 'text-slate-500';
                    if (sc >= 4) return 'text-emerald-400';
                    if (sc >= 3) return 'text-amber-400';
                    return 'text-rose-400';
                  };
                  return (
                    <tr
                      key={s.id}
                      className="transition-colors hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-white">{s.name}</p>
                        {s.email && (
                          <p className="text-[10px] text-slate-500">
                            {s.email}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">
                        {s.lead_time_days ?? '—'}d
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${scoreColor(s.lead_score)}`}
                      >
                        {s.lead_score !== null ? s.lead_score.toFixed(1) : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.quality_rating !== null ? (
                          <span className="flex items-center justify-end gap-1 text-slate-300">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {s.quality_rating}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${scoreColor(s.quality_score)}`}
                      >
                        {s.quality_score !== null
                          ? s.quality_score.toFixed(1)
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {s.cost_trend_pct !== null ? (
                          <span
                            className={`flex items-center justify-end gap-1 font-medium ${(s.cost_trend_pct ?? 0) > 0 ? 'text-rose-400' : 'text-emerald-400'}`}
                          >
                            {(s.cost_trend_pct ?? 0) > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {(s.cost_trend_pct ?? 0) > 0 ? '+' : ''}
                            {s.cost_trend_pct}%
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-medium ${scoreColor(s.cost_trend_score)}`}
                      >
                        {s.cost_trend_score !== null
                          ? s.cost_trend_score.toFixed(1)
                          : '—'}
                      </td>
                      <td
                        className={`px-4 py-3 text-right text-lg font-bold ${scoreColor(s.overall_score)}`}
                      >
                        {s.overall_score !== null ? (
                          <span className="flex items-center justify-end gap-1">
                            {s.overall_score >= 4 && (
                              <Award className="h-4 w-4 text-amber-400" />
                            )}
                            {s.overall_score.toFixed(1)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
