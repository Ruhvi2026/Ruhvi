import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  calculateSkuDemandMetrics,
  getSkuDemandMetrics,
  type SkuDemandMetrics,
} from './inventory-demand-service';

/**
 * ============================================================================
 * TRANSPARENT STOCK-OUT RISK ESTIMATION ENGINE (TRACK G - PHASE 36)
 * ============================================================================
 * Calculates transparent, deterministic stock-out risk projections for eligible SKUs.
 *
 * Guarantees:
 * 1. Sellable Stock Calculation:
 *    - sellableStock = Math.max(0, onHandStock - reservedStock).
 * 2. Unconstrained Demand Integration:
 *    - Reuses authoritative demand metrics (Phase 35). Incorporates trend acceleration
 *      and unconstrained in-stock sales velocity.
 * 3. Transparent Confidence & Limitations:
 *    - Never presents weak estimates as certainty.
 *    - Strictly flags low sample sizes (orderCount < 3, inStockDays < 14) and
 *      insufficient observation windows.
 * 4. Deterministic Risk Tiers:
 *    - CRITICAL_STOCKOUT: sellableStock <= 0.
 *    - IMMINENT_RISK: runoutDays <= supplierLeadTimeDays.
 *    - ELEVATED_RISK: runoutDays <= supplierLeadTimeDays * 2.
 *    - STABLE: runoutDays > supplierLeadTimeDays * 2.
 *    - LOW_DEMAND_STABLE: Zero or negligible demand with available inventory.
 *    - INDETERMINATE: Insufficient data or missing history prevents reliable estimation.
 */

export type StockoutRiskLevel =
  | 'CRITICAL_STOCKOUT'
  | 'IMMINENT_RISK'
  | 'ELEVATED_RISK'
  | 'STABLE'
  | 'LOW_DEMAND_STABLE'
  | 'INDETERMINATE';

export type ProjectionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'INDETERMINATE';

export interface StockoutRiskCalculationParams {
  productId: string;
  sku: string;
  onHandStock: number;
  reservedStock?: number;
  lowStockThreshold?: number;
  supplierLeadTimeDays?: number; // default: 10 days
  demandMetrics: SkuDemandMetrics;
  evaluatedAt?: string;
}

export interface StockoutRiskEstimate {
  productId: string;
  sku: string;
  onHandStock: number;
  reservedStock: number;
  sellableStock: number;
  lowStockThreshold: number;
  supplierLeadTimeDays: number;

  // Projection values
  dailyDemandRateUsed: number;
  rateType:
    'in_stock_unconstrained' | 'trend_accelerated' | 'raw_average' | 'zero';
  estimatedRunoutDays: number | null;
  estimatedStockoutDate: string | null;

  // Risk Classification
  riskLevel: StockoutRiskLevel;
  confidence: ProjectionConfidence;
  confidenceScore: number; // 0.0 to 1.0

  // Transparency & Caveats
  confidenceLimitations: string[];
  assumptions: {
    formula: string;
    leadTimeDays: number;
    windowDays: number;
    inStockDaysObserved: number;
    trend: string;
    onHandStock?: number;
    reservedStock?: number;
    confidenceLimits?: string;
    advisoryNotice?: string;
  };

  evaluatedAt: string;
}

/**
 * Pure calculation engine for SKU stock-out risk.
 */
