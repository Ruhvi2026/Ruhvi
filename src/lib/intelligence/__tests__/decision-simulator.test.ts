jest.mock('server-only', () => ({}));

import {
  simulateDecisionScenario,
  type SimulationFixture,
  type SimulationScenarioConfig,
} from '../decision-simulator';

describe('Offline AI Decision Simulator Harness (Track I - Phase 43)', () => {
  const sampleFixture: SimulationFixture = {
    id: 'fix_diwali_2026',
    name: 'Diwali Festive Catalog Snapshot 2026',
    periodDays: 30,
    totalHistoricalOrders: 200,
    historicalAov: 32000,
    products: [
      {
        id: 'prod_necklace_01',
        sku: 'NK-GLD-001',
        name: 'Royal Temple Necklace',
        currentPrice: 80000,
        costPrice: 48000, // 60% cost
        stockQuantity: 15,
        lowStockThreshold: 3,
        historical30DaySalesUnits: 10,
        supplierLeadTimeDays: 12,
      },
      {
        id: 'prod_ring_01',
        sku: 'RG-DIA-001',
        name: 'Solitaire Engagement Ring',
        currentPrice: 40000,
        costPrice: 24000,
        stockQuantity: 20,
        lowStockThreshold: 4,
        historical30DaySalesUnits: 25,
        supplierLeadTimeDays: 10,
      },
      {
        id: 'prod_bangle_01',
        sku: 'BG-KAD-001',
        name: 'Gold Filigree Kada',
        currentPrice: 60000,
        costPrice: 36000,
        stockQuantity: 8,
        lowStockThreshold: 2,
        historical30DaySalesUnits: 12,
        supplierLeadTimeDays: 14,
      },
    ],
  };

  describe('Scenario 1: Inventory Safety Buffer Adjustment', () => {
    it('simulates working capital impact and stockout risk shift when safety buffers increase', () => {
      const scenario: SimulationScenarioConfig = {
        type: 'inventory_safety_buffer_adjustment',
        title: 'Buffer Increase (+2 units)',
        description: 'Increase safety stock by 2 units per SKU',
        parameters: {
          thresholdAdjustmentDelta: 2,
        },
      };

      const res = simulateDecisionScenario(scenario, sampleFixture);

      expect(res.isSandboxedReadOnly).toBe(true);
      expect(res.scenarioType).toBe('inventory_safety_buffer_adjustment');
      // 3 products, each +2 units buffer:
      // prod1: 2 * 48000 = 96000
      // prod2: 2 * 24000 = 48000
      // prod3: 2 * 36000 = 72000
      // Total working capital delta = 216,000
      expect(res.projectedWorkingCapitalDelta).toBe(216000);
      expect(res.projectedProfitDelta).toBe(0);

      const bufferComp = res.comparisons.find(
        (c) => c.metric === 'buffer_capital'
      );
      expect(bufferComp).toBeDefined();
      expect(bufferComp?.baseline).toBe(3 * 48000 + 4 * 24000 + 2 * 36000); // 144k + 96k + 72k = 312,000
      expect(bufferComp?.simulated).toBe(312000 + 216000); // 528,000
      expect(bufferComp?.percentDelta).toBe(69.2);

      expect(res.keyTradeoffs.length).toBeGreaterThan(0);
      expect(res.recommendation).toBe('FAVORABLE');
    });
  });

  describe('Scenario 2: Price Elasticity Change', () => {
    it('models price increase, volume drop, and gross profit expansion', () => {
      const scenario: SimulationScenarioConfig = {
        type: 'price_elasticity_change',
        title: '5% Premium Price Adjustment',
        description: 'Test 5% price hike with elasticity -1.2',
        parameters: {
          priceChangePercent: 5,
          elasticityCoefficient: -1.2,
        },
      };

      const res = simulateDecisionScenario(scenario, sampleFixture);

      expect(res.scenarioType).toBe('price_elasticity_change');
      // Unit sales should decrease by ~6% (5 * -1.2)
      const unitComp = res.comparisons.find((c) => c.metric === 'unit_sales');
      expect(unitComp).toBeDefined();
      expect(unitComp?.simulated).toBeLessThan(unitComp!.baseline);

      const profitComp = res.comparisons.find(
        (c) => c.metric === 'gross_profit'
      );
      expect(profitComp).toBeDefined();
      expect(res.comparisons.length).toBe(3);
      expect(res.assumptions).toContain(
        'Price elasticity of demand (PED) assumed at -1.2.'
      );
    });
  });

  describe('Scenario 3: Promotional Discount Campaign', () => {
    it('simulates order lift vs discount margin dilution', () => {
      const scenario: SimulationScenarioConfig = {
        type: 'promotional_discount_campaign',
        title: 'Festive 10% Off Campaign',
        description: 'Test 10% discount with 25% conversion lift',
        parameters: {
          discountPercent: 10,
          projectedConversionLiftPercent: 25,
        },
      };

      const res = simulateDecisionScenario(scenario, sampleFixture);

      expect(res.scenarioType).toBe('promotional_discount_campaign');
      const orderComp = res.comparisons.find(
        (c) => c.metric === 'total_orders'
      );
      expect(orderComp?.baseline).toBe(200);
      expect(orderComp?.simulated).toBe(250); // 200 * 1.25

      const aovComp = res.comparisons.find(
        (c) => c.metric === 'average_order_value'
      );
      expect(aovComp?.baseline).toBe(32000);
      expect(aovComp?.simulated).toBe(28800); // 32000 * 0.9
    });
  });

  describe('Scenario 4: Supplier Lead Time Delay', () => {
    it('estimates revenue and margin at risk from supply chain delays', () => {
      const scenario: SimulationScenarioConfig = {
        type: 'supplier_lead_time_delay',
        title: 'Supply Chain Monsoon Delay',
        description: '14-day vendor shipment delay',
        parameters: {
          leadTimeIncreaseDays: 14,
        },
      };

      const res = simulateDecisionScenario(scenario, sampleFixture);

      expect(res.scenarioType).toBe('supplier_lead_time_delay');
      const revAtRisk = res.comparisons.find(
        (c) => c.metric === 'revenue_at_risk'
      );
      expect(revAtRisk).toBeDefined();
      expect(revAtRisk?.simulated).toBeGreaterThanOrEqual(revAtRisk!.baseline);
      expect(res.keyTradeoffs[0]).toContain(
        'Supply chain delay increases potential revenue at risk'
      );
    });
  });
});
