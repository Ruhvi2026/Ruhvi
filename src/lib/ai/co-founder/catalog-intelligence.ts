import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';

/**
 * -----------------------------------------------------------------------------
 * CATALOG & INVENTORY INTELLIGENCE ENGINE
 * -----------------------------------------------------------------------------
 * Provides real-time sales velocity, days-of-inventory (DOI) run-out modeling,
 * gross margin distribution across jewellery categories, and automated restock
 * recommendation planning.
 *
 * Grounding Rule: Distinguish OBSERVED vs CALCULATED vs ESTIMATED vs UNKNOWN.
 * Never invent missing business data.
 */

export type DataAttribution =
  'OBSERVED' | 'CALCULATED' | 'ESTIMATED' | 'UNKNOWN';

export type VelocityTrend =
  'accelerating' | 'stable' | 'decelerating' | 'dormant';

export type UrgencyTier =
  'OUT_OF_STOCK' | 'CRITICAL' | 'ELEVATED' | 'HEALTHY' | 'OVERSTOCKED';

export interface ProductVelocityMetrics {
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  currentStock: number;
  timeframeDays: number;
  unitsSold: number;
  unitsPerDay: number;
  orderCount: number;
  grossRevenue: number;
  revenuePerDay: number;
  averageSellingPrice: number;
  costPrice?: number;
  trend: VelocityTrend;
  velocityChangePercent?: number;
  dataQuality: DataAttribution;
  notes?: string;
}

