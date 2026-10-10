jest.mock('server-only', () => ({}));

import {
  determineVelocityTrend,
  determineStockOutUrgencyTier,
  calculateStockOutRiskScore,
  calculateProductVelocity,
  getProductVelocityBatch,
  calculateDaysOfInventory,
  getCategoryMarginBreakdown,
  generateRestockRecommendations,
  type ProductVelocityMetrics,
  type DaysOfInventoryAnalysis,
  type CategoryMarginBreakdownResult,
  type RestockPlanSummary,
} from '../catalog-intelligence';

// In-memory mock databases
let mockProducts: any[] = [];
let mockCategories: any[] = [];
let mockOrders: any[] = [];
let mockOrderItems: any[] = [];
let forceErrorTable: string | null = null;

// Mock Supabase service client
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (forceErrorTable === table) {
        return {
          select: jest.fn().mockReturnValue({
            or: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            neq: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            maybeSingle: jest.fn().mockResolvedValue({
              data: null,
              error: { message: `Simulated error for table: ${table}` },
            }),
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: `Simulated error for table: ${table}` },
            }),
            then: (resolve: any) =>
              resolve({
                data: null,
                error: { message: `Simulated error for table: ${table}` },
              }),
          }),
        };
      }

      if (table === 'products') {
        const filters: Record<string, any> = {};
        let orCondition: string | null = null;
        let limitVal: number | undefined;

        const chain: any = {
          or: jest.fn((cond: string) => {
            orCondition = cond;
            return chain;
          }),
          eq: jest.fn((col: string, val: any) => {
            filters[col] = val;
            return chain;
          }),
          neq: jest.fn((col: string, val: any) => {
            filters[`${col}_neq`] = val;
            return chain;
          }),
          gte: jest.fn((col: string, val: any) => {
            filters[`${col}_gte`] = val;
            return chain;
          }),
          lte: jest.fn((col: string, val: any) => {
            filters[`${col}_lte`] = val;
            return chain;
          }),
          order: jest.fn(() => chain),
          limit: jest.fn((n: number) => {
            limitVal = n;
            return chain;
          }),
          maybeSingle: jest.fn(() => {
            const list = applyProductFilters(
              mockProducts,
              filters,
              orCondition
            );
            return Promise.resolve({ data: list[0] || null, error: null });
          }),
          single: jest.fn(() => {
            const list = applyProductFilters(
              mockProducts,
              filters,
              orCondition
            );
            return Promise.resolve({
              data: list[0] || null,
              error: list[0] ? null : { message: 'Row not found' },
            });
          }),
          then: (resolve: any) => {
            let list = applyProductFilters(mockProducts, filters, orCondition);
            if (limitVal) list = list.slice(0, limitVal);
            return resolve({ data: list, error: null });
          },
        };
        return { select: jest.fn(() => chain) };
      }

      if (table === 'categories') {
        const chain: any = {
          order: jest.fn(() => chain),
          then: (resolve: any) =>
            resolve({ data: [...mockCategories], error: null }),
        };
        return { select: jest.fn(() => chain) };
      }

      if (table === 'orders') {
        let gteDate: string | null = null;
        const chain: any = {
          gte: jest.fn((col: string, val: any) => {
            if (col === 'created_at') gteDate = val;
            return chain;
          }),
          order: jest.fn(() => chain),
          then: (resolve: any) => {
            let list = [...mockOrders];
            if (gteDate) {
              list = list.filter((o) => o.created_at >= gteDate!);
            }
            return resolve({ data: list, error: null });
          },
        };
        return { select: jest.fn(() => chain) };
      }

      if (table === 'order_items') {
        let inOrderIds: string[] = [];
        const chain: any = {
          in: jest.fn((col: string, vals: string[]) => {
            if (col === 'order_id') inOrderIds = vals;
            return chain;
          }),
          then: (resolve: any) => {
            let list = [...mockOrderItems];
            if (inOrderIds.length > 0) {
              list = list.filter((i) => inOrderIds.includes(i.order_id));
            }
            return resolve({ data: list, error: null });
          },
        };
        return { select: jest.fn(() => chain) };
      }

      return {
        select: jest.fn().mockReturnValue({
          then: (resolve: any) => resolve({ data: [], error: null }),
        }),
      };
    }),
  })),
}));

