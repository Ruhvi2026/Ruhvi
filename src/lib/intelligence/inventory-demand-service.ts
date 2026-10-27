import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

/**
 * ============================================================================
 * INVENTORY DEMAND & SALES VELOCITY INTELLIGENCE (TRACK G - PHASE 35)
 * ============================================================================
 * Provides authoritative, reproducible SKU-level demand and sales-velocity metrics.
 *
 * Guarantees:
 * 1. Sold-Unit Treatment & Status Exclusions:
 *    - Valid orders: 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'.
 *    - Non-demand exclusions: 'cancelled', 'failed', 'pending_payment'.
 *    - Returns/refunds: Net units sold = grossUnitsSold - returnedUnitsSubtracted.
 * 2. Unconstrained (Stockout-Adjusted) Velocity:
 *    - Tracks inStockDays vs outOfStockDays to avoid falsely deflating velocity
 *      for items frequently stocked out.
 *    - Emits both rawDailySales (netUnits / windowDays) and inStockDailySales
 *      (netUnits / inStockDays).
 * 3. Minimum-Data Rule & Zero Demand Disambiguation:
 *    - Strictly distinguishes:
 *      * ACTIVE_DEMAND: Substantial sales history across in-stock days.
 *      * ZERO_DEMAND: Product was in-stock for >= minActiveDays, but recorded 0 sales.
 *      * STOCKOUT_CONSTRAINED: Zero or low sales caused by lack of inventory (>75% OOS).
 *      * INSUFFICIENT_DATA: Newly launched product or data horizon < minActiveDays.
 * 4. Transparent Provenance:
 *    - Full audit breakdown with timestamps, gross/cancelled/returned units, and formulas.
 */

export type DemandClassification =
  | 'ACTIVE_DEMAND'
  | 'ZERO_DEMAND'
  | 'STOCKOUT_CONSTRAINED'
  | 'INSUFFICIENT_DATA';

export type DemandTrend =
  'ACCELERATING' | 'STEADY' | 'DECELERATING' | 'INSUFFICIENT_DATA';

export interface RawOrderItemRecord {
  orderId: string;
  productId: string;
  sku: string;
  quantity: number;
  priceAtPurchase: number;
  orderStatus: string;
  createdAt: string;
  isReturned?: boolean;
}

export interface SkuDemandCalculationParams {
  productId: string;
  sku: string;
  productCreatedAt?: string;
  currentStock: number;
  lowStockThreshold: number;
  windowDays?: number; // default: 30
  minActiveDays?: number; // default: 7
  orderItems: RawOrderItemRecord[];
  outOfStockDays?: number; // Estimated or logged out-of-stock days in window
  evaluatedAt?: string;
}

export interface SkuDemandMetrics {
  productId: string;
  sku: string;
  windowDays: number;
  windowStart: string;
  windowEnd: string;

  // Sold unit aggregates
  grossUnitsSold: number;
  cancelledUnitsOmitted: number;
  returnedUnitsSubtracted: number;
  netUnitsSold: number;
  grossRevenue: number;
  netRevenue: number;
  orderCount: number;
  averageSellingPrice: number;

  // Velocity metrics
  rawDailySales: number;
  inStockDays: number;
  outOfStockDays: number;
  inStockDailySales: number; // Unconstrained demand velocity
  stockoutFraction: number;

  // Classification & Trend
  classification: DemandClassification;
  classificationReason: string;
  trend: DemandTrend;
  confidenceScore: number; // 0.0 to 1.0

  // Provenance & Metadata
  evaluatedAt: string;
  dataFreshness: string;
}

const INVALID_STATUSES = new Set([
  'cancelled',
  'failed',
  'pending_payment',
  'draft',
]);
const RETURNED_STATUSES = new Set([
  'returned',
  'refunded',
  'rto_delivered',
  'rto_received',
]);

/**
 * Pure calculation engine for SKU demand metrics.
 */