export interface VelocityBatchOptions {
  timeframeDays?: number;
  minStock?: number;
  maxStock?: number;
  categorySlug?: string;
  sortBy?: 'velocity' | 'revenue' | 'stock' | 'name';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

export interface DoiCalculationOptions {
  leadTimeDays?: number;
  safetyBufferDays?: number;
  timeframeDays?: number;
}

export interface DaysOfInventoryAnalysis {
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  currentStock: number;
  unitsPerDay: number;
  daysOfInventory: number;
  leadTimeDays: number;
  safetyBufferDays: number;
  urgencyTier: UrgencyTier;
  projectedStockOutDate: string | null;
  stockOutRiskScore: number; // 0 to 100
  dataQuality: DataAttribution;
  recommendedAction: string;
}

export interface CategoryMarginMetrics {
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  productCount: number;
  inStockProductCount: number;
  outOfStockProductCount: number;
  unitsSold: number;
  grossRevenue: number;
  estimatedCOGS: number;
  grossMarginAmount: number;
  grossMarginPercent: number;
  revenueContributionPercent: number;
  averageOrderValueCategory: number;
  dataQuality: DataAttribution;
}

export interface CategoryMarginBreakdownResult {
  timeframeDays: number;
  totalCatalogRevenue: number;
  totalCatalogCOGS: number;
  blendedGrossMarginPercent: number;
  categories: CategoryMarginMetrics[];
  topMarginCategory?: string;
  topVolumeCategory?: string;
  analyzedAt: string;
}

export interface RestockRecommendationOptions {
  categorySlug?: string;
  urgencyTier?: UrgencyTier;
  leadTimeDays?: number;
  safetyBufferDays?: number;
  timeframeDays?: number;
  limit?: number;
}

export interface RestockRecommendation {
  productId: string;
  sku: string;
  productName: string;
  category?: string;
  currentStock: number;
  unitsPerDay: number;
  daysOfInventory: number;
  urgencyTier: UrgencyTier;
  recommendedReorderQuantity: number;
  unitCostPrice: number;
  estimatedReorderCost: number;
  leadTimeDays: number;
  projectedStockOutDate: string | null;
  rationale: string;
  dataQuality: DataAttribution;
}

export interface RestockPlanSummary {
  totalSkusEvaluated: number;
  restockRecommendedCount: number;
  criticalRestockCount: number;
  elevatedRestockCount: number;
  totalUnitsToOrder: number;
  estimatedTotalCapitalRequired: number;
  recommendations: RestockRecommendation[];
  generatedAt: string;
}

// -----------------------------------------------------------------------------
// HELPER CALCULATORS
// -----------------------------------------------------------------------------

/**
 * Classifies velocity trajectory by comparing units sold in current period vs prior period.
 */
export function determineVelocityTrend(
  currentUnits: number,
  previousUnits: number
): { trend: VelocityTrend; changePercent?: number } {
  if (currentUnits === 0 && previousUnits === 0) {
    return { trend: 'dormant', changePercent: 0 };
  }
  if (previousUnits === 0 && currentUnits > 0) {
    return { trend: 'accelerating', changePercent: 100 };
  }
  if (previousUnits > 0) {
    const diff = currentUnits - previousUnits;
    const changePercent = Math.round((diff / previousUnits) * 100 * 10) / 10;
    if (changePercent >= 15) {
      return { trend: 'accelerating', changePercent };
    }
    if (changePercent <= -15) {
      return { trend: 'decelerating', changePercent };
    }
    return { trend: 'stable', changePercent };
  }
  return { trend: 'stable', changePercent: 0 };
}

/**
 * Evaluates urgency tier based on available stock, days of inventory, and supplier lead time.
 */
export function determineStockOutUrgencyTier(
  currentStock: number,
  daysOfInventory: number,
  leadTimeDays: number,
  safetyBufferDays: number
): UrgencyTier {
  if (currentStock <= 0) {
    return 'OUT_OF_STOCK';
  }
  if (daysOfInventory <= leadTimeDays) {
    return 'CRITICAL';
  }
  if (daysOfInventory <= leadTimeDays + safetyBufferDays) {
    return 'ELEVATED';
  }
  if (daysOfInventory > 90) {
    return 'OVERSTOCKED';
  }
  return 'HEALTHY';
}

/**
 * Computes an integer risk score from 0 (safely stocked / overstocked) to 100 (stocked out).
 */
export function calculateStockOutRiskScore(
  currentStock: number,
  daysOfInventory: number,
  leadTimeDays: number,
  safetyBufferDays: number
): number {
  if (currentStock <= 0) return 100;
  if (daysOfInventory <= 0) return 100;

  if (daysOfInventory <= leadTimeDays) {
    // Lead time deficit: score between 80 and 99
    const ratio = Math.max(0, daysOfInventory / Math.max(leadTimeDays, 1));
    return Math.round(80 + (1 - ratio) * 19);
  }

  const threshold = leadTimeDays + safetyBufferDays;
  if (daysOfInventory <= threshold) {
    // Safety buffer warning: score between 50 and 79
    const span = Math.max(threshold - leadTimeDays, 1);
    const pos = (daysOfInventory - leadTimeDays) / span;
    return Math.round(50 + (1 - pos) * 29);
  }

  if (daysOfInventory <= 60) {
    return Math.max(10, Math.round(40 - (daysOfInventory - threshold) * 0.5));
  }

  return 5;
}

// -----------------------------------------------------------------------------
// CORE CATALOG INTELLIGENCE FUNCTIONS
// -----------------------------------------------------------------------------

/**
 * Calculates real-time sales velocity, order frequency, and revenue run-rate for a product SKU.
 */
export async function calculateProductVelocity(
  productIdOrSku: string,
  timeframeDays: number = 30
): Promise<ProductVelocityMetrics> {
  if (!productIdOrSku || !productIdOrSku.trim()) {
    throw new Error(
      'Valid productId or SKU is required for velocity calculation'
    );
  }

  const supabase = getServiceClient();
  const cleanIdOrSku = productIdOrSku.trim();

  // 1. Fetch product record
  let product: any = null;
  const { data: prodByOr } = await supabase
    .from('products')
    .select(
      'id, name, sku, price, mrp, cost_price, stock_quantity, status, category_id, category:categories(id, name, slug)'
    )
    .or(`id.eq.${cleanIdOrSku},sku.eq.${cleanIdOrSku}`)
    .maybeSingle();

  if (prodByOr) {
    product = prodByOr;
  } else {
    // Fallback: direct ID or SKU eq
    const { data: prodById } = await supabase
      .from('products')
      .select(
        'id, name, sku, price, mrp, cost_price, stock_quantity, status, category_id, category:categories(id, name, slug)'
      )
      .eq('id', cleanIdOrSku)
      .maybeSingle();
    if (prodById) {
      product = prodById;
    } else {
      const { data: prodBySku } = await supabase
        .from('products')
        .select(
          'id, name, sku, price, mrp, cost_price, stock_quantity, status, category_id, category:categories(id, name, slug)'
        )
        .eq('sku', cleanIdOrSku)
        .maybeSingle();
      product = prodBySku;
    }
  }

  if (!product) {
    throw new Error(`Product not found for identifier: ${cleanIdOrSku}`);
  }

  const productId = product.id;
  const sku = product.sku || cleanIdOrSku;
  const productName = product.name || 'Jewellery Item';
  const currentStock = Math.max(0, Number(product.stock_quantity) || 0);
  const costPrice = product.cost_price ? Number(product.cost_price) : undefined;
  const categoryName = Array.isArray(product.category)
    ? product.category[0]?.name
    : product.category?.name;

  // 2. Fetch orders in timeframe + preceding period for trend
  const now = new Date();
  const currentStart = new Date(
    now.getTime() - timeframeDays * 86400000
  ).toISOString();
  const priorStart = new Date(
    now.getTime() - timeframeDays * 2 * 86400000
  ).toISOString();

  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', priorStart)
    .order('created_at', { ascending: false });

  if (ordersErr) {
    throw new Error(
      `Failed to query orders for velocity: ${ordersErr.message}`
    );
  }

  const validOrders = (orders || []).filter(
    (o: any) =>
      !['cancelled', 'failed', 'refunded'].includes(
        (o.status || '').toLowerCase()
      )
  );

  const currentOrderIds = validOrders
    .filter((o: any) => o.created_at >= currentStart)
    .map((o: any) => o.id);

  const priorOrderIds = validOrders
    .filter(
      (o: any) => o.created_at < currentStart && o.created_at >= priorStart
    )
    .map((o: any) => o.id);

  let unitsSold = 0;
  let grossRevenue = 0;
  let orderCount = 0;
  let priorUnitsSold = 0;

  // 3. Fetch order items for matched orders
  const allOrderIds = [...currentOrderIds, ...priorOrderIds];
  if (allOrderIds.length > 0) {
    const { data: items, error: itemsErr } = await supabase
      .from('order_items')
      .select('order_id, product_id, sku, quantity, price_at_purchase')
      .in('order_id', allOrderIds);

    if (itemsErr) {
      throw new Error(
        `Failed to query order items for velocity: ${itemsErr.message}`
      );
    }

    const matchedCurrentOrders = new Set<string>();

    for (const item of items || []) {
      const isMatch =
        item.product_id === productId ||
        (item.sku && item.sku.toLowerCase() === sku.toLowerCase());

      if (!isMatch) continue;

      const qty = Number(item.quantity) || 0;
      const price = Number(item.price_at_purchase) || 0;

      if (currentOrderIds.includes(item.order_id)) {
        unitsSold += qty;
        grossRevenue += price * qty;
        matchedCurrentOrders.add(item.order_id);
      } else if (priorOrderIds.includes(item.order_id)) {
        priorUnitsSold += qty;
      }
    }

    orderCount = matchedCurrentOrders.size;
  }

  const safeDays = Math.max(1, timeframeDays);
  const unitsPerDay = Math.round((unitsSold / safeDays) * 100) / 100;
  const revenuePerDay = Math.round((grossRevenue / safeDays) * 100) / 100;
  const averageSellingPrice =
    unitsSold > 0
      ? Math.round((grossRevenue / unitsSold) * 100) / 100
      : Number(product.price) || 0;

  const { trend, changePercent } = determineVelocityTrend(
    unitsSold,
    priorUnitsSold
  );

  const dataQuality: DataAttribution =
    unitsSold > 0 ? 'CALCULATED' : 'OBSERVED';

  return {
    productId,
    sku,
    productName,
    category: categoryName,
    currentStock,
    timeframeDays,
    unitsSold,
    unitsPerDay,
    orderCount,
    grossRevenue: Math.round(grossRevenue * 100) / 100,
    revenuePerDay,
    averageSellingPrice,
    costPrice,
    trend,
    velocityChangePercent: changePercent,
    dataQuality,
    notes:
      unitsSold === 0
        ? `Zero recorded sales in the last ${timeframeDays} days. Trend is dormant.`
        : `Observed ${unitsSold} units across ${orderCount} orders in ${timeframeDays} days.`,
  };
}

/**
 * Batch calculates product velocities across multiple SKUs or the entire active catalog.
 */
export async function getProductVelocityBatch(
  productIdsOrSkus?: string[],
  options?: VelocityBatchOptions
): Promise<ProductVelocityMetrics[]> {
  const supabase = getServiceClient();
  const timeframeDays = options?.timeframeDays ?? 30;

  let query = supabase
    .from('products')
    .select(
      'id, name, sku, price, mrp, cost_price, stock_quantity, status, category_id, category:categories(id, name, slug)'
    );

  if (productIdsOrSkus && productIdsOrSkus.length > 0) {
    query = query.or(
      `id.in.(${productIdsOrSkus.join(',')}),sku.in.(${productIdsOrSkus.join(',')})`
    );
  } else {
    query = query.neq('status', 'hidden');
  }

  if (options?.categorySlug) {
    // If joined category slug is filtered
    query = query.eq('categories.slug', options.categorySlug);
  }

  if (options?.minStock !== undefined) {
    query = query.gte('stock_quantity', options.minStock);
  }
  if (options?.maxStock !== undefined) {
    query = query.lte('stock_quantity', options.maxStock);
  }

  const { data: products, error: prodErr } = await query.limit(
    options?.limit || 100
  );
  if (prodErr) {
    throw new Error(
      `Failed to query products for batch velocity: ${prodErr.message}`
    );
  }

  const productList = products || [];
  if (productList.length === 0) return [];

  // Query orders once for the entire batch
  const now = new Date();
  const currentStart = new Date(
    now.getTime() - timeframeDays * 86400000
  ).toISOString();
  const priorStart = new Date(
    now.getTime() - timeframeDays * 2 * 86400000
  ).toISOString();

  const { data: orders } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', priorStart);

  const validOrders = (orders || []).filter(
    (o: any) =>
      !['cancelled', 'failed', 'refunded'].includes(
        (o.status || '').toLowerCase()
      )
  );

  const currentOrderIds = validOrders
    .filter((o: any) => o.created_at >= currentStart)
    .map((o: any) => o.id);

  const priorOrderIds = validOrders
    .filter(
      (o: any) => o.created_at < currentStart && o.created_at >= priorStart
    )
    .map((o: any) => o.id);

  const allOrderIds = [...currentOrderIds, ...priorOrderIds];
  let items: any[] = [];

  if (allOrderIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('order_items')
      .select('order_id, product_id, sku, quantity, price_at_purchase')
      .in('order_id', allOrderIds);
    items = itemRows || [];
  }

  const results: ProductVelocityMetrics[] = [];

  for (const product of productList as any[]) {
    const productId = product.id;
    const sku = product.sku || productId;
    const currentStock = Math.max(0, Number(product.stock_quantity) || 0);
    const categoryName = Array.isArray(product.category)
      ? product.category[0]?.name
      : product.category?.name;

    let unitsSold = 0;
    let grossRevenue = 0;
    let priorUnitsSold = 0;
    const matchedOrders = new Set<string>();

    for (const item of items) {
      const isMatch =
        item.product_id === productId ||
        (item.sku && item.sku.toLowerCase() === sku.toLowerCase());

      if (!isMatch) continue;

      const qty = Number(item.quantity) || 0;
      const price = Number(item.price_at_purchase) || 0;

      if (currentOrderIds.includes(item.order_id)) {
        unitsSold += qty;
        grossRevenue += price * qty;
        matchedOrders.add(item.order_id);
      } else if (priorOrderIds.includes(item.order_id)) {
        priorUnitsSold += qty;
      }
    }

    const safeDays = Math.max(1, timeframeDays);
    const unitsPerDay = Math.round((unitsSold / safeDays) * 100) / 100;
    const revenuePerDay = Math.round((grossRevenue / safeDays) * 100) / 100;
    const averageSellingPrice =
      unitsSold > 0
        ? Math.round((grossRevenue / unitsSold) * 100) / 100
        : Number(product.price) || 0;

    const { trend, changePercent } = determineVelocityTrend(
      unitsSold,
      priorUnitsSold
    );

    results.push({
      productId,
      sku,
      productName: product.name || 'Jewellery Item',
      category: categoryName,
      currentStock,
      timeframeDays,
      unitsSold,
      unitsPerDay,
      orderCount: matchedOrders.size,
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      revenuePerDay,
      averageSellingPrice,
      costPrice: product.cost_price ? Number(product.cost_price) : undefined,
      trend,
      velocityChangePercent: changePercent,
      dataQuality: unitsSold > 0 ? 'CALCULATED' : 'OBSERVED',
    });
  }

  // Sorting
  const sortBy = options?.sortBy || 'velocity';
  const sortOrder = options?.sortOrder || 'desc';

  results.sort((a, b) => {
    let diff = 0;
    if (sortBy === 'velocity') diff = a.unitsPerDay - b.unitsPerDay;
    else if (sortBy === 'revenue') diff = a.grossRevenue - b.grossRevenue;
    else if (sortBy === 'stock') diff = a.currentStock - b.currentStock;
    else diff = a.productName.localeCompare(b.productName);

    return sortOrder === 'desc' ? -diff : diff;
  });

  return results;
}

/**
 * Computes Days-of-Inventory (DOI) and stock-out urgency analysis for a product SKU.
 */
export async function calculateDaysOfInventory(
  productIdOrSku: string,
  options?: DoiCalculationOptions
): Promise<DaysOfInventoryAnalysis> {
  const leadTimeDays = Math.max(1, options?.leadTimeDays ?? 10);
  const safetyBufferDays = Math.max(1, options?.safetyBufferDays ?? 20);
  const timeframeDays = options?.timeframeDays ?? 30;

  const velocity = await calculateProductVelocity(
    productIdOrSku,
    timeframeDays
  );
  const currentStock = velocity.currentStock;
  const unitsPerDay = velocity.unitsPerDay;

  // Stockout condition
  if (currentStock <= 0) {
    return {
      productId: velocity.productId,
      sku: velocity.sku,
      productName: velocity.productName,
      category: velocity.category,
      currentStock: 0,
      unitsPerDay,
      daysOfInventory: 0,
      leadTimeDays,
      safetyBufferDays,
      urgencyTier: 'OUT_OF_STOCK',
      projectedStockOutDate: new Date().toISOString(),
      stockOutRiskScore: 100,
      dataQuality: 'OBSERVED',
      recommendedAction:
        'Immediate expedited reorder required. SKU is completely stocked out, losing potential customer sales.',
    };
  }

  // Dormant sales / zero velocity condition
  if (unitsPerDay <= 0) {
    const isOverstocked = currentStock >= 50;
    return {
      productId: velocity.productId,
      sku: velocity.sku,
      productName: velocity.productName,
      category: velocity.category,
      currentStock,
      unitsPerDay: 0,
      daysOfInventory: 999, // infinite / dormant buffer
      leadTimeDays,
      safetyBufferDays,
      urgencyTier: isOverstocked ? 'OVERSTOCKED' : 'HEALTHY',
      projectedStockOutDate: null,
      stockOutRiskScore: 0,
      dataQuality: 'CALCULATED',
      recommendedAction: isOverstocked
        ? `Zero sales velocity over ${timeframeDays} days with ${currentStock} units in inventory. Consider bundling or promotional campaign to clear capital.`
        : `Inventory is stable (${currentStock} units) with zero immediate run-out risk.`,
    };
  }

  // Positive velocity condition
  const daysOfInventory = Math.round(currentStock / unitsPerDay);
  const projectedDays = Math.floor(currentStock / unitsPerDay);
  const projectedStockOutDate = new Date(
    Date.now() + projectedDays * 86400000
  ).toISOString();

  const urgencyTier = determineStockOutUrgencyTier(
    currentStock,
    daysOfInventory,
    leadTimeDays,
    safetyBufferDays
  );
  const stockOutRiskScore = calculateStockOutRiskScore(
    currentStock,
    daysOfInventory,
    leadTimeDays,
    safetyBufferDays
  );

  let recommendedAction: string;
  if (urgencyTier === 'CRITICAL') {
    recommendedAction = `CRITICAL ALERT: Stock-out in ${daysOfInventory} days (projected: ${new Date(projectedStockOutDate).toLocaleDateString()}). Replenishment lead time is ${leadTimeDays} days. Issue purchase order immediately.`;
  } else if (urgencyTier === 'ELEVATED') {
    recommendedAction = `ELEVATED NOTICE: Inventory runway is ${daysOfInventory} days, which will breach the ${leadTimeDays + safetyBufferDays}-day buffer threshold. Queue restock order with suppliers.`;
  } else if (urgencyTier === 'OVERSTOCKED') {
    recommendedAction = `OVERSTOCKED: Runway exceeds ${daysOfInventory} days at current run-rate. Freeze additional purchase orders for this SKU.`;
  } else {
    recommendedAction = `OPTIMAL: Stock level is healthy with ${daysOfInventory} days of coverage at ${unitsPerDay} units/day.`;
  }

  return {
    productId: velocity.productId,
    sku: velocity.sku,
    productName: velocity.productName,
    category: velocity.category,
    currentStock,
    unitsPerDay,
    daysOfInventory,
    leadTimeDays,
    safetyBufferDays,
    urgencyTier,
    projectedStockOutDate,
    stockOutRiskScore,
    dataQuality: 'CALCULATED',
    recommendedAction,
  };
}

/**
 * Calculates revenue, sales volume, and gross profit margin distribution across jewellery categories.
 */
export async function getCategoryMarginBreakdown(
  timeframeDays: number = 30
): Promise<CategoryMarginBreakdownResult> {
  const supabase = getServiceClient();
  const analyzedAt = new Date().toISOString();
  const startTime = new Date(
    Date.now() - timeframeDays * 86400000
  ).toISOString();

  // 1. Fetch categories
  const { data: categoryRows, error: catErr } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name');

  if (catErr) {
    throw new Error(`Failed to load categories: ${catErr.message}`);
  }

  // 2. Fetch products
  const { data: productRows, error: prodErr } = await supabase
    .from('products')
    .select(
      'id, name, sku, category_id, price, cost_price, stock_quantity, status'
    );

  if (prodErr) {
    throw new Error(`Failed to load products: ${prodErr.message}`);
  }

  // 3. Fetch completed orders in timeframe
  const { data: orderRows, error: orderErr } = await supabase
    .from('orders')
    .select('id, status, created_at')
    .gte('created_at', startTime);

  if (orderErr) {
    throw new Error(`Failed to load orders: ${orderErr.message}`);
  }

  const validOrders = (orderRows || []).filter(
    (o: any) =>
      !['cancelled', 'failed', 'refunded'].includes(
        (o.status || '').toLowerCase()
      )
  );
  const orderIds = validOrders.map((o: any) => o.id);

  // 4. Fetch order items for matched orders
  let orderItems: any[] = [];
  if (orderIds.length > 0) {
    const { data: itemRows } = await supabase
      .from('order_items')
      .select(
        'order_id, product_id, sku, quantity, price_at_purchase, unit_cost_price'
      )
      .in('order_id', orderIds);
    orderItems = itemRows || [];
  }

  // Map products to categories and lookup
  const productCategoryMap = new Map<string, string>();
  const productCostMap = new Map<string, number>();
  const productPriceMap = new Map<string, number>();

  for (const p of productRows || []) {
    if (p.category_id) productCategoryMap.set(p.id, p.category_id);
    if (p.sku && p.category_id)
      productCategoryMap.set(p.sku.toLowerCase(), p.category_id);
    if (p.cost_price != null) productCostMap.set(p.id, Number(p.cost_price));
    if (p.price != null) productPriceMap.set(p.id, Number(p.price));
  }

  // Aggregate category buckets
  const categoryStats = new Map<
    string,
    {
      id: string;
      name: string;
      slug: string;
      productCount: number;
      inStockCount: number;
      outOfStockCount: number;
      unitsSold: number;
      grossRevenue: number;
      estimatedCOGS: number;
      orderSet: Set<string>;
      cogsEstimatedCount: number;
    }
  >();

  for (const cat of categoryRows || []) {
    categoryStats.set(cat.id, {
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      productCount: 0,
      inStockCount: 0,
      outOfStockCount: 0,
      unitsSold: 0,
      grossRevenue: 0,
      estimatedCOGS: 0,
      orderSet: new Set<string>(),
      cogsEstimatedCount: 0,
    });
  }

  // Uncategorized bucket for products with missing category_id
  const UNCATEGORIZED_ID = 'uncategorized';
  categoryStats.set(UNCATEGORIZED_ID, {
    id: UNCATEGORIZED_ID,
    name: 'Uncategorized & Accessories',
    slug: 'uncategorized',
    productCount: 0,
    inStockCount: 0,
    outOfStockCount: 0,
    unitsSold: 0,
    grossRevenue: 0,
    estimatedCOGS: 0,
    orderSet: new Set<string>(),
    cogsEstimatedCount: 0,
  });

  // Count products per category
  for (const p of productRows || []) {
    const catId =
      p.category_id && categoryStats.has(p.category_id)
        ? p.category_id
        : UNCATEGORIZED_ID;
    const bucket = categoryStats.get(catId)!;
    bucket.productCount += 1;
    const stock = Number(p.stock_quantity) || 0;
    if (stock > 0) bucket.inStockCount += 1;
    else bucket.outOfStockCount += 1;
  }

  // Process order items
  let totalCatalogRevenue = 0;
  let totalCatalogCOGS = 0;

  for (const item of orderItems) {
    const prodId = item.product_id;
    const skuKey = item.sku ? item.sku.toLowerCase() : '';
    const catId =
      (prodId && productCategoryMap.get(prodId)) ||
      (skuKey && productCategoryMap.get(skuKey)) ||
      UNCATEGORIZED_ID;

    const bucket =
      categoryStats.get(catId) || categoryStats.get(UNCATEGORIZED_ID)!;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.price_at_purchase) || 0;
    const lineRevenue = price * qty;

    // Determine unit cost
    let unitCost: number;
    if (item.unit_cost_price != null && Number(item.unit_cost_price) > 0) {
      unitCost = Number(item.unit_cost_price);
    } else if (
      prodId &&
      productCostMap.has(prodId) &&
      productCostMap.get(prodId)! > 0
    ) {
      unitCost = productCostMap.get(prodId)!;
    } else {
      // Conservative jewellery gross margin benchmark: COGS estimated at 38% of sale price
      unitCost = Math.round(price * 0.38 * 100) / 100;
      bucket.cogsEstimatedCount += 1;
    }

    const lineCOGS = unitCost * qty;

    bucket.unitsSold += qty;
    bucket.grossRevenue += lineRevenue;
    bucket.estimatedCOGS += lineCOGS;
    bucket.orderSet.add(item.order_id);

    totalCatalogRevenue += lineRevenue;
    totalCatalogCOGS += lineCOGS;
  }

