import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import {
  getSkuDemandMetrics,
  type SkuDemandMetrics,
} from './inventory-demand-service';

/**
 * ============================================================================
 * DEAD & SLOW-MOVING STOCK DETECTION ENGINE (TRACK G - PHASE 37)
 * ============================================================================
 * Detects slow-moving or potentially dead stock using approved business rules.
 *
 * Guarantees:
 * 1. Strict Review-Only Guarantee:
 *    - Generates explainable findings and audit recommendations only.
 *    - NEVER automatically discounts, delists, or alters stock quantities or prices.
 * 2. Minimum Observation Window (Anti-False-Positive):
 *    - Products catalogued < 30 days ago are classified as NEW_LAUNCH_MONITORING
 *      and never prematurely flagged as dead or slow stock.
 * 3. On-Hand Inventory Constraint:
 *    - Products with 0 stock are marked NOT_APPLICABLE (stocked out, not dead inventory).
 * 4. Transparent Business Rules & Capital Valuation:
 *    - Evaluates days since last sale, catalog age, lifetime volume, and trapped capital.
 *    - Emits rule explanations and evidence for human merchandising review.
 */

export type StockMovementClassification =
  | 'DEAD_STOCK'
  | 'SLOW_MOVING'
  | 'AT_RISK'
  | 'HEALTHY'
  | 'NEW_LAUNCH_MONITORING'
  | 'NOT_APPLICABLE';

export type FindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';

export interface SkuAgingInput {
  productId: string;
  sku: string;
  productName: string;
  categoryId?: string;
  categoryName?: string;
  productCreatedAt: string;
  onHandStock: number;
  price: number;
  costPrice?: number;
  lastSaleDate?: string | null;
  totalUnitsSoldLifetime?: number;
  demandMetrics?: SkuDemandMetrics;
  isSeasonal?: boolean;
  seasonalNotes?: string;
  evaluatedAt?: string;
}

export interface StockAgingFinding {
  productId: string;
  sku: string;
  productName: string;
  categoryName: string;
  onHandStock: number;
  price: number;
  costPrice: number;
  capitalTiedUp: number; // onHandStock * costPrice
  daysSinceCatalogued: number;
  daysSinceLastSale: number | null; // null if never sold
  neverSold: boolean;
  classification: StockMovementClassification;
  severity: FindingSeverity;
  rulesTriggered: string[];
  evidence: {
    lastSaleDate: string | null;
    productCreatedAt: string;
    unitsSoldIn30Days: number;
    dailyVelocity: number;
    projectedMonthsToClear: number | null;
    isSeasonal: boolean;
  };
  recommendedReviewActions: string[];
  evaluatedAt: string;
}

/**
 * Pure calculation engine for stock movement and aging classification.
 */
