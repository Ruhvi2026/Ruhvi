jest.mock('server-only', () => ({}));

jest.mock('@/lib/ai/co-founder/analytics', () => ({
  getStoreAnalytics: jest.fn().mockResolvedValue({
    currentPeriod: {
      aov: 4200,
      totalRevenue: 340000,
      totalOrders: 81,
    },
  }),
}));

jest.mock('@/lib/ai/co-founder/competitors', () => ({
  getCompetitors: jest.fn().mockResolvedValue([
    {
      id: 'comp_1',
      name: 'Giva Jewellery',
      website_url: 'https://giva.co',
      market_positioning: 'Silver & demi-fine mass market',
    },
  ]),
}));

import { StrategyCoWorker } from '../marketing/co-workers/strategy';

describe('Marketing Co-Worker 1: Strategy Co-Worker', () => {
  let strategy: StrategyCoWorker;

  beforeEach(() => {
    strategy = new StrategyCoWorker();
  });

  it('declares identity, enabled status, and all 30 skills', () => {
    expect(strategy.id).toBe('marketing_strategy');
    expect(strategy.name).toBe('Strategy Co-worker');

    const def = strategy.getDefinition();
    expect(def.status).toBe('ENABLED');
    expect(def.isProductionOnly).toBe(false);
    expect(def.skills.length).toBe(30);
    expect(def.skills).toContain('Marketing strategy');
    expect(def.skills).toContain('Margin-aware promotion recommendations');
    expect(def.skills).toContain('A/B testing strategy');
    expect(def.tools).toContain('get_store_metrics');
    expect(def.tools).toContain('get_competitors');
  });

  it('formulates structured marketing strategy calibrated to AOV with 3 luxury angles', async () => {
    const output = await strategy.execute({
      task: 'Plan Diwali acquisition campaign for 22K Gold Plated Choker',
    });

    expect(output.coWorkerId).toBe('marketing_strategy');
    expect(output.status).toBe('ENABLED');
    expect(output.success).toBe(true);

    const strat = output.data.strategy!;
    expect(strat).toBeDefined();
    expect(strat.angles.length).toBe(3);
    expect(strat.angles[0].hook).toContain('gold');
    expect(strat.angles[0].headline).toBeTruthy();
    expect(
      strat.budgetRecommendation.suggestedDailyBudgetInr
    ).toBeGreaterThanOrEqual(1500);
    expect(strat.budgetRecommendation.expectedRoasFloor).toBe(3.2);
    expect(strat.creativeRequirements.requiresVideo).toBe(true);
    expect(strat.recommendedNextWorkers).toContain('marketing_creative_media');
    expect(strat.recommendedNextWorkers).toContain('marketing_ads_execution');
    expect(output.requiredApproval).toBe(false);
  });

  it('enforces human-in-the-loop approval when discount or coupon is requested', async () => {
    const output = await strategy.execute({
      task: 'Launch festive discount campaign with 15% off coupon',
    });

    expect(output.requiredApproval).toBe(true);
    expect(output.executionStatus).toBe('pending_approval');
    expect(output.data.strategy?.offer).toContain('RUHVI500');
    expect(output.executiveVoiceSummary).toContain('Awaiting your approval');
  });
});