  totalCatalogRevenue = Math.round(totalCatalogRevenue * 100) / 100;
  totalCatalogCOGS = Math.round(totalCatalogCOGS * 100) / 100;

  // Format category list
  const categories: CategoryMarginMetrics[] = [];
  let highestMarginPercent = -1;
  let topMarginCategory: string | undefined;
  let highestUnits = -1;
  let topVolumeCategory: string | undefined;

  for (const bucket of categoryStats.values()) {
    // Only include categories that either have products or have sales
    if (bucket.productCount === 0 && bucket.unitsSold === 0) continue;

    const grossMarginAmount =
      Math.round((bucket.grossRevenue - bucket.estimatedCOGS) * 100) / 100;
    const grossMarginPercent =
      bucket.grossRevenue > 0
        ? Math.round((grossMarginAmount / bucket.grossRevenue) * 100 * 10) / 10
        : 0;

    const revenueContributionPercent =
      totalCatalogRevenue > 0
        ? Math.round((bucket.grossRevenue / totalCatalogRevenue) * 100 * 10) /
          10
        : 0;

    const averageOrderValueCategory =
      bucket.orderSet.size > 0
        ? Math.round((bucket.grossRevenue / bucket.orderSet.size) * 100) / 100
        : 0;

    const dataQuality: DataAttribution =
      bucket.cogsEstimatedCount > 0
        ? 'ESTIMATED'
        : bucket.unitsSold > 0
          ? 'CALCULATED'
          : 'OBSERVED';

    if (bucket.grossRevenue > 0 && grossMarginPercent > highestMarginPercent) {
      highestMarginPercent = grossMarginPercent;
      topMarginCategory = bucket.name;
    }

    if (bucket.unitsSold > highestUnits) {
      highestUnits = bucket.unitsSold;
      topVolumeCategory = bucket.name;
    }

    categories.push({
      categoryId: bucket.id,
      categoryName: bucket.name,
      categorySlug: bucket.slug,
      productCount: bucket.productCount,
      inStockProductCount: bucket.inStockCount,
      outOfStockProductCount: bucket.outOfStockCount,
      unitsSold: bucket.unitsSold,
      grossRevenue: Math.round(bucket.grossRevenue * 100) / 100,
      estimatedCOGS: Math.round(bucket.estimatedCOGS * 100) / 100,
      grossMarginAmount,
      grossMarginPercent,
      revenueContributionPercent,
      averageOrderValueCategory,
      dataQuality,
    });
  }

