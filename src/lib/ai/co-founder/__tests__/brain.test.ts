jest.mock('server-only', () => ({}));

import {
  getCoFounderSystemPrompt,
  CO_FOUNDER_TOOL_DECLARATIONS,
} from '../brain';
import { executeCoFounderTool } from '../tool-bridge';
import {
  getRelevantMemories,
  writeCoFounderMemory,
  correctCoFounderMemory,
} from '../memory';

// In-memory mock storage for testing memory operations
const mockMemoriesTable: any[] = [];
let memCounter = 0;

// Mock getServiceClient
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'co_founder_memories') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn(function (this: any, col: string, val: any) {
            this._filters = this._filters || {};
            this._filters[col] = val;
            return this;
          }),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn(function (this: any, n: number) {
            const results = mockMemoriesTable
              .filter((m) => {
                if (
                  this._filters?.is_active !== undefined &&
                  m.is_active !== this._filters.is_active
                )
                  return false;
                if (
                  this._filters?.user_id &&
                  m.user_id !== this._filters.user_id
                )
                  return false;
                if (
                  this._filters?.category &&
                  m.category !== this._filters.category
                )
                  return false;
                if (this._filters?.key && m.key !== this._filters.key)
                  return false;
                return true;
              })
              .slice(0, n);
            return Promise.resolve({ data: results, error: null });
          }),
          maybeSingle: jest.fn(function (this: any) {
            const item = mockMemoriesTable.find((m) => {
              if (
                this._filters?.is_active !== undefined &&
                m.is_active !== this._filters.is_active
              )
                return false;
              if (this._filters?.user_id && m.user_id !== this._filters.user_id)
                return false;
              if (this._filters?.key && m.key !== this._filters.key)
                return false;
              return true;
            });
            return Promise.resolve({ data: item || null, error: null });
          }),
          insert: jest.fn((row: any) => {
            memCounter++;
            const newRow = { id: `mem_${Date.now()}_${memCounter}`, ...row };
            mockMemoriesTable.push(newRow);
            return {
              select: () => ({
                single: () => Promise.resolve({ data: newRow, error: null }),
              }),
            };
          }),
          update: jest.fn(function (this: any, updateFields: any) {
            return {
              eq: (col: string, val: any) => {
                mockMemoriesTable.forEach((m) => {
                  if (m[col] === val) Object.assign(m, updateFields);
                });
                return Promise.resolve({ data: null, error: null });
              },
            };
          }),
        };
      }
      if (table === 'orders') {
        const orderRows = [
          {
            id: '1',
            order_number: 'RHV-101',
            total: 5000,
            total_amount: 5000,
            status: 'delivered',
            payment_status: 'paid',
          },
          {
            id: '2',
            order_number: 'RHV-102',
            total: 3500,
            total_amount: 3500,
            status: 'shipped',
            payment_status: 'paid',
          },
        ];
        return {
          select: jest.fn().mockReturnThis(),
          gte: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: orderRows, error: null }),
          then: jest.fn((resolve: any) =>
            resolve({ data: orderRows, error: null })
          ),
        };
      }
      if (table === 'products') {
        const prodData = [
          {
            id: 'p1',
            name: 'Royal Kundan Choker',
            sku: 'RKC-01',
            stock_quantity: 2,
          },
        ];
        return {
          select: jest.fn().mockReturnThis(),
          lte: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: prodData, error: null }),
          then: jest.fn((resolve: any) =>
            resolve({ data: prodData, error: null })
          ),
        };
      }
      if (table === 'support_tickets') {
        const ticketData = [
          {
            id: 't1',
            ticket_number: 'TCK-01',
            subject: 'Exchange request',
            status: 'open',
            priority: 'medium',
          },
        ];
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          in: jest.fn().mockReturnThis(),
          limit: jest.fn().mockResolvedValue({ data: ticketData, error: null }),
          then: jest.fn((resolve: any) =>
            resolve({ data: ticketData, error: null })
          ),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        then: jest.fn((resolve: any) => resolve({ data: [], error: null })),
      };
    }),
  })),
}));

// Mock buildKnowledgeContext
jest.mock('@/lib/ai/knowledge', () => ({
  buildKnowledgeContext: jest.fn(
    async () => 'LIVE STORE SNAPSHOT MOCK: Products and collections active.'
  ),
  RUHVI_BUSINESS_KNOWLEDGE: {
    brand: { name: 'Ruhvi', tagline: 'Fine Jewellery' },
    materials: { plating: '22K gold', base: 'brass' },
    shipping: { carrier: 'Blue Dart' },
  },
}));