// Helper to filter mock products
function applyProductFilters(
  products: any[],
  filters: Record<string, any>,
  orCondition: string | null
): any[] {
  let list = [...products];

  if (orCondition) {
    // Parse formats like id.eq.X,sku.eq.X or id.in.(...),sku.in.(...)
    const parts = orCondition.split(',');
    list = list.filter((p) => {
      return parts.some((part) => {
        if (part.startsWith('id.eq.')) {
          return p.id === part.replace('id.eq.', '');
        }
        if (part.startsWith('sku.eq.')) {
          return (
            (p.sku || '').toLowerCase() ===
            part.replace('sku.eq.', '').toLowerCase()
          );
        }
        if (part.startsWith('id.in.(')) {
          const ids = part.replace('id.in.(', '').replace(')', '').split(',');
          return ids.includes(p.id);
        }
        if (part.startsWith('sku.in.(')) {
          const skus = part
            .replace('sku.in.(', '')
            .replace(')', '')
            .split(',')
            .map((s) => s.toLowerCase());
          return skus.includes((p.sku || '').toLowerCase());
        }
        return false;
      });
    });
  }

  for (const [k, v] of Object.entries(filters)) {
    if (k === 'id') {
      list = list.filter((p) => p.id === v);
    } else if (k === 'sku') {
      list = list.filter(
        (p) => (p.sku || '').toLowerCase() === v.toLowerCase()
      );
    } else if (k === 'status_neq') {
      list = list.filter((p) => p.status !== v);
    } else if (k === 'stock_quantity_gte') {
      list = list.filter((p) => Number(p.stock_quantity || 0) >= v);
    } else if (k === 'stock_quantity_lte') {
      list = list.filter((p) => Number(p.stock_quantity || 0) <= v);
    } else if (k === 'categories.slug') {
      list = list.filter((p) => {
        const cat = Array.isArray(p.category) ? p.category[0] : p.category;
        return cat?.slug === v;
      });
    }
  }

  return list;
}

// -----------------------------------------------------------------------------
// TESTS
// -----------------------------------------------------------------------------