  // Sort by gross revenue descending
  categories.sort((a, b) => b.grossRevenue - a.grossRevenue);

  const blendedGrossMarginPercent =
    totalCatalogRevenue > 0
      ? Math.round(
          ((totalCatalogRevenue - totalCatalogCOGS) / totalCatalogRevenue) *
            100 *
            10
        ) / 10
      : 0;

  return {
    timeframeDays,
    totalCatalogRevenue,
    totalCatalogCOGS,
    blendedGrossMarginPercent,
    categories,
    topMarginCategory,
    topVolumeCategory,
    analyzedAt,
  };
}

/**
 * Generates prioritized restock recommendations with calculated reorder quantities and capital requirements.
 */
export async function generateRestockRecommendations(
  options?: RestockRecommendationOptions
): Promise<RestockPlanSummary> {
  const leadTimeDays = Math.max(1, options?.leadTimeDays ?? 10);
  const safetyBufferDays = Math.max(1, options?.safetyBufferDays ?? 20);
  const timeframeDays = options?.timeframeDays ?? 30;
  const targetCoverageDays = leadTimeDays + safetyBufferDays;

  // Batch calculate velocities for the active catalog
  const velocities = await getProductVelocityBatch(undefined, {
    timeframeDays,
    categorySlug: options?.categorySlug,
    limit: options?.limit || 150,
  });

  const recommendations: RestockRecommendation[] = [];
  let criticalCount = 0;
  let elevatedCount = 0;
  let totalUnitsToOrder = 0;
  let totalCapitalRequired = 0;

  for (const v of velocities) {
    const currentStock = v.currentStock;
    const unitsPerDay = v.unitsPerDay;

    let daysOfInventory = 999;
    let urgencyTier: UrgencyTier = 'HEALTHY';
    let projectedStockOutDate: string | null = null;

    if (currentStock <= 0) {
      daysOfInventory = 0;
      urgencyTier = 'OUT_OF_STOCK';
      projectedStockOutDate = new Date().toISOString();
    } else if (unitsPerDay > 0) {
      daysOfInventory = Math.round(currentStock / unitsPerDay);
      projectedStockOutDate = new Date(
        Date.now() + Math.floor(currentStock / unitsPerDay) * 86400000
      ).toISOString();
      urgencyTier = determineStockOutUrgencyTier(
        currentStock,
        daysOfInventory,
        leadTimeDays,
        safetyBufferDays
      );
    } else {
      urgencyTier = currentStock > 50 ? 'OVERSTOCKED' : 'HEALTHY';
    }

    // Apply urgency tier filter if specified
    if (options?.urgencyTier && urgencyTier !== options.urgencyTier) {
      continue;
    }

    // Determine reorder quantity
    let recommendedReorderQuantity = 0;
    let rationale = '';

    if (urgencyTier === 'OUT_OF_STOCK') {
      // If zero current stock: order target coverage based on velocity, or minimum safety batch of 10
      const baseUnits =
        unitsPerDay > 0 ? Math.ceil(unitsPerDay * targetCoverageDays) : 10;
      recommendedReorderQuantity = Math.max(baseUnits, 5);
      rationale = `SKU is completely stocked out. Immediate reorder of ${recommendedReorderQuantity} units recommended to resume sales.`;
    } else if (urgencyTier === 'CRITICAL' || urgencyTier === 'ELEVATED') {
      const targetStock = Math.ceil(unitsPerDay * targetCoverageDays);
      recommendedReorderQuantity = Math.max(0, targetStock - currentStock);
      rationale = `Current runway of ${daysOfInventory} days breaches ${targetCoverageDays}-day buffer. Order ${recommendedReorderQuantity} units to cover lead time (${leadTimeDays}d) + buffer (${safetyBufferDays}d).`;
    }

    if (recommendedReorderQuantity > 0) {
      if (urgencyTier === 'OUT_OF_STOCK' || urgencyTier === 'CRITICAL') {
        criticalCount += 1;
      } else if (urgencyTier === 'ELEVATED') {
        elevatedCount += 1;
      }

      // Unit cost price (fallback to 38% estimated COGS if cost_price missing)
      const costPrice =
        v.costPrice ||
        (v.averageSellingPrice > 0
          ? Math.round(v.averageSellingPrice * 0.38 * 100) / 100
          : 0);

      const estimatedReorderCost =
        Math.round(recommendedReorderQuantity * costPrice * 100) / 100;

      totalUnitsToOrder += recommendedReorderQuantity;
      totalCapitalRequired += estimatedReorderCost;

      recommendations.push({
        productId: v.productId,
        sku: v.sku,
        productName: v.productName,
        category: v.category,
        currentStock,
        unitsPerDay,
        daysOfInventory,
        urgencyTier,
        recommendedReorderQuantity,
        unitCostPrice: costPrice,
        estimatedReorderCost,
        leadTimeDays,
        projectedStockOutDate,
        rationale,
        dataQuality: v.costPrice ? 'CALCULATED' : 'ESTIMATED',
      });
    }
  }

  // Sort recommendations by urgency: OUT_OF_STOCK -> CRITICAL -> ELEVATED
  const tierOrder: Record<UrgencyTier, number> = {
    OUT_OF_STOCK: 1,
    CRITICAL: 2,
    ELEVATED: 3,
    HEALTHY: 4,
    OVERSTOCKED: 5,
  };

  recommendations.sort((a, b) => {
    const diff = tierOrder[a.urgencyTier] - tierOrder[b.urgencyTier];
    if (diff !== 0) return diff;
    return a.daysOfInventory - b.daysOfInventory;
  });

  return {
    totalSkusEvaluated: velocities.length,
    restockRecommendedCount: recommendations.length,
    criticalRestockCount: criticalCount,
    elevatedRestockCount: elevatedCount,
    totalUnitsToOrder,
    estimatedTotalCapitalRequired: Math.round(totalCapitalRequired * 100) / 100,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}