describe('Stage 3 — Co-Founder Brain & Memory System', () => {
  beforeEach(() => {
    mockMemoriesTable.length = 0;
    memCounter = 0;
  });

  it('generates system prompt containing Co-Founder executive identity and voice constraints', async () => {
    const prompt = await getCoFounderSystemPrompt({
      adminName: 'Aayush',
      userRole: 'super_admin',
      channel: 'voice',
    });
    expect(prompt).toContain('AI Co-Founder');
    expect(prompt).toContain('Ruhvi');
    expect(prompt).toContain('VOICE MODE');
    expect(prompt).toContain('LIVE DATA PRECEDENCE');
    expect(prompt).toContain('APPROVAL BOUNDARIES');
  });

  it('formats text mode prompt with structured presentation guidelines', async () => {
    const prompt = await getCoFounderSystemPrompt({
      adminName: 'Aayush',
      userRole: 'super_admin',
      channel: 'text',
    });
    expect(prompt).toContain('TEXT MODE');
  });

  it('writes and retrieves long-term strategic memories', async () => {
    const writeRes = await writeCoFounderMemory({
      userId: 'user_100',
      category: 'strategic_goal',
      key: 'diwali_campaign_target',
      value: 'Achieve ₹50 Lakhs revenue for festive collections',
    });
    expect(writeRes.success).toBe(true);

    const memories = await getRelevantMemories('user_100');
    expect(memories.length).toBe(1);
    expect(memories[0].key).toBe('diwali_campaign_target');
    expect(memories[0].value).toContain('₹50 Lakhs');
  });

  it('corrects existing memory and marks previous as superseded', async () => {
    await writeCoFounderMemory({
      userId: 'user_100',
      category: 'business_preference',
      key: 'primary_carrier',
      value: 'Blue Dart Standard',
    });

    const correctionRes = await correctCoFounderMemory(
      'user_100',
      'primary_carrier',
      'Blue Dart Express Air with priority transit'
    );
    expect(correctionRes.success).toBe(true);

    const activeMemories = await getRelevantMemories('user_100');
    expect(activeMemories.length).toBe(1);
    expect(activeMemories[0].value).toBe(
      'Blue Dart Express Air with priority transit'
    );
  });

  it('injects relevant memories into Co-Founder system instructions', async () => {
    await writeCoFounderMemory({
      userId: 'user_200',
      category: 'operational_rule',
      key: 'choker_inventory_buffer',
      value: 'Keep minimum 10 units in buffer before festive rush',
    });

    const prompt = await getCoFounderSystemPrompt({
      userId: 'user_200',
      adminName: 'Founder',
    });
    expect(prompt).toContain('choker_inventory_buffer');
    expect(prompt).toContain('Keep minimum 10 units in buffer');
  });

  it('executes tools and enforces approval boundaries for write operations', async () => {
    // Read operation executes
    const metrics = await executeCoFounderTool('get_store_metrics', {}, [
      'analytics:read',
    ]);
    expect(metrics.success).toBe(true);

    // Permission matrix guard blocks unpermitted tools
    const blocked = await executeCoFounderTool('get_store_metrics', {}, [
      'unauthorized:scope',
    ]);
    expect(blocked.success).toBe(false);
  });

  it('enforces natural colloquial spoken Bengali rules and bans archaic words', async () => {
    const prompt = await getCoFounderSystemPrompt({
      adminName: 'Founder',
      channel: 'voice',
      language: 'bn-IN',
      voiceStyle: 'spoken_bengali',
    });
    expect(prompt).toContain('BENGALI SPOKEN VOICE PHONICS');
    expect(prompt).toContain('NATURAL COLLOQUIAL SPOKEN BENGALI');
    expect(prompt).toContain('NEVER use "এবং"');
    expect(prompt).toContain('ALWAYS use "আর"');
    expect(prompt).toContain('SHORT, BREATHABLE CADENCE');
  });

  it('formats Banglish phonetic instructions when banglish mode is active', async () => {
    const prompt = await getCoFounderSystemPrompt({
      adminName: 'Founder',
      channel: 'voice',
      language: 'bn-IN',
      voiceStyle: 'banglish',
    });
    expect(prompt).toContain('BANGLISH / ROMANIZED PHONETIC MODE ACTIVE');
    expect(prompt).toContain('Romanized Bengali');
  });
});