export function evaluateStockAgingAndMovement(
  input: SkuAgingInput
): StockAgingFinding {
  const evaluatedDate = input.evaluatedAt
    ? new Date(input.evaluatedAt)
    : new Date();
  const evaluatedAt = evaluatedDate.toISOString();

  const onHandStock = Math.max(0, Number(input.onHandStock) || 0);
  const price = Math.max(0, Number(input.price) || 0);
  // Default estimated cost price to 60% of retail price if not specified
  const costPrice =
    input.costPrice !== undefined
      ? Math.max(0, Number(input.costPrice))
      : Math.round(price * 0.6);
  const capitalTiedUp = Math.round(onHandStock * costPrice);

  const categoryName = input.categoryName || 'General';
  const isSeasonal = Boolean(input.isSeasonal);

  // Calculate days since catalogued
  let daysSinceCatalogued = 0;
  const createdDate = new Date(input.productCreatedAt);
  if (!isNaN(createdDate.getTime())) {
    const diffMs = evaluatedDate.getTime() - createdDate.getTime();
    daysSinceCatalogued = Math.max(
      0,
      Math.floor(diffMs / (24 * 60 * 60 * 1000))
    );
  }

  // Calculate days since last sale
  let daysSinceLastSale: number | null = null;
  let neverSold = true;

  if (input.lastSaleDate) {
    const saleDate = new Date(input.lastSaleDate);
    if (!isNaN(saleDate.getTime())) {
      const diffMs = evaluatedDate.getTime() - saleDate.getTime();
      daysSinceLastSale = Math.max(
        0,
        Math.floor(diffMs / (24 * 60 * 60 * 1000))
      );
      neverSold = false;
    }
  }

  const unitsSoldIn30Days = input.demandMetrics
    ? input.demandMetrics.netUnitsSold
    : 0;
  const dailyVelocity = input.demandMetrics
    ? input.demandMetrics.inStockDailySales
    : 0;

  let projectedMonthsToClear: number | null = null;
  if (dailyVelocity > 0 && onHandStock > 0) {
    const daysToClear = onHandStock / dailyVelocity;
    projectedMonthsToClear = Math.round((daysToClear / 30) * 10) / 10;
  }

  const rulesTriggered: string[] = [];
  const recommendedReviewActions: string[] = [];
  let classification: StockMovementClassification;
  let severity: FindingSeverity;

  // ─── Rule 1: Zero on-hand stock ───────────────────────────────────────────
  if (onHandStock <= 0) {
    classification = 'NOT_APPLICABLE';
    severity = 'NONE';
    rulesTriggered.push(
      'Product currently has zero on-hand stock (not holding dead inventory).'
    );
  }
  // ─── Rule 2: New Launch Monitoring (< 30 days old) ────────────────────────
  else if (daysSinceCatalogued < 30) {
    classification = 'NEW_LAUNCH_MONITORING';
    severity = 'NONE';
    rulesTriggered.push(
      `Product catalogued ${daysSinceCatalogued} days ago (< 30 days minimum observation window).`
    );
    recommendedReviewActions.push(
      'Continue launch monitoring; verify campaign traffic and conversion funnel.'
    );
  }
  // ─── Rule 3: Products with No Recorded Sales (Never Sold) ─────────────────
  else if (neverSold) {
    if (daysSinceCatalogued >= 90) {
      classification = 'DEAD_STOCK';
      severity = 'CRITICAL';
      rulesTriggered.push(
        `Zero lifetime sales recorded since cataloguing ${daysSinceCatalogued} days ago (>= 90 days).`
      );
      recommendedReviewActions.push(
        'Review PDP photography, title, descriptions, and benchmark pricing against competitors.'
      );
      recommendedReviewActions.push(
        'Evaluate promotional placement in upcoming festival or bridal campaigns.'
      );
      recommendedReviewActions.push(
        'Consider cross-selling bundle or hero product pairing to stimulate first purchase.'
      );
    } else if (daysSinceCatalogued >= 45) {
      classification = 'SLOW_MOVING';
      severity = 'HIGH';
      rulesTriggered.push(
        `Zero lifetime sales recorded since cataloguing ${daysSinceCatalogued} days ago (45-89 days).`
      );
      recommendedReviewActions.push(
        'Inspect collection visibility, search tags, and indexing.'
      );
      recommendedReviewActions.push(
        'Feature on social media styling stories or category highlight banners.'
      );
    } else {
      // 30 to 44 days old, never sold
      classification = 'AT_RISK';
      severity = 'MEDIUM';
      rulesTriggered.push(
        `Zero sales recorded during initial ${daysSinceCatalogued}-day launch ramp (30-44 days).`
      );
      recommendedReviewActions.push(
        'Review initial traffic acquisition and customer feedback.'
      );
    }
  }
  // ─── Rule 4: Products with Previous Sales ─────────────────────────────────
  else {
    const saleDays = daysSinceLastSale ?? 0;

    if (saleDays >= 90) {
      classification = 'DEAD_STOCK';
      severity = 'CRITICAL';
      rulesTriggered.push(
        `No sales recorded in ${saleDays} days (>= 90-day dead stock threshold).`
      );
      recommendedReviewActions.push(
        'Review PDP pricing, customer reviews, and market competitiveness.'
      );
      recommendedReviewActions.push(
        'Evaluate re-merchandising or clearance promotional discount review.'
      );
      recommendedReviewActions.push(
        'Verify physical stock condition and showroom sample quality.'
      );
    } else if (saleDays >= 45) {
      classification = 'SLOW_MOVING';
      severity = 'HIGH';
      rulesTriggered.push(
        `No sales recorded in ${saleDays} days (45-89 day slow-moving threshold).`
      );
      recommendedReviewActions.push(
        'Highlight in category banners or newsletter feature.'
      );
      recommendedReviewActions.push(
        'Check search keyword relevance and competitor price changes.'
      );
    } else if (saleDays >= 30) {
      classification = 'AT_RISK';
      severity = 'MEDIUM';
      rulesTriggered.push(
        `No sales recorded in ${saleDays} days (30-44 day at-risk window).`
      );
      recommendedReviewActions.push(
        'Monitor sales velocity closely; test subtle placement adjustment.'
      );
    } else {
      // Sales within last 30 days
      if (projectedMonthsToClear !== null && projectedMonthsToClear > 6) {
        classification = 'SLOW_MOVING';
        severity = 'MEDIUM';
        rulesTriggered.push(
          `Recent sale recorded ${saleDays} day(s) ago, but inventory clearing rate is sluggish (~${projectedMonthsToClear} months of supply).`
        );
        recommendedReviewActions.push(
          'Pace replenishment orders; align stock level with modest demand velocity.'
        );
      } else {
        classification = 'HEALTHY';
        severity = 'NONE';
        rulesTriggered.push(
          `Healthy sales activity: last sale ${saleDays} day(s) ago with balanced stock turnover.`
        );
      }
    }
  }

  // Seasonal adjustment context
  if (isSeasonal && input.seasonalNotes) {
    rulesTriggered.push(`Seasonal factor noted: ${input.seasonalNotes}`);
  }

  return {
    productId: input.productId,
    sku: input.sku,
    productName: input.productName,
    categoryName,
    onHandStock,
    price,
    costPrice,
    capitalTiedUp,
    daysSinceCatalogued,
    daysSinceLastSale,
    neverSold,
    classification,
    severity,
    rulesTriggered,
    evidence: {
      lastSaleDate: input.lastSaleDate ?? null,
      productCreatedAt: input.productCreatedAt,
      unitsSoldIn30Days,
      dailyVelocity,
      projectedMonthsToClear,
      isSeasonal,
    },
    recommendedReviewActions,
    evaluatedAt,
  };
}

