/**
 * Profit / rate calculator helpers.
 * Margin bands are configurable — read from `settings.operations_thresholds`
 * (seeded in migration 0073) with fallback defaults.
 */

export interface ProfitThresholds {
  margin_go_ahead: number;
  margin_dont_sell: number;
}

export const DEFAULT_PROFIT_THRESHOLDS: ProfitThresholds = {
  margin_go_ahead: 25.0,
  margin_dont_sell: 12.0,
};

export async function getProfitThresholds(
  supabase: any
): Promise<ProfitThresholds> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'operations_thresholds')
      .single();
    const value = data?.value || {};
    return {
      margin_go_ahead:
        Number(value.margin_go_ahead) ||
        DEFAULT_PROFIT_THRESHOLDS.margin_go_ahead,
      margin_dont_sell:
        Number(value.margin_dont_sell) ||
        DEFAULT_PROFIT_THRESHOLDS.margin_dont_sell,
    };
  } catch {
    return { ...DEFAULT_PROFIT_THRESHOLDS };
  }
}

export interface ProfitInput {
  cost_price: number;
  base_selling_price: number;
  discount_pct: number;
  packaging_cost: number;
  shipping_cost: number;
  tax_pct: number;
  quantity: number;
  thresholds: ProfitThresholds;
}

export type RecommendationLevel = 'go' | 'reconsider' | 'dont_sell';

export interface ProfitResult {
  effective_selling_price: number;
  gross_profit: number;
  tax_amount: number;
  packaging_cost: number;
  shipping_cost: number;
  net_profit: number;
  profit_margin_pct: number;
  break_even_price: number;
  roi_pct: number;
  recommendation: { level: RecommendationLevel; label: string };
  batch: {
    revenue: number;
    cost: number;
    packaging: number;
    shipping: number;
    tax: number;
    net_profit: number;
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function computeProfit(input: ProfitInput): ProfitResult {
  const qty = Math.max(1, input.quantity || 1);
  const discount = (input.discount_pct || 0) / 100;

  const effectiveSellingPrice = round2(
    (input.base_selling_price || 0) * (1 - discount)
  );
  const costPrice = input.cost_price || 0;
  const packaging = input.packaging_cost || 0;
  const shipping = input.shipping_cost || 0;
  const taxPct = input.tax_pct || 0;

  const taxAmount = round2((effectiveSellingPrice * taxPct) / 100);
  const grossProfit = round2(effectiveSellingPrice - costPrice);
  const netProfit = round2(grossProfit - packaging - shipping - taxAmount);

  const profitMarginPct =
    effectiveSellingPrice > 0 ? (netProfit / effectiveSellingPrice) * 100 : 0;
  const breakEvenPrice = round2(costPrice + packaging + shipping + taxAmount);
  const roiPct = costPrice > 0 ? (netProfit / costPrice) * 100 : 0;

  const { margin_go_ahead, margin_dont_sell } = input.thresholds;
  let level: RecommendationLevel = 'dont_sell';
  let label = 'Don\u2019t Sell At This Price';
  if (profitMarginPct >= margin_go_ahead) {
    level = 'go';
    label = 'Go Ahead';
  } else if (profitMarginPct >= margin_dont_sell) {
    level = 'reconsider';
    label = 'Reconsider \u2014 thin margin';
  }

  return {
    effective_selling_price: effectiveSellingPrice,
    gross_profit: grossProfit,
    tax_amount: taxAmount,
    packaging_cost: packaging,
    shipping_cost: shipping,
    net_profit: netProfit,
    profit_margin_pct: round2(profitMarginPct),
    break_even_price: breakEvenPrice,
    roi_pct: round2(roiPct),
    recommendation: { level, label },
    batch: {
      revenue: round2(effectiveSellingPrice * qty),
      cost: round2(costPrice * qty),
      packaging: round2(packaging * qty),
      shipping: round2(shipping * qty),
      tax: round2(taxAmount * qty),
      net_profit: round2(netProfit * qty),
    },
  };
}
