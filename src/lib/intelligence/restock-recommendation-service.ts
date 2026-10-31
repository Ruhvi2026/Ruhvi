import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  getSkuDemandMetrics,
  type SkuDemandMetrics,
} from './inventory-demand-service';

/**
 * ============================================================================
 * REVIEW-ONLY RESTOCK RECOMMENDATION ENGINE (TRACK G - PHASE 38)
 * ============================================================================
 * Generates transparent, review-only restock quantity suggestions for eligible SKUs.
 *
 * Guarantees:
 * 1. Strict Review-Only Guarantee:
 *    - All outputs are labeled as draft recommendations for inventory managers.
 *    - Absolutely NO automated purchase orders, external vendor communications,
 *      or inventory ledger mutations.
 * 2. Deterministic Replenishment Logic:
 *    - Reorder Point (ROP) = (Demand Velocity * Lead Time) + Safety Stock.
 *    - Target Stock Level (Order-Up-To) = (Demand Velocity * (Lead Time + Review Period)) + Safety Stock.
 *    - Suggested Quantity = Target Stock Level - Sellable Stock (respecting MOQ & batch multiples).
 * 3. Transparent Missing-Data & Zero-Demand Handling:
 *    - Unconfigured lead times use a safe, documented default (10 days) with explicit caveats.
 *    - SKUs with ZERO_DEMAND or INSUFFICIENT_DATA do not generate blind purchase orders.
 */

export type RestockUrgency = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export type RestockStatus =
  'RESTOCK_RECOMMENDED' | 'NO_RESTOCK_NEEDED' | 'INSUFFICIENT_DATA_FOR_RESTOCK';

export interface RestockCalculationParams {
  productId: string;
  sku: string;
  productName?: string;
  sellableStock: number;
  lowStockThreshold: number;
  demandMetrics: SkuDemandMetrics;
  supplierLeadTimeDays?: number; // default: 10 days
  reviewPeriodDays?: number; // default: 30 days
  safetyStockDays?: number; // default: 7 days
  minimumOrderQuantity?: number; // MOQ
  batchSizeMultiple?: number; // e.g. Pack of 2 or 5
  maxStockCap?: number;
  unitCostPrice?: number;
  evaluatedAt?: string;
}

export interface RestockRecommendation {
  productId: string;
  sku: string;
  status: RestockStatus;
  urgency: RestockUrgency;

  // Inventory & Parameter State
  sellableStock: number;
  dailyDemandRate: number;
  leadTimeDays: number;
  reviewPeriodDays: number;
  safetyStockUnits: number;
  reorderPoint: number;
  targetStockLevel: number;

  // Recommendations
  suggestedQuantity: number;
  rawDeficit: number;
  moqApplied: boolean;
  batchRoundingApplied: boolean;
  estimatedProcurementCost: number;

  // Explainability & Audit
  rationale: string;
  formulaDetails: {
    reorderPointFormula: string;
    targetStockFormula: string;
    effectiveDailyRate: number;
  };
  caveats: string[];
  advisoryNotice: string;
  isDraftReviewOnly: true;
  evaluatedAt: string;
}

const DEFAULT_ADVISORY_NOTICE =
  'Review-only replenishment suggestion for human inventory review. Zero automated purchase orders, supplier communications, product additions, or stock ledger mutations occur.';

/**
 * Pure calculation engine for restock quantity recommendations.
 */
