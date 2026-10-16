jest.mock('server-only', () => ({}));

import {
  RUHVI_BUSINESS_KNOWLEDGE,
  buildKnowledgeContext,
  getLivePriveMetrics,
} from '@/lib/ai/knowledge';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../brain';
import { TOOL_PERMISSION_MAP } from '@/lib/ai/mcp-auth';

describe('Ruhvi Privé (VIP Membership) AI Co-Founder Integration', () => {
  it('defines comprehensive VIP Privé business knowledge and rules', () => {
    const vip = RUHVI_BUSINESS_KNOWLEDGE.vipMembership;
    expect(vip).toBeDefined();
    expect(vip.brandName).toContain('RUHVI PRIVÉ');
    expect(vip.pricingAndEntry.optionA).toContain('1,500 Reward Coins');
    expect(vip.pricingAndEntry.optionB).toContain('₹500');
    expect(vip.pricingAndEntry.validity).toContain('365 days');
    expect(vip.pricingAndEntry.nonRefundable).toContain('Strictly non-refundable');
    expect(vip.activeBenefits.length).toBeGreaterThanOrEqual(7);
    expect(vip.explicitExclusions.length).toBeGreaterThanOrEqual(3);
  });

  it('declares get_prive_membership_status in CO_FOUNDER_TOOL_DECLARATIONS', () => {
    const tool = CO_FOUNDER_TOOL_DECLARATIONS.find(
      (t) => t.name === 'get_prive_membership_status'
    );
    expect(tool).toBeDefined();
    expect(tool?.description).toContain('Ruhvi Privé VIP membership');
    expect(tool?.parameters.properties.search_customer).toBeDefined();
  });

  it('maps get_prive_membership_status in TOOL_PERMISSION_MAP', () => {
    expect(TOOL_PERMISSION_MAP['get_prive_membership_status']).toEqual({
      module: 'customer',
      action: 'read',
    });
  });

  it('queries live database metrics in getLivePriveMetrics', async () => {
    const mockSupabase = {
      from: jest.fn((table: string) => {
        if (table === 'users') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
            gte: jest.fn().mockReturnThis(),
            lte: jest.fn().mockResolvedValue({
              count: 3,
              data: [
                { id: 'u1', vip_source: 'coins' },
                { id: 'u2', vip_source: 'gateway' },
                { id: 'u3', vip_source: 'coins' },
              ],
            }),
          };
        }
        if (table === 'orders') {
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockResolvedValue({ count: 12 }),
          };
        }
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ count: 0, data: [] }),
        };
      }),
    };

    const metricsStr = await getLivePriveMetrics(mockSupabase);
    expect(metricsStr).toContain('LIVE DATABASE VIP PRIVÉ METRICS:');
    expect(metricsStr).toContain('Total Active VIP Members:');
  });

  it('dynamically injects Privé knowledge and live metrics when query mentions VIP or Privé', async () => {
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        gt: jest.fn().mockReturnThis(),
        gte: jest.fn().mockReturnThis(),
        lte: jest.fn().mockResolvedValue({ count: 5, data: [] }),
        order: jest.fn().mockResolvedValue({ data: [] }),
      })),
    };

    const context = await buildKnowledgeContext(
      'What are the perks of Ruhvi Privé VIP membership?',
      mockSupabase
    );

    expect(context).toContain('RUHVI PRIVÉ (VIP MEMBERSHIP) KNOWLEDGE');
    expect(context).toContain('1,500 Reward Coins');
    expect(context).toContain('₹500');
    expect(context).toContain('LIVE DATABASE VIP PRIVÉ METRICS:');
  });
});