export function calculateStockoutRisk(
  params: StockoutRiskCalculationParams
): StockoutRiskEstimate {
  const evaluatedDate = params.evaluatedAt
    ? new Date(params.evaluatedAt)
    : new Date();
  const evaluatedAt = evaluatedDate.toISOString();

  const onHandStock = Math.max(0, Number(params.onHandStock) || 0);
  const reservedStock = Math.max(0, Number(params.reservedStock) || 0);
  const sellableStock = Math.max(0, onHandStock - reservedStock);
  const lowStockThreshold = Math.max(1, Number(params.lowStockThreshold) || 2);
  const supplierLeadTimeDays = Math.max(
    1,
    Number(params.supplierLeadTimeDays) || 10
  );

  const { demandMetrics } = params;
  const confidenceLimitations: string[] = [];

  // Edge case: Already stocked out
  if (sellableStock <= 0) {
    const zeroReason =
      reservedStock > 0 && onHandStock > 0
        ? `Zero sellable stock: all ${onHandStock} on-hand unit(s) are reserved.`
        : 'Product currently has zero sellable stock.';
    confidenceLimitations.push(zeroReason);

    return {
      productId: params.productId,
      sku: params.sku,
      onHandStock,
      reservedStock,
      sellableStock: 0,
      lowStockThreshold,
      supplierLeadTimeDays,
      dailyDemandRateUsed: 0,
      rateType: 'zero',
      estimatedRunoutDays: 0,
      estimatedStockoutDate: evaluatedAt,
      riskLevel: 'CRITICAL_STOCKOUT',
      confidence: 'HIGH',
      confidenceScore: 1.0,
      confidenceLimitations,
      assumptions: {
        formula: 'sellableStock <= 0',
        leadTimeDays: supplierLeadTimeDays,
        windowDays: demandMetrics.windowDays,
        inStockDaysObserved: demandMetrics.inStockDays,
        trend: demandMetrics.trend,
        onHandStock,
        reservedStock,
        confidenceLimits: 'Certain: Sellable stock is zero.',
        advisoryNotice:
          'Review-only advisory estimate. Zero automatic stock updates are performed.',
      },
      evaluatedAt,
    };
  }

  // Edge case: Insufficient data or stockout constrained with 0 sales
  if (
    demandMetrics.classification === 'INSUFFICIENT_DATA' ||
    (demandMetrics.classification === 'STOCKOUT_CONSTRAINED' &&
      demandMetrics.netUnitsSold === 0)
  ) {
    confidenceLimitations.push(
      demandMetrics.classificationReason ||
        'Insufficient historical sales exposure to project runout velocity.'
    );

    return {
      productId: params.productId,
      sku: params.sku,
      onHandStock,
      reservedStock,
      sellableStock,
      lowStockThreshold,
      supplierLeadTimeDays,
      dailyDemandRateUsed: 0,
      rateType: 'zero',
      estimatedRunoutDays: null,
      estimatedStockoutDate: null,
      riskLevel: 'INDETERMINATE',
      confidence: 'INDETERMINATE',
      confidenceScore: Math.min(0.2, demandMetrics.confidenceScore),
      confidenceLimitations,
      assumptions: {
        formula: 'Indeterminate due to insufficient observation horizon',
        leadTimeDays: supplierLeadTimeDays,
        windowDays: demandMetrics.windowDays,
        inStockDaysObserved: demandMetrics.inStockDays,
        trend: demandMetrics.trend,
        onHandStock,
        reservedStock,
        confidenceLimits:
          'Projection withheld: insufficient historical observation window.',
        advisoryNotice:
          'Review-only advisory estimate. Zero automatic stock updates are performed.',
      },
      evaluatedAt,
    };
  }

  // Edge case: Confirmed zero demand (ample stock, 0 sales across observed active days)
  if (
    demandMetrics.classification === 'ZERO_DEMAND' ||
    demandMetrics.netUnitsSold === 0
  ) {
    if (sellableStock <= lowStockThreshold) {
      confidenceLimitations.push(
        `Sellable stock (${sellableStock}) is at or below the safety threshold (${lowStockThreshold}), but zero recent sales were recorded.`
      );
    }

    return {
      productId: params.productId,
      sku: params.sku,
      onHandStock,
      reservedStock,
      sellableStock,
      lowStockThreshold,
      supplierLeadTimeDays,
      dailyDemandRateUsed: 0,
      rateType: 'zero',
      estimatedRunoutDays: null,
      estimatedStockoutDate: null,
      riskLevel: 'LOW_DEMAND_STABLE',
      confidence: demandMetrics.confidenceScore >= 0.7 ? 'HIGH' : 'MEDIUM',
      confidenceScore: demandMetrics.confidenceScore,
      confidenceLimitations,
      assumptions: {
        formula:
          'Zero demand recorded across observed in-stock days; runout infinite under current velocity',
        leadTimeDays: supplierLeadTimeDays,
        windowDays: demandMetrics.windowDays,
        inStockDaysObserved: demandMetrics.inStockDays,
        trend: demandMetrics.trend,
        onHandStock,
        reservedStock,
        confidenceLimits:
          'Subject to sudden demand spikes; current velocity is flat zero.',
        advisoryNotice:
          'Review-only advisory estimate. Zero automatic stock updates are performed.',
      },
      evaluatedAt,
    };
  }

  // Active Demand Scenario
  // Use unconstrained in-stock velocity when available, else raw
  let baseDailyRate =
    demandMetrics.inStockDailySales > 0
      ? demandMetrics.inStockDailySales
      : demandMetrics.rawDailySales;

  let rateType: 'in_stock_unconstrained' | 'trend_accelerated' | 'raw_average' =
    demandMetrics.inStockDailySales > 0
      ? 'in_stock_unconstrained'
      : 'raw_average';

  // Trend adjustment
  if (demandMetrics.trend === 'ACCELERATING') {
    baseDailyRate = Math.round(baseDailyRate * 1.25 * 100) / 100;
    rateType = 'trend_accelerated';
    confidenceLimitations.push(
      'Demand velocity is accelerating (+25% adjustment applied). Actual stockout may occur sooner.'
    );
  } else if (demandMetrics.trend === 'DECELERATING') {
    confidenceLimitations.push(
      'Demand velocity is decelerating. Historical rate may overestimate depletion speed.'
    );
  }

  // Sample size warnings
  if (demandMetrics.orderCount < 3) {
    confidenceLimitations.push(
      `Low order sample size (${demandMetrics.orderCount} order(s)) reduces projection certainty.`
    );
  }

  if (demandMetrics.inStockDays < 14) {
    confidenceLimitations.push(
      `Limited in-stock observation period (${demandMetrics.inStockDays} days) in ${demandMetrics.windowDays}-day horizon.`
    );
  }

  if (reservedStock > 0) {
    confidenceLimitations.push(
      `${reservedStock} unit(s) currently reserved in pending customer carts or orders.`
    );
  }

  if (sellableStock <= lowStockThreshold) {
    confidenceLimitations.push(
      `Sellable stock (${sellableStock}) is at or below the safety threshold (${lowStockThreshold}).`
    );
  }

  const runoutDays = Math.max(0, Math.floor(sellableStock / baseDailyRate));
  const estimatedStockoutTime =
    evaluatedDate.getTime() + runoutDays * 24 * 60 * 60 * 1000;
  const estimatedStockoutDate = new Date(estimatedStockoutTime).toISOString();

  // Determine Risk Tier based on Lead Time
  let riskLevel: StockoutRiskLevel;
  if (runoutDays <= supplierLeadTimeDays) {
    // Cannot restock before running out
    riskLevel = 'IMMINENT_RISK';
  } else if (runoutDays <= supplierLeadTimeDays * 2) {
    // Within reorder window
    riskLevel = 'ELEVATED_RISK';
  } else {
    riskLevel = 'STABLE';
  }

  // Determine overall projection confidence
  let confidence: ProjectionConfidence = 'HIGH';
  let confidenceScore = demandMetrics.confidenceScore;

  if (demandMetrics.orderCount < 3 || demandMetrics.inStockDays < 14) {
    confidence = 'LOW';
    confidenceScore = Math.min(0.4, confidenceScore);
  } else if (demandMetrics.inStockDays < 21 || demandMetrics.orderCount < 5) {
    confidence = 'MEDIUM';
    confidenceScore = Math.min(0.7, confidenceScore);
  }

  return {
    productId: params.productId,
    sku: params.sku,
    onHandStock,
    reservedStock,
    sellableStock,
    lowStockThreshold,
    supplierLeadTimeDays,
    dailyDemandRateUsed: baseDailyRate,
    rateType,
    estimatedRunoutDays: runoutDays,
    estimatedStockoutDate,
    riskLevel,
    confidence,
    confidenceScore,
    confidenceLimitations,
    assumptions: {
      formula: `floor(sellableStock (${sellableStock}) / dailyDemandRate (${baseDailyRate}))`,
      leadTimeDays: supplierLeadTimeDays,
      windowDays: demandMetrics.windowDays,
      inStockDaysObserved: demandMetrics.inStockDays,
      trend: demandMetrics.trend,
      onHandStock,
      reservedStock,
      confidenceLimits:
        confidence === 'HIGH'
          ? 'High projection reliability based on >=21 in-stock days and >=5 orders.'
          : confidence === 'MEDIUM'
            ? 'Moderate projection reliability. Subject to normal demand variance.'
            : 'Low projection reliability due to sparse order history (<3 orders) or brief in-stock horizon (<14 days).',
      advisoryNotice:
        'Review-only advisory estimate. Zero automatic stock updates are performed.',
    },
    evaluatedAt,
  };
}

/**
 * Server service to retrieve live authoritative stock and demand,
 * then estimate stock-out risk.
 */
export async function getSkuStockoutRisk(
  productId: string,
  options?: {
    supplierLeadTimeDays?: number;
    windowDays?: number;
    reservedStock?: number;
  }
): Promise<StockoutRiskEstimate> {
  const supabase = getServiceClient();

  // 1. Fetch Product authoritative stock
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, sku, stock_quantity, low_stock_threshold')
    .eq('id', productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error(
      `Product ${productId} not found: ${prodErr?.message || 'unknown'}`
    );
  }

  // 2. Compute authoritative demand metrics
  const demandMetrics = await getSkuDemandMetrics(productId, {
    windowDays: options?.windowDays ?? 30,
  });

  return calculateStockoutRisk({
    productId: product.id,
    sku: product.sku,
    onHandStock: Number(product.stock_quantity) || 0,
    reservedStock: options?.reservedStock ?? 0,
    lowStockThreshold: Number(product.low_stock_threshold) || 2,
    supplierLeadTimeDays: options?.supplierLeadTimeDays ?? 10,
    demandMetrics,
  });
}