describe('Catalog & Inventory Intelligence Engine', () => {
  beforeEach(() => {
    mockProducts = [];
    mockCategories = [];
    mockOrders = [];
    mockOrderItems = [];
    forceErrorTable = null;
    jest.clearAllMocks();
  });

  // ===========================================================================
  // 1. Helper Calculators Tests
  // ===========================================================================
  describe('Helper Calculators', () => {
    describe('determineVelocityTrend', () => {
      it('returns dormant when current and prior sales are 0', () => {
        const res = determineVelocityTrend(0, 0);
        expect(res.trend).toBe('dormant');
        expect(res.changePercent).toBe(0);
      });

      it('returns accelerating with 100% change when starting from zero prior sales', () => {
        const res = determineVelocityTrend(10, 0);
        expect(res.trend).toBe('accelerating');
        expect(res.changePercent).toBe(100);
      });

      it('returns accelerating when velocity increases by 15% or more', () => {
        const res = determineVelocityTrend(25, 20); // +25%
        expect(res.trend).toBe('accelerating');
        expect(res.changePercent).toBe(25);
      });

      it('returns decelerating when velocity drops by 15% or more', () => {
        const res = determineVelocityTrend(15, 20); // -25%
        expect(res.trend).toBe('decelerating');
        expect(res.changePercent).toBe(-25);
      });

      it('returns stable when velocity change is within [-15%, +15%]', () => {
        const res = determineVelocityTrend(21, 20); // +5%
        expect(res.trend).toBe('stable');
        expect(res.changePercent).toBe(5);
      });
    });

    describe('determineStockOutUrgencyTier', () => {
      it('returns OUT_OF_STOCK when stock is 0 or negative', () => {
        expect(determineStockOutUrgencyTier(0, 0, 10, 20)).toBe('OUT_OF_STOCK');
        expect(determineStockOutUrgencyTier(-2, 0, 10, 20)).toBe(
          'OUT_OF_STOCK'
        );
      });

      it('returns CRITICAL when days of inventory is <= lead time', () => {
        expect(determineStockOutUrgencyTier(5, 5, 10, 20)).toBe('CRITICAL');
        expect(determineStockOutUrgencyTier(10, 10, 10, 20)).toBe('CRITICAL');
      });

      it('returns ELEVATED when days of inventory is <= lead time + buffer', () => {
        expect(determineStockOutUrgencyTier(15, 15, 10, 20)).toBe('ELEVATED');
        expect(determineStockOutUrgencyTier(30, 30, 10, 20)).toBe('ELEVATED');
      });

      it('returns OVERSTOCKED when days of inventory exceeds 90 days', () => {
        expect(determineStockOutUrgencyTier(100, 95, 10, 20)).toBe(
          'OVERSTOCKED'
        );
      });

      it('returns HEALTHY for optimal runway', () => {
        expect(determineStockOutUrgencyTier(45, 45, 10, 20)).toBe('HEALTHY');
      });
    });

    describe('calculateStockOutRiskScore', () => {
      it('returns 100 for zero stock or zero days of inventory', () => {
        expect(calculateStockOutRiskScore(0, 0, 10, 20)).toBe(100);
        expect(calculateStockOutRiskScore(10, 0, 10, 20)).toBe(100);
      });

      it('returns between 80 and 99 when runway is within lead time', () => {
        const score = calculateStockOutRiskScore(5, 5, 10, 20);
        expect(score).toBeGreaterThanOrEqual(80);
        expect(score).toBeLessThanOrEqual(99);
      });

      it('returns between 50 and 79 when runway breaches safety buffer', () => {
        const score = calculateStockOutRiskScore(20, 20, 10, 20);
        expect(score).toBeGreaterThanOrEqual(50);
        expect(score).toBeLessThanOrEqual(79);
      });

      it('returns between 10 and 40 for healthy stock', () => {
        const score = calculateStockOutRiskScore(40, 40, 10, 20);
        expect(score).toBeGreaterThanOrEqual(10);
        expect(score).toBeLessThanOrEqual(40);
      });

      it('returns baseline 5 when runway exceeds 60 days', () => {
        expect(calculateStockOutRiskScore(100, 75, 10, 20)).toBe(5);
      });
    });
  });

  // ===========================================================================
  // 2. Product Velocity Analytics Tests
  // ===========================================================================
  describe('calculateProductVelocity', () => {
    it('throws error if productId or SKU is empty or whitespace', async () => {
      await expect(calculateProductVelocity('')).rejects.toThrow(
        'Valid productId or SKU is required'
      );
      await expect(calculateProductVelocity('   ')).rejects.toThrow(
        'Valid productId or SKU is required'
      );
    });

    it('throws error if product is not found in database', async () => {
      mockProducts = [];
      await expect(calculateProductVelocity('non_existent_id')).rejects.toThrow(
        'Product not found for identifier: non_existent_id'
      );
    });

    it('calculates zero velocity for dormant product with zero orders', async () => {
      mockProducts = [
        {
          id: 'prod_1',
          name: 'Kundan Choker Necklace',
          sku: 'NECK-001',
          price: 4999,
          cost_price: 1899,
          stock_quantity: 15,
          status: 'active',
          category: { name: 'Necklaces' },
        },
      ];
      mockOrders = [];
      mockOrderItems = [];

      const result = await calculateProductVelocity('prod_1', 30);

      expect(result.productId).toBe('prod_1');
      expect(result.sku).toBe('NECK-001');
      expect(result.productName).toBe('Kundan Choker Necklace');
      expect(result.category).toBe('Necklaces');
      expect(result.unitsSold).toBe(0);
      expect(result.unitsPerDay).toBe(0);
      expect(result.grossRevenue).toBe(0);
      expect(result.revenuePerDay).toBe(0);
      expect(result.averageSellingPrice).toBe(4999); // fallback to catalog price
      expect(result.trend).toBe('dormant');
      expect(result.dataQuality).toBe('OBSERVED');
      expect(result.notes).toContain('Zero recorded sales in the last 30 days');
    });

    it('filters out cancelled, failed, and refunded orders', async () => {
      mockProducts = [
        {
          id: 'prod_1',
          name: 'Gold Jhumka Earrings',
          sku: 'EARR-001',
          price: 2499,
          cost_price: 950,
          stock_quantity: 8,
          status: 'active',
        },
      ];

      const now = new Date();
      mockOrders = [
        {
          id: 'ord_cancelled',
          status: 'cancelled',
          created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
        },
        {
          id: 'ord_failed',
          status: 'failed',
          created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
        },
        {
          id: 'ord_refunded',
          status: 'refunded',
          created_at: new Date(now.getTime() - 4 * 86400000).toISOString(),
        },
        {
          id: 'ord_valid',
          status: 'delivered',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
      ];

      mockOrderItems = [
        {
          order_id: 'ord_cancelled',
          product_id: 'prod_1',
          sku: 'EARR-001',
          quantity: 2,
          price_at_purchase: 2499,
        },
        {
          order_id: 'ord_failed',
          product_id: 'prod_1',
          sku: 'EARR-001',
          quantity: 1,
          price_at_purchase: 2499,
        },
        {
          order_id: 'ord_refunded',
          product_id: 'prod_1',
          sku: 'EARR-001',
          quantity: 1,
          price_at_purchase: 2499,
        },
        {
          order_id: 'ord_valid',
          product_id: 'prod_1',
          sku: 'EARR-001',
          quantity: 3,
          price_at_purchase: 2499,
        },
      ];

      const result = await calculateProductVelocity('prod_1', 30);

      // Only ord_valid should be counted
      expect(result.unitsSold).toBe(3);
      expect(result.orderCount).toBe(1);
      expect(result.grossRevenue).toBe(7497);
      expect(result.unitsPerDay).toBe(0.1);
      expect(result.dataQuality).toBe('CALCULATED');
    });

    it('calculates accelerating trend when units sold increase compared to prior 30 days', async () => {
      mockProducts = [
        {
          id: 'prod_ring',
          name: 'Solitaire Diamond Ring',
          sku: 'RING-001',
          price: 9999,
          cost_price: 3800,
          stock_quantity: 12,
          status: 'active',
        },
      ];

      const now = new Date();
      // Current 30 days orders (e.g. 10 days ago)
      const ordCurrent = {
        id: 'ord_cur',
        status: 'completed',
        created_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
      };
      // Prior 30 days orders (e.g. 40 days ago)
      const ordPrior = {
        id: 'ord_prev',
        status: 'completed',
        created_at: new Date(now.getTime() - 40 * 86400000).toISOString(),
      };

      mockOrders = [ordCurrent, ordPrior];
      mockOrderItems = [
        {
          order_id: 'ord_cur',
          product_id: 'prod_ring',
          sku: 'RING-001',
          quantity: 10,
          price_at_purchase: 9999,
        },
        {
          order_id: 'ord_prev',
          product_id: 'prod_ring',
          sku: 'RING-001',
          quantity: 5,
          price_at_purchase: 9999,
        },
      ];

      const result = await calculateProductVelocity('RING-001', 30);

      expect(result.unitsSold).toBe(10);
      expect(result.trend).toBe('accelerating');
      expect(result.velocityChangePercent).toBe(100);
      expect(result.grossRevenue).toBe(99990);
    });

    it('matches by SKU when identifier is SKU string', async () => {
      mockProducts = [
        {
          id: 'p-uuid-999',
          name: 'Silver Anklet Payal',
          sku: 'ANK-005',
          price: 1599,
          stock_quantity: 20,
          status: 'active',
        },
      ];

      const now = new Date();
      mockOrders = [
        {
          id: 'ord_1',
          status: 'completed',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
      ];
      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p-uuid-999',
          sku: 'ANK-005',
          quantity: 4,
          price_at_purchase: 1599,
        },
      ];

      const result = await calculateProductVelocity('ANK-005', 30);
      expect(result.productId).toBe('p-uuid-999');
      expect(result.sku).toBe('ANK-005');
      expect(result.unitsSold).toBe(4);
    });

    it('throws error when database query for orders fails', async () => {
      mockProducts = [
        { id: 'p1', name: 'Bangles', sku: 'BAN-1', stock_quantity: 5 },
      ];
      forceErrorTable = 'orders';

      await expect(calculateProductVelocity('p1', 30)).rejects.toThrow(
        'Failed to query orders for velocity'
      );
    });
  });

  // ===========================================================================
  // 3. Product Velocity Batch Tests
  // ===========================================================================
  describe('getProductVelocityBatch', () => {
    beforeEach(() => {
      const now = new Date();
      mockProducts = [
        {
          id: 'p1',
          name: 'Zirconia Drop Earrings',
          sku: 'EARR-01',
          price: 1999,
          stock_quantity: 2,
          status: 'active',
          category: { name: 'Earrings', slug: 'earrings' },
        },
        {
          id: 'p2',
          name: 'Bridal Temple Choker',
          sku: 'NECK-01',
          price: 7999,
          stock_quantity: 15,
          status: 'active',
          category: { name: 'Necklaces', slug: 'necklaces' },
        },
        {
          id: 'p3',
          name: 'Antique Gold Kada',
          sku: 'BANG-01',
          price: 3499,
          stock_quantity: 60,
          status: 'active',
          category: { name: 'Bangles', slug: 'bangles' },
        },
      ];

      mockOrders = [
        {
          id: 'ord_1',
          status: 'delivered',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
        {
          id: 'ord_2',
          status: 'delivered',
          created_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
        },
      ];

      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p1',
          sku: 'EARR-01',
          quantity: 10,
          price_at_purchase: 1999,
        },
        {
          order_id: 'ord_2',
          product_id: 'p2',
          sku: 'NECK-01',
          quantity: 2,
          price_at_purchase: 7999,
        },
      ];
    });

    it('returns velocity metrics for all products sorted by velocity descending', async () => {
      const batch = await getProductVelocityBatch(undefined, {
        sortBy: 'velocity',
        sortOrder: 'desc',
      });

      expect(batch).toHaveLength(3);
      expect(batch[0].productId).toBe('p1'); // 10 units sold
      expect(batch[1].productId).toBe('p2'); // 2 units sold
      expect(batch[2].productId).toBe('p3'); // 0 units sold
    });

    it('sorts by revenue descending', async () => {
      const batch = await getProductVelocityBatch(undefined, {
        sortBy: 'revenue',
        sortOrder: 'desc',
      });

      expect(batch).toHaveLength(3);
      // p1 revenue = 10 * 1999 = 19990, p2 revenue = 2 * 7999 = 15998
      expect(batch[0].productId).toBe('p1');
      expect(batch[1].productId).toBe('p2');
    });

    it('sorts by stock descending', async () => {
      const batch = await getProductVelocityBatch(undefined, {
        sortBy: 'stock',
        sortOrder: 'desc',
      });

      expect(batch[0].productId).toBe('p3'); // stock 60
      expect(batch[1].productId).toBe('p2'); // stock 15
      expect(batch[2].productId).toBe('p1'); // stock 2
    });

    it('filters by stock quantity bounds', async () => {
      const batch = await getProductVelocityBatch(undefined, {
        minStock: 10,
        maxStock: 50,
      });

      expect(batch).toHaveLength(1);
      expect(batch[0].productId).toBe('p2');
    });

    it('returns empty array when no products match', async () => {
      mockProducts = [];
      const batch = await getProductVelocityBatch();
      expect(batch).toEqual([]);
    });
  });

  // ===========================================================================
  // 4. Days of Inventory (DOI) & Stock-Out Urgency Tests
  // ===========================================================================
  describe('calculateDaysOfInventory', () => {
    const now = new Date();

    it('returns OUT_OF_STOCK with score 100 when currentStock is 0', async () => {
      mockProducts = [
        {
          id: 'p_oos',
          name: 'Floral Diamond Mangalsutra',
          sku: 'MANG-001',
          price: 5499,
          stock_quantity: 0,
          status: 'out_of_stock',
        },
      ];
      mockOrders = [];
      mockOrderItems = [];

      const analysis = await calculateDaysOfInventory('p_oos');

      expect(analysis.urgencyTier).toBe('OUT_OF_STOCK');
      expect(analysis.daysOfInventory).toBe(0);
      expect(analysis.stockOutRiskScore).toBe(100);
      expect(analysis.projectedStockOutDate).toBeDefined();
      expect(analysis.recommendedAction).toContain(
        'Immediate expedited reorder required'
      );
    });

    it('returns 999 days and HEALTHY for in-stock item with zero velocity', async () => {
      mockProducts = [
        {
          id: 'p_stable',
          name: 'Silver Nose Ring',
          sku: 'NOSE-01',
          price: 499,
          stock_quantity: 20,
          status: 'active',
        },
      ];
      mockOrders = [];
      mockOrderItems = [];

      const analysis = await calculateDaysOfInventory('p_stable');

      expect(analysis.urgencyTier).toBe('HEALTHY');
      expect(analysis.daysOfInventory).toBe(999);
      expect(analysis.stockOutRiskScore).toBe(0);
      expect(analysis.projectedStockOutDate).toBeNull();
      expect(analysis.recommendedAction).toContain('Inventory is stable');
    });

    it('returns OVERSTOCKED for stagnant item with high stock quantity', async () => {
      mockProducts = [
        {
          id: 'p_high_stagnant',
          name: 'Plain Brass Bangles',
          sku: 'BAN-99',
          price: 399,
          stock_quantity: 80,
          status: 'active',
        },
      ];
      mockOrders = [];
      mockOrderItems = [];

      const analysis = await calculateDaysOfInventory('p_high_stagnant');

      expect(analysis.urgencyTier).toBe('OVERSTOCKED');
      expect(analysis.daysOfInventory).toBe(999);
      expect(analysis.recommendedAction).toContain(
        'Zero sales velocity over 30 days'
      );
    });

    it('returns CRITICAL when days of inventory is <= lead time', async () => {
      // 10 units sold in 30 days => 0.33 units/day
      // stock = 3 => runway = ~9 days <= leadTime (10 days)
      mockProducts = [
        {
          id: 'p_crit',
          name: 'Emerald Tear Earrings',
          sku: 'EARR-CRIT',
          price: 3499,
          stock_quantity: 3,
          status: 'active',
        },
      ];
      mockOrders = [
        {
          id: 'ord_1',
          status: 'completed',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
      ];
      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p_crit',
          sku: 'EARR-CRIT',
          quantity: 10,
          price_at_purchase: 3499,
        },
      ];

      const analysis = await calculateDaysOfInventory('p_crit', {
        leadTimeDays: 10,
        safetyBufferDays: 20,
      });

      expect(analysis.urgencyTier).toBe('CRITICAL');
      expect(analysis.daysOfInventory).toBeLessThanOrEqual(10);
      expect(analysis.stockOutRiskScore).toBeGreaterThanOrEqual(80);
      expect(analysis.projectedStockOutDate).toBeDefined();
      expect(analysis.recommendedAction).toContain('CRITICAL ALERT');
    });

    it('returns ELEVATED when days of inventory breaches safety buffer', async () => {
      // 10 units sold in 30 days => 0.33 units/day
      // stock = 6 => runway = 18 days (between 10 and 30 days)
      mockProducts = [
        {
          id: 'p_elev',
          name: 'Gold Plated Chain',
          sku: 'CHN-01',
          price: 1999,
          stock_quantity: 6,
          status: 'active',
        },
      ];
      mockOrders = [
        {
          id: 'ord_1',
          status: 'completed',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
      ];
      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p_elev',
          sku: 'CHN-01',
          quantity: 10,
          price_at_purchase: 1999,
        },
      ];

      const analysis = await calculateDaysOfInventory('p_elev', {
        leadTimeDays: 10,
        safetyBufferDays: 20,
      });

      expect(analysis.urgencyTier).toBe('ELEVATED');
      expect(analysis.daysOfInventory).toBeGreaterThan(10);
      expect(analysis.daysOfInventory).toBeLessThanOrEqual(30);
      expect(analysis.stockOutRiskScore).toBeGreaterThanOrEqual(50);
      expect(analysis.recommendedAction).toContain('ELEVATED NOTICE');
    });
  });

  // ===========================================================================
  // 5. Category Margin & Performance Breakdown Tests
  // ===========================================================================
  describe('getCategoryMarginBreakdown', () => {
    beforeEach(() => {
      const now = new Date();
      mockCategories = [
        { id: 'cat_earrings', name: 'Earrings', slug: 'earrings' },
        { id: 'cat_necklaces', name: 'Necklaces', slug: 'necklaces' },
      ];

      mockProducts = [
        {
          id: 'p_earr',
          name: 'Stud Earrings',
          sku: 'E-01',
          category_id: 'cat_earrings',
          price: 2000,
          cost_price: 800, // 40% cost, 60% margin
          stock_quantity: 10,
          status: 'active',
        },
        {
          id: 'p_neck',
          name: 'Pearl Choker',
          sku: 'N-01',
          category_id: 'cat_necklaces',
          price: 5000,
          cost_price: null, // missing cost_price, triggers 38% fallback
          stock_quantity: 5,
          status: 'active',
        },
      ];

      mockOrders = [
        {
          id: 'ord_1',
          status: 'delivered',
          created_at: new Date(now.getTime() - 2 * 86400000).toISOString(),
        },
        {
          id: 'ord_2',
          status: 'delivered',
          created_at: new Date(now.getTime() - 3 * 86400000).toISOString(),
        },
      ];

      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p_earr',
          sku: 'E-01',
          quantity: 2,
          price_at_purchase: 2000,
          unit_cost_price: 800, // Explicit unit cost
        },
        {
          order_id: 'ord_2',
          product_id: 'p_neck',
          sku: 'N-01',
          quantity: 1,
          price_at_purchase: 5000,
          unit_cost_price: null, // Fallback needed
        },
      ];
    });

    it('calculates category margins, blended gross margin, and data attribution accurately', async () => {
      const breakdown = await getCategoryMarginBreakdown(30);

      expect(breakdown.categories).toHaveLength(2);
      expect(breakdown.totalCatalogRevenue).toBe(9000); // 4000 (earrings) + 5000 (necklaces)

      // Earrings category
      const earr = breakdown.categories.find(
        (c) => c.categorySlug === 'earrings'
      )!;
      expect(earr.unitsSold).toBe(2);
      expect(earr.grossRevenue).toBe(4000);
      expect(earr.estimatedCOGS).toBe(1600); // 2 * 800
      expect(earr.grossMarginAmount).toBe(2400);
      expect(earr.grossMarginPercent).toBe(60);
      expect(earr.dataQuality).toBe('CALCULATED');

      // Necklaces category (uses 38% fallback: 5000 * 0.38 = 1900)
      const neck = breakdown.categories.find(
        (c) => c.categorySlug === 'necklaces'
      )!;
      expect(neck.unitsSold).toBe(1);
      expect(neck.grossRevenue).toBe(5000);
      expect(neck.estimatedCOGS).toBe(1900);
      expect(neck.grossMarginAmount).toBe(3100);
      expect(neck.grossMarginPercent).toBe(62);
      expect(neck.dataQuality).toBe('ESTIMATED'); // Flagged because COGS was estimated

      // Blended store metrics
      expect(breakdown.blendedGrossMarginPercent).toBeGreaterThan(60);
      expect(breakdown.topMarginCategory).toBe('Necklaces'); // 62% > 60%
      expect(breakdown.topVolumeCategory).toBe('Earrings'); // 2 units > 1 unit
    });

    it('groups products without category under Uncategorized bucket', async () => {
      const now = new Date();
      mockProducts.push({
        id: 'p_uncat',
        name: 'Velvet Jewellery Box',
        sku: 'BOX-01',
        category_id: null,
        price: 500,
        cost_price: 150,
        stock_quantity: 20,
        status: 'active',
      });

      mockOrders.push({
        id: 'ord_uncat',
        status: 'delivered',
        created_at: new Date(now.getTime() - 1 * 86400000).toISOString(),
      });

      mockOrderItems.push({
        order_id: 'ord_uncat',
        product_id: 'p_uncat',
        sku: 'BOX-01',
        quantity: 2,
        price_at_purchase: 500,
        unit_cost_price: 150,
      });

      const breakdown = await getCategoryMarginBreakdown(30);
      const uncat = breakdown.categories.find(
        (c) => c.categoryId === 'uncategorized'
      );
      expect(uncat).toBeDefined();
      expect(uncat?.grossRevenue).toBe(1000);
      expect(uncat?.estimatedCOGS).toBe(300);
    });

    it('throws error when loading categories fails', async () => {
      forceErrorTable = 'categories';
      await expect(getCategoryMarginBreakdown(30)).rejects.toThrow(
        'Failed to load categories'
      );
    });
  });

  // ===========================================================================
  // 6. Restock Recommendation Generator Tests
  // ===========================================================================
  describe('generateRestockRecommendations', () => {
    const now = new Date();

    beforeEach(() => {
      mockProducts = [
        {
          id: 'p_oos',
          name: 'Kundan Maang Tikka',
          sku: 'TIK-01',
          price: 1499,
          cost_price: 550,
          stock_quantity: 0,
          status: 'out_of_stock',
          category: { name: 'Accessories', slug: 'accessories' },
        },
        {
          id: 'p_crit',
          name: 'Bridal Choker Set',
          sku: 'CHK-01',
          price: 8999,
          cost_price: 3200,
          stock_quantity: 2,
          status: 'active',
          category: { name: 'Necklaces', slug: 'necklaces' },
        },
        {
          id: 'p_healthy',
          name: 'Simple Gold Nose Pin',
          sku: 'PIN-01',
          price: 599,
          cost_price: 200,
          stock_quantity: 50,
          status: 'active',
          category: { name: 'Nose Rings', slug: 'nose-rings' },
        },
      ];

      // p_crit sales: 10 units in 30 days => 0.33 units/day.
      // With leadTime=10, buffer=20 (target 30d): target = 10 units. current=2 => reorder 8.
      mockOrders = [
        {
          id: 'ord_1',
          status: 'delivered',
          created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
        },
      ];

      mockOrderItems = [
        {
          order_id: 'ord_1',
          product_id: 'p_crit',
          sku: 'CHK-01',
          quantity: 10,
          price_at_purchase: 8999,
        },
      ];
    });

    it('generates prioritized restock recommendations with reorder quantities and capital requirements', async () => {
      const plan = await generateRestockRecommendations({
        leadTimeDays: 10,
        safetyBufferDays: 20,
      });

      expect(plan.recommendations.length).toBeGreaterThanOrEqual(2);

      // OUT_OF_STOCK should be ranked highest
      const oosRec = plan.recommendations.find((r) => r.productId === 'p_oos')!;
      expect(oosRec.urgencyTier).toBe('OUT_OF_STOCK');
      expect(oosRec.recommendedReorderQuantity).toBeGreaterThanOrEqual(5);
      expect(oosRec.estimatedReorderCost).toBe(
        oosRec.recommendedReorderQuantity * 550
      );

      // CRITICAL should also be recommended
      const critRec = plan.recommendations.find(
        (r) => r.productId === 'p_crit'
      )!;
      expect(critRec.urgencyTier).toBe('CRITICAL');
      expect(critRec.recommendedReorderQuantity).toBeGreaterThan(0);
      expect(critRec.estimatedReorderCost).toBe(
        critRec.recommendedReorderQuantity * 3200
      );

      // HEALTHY item should NOT be recommended for reorder
      const healthyRec = plan.recommendations.find(
        (r) => r.productId === 'p_healthy'
      );
      expect(healthyRec).toBeUndefined();

      expect(plan.criticalRestockCount).toBeGreaterThan(0);
      expect(plan.totalUnitsToOrder).toBeGreaterThan(0);
      expect(plan.estimatedTotalCapitalRequired).toBeGreaterThan(0);
    });

    it('filters recommendations by urgency tier when specified', async () => {
      const plan = await generateRestockRecommendations({
        urgencyTier: 'OUT_OF_STOCK',
      });

      expect(plan.recommendations).toHaveLength(1);
      expect(plan.recommendations[0].productId).toBe('p_oos');
    });
  });
});
