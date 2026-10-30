jest.mock('server-only', () => ({}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

import {
  calculateSyntheticTotals,
  executeSyntheticOrderJourney,
  SYNTHETIC_ORDER_PREFIX,
  SYNTHETIC_PAYMENT_METHOD,
  SYNTHETIC_QA_PREFIX,
  SIMULATION_DISCLAIMER_TEXT,
  type SyntheticItemSpec,
} from '../synthetic-transaction-service';
import { getServiceClient } from '@/lib/supabase/service';

describe('Synthetic Transaction Service with Safe Rollback (Track H - Phase 41 & Audit P1.8)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      single: jest.fn(),
      update: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
    };
    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('Financial Totals & Pricing Invariants', () => {
    it('correctly calculates subtotal, discount, net total, and GST', () => {
      const items: SyntheticItemSpec[] = [
        {
          productId: 'prod_ring_01',
          sku: 'RG-001',
          title: 'Ring',
          price: 20000,
          quantity: 2, // 40,000
        },
        {
          productId: 'prod_pendant_01',
          sku: 'PD-001',
          title: 'Pendant',
          price: 10000,
          quantity: 1, // 10,000
        },
      ];

      const res = calculateSyntheticTotals(items, 5000);

      expect(res.subtotal).toBe(50000);
      expect(res.discount).toBe(5000);
      expect(res.total).toBe(45000);
      expect(res.gstAmount).toBe(1350); // 45000 * 0.03
    });

    it('caps coupon discount at subtotal to prevent negative totals', () => {
      const items: SyntheticItemSpec[] = [
        {
          productId: 'prod_chain_01',
          sku: 'CH-001',
          title: 'Chain',
          price: 4000,
          quantity: 1,
        },
      ];

      const res = calculateSyntheticTotals(items, 10000);

      expect(res.subtotal).toBe(4000);
      expect(res.discount).toBe(4000);
      expect(res.total).toBe(0);
      expect(res.gstAmount).toBe(0);
    });
  });

  describe('Pure Simulation Mode (Default)', () => {
    it('executes cart to order creation journey in pure calculation simulation mode without DB writes', async () => {
      const res = await executeSyntheticOrderJourney({
        items: [
          {
            productId: 'prod_diamond_ring_01',
            sku: 'RG-DIA-001',
            title: 'Diamond Ring',
            price: 35000,
            quantity: 1,
          },
        ],
        couponDiscountAmount: 3500,
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.testOrderNumber).toMatch(
        new RegExp(`^${SYNTHETIC_ORDER_PREFIX}`)
      );
      expect(res.grossAmount).toBe(35000);
      expect(res.discountApplied).toBe(3500);
      expect(res.netAmount).toBe(31500);

      // Verify explicit simulation tagging (P1.8 guarantee)
      expect(res.executionMode).toBe('pure_calculation_simulation');
      expect(res.isSimulatedDryRun).toBe(true);
      expect(res.persistedToDatabase).toBe(false);
      expect(res.rollbackMethod).toBe('pure_simulation_no_db_writes');
      expect(res.disclaimer).toBe(SIMULATION_DISCLAIMER_TEXT);

      // Verify isolation & rollback guarantees
      expect(res.cleanRollback).toBe(true);
      expect(res.invariantsVerified.isolatedFromCanonicalKpis).toBe(true);
      expect(res.invariantsVerified.realPaymentBypassed).toBe(true);
      expect(res.invariantsVerified.physicalShippingBypassed).toBe(true);
      expect(res.invariantsVerified.inventoryRestored).toBe(true);
      expect(res.invariantsVerified.cartCleanedUp).toBe(true);
      expect(res.invariantsVerified.persistedReadbackVerified).toBe(false);

      // Verify no DB client write methods were called
      expect(mockSupabase.insert).not.toHaveBeenCalled();
      expect(mockSupabase.update).not.toHaveBeenCalled();

      // Verify all steps passed
      for (const step of res.stepLogs) {
        expect(step.status).toBe('PASS');
      }
    });

    it('fails gracefully and rolls back if cart is empty', async () => {
      const res = await executeSyntheticOrderJourney({
        items: [],
      });

      expect(res.status).toBe('FAILED');
      expect(res.cleanRollback).toBe(true); // Still guarantees clean state
      expect(res.rollbackMethod).toBe('pure_simulation_no_db_writes');
      expect(res.stepLogs.some((s) => s.status === 'FAIL')).toBe(true);
    });
  });

  describe('Staging Persisted Execution Mode (P1.8)', () => {
    it('persists synthetic order to DB, rolls back, and verifies readback', async () => {
      // 1. Mock insert response
      mockSupabase.single
        .mockResolvedValueOnce({
          data: {
            id: 'ord_uuid_synth_123',
            order_number: 'SYNTH_ORD_1729000000',
            is_test: true,
          },
          error: null,
        })
        // 2. Mock rollback readback response
        .mockResolvedValueOnce({
          data: {
            id: 'ord_uuid_synth_123',
            status: 'cancelled_synthetic_test',
          },
          error: null,
        });

      mockSupabase.update.mockReturnValue({
        eq: jest.fn().mockResolvedValue({ error: null }),
      });

      const res = await executeSyntheticOrderJourney({
        persistToDatabase: true,
        items: [
          {
            productId: 'prod_solitaire_01',
            sku: 'SOL-01',
            title: 'Solitaire Ring',
            price: 50000,
            quantity: 1,
          },
        ],
      });

      expect(res.status).toBe('SUCCESS');
      expect(res.executionMode).toBe('staging_persisted_checkout');
      expect(res.isSimulatedDryRun).toBe(false);
      expect(res.persistedToDatabase).toBe(true);
      expect(res.testOrderId).toBe('ord_uuid_synth_123');
      expect(res.rollbackMethod).toBe('database_verified_rollback');
      expect(res.invariantsVerified.persistedReadbackVerified).toBe(true);
      expect(res.cleanRollback).toBe(true);

      // Verify DB calls
      expect(mockSupabase.insert).toHaveBeenCalledTimes(1);
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'cancelled_synthetic_test',
        })
      );
    });

    it('blocks persisted execution in production environment to protect customer records', async () => {
      const originalEnv = process.env.NODE_ENV;
      const originalVercelEnv = process.env.VERCEL_ENV;

      try {
        (process.env as any).NODE_ENV = 'production';
        process.env.VERCEL_ENV = 'production';

        await expect(
          executeSyntheticOrderJourney({
            persistToDatabase: true,
          })
        ).rejects.toThrow(
          /Persisted synthetic transactions are blocked in production/
        );
      } finally {
        (process.env as any).NODE_ENV = originalEnv;
        process.env.VERCEL_ENV = originalVercelEnv;
      }
    });
  });
});