export function calculateRestockRecommendation(
  params: RestockCalculationParams
): RestockRecommendation {
  const evaluatedDate = params.evaluatedAt
    ? new Date(params.evaluatedAt)
    : new Date();
  const evaluatedAt = evaluatedDate.toISOString();

  const sellableStock = Math.max(0, Number(params.sellableStock) || 0);
  const lowStockThreshold = Math.max(1, Number(params.lowStockThreshold) || 2);
  const leadTimeDays = Math.max(1, Number(params.supplierLeadTimeDays) || 10);
  const reviewPeriodDays = Math.max(1, Number(params.reviewPeriodDays) || 30);
  const safetyStockDays = Math.max(1, Number(params.safetyStockDays) || 7);
  const unitCostPrice = Math.max(0, Number(params.unitCostPrice) || 0);

  const { demandMetrics } = params;
  const caveats: string[] = [];

  if (!params.supplierLeadTimeDays) {
    caveats.push(
      'Standard fallback lead time (10 days) used; configure specific vendor lead times for precision.'
    );
  }

  // ─── 1. Insufficient Data Edge Case ─────────────────────────────────────────
  if (demandMetrics.classification === 'INSUFFICIENT_DATA') {
    caveats.push(
      'Insufficient sales history (< minimum observation window) to project reliable replenishment volume.'
    );
    return {
      productId: params.productId,
      sku: params.sku,
      status: 'INSUFFICIENT_DATA_FOR_RESTOCK',
      urgency: 'NONE',
      sellableStock,
      dailyDemandRate: 0,
      leadTimeDays,
      reviewPeriodDays,
      safetyStockUnits: lowStockThreshold,
      reorderPoint: lowStockThreshold,
      targetStockLevel: lowStockThreshold,
      suggestedQuantity: 0,
      rawDeficit: 0,
      moqApplied: false,
      batchRoundingApplied: false,
      estimatedProcurementCost: 0,
      rationale:
        'Product has insufficient historical sales data to forecast reliable restock quantities.',
      formulaDetails: {
        reorderPointFormula: 'N/A (insufficient data)',
        targetStockFormula: 'N/A (insufficient data)',
        effectiveDailyRate: 0,
      },
      caveats,
      advisoryNotice: DEFAULT_ADVISORY_NOTICE,
      isDraftReviewOnly: true,
      evaluatedAt,
    };
  }

  // ─── 2. Zero Demand Edge Case ───────────────────────────────────────────────
  if (
    demandMetrics.classification === 'ZERO_DEMAND' ||
    demandMetrics.netUnitsSold === 0
  ) {
    caveats.push(
      'Zero sales recorded during active in-stock observation period. Restock not recommended.'
    );
    return {
      productId: params.productId,
      sku: params.sku,
      status: 'NO_RESTOCK_NEEDED',
      urgency: 'NONE',
      sellableStock,
      dailyDemandRate: 0,
      leadTimeDays,
      reviewPeriodDays,
      safetyStockUnits: lowStockThreshold,
      reorderPoint: lowStockThreshold,
      targetStockLevel: lowStockThreshold,
      suggestedQuantity: 0,
      rawDeficit: 0,
      moqApplied: false,
      batchRoundingApplied: false,
      estimatedProcurementCost: 0,
      rationale:
        'Zero sales recorded across active in-stock period. Additional capital expenditure not recommended.',
      formulaDetails: {
        reorderPointFormula: 'N/A (zero demand)',
        targetStockFormula: 'N/A (zero demand)',
        effectiveDailyRate: 0,
      },
      caveats,
      advisoryNotice: DEFAULT_ADVISORY_NOTICE,
      isDraftReviewOnly: true,
      evaluatedAt,
    };
  }

  // ─── 3. Active Demand Calculations ─────────────────────────────────────────
  let effectiveDailyRate =
    demandMetrics.inStockDailySales > 0
      ? demandMetrics.inStockDailySales
      : demandMetrics.rawDailySales;

  if (demandMetrics.trend === 'ACCELERATING') {
    effectiveDailyRate = Math.round(effectiveDailyRate * 1.25 * 100) / 100;
    caveats.push(
      'Demand is accelerating; a +25% replenishment velocity buffer has been incorporated.'
    );
  }

  // Safety stock: max of static low_stock_threshold or dynamic (rate * safetyStockDays)
  const dynamicSafetyUnits = Math.ceil(effectiveDailyRate * safetyStockDays);
  const safetyStockUnits = Math.max(lowStockThreshold, dynamicSafetyUnits);

  // Reorder Point = (Velocity * LeadTime) + SafetyStock
  const reorderPoint = Math.ceil(
    effectiveDailyRate * leadTimeDays + safetyStockUnits
  );

  // Target Stock Level (Order-Up-To) = (Velocity * (LeadTime + ReviewPeriod)) + SafetyStock
  const targetStockLevel = Math.ceil(
    effectiveDailyRate * (leadTimeDays + reviewPeriodDays) + safetyStockUnits
  );

  // Check if restock is triggered
  if (sellableStock > reorderPoint) {
    const daysUntilReorder = Math.floor(
      (sellableStock - reorderPoint) / effectiveDailyRate
    );
    return {
      productId: params.productId,
      sku: params.sku,
      status: 'NO_RESTOCK_NEEDED',
      urgency: 'NONE',
      sellableStock,
      dailyDemandRate: effectiveDailyRate,
      leadTimeDays,
      reviewPeriodDays,
      safetyStockUnits,
      reorderPoint,
      targetStockLevel,
      suggestedQuantity: 0,
      rawDeficit: 0,
      moqApplied: false,
      batchRoundingApplied: false,
      estimatedProcurementCost: 0,
      rationale: `Sellable stock (${sellableStock}) exceeds reorder point (${reorderPoint}). Stock is sufficient for approximately ${daysUntilReorder} days before reordering.`,
      formulaDetails: {
        reorderPointFormula: `ceil(${effectiveDailyRate} * ${leadTimeDays} + ${safetyStockUnits}) = ${reorderPoint}`,
        targetStockFormula: `ceil(${effectiveDailyRate} * (${leadTimeDays} + ${reviewPeriodDays}) + ${safetyStockUnits}) = ${targetStockLevel}`,
        effectiveDailyRate,
      },
      caveats,
      advisoryNotice: DEFAULT_ADVISORY_NOTICE,
      isDraftReviewOnly: true,
      evaluatedAt,
    };
  }

  // Restock is recommended!
  const rawDeficit = Math.max(0, targetStockLevel - sellableStock);
  let finalQuantity = rawDeficit;
  let moqApplied = false;
  let batchRoundingApplied = false;

  // Apply MOQ
  if (
    params.minimumOrderQuantity &&
    finalQuantity < params.minimumOrderQuantity
  ) {
    finalQuantity = params.minimumOrderQuantity;
    moqApplied = true;
    caveats.push(
      `Quantity adjusted from ${rawDeficit} to ${finalQuantity} to fulfill supplier MOQ (${params.minimumOrderQuantity}).`
    );
  }

  // Apply Batch Multiple
  if (params.batchSizeMultiple && params.batchSizeMultiple > 1) {
    const remainder = finalQuantity % params.batchSizeMultiple;
    if (remainder !== 0) {
      finalQuantity = finalQuantity + (params.batchSizeMultiple - remainder);
      batchRoundingApplied = true;
      caveats.push(
        `Quantity rounded up to nearest batch multiple of ${params.batchSizeMultiple}.`
      );
    }
  }

  // Apply Max Stock Cap
  if (params.maxStockCap && finalQuantity > params.maxStockCap) {
    finalQuantity = params.maxStockCap;
    caveats.push(
      `Quantity capped at maximum inventory limit (${params.maxStockCap}).`
    );
  }

  // Determine Urgency Tier
  let urgency: RestockUrgency;
  if (sellableStock <= 0) {
    urgency = 'CRITICAL';
  } else if (sellableStock <= safetyStockUnits) {
    urgency = 'HIGH';
  } else {
    urgency = 'MEDIUM';
  }

  const estimatedProcurementCost = finalQuantity * unitCostPrice;

  return {
    productId: params.productId,
    sku: params.sku,
    status: 'RESTOCK_RECOMMENDED',
    urgency,
    sellableStock,
    dailyDemandRate: effectiveDailyRate,
    leadTimeDays,
    reviewPeriodDays,
    safetyStockUnits,
    reorderPoint,
    targetStockLevel,
    suggestedQuantity: finalQuantity,
    rawDeficit,
    moqApplied,
    batchRoundingApplied,
    estimatedProcurementCost,
    rationale: `Sellable stock (${sellableStock}) is at or below reorder point (${reorderPoint}). Recommended restock of ${finalQuantity} units restores target level of ${targetStockLevel}.`,
    formulaDetails: {
      reorderPointFormula: `ceil(${effectiveDailyRate} * ${leadTimeDays} + ${safetyStockUnits}) = ${reorderPoint}`,
      targetStockFormula: `ceil(${effectiveDailyRate} * (${leadTimeDays} + ${reviewPeriodDays}) + ${safetyStockUnits}) = ${targetStockLevel}`,
      effectiveDailyRate,
    },
    caveats,
    advisoryNotice: DEFAULT_ADVISORY_NOTICE,
    isDraftReviewOnly: true,
    evaluatedAt,
  };
}