/**
 * Server service to query authoritative product data, order history,
 * and analyze stock aging without modifying database records.
 */
export async function getSkuAgingAnalysis(
  productId: string
): Promise<StockAgingFinding> {
  const supabase = getServiceClient();

  // 1. Fetch Product
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select(
      'id, sku, name, category_id, price, stock_quantity, created_at, categories(name)'
    )
    .eq('id', productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error(
      `Product ${productId} not found: ${prodErr?.message || 'unknown'}`
    );
  }

  // 2. Query last valid sale date
  const { data: lastSaleItem, error: saleErr } = await supabase
    .from('order_items')
    .select('created_at, orders(status)')
    .eq('product_id', productId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (saleErr) {
    throw new Error(
      `Failed to query last sale for product ${productId}: ${saleErr.message}`
    );
  }

  let lastSaleDate: string | null = null;
  const invalidStatuses = new Set(['cancelled', 'failed', 'pending_payment']);

  for (const item of lastSaleItem || []) {
    const status = (item.orders as any)?.status?.toLowerCase();
    if (!invalidStatuses.has(status)) {
      lastSaleDate = item.created_at;
      break;
    }
  }

  // 3. Query demand metrics
  let demandMetrics: SkuDemandMetrics | undefined;
  try {
    demandMetrics = await getSkuDemandMetrics(productId, { windowDays: 30 });
  } catch {
    // Graceful fallback if demand metrics calculation fails
  }

  return evaluateStockAgingAndMovement({
    productId: product.id,
    sku: product.sku,
    productName: product.name,
    categoryId: product.category_id,
    categoryName: (product.categories as any)?.name || 'Jewellery',
    productCreatedAt: product.created_at,
    onHandStock: Number(product.stock_quantity) || 0,
    price: Number(product.price) || 0,
    lastSaleDate,
    demandMetrics,
  });
}