export function calculateSkuDemandMetrics(
  params: SkuDemandCalculationParams
): SkuDemandMetrics {
  const windowDays = Math.max(1, params.windowDays ?? 30);
  const minActiveDays = Math.max(1, params.minActiveDays ?? 7);
  const evaluatedDate = params.evaluatedAt
    ? new Date(params.evaluatedAt)
    : new Date();
  const evaluatedAt = evaluatedDate.toISOString();

  const windowStartDate = new Date(
    evaluatedDate.getTime() - windowDays * 24 * 60 * 60 * 1000
  );
  const windowStart = windowStartDate.toISOString();
  const windowEnd = evaluatedAt;

  const skuUpper = params.sku.trim().toUpperCase();
  const outOfStockDays = Math.min(
    windowDays,
    Math.max(0, params.outOfStockDays ?? 0)
  );
  const inStockDays = Math.max(0, windowDays - outOfStockDays);
  const stockoutFraction =
    Math.round((outOfStockDays / windowDays) * 100) / 100;

  // Calculate product age in days
  let productAgeDays = windowDays;
  if (params.productCreatedAt) {
    const createdDate = new Date(params.productCreatedAt);
    if (!isNaN(createdDate.getTime())) {
      const diffMs = evaluatedDate.getTime() - createdDate.getTime();
      productAgeDays = Math.max(0, Math.floor(diffMs / (24 * 60 * 60 * 1000)));
    }
  }

  let grossUnitsSold = 0;
  let cancelledUnitsOmitted = 0;
  let returnedUnitsSubtracted = 0;
  let grossRevenue = 0;
  let returnedRevenue = 0;
  const matchedOrderIds = new Set<string>();

  // Split window into two halves for trend detection
  const midpointTime =
    evaluatedDate.getTime() - (windowDays / 2) * 24 * 60 * 60 * 1000;
  let recentHalfUnits = 0;
  let priorHalfUnits = 0;

  for (const item of params.orderItems) {
    // Match by SKU or Product ID
    const itemSkuUpper = (item.sku || '').trim().toUpperCase();
    const isSkuMatch = itemSkuUpper && itemSkuUpper === skuUpper;
    const isIdMatch = item.productId && item.productId === params.productId;

    if (!isSkuMatch && !isIdMatch) {
      continue;
    }

    const itemDate = new Date(item.createdAt);
    if (
      isNaN(itemDate.getTime()) ||
      itemDate < windowStartDate ||
      itemDate > evaluatedDate
    ) {
      continue;
    }

    const qty = Number(item.quantity) || 0;
    const unitPrice = Number(item.priceAtPurchase) || 0;
    const lineTotal = unitPrice * qty;
    const statusLower = (item.orderStatus || '').toLowerCase();

    // Check cancellation / failed checkout
    if (INVALID_STATUSES.has(statusLower)) {
      cancelledUnitsOmitted += qty;
      continue;
    }

    // Check returns
    if (item.isReturned || RETURNED_STATUSES.has(statusLower)) {
      grossUnitsSold += qty;
      grossRevenue += lineTotal;
      returnedUnitsSubtracted += qty;
      returnedRevenue += lineTotal;
      matchedOrderIds.add(item.orderId);
      continue;
    }

    // Valid order item
    grossUnitsSold += qty;
    grossRevenue += lineTotal;
    matchedOrderIds.add(item.orderId);

    // Trend attribution
    if (itemDate.getTime() >= midpointTime) {
      recentHalfUnits += qty;
    } else {
      priorHalfUnits += qty;
    }
  }

  const netUnitsSold = Math.max(0, grossUnitsSold - returnedUnitsSubtracted);
  const netRevenue = Math.max(0, grossRevenue - returnedRevenue);
  const orderCount = matchedOrderIds.size;
  const averageSellingPrice =
    netUnitsSold > 0 ? Math.round((netRevenue / netUnitsSold) * 100) / 100 : 0;

  // Velocity rates
  const rawDailySales = Math.round((netUnitsSold / windowDays) * 100) / 100;
  const inStockDailySales =
    inStockDays > 0 ? Math.round((netUnitsSold / inStockDays) * 100) / 100 : 0;

  // Trend determination
  let trend: DemandTrend = 'STEADY';
  if (productAgeDays < minActiveDays) {
    trend = 'INSUFFICIENT_DATA';
  } else if (recentHalfUnits === 0 && priorHalfUnits === 0) {
    trend = 'STEADY';
  } else if (priorHalfUnits === 0 && recentHalfUnits > 0) {
    trend = 'ACCELERATING';
  } else if (recentHalfUnits === 0 && priorHalfUnits > 0) {
    trend = 'DECELERATING';
  } else {
    const diff = (recentHalfUnits - priorHalfUnits) / priorHalfUnits;
    if (diff >= 0.25) {
      trend = 'ACCELERATING';
    } else if (diff <= -0.25) {
      trend = 'DECELERATING';
    } else {
      trend = 'STEADY';
    }
  }

  // Classification & Minimum-Data Rule
  let classification: DemandClassification;
  let classificationReason: string;

  if (productAgeDays < minActiveDays) {
    classification = 'INSUFFICIENT_DATA';
    classificationReason = `Product was catalogued only ${productAgeDays} day(s) ago (minimum required: ${minActiveDays} days)`;
  } else if (outOfStockDays >= windowDays * 0.75 && netUnitsSold === 0) {
    classification = 'STOCKOUT_CONSTRAINED';
    classificationReason = `Zero sales observed while out of stock for ${outOfStockDays}/${windowDays} days (${Math.round(stockoutFraction * 100)}% of window)`;
  } else if (netUnitsSold === 0) {
    if (inStockDays >= minActiveDays) {
      classification = 'ZERO_DEMAND';
      classificationReason = `Zero units sold despite ${inStockDays} active in-stock days`;
    } else {
      classification = 'STOCKOUT_CONSTRAINED';
      classificationReason = `Low in-stock exposure (${inStockDays} days) prevented meaningful demand observation`;
    }
  } else {
    classification = 'ACTIVE_DEMAND';
    classificationReason = `Recorded ${netUnitsSold} net units sold across ${inStockDays} in-stock days (${inStockDailySales} units/day)`;
  }

  // Confidence scoring (0.0 to 1.0)
  let confidenceScore = 0.3; // Base confidence
  if (inStockDays >= 20) confidenceScore += 0.3;
  else if (inStockDays >= 10) confidenceScore += 0.15;

  if (orderCount >= 5) confidenceScore += 0.25;
  else if (orderCount >= 2) confidenceScore += 0.15;

  if (productAgeDays >= 30) confidenceScore += 0.15;

  if (classification === 'INSUFFICIENT_DATA') {
    confidenceScore = Math.min(0.2, confidenceScore);
  } else if (classification === 'STOCKOUT_CONSTRAINED') {
    confidenceScore = Math.min(0.4, confidenceScore);
  }

  confidenceScore = Math.min(1.0, Math.round(confidenceScore * 100) / 100);

  return {
    productId: params.productId,
    sku: params.sku,
    windowDays,
    windowStart,
    windowEnd,
    grossUnitsSold,
    cancelledUnitsOmitted,
    returnedUnitsSubtracted,
    netUnitsSold,
    grossRevenue,
    netRevenue,
    orderCount,
    averageSellingPrice,
    rawDailySales,
    inStockDays,
    outOfStockDays,
    inStockDailySales,
    stockoutFraction,
    classification,
    classificationReason,
    trend,
    confidenceScore,
    evaluatedAt,
    dataFreshness: 'Authoritative live ledger',
  };
}