/**
 * Server service to retrieve live product inventory and demand,
 * then generate a draft restock recommendation.
 */
export async function getSkuRestockRecommendation(
  productId: string,
  options?: {
    supplierLeadTimeDays?: number;
    reviewPeriodDays?: number;
    safetyStockDays?: number;
    minimumOrderQuantity?: number;
    batchSizeMultiple?: number;
  }
): Promise<RestockRecommendation> {
  const supabase = getServiceClient();

  // 1. Fetch Product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select(
      'id, sku, name, price, cost_price, stock_quantity, low_stock_threshold'
    )
    .eq('id', productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error(
      `Product ${productId} not found: ${prodErr?.message || 'unknown'}`
    );
  }

  // 2. Fetch Demand Metrics
  const demandMetrics = await getSkuDemandMetrics(productId, {
    windowDays: 30,
  });

  return calculateRestockRecommendation({
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    sellableStock: Number(product.stock_quantity) || 0,
    lowStockThreshold: Number(product.low_stock_threshold) || 2,
    demandMetrics,
    supplierLeadTimeDays: options?.supplierLeadTimeDays ?? 10,
    reviewPeriodDays: options?.reviewPeriodDays ?? 30,
    safetyStockDays: options?.safetyStockDays ?? 7,
    minimumOrderQuantity: options?.minimumOrderQuantity,
    batchSizeMultiple: options?.batchSizeMultiple,
    unitCostPrice:
      product.cost_price !== null && product.cost_price !== undefined
        ? Number(product.cost_price)
        : Math.round((Number(product.price) || 0) * 0.6),
  });
}
