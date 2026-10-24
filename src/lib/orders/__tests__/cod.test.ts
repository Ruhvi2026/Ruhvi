import {
  getCodRefusalThreshold,
  getCodEligibility,
  recordCodRefusal,
  resetCodEligibility,
} from '../cod';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import { getServiceClient } from '@/lib/supabase/service';

describe('COD Rules Engine', () => {
  let mockSupabase: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('getCodRefusalThreshold', () => {
    it('returns default 2 when setting record is absent or error occurs', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const threshold = await getCodRefusalThreshold();
      expect(threshold).toBe(2);
    });

    it('returns configured threshold value when present in settings', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: { value: '3' },
              error: null,
            }),
          }),
        }),
      });

      const threshold = await getCodRefusalThreshold();
      expect(threshold).toBe(3);
    });
  });

  describe('getCodEligibility', () => {
    it('fails open (cod_disabled: false) when customer has no prior record', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest
              .fn()
              .mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const result = await getCodEligibility('cust-123');
      expect(result.cod_disabled).toBe(false);
      expect(result.cod_refusal_count).toBe(0);
      expect(result.last_refusal_at).toBeNull();
    });

    it('returns stored eligibility status when record exists', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            maybeSingle: jest.fn().mockResolvedValue({
              data: {
                cod_disabled: true,
                cod_refusal_count: 2,
                last_refusal_at: '2026-10-10T00:00:00Z',
              },
              error: null,
            }),
          }),
        }),
      });

      const result = await getCodEligibility('cust-blocked');
      expect(result.cod_disabled).toBe(true);
      expect(result.cod_refusal_count).toBe(2);
      expect(result.last_refusal_at).toBe('2026-10-10T00:00:00Z');
    });
  });

  describe('recordCodRefusal', () => {
    it('rejects non-qualifying delivery outcomes', async () => {
      const result = await recordCodRefusal({
        customerId: 'cust-1',
        orderId: 'ord-1',
        result: 'delivered',
      });

      expect(result.ok).toBe(false);
      expect(result.error).toBe('Not a qualifying COD refusal outcome');
    });

    it('handles idempotent retries via duplicate key error (23505)', async () => {
      // Step 1: marker insert fails with 23505
      const insertMock = jest.fn().mockResolvedValue({
        error: { code: '23505', message: 'duplicate key' },
      });
      // Step 2: query existing state
      const selectMock = {
        eq: jest.fn().mockReturnValue({
          maybeSingle: jest.fn().mockResolvedValue({
            data: { cod_disabled: true, cod_refusal_count: 2 },
            error: null,
          }),
        }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'cod_eligibility_events') {
          return { insert: insertMock };
        }
        if (table === 'cod_eligibility') {
          return { select: jest.fn().mockReturnValue(selectMock) };
        }
        return {};
      });

      const result = await recordCodRefusal({
        customerId: 'cust-1',
        orderId: 'ord-duplicate',
        result: 'refused',
      });

      expect(result.ok).toBe(true);
      expect(result.disabled).toBe(true);
      expect(result.refusal_count).toBe(2);
    });

    it('records refusal and disables COD when threshold is reached', async () => {
      const insertMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockImplementation((table: string) => {
        if (table === 'cod_eligibility_events') {
          return { insert: insertMock };
        }
        if (table === 'cod_eligibility') {
          return { update: jest.fn().mockReturnValue(updateMock) };
        }
        if (table === 'settings') {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                maybeSingle: jest.fn().mockResolvedValue({
                  data: { value: '2' },
                }),
              }),
            }),
          };
        }
        return {};
      });

      // RPC increments refusal count to 2
      mockSupabase.rpc.mockResolvedValue({
        data: 2,
        error: null,
      });

      const result = await recordCodRefusal({
        customerId: 'cust-1',
        orderId: 'ord-new',
        result: 'uncollected',
      });

      expect(result.ok).toBe(true);
      expect(result.disabled).toBe(true);
      expect(result.refusal_count).toBe(2);
    });
  });

  describe('resetCodEligibility', () => {
    it('resets COD disabled state and counter', async () => {
      const updateMock = {
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      mockSupabase.from.mockReturnValue({
        update: jest.fn().mockReturnValue(updateMock),
      });

      const result = await resetCodEligibility('cust-1');
      expect(result.ok).toBe(true);
    });
  });
});