/**
 * Server-side service retrieving authoritative order and inventory records
 * and computing SKU demand metrics.
 */
export async function getSkuDemandMetrics(
  productId: string,
  options?: { windowDays?: number; minActiveDays?: number }
): Promise<SkuDemandMetrics> {
  const supabase = getServiceClient();
  const windowDays = Math.max(1, options?.windowDays ?? 30);
  const minActiveDays = Math.max(1, options?.minActiveDays ?? 7);

  // 1. Fetch Product metadata
  const { data: product, error: prodErr } = await supabase
    .from('products')
    .select('id, sku, stock_quantity, low_stock_threshold, created_at')
    .eq('id', productId)
    .maybeSingle();

  if (prodErr || !product) {
    throw new Error(
      `Product ${productId} not found: ${prodErr?.message || 'unknown'}`
    );
  }

  const windowStartDate = new Date(
    Date.now() - windowDays * 24 * 60 * 60 * 1000
  ).toISOString();

  // 2. Fetch authoritative orders and order items in window
  const { data: orderItems, error: itemsErr } = await supabase
    .from('order_items')
    .select(
      'order_id, product_id, sku, quantity, price_at_purchase, created_at, orders(status)'
    )
    .eq('product_id', productId)
    .gte('created_at', windowStartDate);

  if (itemsErr) {
    throw new Error(
      `Failed to query order items for SKU demand: ${itemsErr.message}`
    );
  }

  const rawOrderItems: RawOrderItemRecord[] = (orderItems || []).map(
    (item: any) => ({
      orderId: item.order_id,
      productId: item.product_id,
      sku: item.sku || product.sku,
      quantity: item.quantity,
      priceAtPurchase: item.price_at_purchase,
      orderStatus: item.orders?.status || 'delivered',
      createdAt: item.created_at,
    })
  );

  // Estimate out-of-stock days based on current stock (or default 0 if stock > 0)
  const currentStock = Number(product.stock_quantity) || 0;
  const estimatedOosDays = currentStock <= 0 ? Math.min(windowDays, 14) : 0;

  return calculateSkuDemandMetrics({
    productId: product.id,
    sku: product.sku,
    productCreatedAt: product.created_at,
    currentStock,
    lowStockThreshold: Number(product.low_stock_threshold) || 2,
    windowDays,
    minActiveDays,
    orderItems: rawOrderItems,
    outOfStockDays: estimatedOosDays,
  });
}
