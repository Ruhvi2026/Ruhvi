'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Calculator,
  Search,
  ArrowLeft,
  Package,
  Boxes,
  Percent,
  Truck,
  ReceiptText,
} from 'lucide-react';
import Link from 'next/link';
import {
  getProfitThresholds,
  computeProfit,
  ProfitThresholds,
  DEFAULT_PROFIT_THRESHOLDS,
} from '@/lib/calculator';

export default function ProfitCalculatorPage() {
  const [thresholds, setThresholds] = useState<ProfitThresholds>(
    DEFAULT_PROFIT_THRESHOLDS
  );

  // Product selection
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<{
    product: any;
    variant: any;
  } | null>(null);

  // Packaging variants (selectable in calculator)
  const [packagingVariants, setPackagingVariants] = useState<any[]>([]);
  const [packagingId, setPackagingId] = useState('');

  // Mode
  const [mode, setMode] = useState<'per_unit' | 'batch'>('per_unit');

  // Manual inputs
  const [discountPct, setDiscountPct] = useState('0');
  const [shippingCost, setShippingCost] = useState('0');
  const [taxPct, setTaxPct] = useState('3');
  const [batchQty, setBatchQty] = useState('100');

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const config = await getProfitThresholds(supabase);
      setThresholds(config);
      const { data: packs } = await supabase
        .from('packaging_variants')
        .select('id, name, cost, description')
        .order('name');
      setPackagingVariants(packs || []);
    };
    load();
  }, []);

  // Debounced product search by name / SKU (products with variants)
  useEffect(() => {
    if (search.trim().length < 2) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const delay = setTimeout(async () => {
      const { data } = await supabase
        .from('products')
        .select(
          `id, name, sku, slug, sku_prefix, cost_price, base_selling_price, packaging_cost, weight_grams, length_cm, width_cm, height_cm,
           product_variants(id, sku, size, metal_type, stock_quantity, cost_price_override, selling_price_override)`
        )
        .or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
        .limit(8);
      setResults(data || []);
    }, 300);
    return () => clearTimeout(delay);
  }, [search]);

  const handleSelect = (product: any) => {
    // Default to first variant, or a pseudo variant representing the base product
    const firstVariant = product.product_variants?.[0];
    setSelected({
      product,
      variant: firstVariant || null,
    });
    setSearch('');
    setResults([]);
  };

  const handleSelectVariant = (variant: any) => {
    if (!selected) return;
    setSelected({ ...selected, variant });
  };

  // Auto-fetch values from selected product/variant
  const auto = useMemo(() => {
    if (!selected) return null;
    const p = selected.product;
    const v = selected.variant;
    return {
      cost_price: v?.cost_price_override ?? p.cost_price ?? 0,
      base_selling_price:
        v?.selling_price_override ?? p.base_selling_price ?? p.price ?? 0,
      packaging_cost: p.packaging_cost ?? 0,
      weight_grams: p.weight_grams,
      length_cm: p.length_cm,
      width_cm: p.width_cm,
      height_cm: p.height_cm,
    };
  }, [selected]);

  const selectedPackaging = packagingVariants.find(
    (pv) => pv.id === packagingId
  );

  const result = useMemo(() => {
    if (!auto) return null;
    const packaging =
      selectedPackaging && Number(selectedPackaging.cost) >= 0
        ? Number(selectedPackaging.cost)
        : auto.packaging_cost;
    return computeProfit({
      cost_price: auto.cost_price,
      base_selling_price: auto.base_selling_price,
      discount_pct: parseFloat(discountPct) || 0,
      packaging_cost: packaging,
      shipping_cost: parseFloat(shippingCost) || 0,
      tax_pct: parseFloat(taxPct) || 0,
      quantity: parseInt(batchQty, 10) || 1,
      thresholds,
    });
  }, [
    auto,
    selectedPackaging,
    discountPct,
    shippingCost,
    taxPct,
    batchQty,
    thresholds,
  ]);

  const recStyle =
    result?.recommendation.level === 'go'
      ? {
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
          text: 'text-emerald-400',
        }
      : result?.recommendation.level === 'reconsider'
        ? {
            border: 'border-amber-500/30',
            bg: 'bg-amber-500/10',
            text: 'text-amber-400',
          }
        : {
            border: 'border-rose-500/30',
            bg: 'bg-rose-500/10',
            text: 'text-rose-400',
          };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/operations/dashboard"
          className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Profit Calculator</h1>
          <p className="mt-1 text-sm text-slate-400">
            Margin, break-even, and ROI for a product or batch.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Product & Inputs */}
        <div className="space-y-6">
          {/* Product selection */}
          <div className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Select Product</h2>
            </div>

            {selected ? (
              <div className="space-y-3">
                <div className="flex items-start justify-between rounded-lg border border-white/10 bg-black/20 p-4">
                  <div>
                    <p className="font-medium text-white">
                      {selected.product.name}
                    </p>
                    <p className="text-xs text-slate-500">
                      SKU: {selected.product.sku}
                    </p>
                    {selected.variant && (
                      <p className="mt-1 text-xs text-slate-400">
                        Variant: {selected.variant.sku}
                        {selected.variant.size
                          ? ` (size ${selected.variant.size})`
                          : ''}
                        {selected.variant.metal_type
                          ? ` / ${selected.variant.metal_type}`
                          : ''}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    Change
                  </button>
                </div>

                {selected.product.product_variants?.length > 1 && (
                  <div>
                    <label className="mb-1.5 block text-xs font-medium text-slate-400">
                      Variant
                    </label>
                    <select
                      value={selected.variant?.id || ''}
                      onChange={(e) => {
                        const v = selected.product.product_variants.find(
                          (x: any) => x.id === e.target.value
                        );
                        if (v) handleSelectVariant(v);
                      }}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                    >
                      <option value="">Base product (no variant)</option>
                      {selected.product.product_variants.map((v: any) => (
                        <option key={v.id} value={v.id}>
                          {v.sku} — {v.size || 'OS'} / {v.metal_type || '—'} (
                          {v.stock_quantity} in stock)
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search product by name or SKU..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 py-2.5 pl-9 pr-4 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {results.length > 0 && (
                  <ul className="divide-y divide-white/5 overflow-hidden rounded-lg border border-white/10 bg-black/20">
                    {results.map((p) => (
                      <li key={p.id}>
                        <button
                          onClick={() => handleSelect(p)}
                          className="flex w-full items-center justify-between p-3 text-left transition-colors hover:bg-white/5"
                        >
                          <div>
                            <p className="text-sm font-medium text-white">
                              {p.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              SKU: {p.sku}
                            </p>
                          </div>
                          <span className="text-xs text-slate-400">
                            {p.product_variants?.length || 0} variants
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Auto-fetched values */}
            {auto && (
              <div className="rounded-lg border border-white/10 bg-black/20 p-4 text-xs">
                <p className="mb-2 font-semibold uppercase tracking-wider text-slate-500">
                  Auto-fetched
                </p>
                <div className="grid grid-cols-2 gap-2 text-slate-300">
                  <div>
                    Cost:{' '}
                    <span className="font-medium text-white">
                      ₹{auto.cost_price}
                    </span>
                  </div>
                  <div>
                    Base price:{' '}
                    <span className="font-medium text-white">
                      ₹{auto.base_selling_price}
                    </span>
                  </div>
                  <div>
                    Packaging:{' '}
                    <span className="font-medium text-white">
                      ₹{auto.packaging_cost}
                    </span>
                  </div>
                  <div>
                    Weight:{' '}
                    <span className="font-medium text-white">
                      {auto.weight_grams ?? '—'}g
                    </span>
                  </div>
                  <div>
                    Dims:{' '}
                    <span className="font-medium text-white">
                      {auto.length_cm ?? '—'} × {auto.width_cm ?? '—'} ×{' '}
                      {auto.height_cm ?? '—'} cm
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Inputs */}
          <div className="space-y-4 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">Inputs</h2>
              <div className="flex rounded-lg border border-white/10 bg-black/20 p-0.5">
                <button
                  onClick={() => setMode('per_unit')}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === 'per_unit'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Calculator className="h-3.5 w-3.5" /> Per Unit
                </button>
                <button
                  onClick={() => setMode('batch')}
                  className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                    mode === 'batch'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Boxes className="h-3.5 w-3.5" /> Batch
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Percent className="h-3.5 w-3.5" /> Discount %
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <Truck className="h-3.5 w-3.5" /> Shipping (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={shippingCost}
                  onChange={(e) => setShippingCost(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                  <ReceiptText className="h-3.5 w-3.5" /> Tax / GST %
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={taxPct}
                  onChange={(e) => setTaxPct(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>
              {mode === 'batch' && (
                <div>
                  <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-slate-400">
                    <Boxes className="h-3.5 w-3.5" /> Batch Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Packaging variant selection */}
            {packagingVariants.length > 0 && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Packaging Variant
                </label>
                <select
                  value={packagingId}
                  onChange={(e) => setPackagingId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">Use product packaging cost</option>
                  {packagingVariants.map((pv) => (
                    <option key={pv.id} value={pv.id}>
                      {pv.name} — ₹{pv.cost}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Right: Results */}
        <div className="space-y-6">
          {!selected ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 bg-[#151520] p-16 text-center">
              <Calculator className="mb-3 h-10 w-10 text-slate-600" />
              <p className="text-sm text-slate-500">
                Select a product to see the profit calculation.
              </p>
            </div>
          ) : result ? (
            <>
              {/* Recommendation */}
              <div
                className={`rounded-xl border p-6 ${recStyle.border} ${recStyle.bg}`}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Recommendation
                </p>
                <p className={`mt-1 text-xl font-bold ${recStyle.text}`}>
                  {result.recommendation.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Margin band: go-ahead ≥ {thresholds.margin_go_ahead}% ·
                  don&apos;t-sell &lt; {thresholds.margin_dont_sell}%
                </p>
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Effective Price
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    ₹{result.effective_selling_price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Gross Profit
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    ₹{result.gross_profit.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Net Profit
                  </p>
                  <p
                    className={`mt-1 text-xl font-bold ${
                      result.net_profit >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    ₹{result.net_profit.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Profit Margin
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {result.profit_margin_pct.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    Break-Even Price
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    ₹{result.break_even_price.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-[#151520] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    ROI
                  </p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {result.roi_pct.toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div className="rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
                <h3 className="mb-4 text-base font-bold text-white">
                  {mode === 'batch'
                    ? `Batch Breakdown (${parseInt(batchQty, 10) || 1} units)`
                    : 'Per-Unit Breakdown'}
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Selling Price</span>
                    <span className="font-medium text-white">
                      ₹
                      {(mode === 'batch'
                        ? result.batch.revenue
                        : result.effective_selling_price
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cost Price</span>
                    <span className="font-medium text-rose-400">
                      −₹
                      {(mode === 'batch'
                        ? result.batch.cost
                        : (auto?.cost_price ?? 0)
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2">
                    <span className="text-slate-400">Gross Profit</span>
                    <span className="font-medium text-emerald-400">
                      ₹
                      {(mode === 'batch'
                        ? result.batch.revenue - result.batch.cost
                        : result.gross_profit
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Packaging</span>
                    <span className="font-medium text-rose-400">
                      −₹
                      {(mode === 'batch'
                        ? result.batch.packaging
                        : result.packaging_cost
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Shipping</span>
                    <span className="font-medium text-rose-400">
                      −₹
                      {(mode === 'batch'
                        ? result.batch.shipping
                        : result.shipping_cost
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Tax (GST)</span>
                    <span className="font-medium text-rose-400">
                      −₹
                      {(mode === 'batch'
                        ? result.batch.tax
                        : result.tax_amount
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                  <div className="flex justify-between border-t border-white/5 pt-2 text-base font-bold">
                    <span className="text-white">Net Profit</span>
                    <span
                      className={
                        result.net_profit >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }
                    >
                      ₹
                      {(mode === 'batch'
                        ? result.batch.net_profit
                        : result.net_profit
                      ).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
