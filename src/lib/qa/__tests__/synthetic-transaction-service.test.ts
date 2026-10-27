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
  type SyntheticItemSpec,
} from '../synthetic-transaction-service';

describe('Synthetic Transaction Service with Safe Rollback (Track H - Phase 41)', () => {
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

  describe('Full Journey Execution & Safe Rollback', () => {
    it('executes cart to order creation journey with complete safe rollback and KPI isolation', async () => {
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

      // Verify strict isolation & rollback guarantees
      expect(res.cleanRollback).toBe(true);
      expect(res.invariantsVerified.isolatedFromCanonicalKpis).toBe(true);
      expect(res.invariantsVerified.realPaymentBypassed).toBe(true);
      expect(res.invariantsVerified.physicalShippingBypassed).toBe(true);
      expect(res.invariantsVerified.inventoryRestored).toBe(true);
      expect(res.invariantsVerified.cartCleanedUp).toBe(true);

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
      expect(res.stepLogs.some((s) => s.status === 'FAIL')).toBe(true);
    });
  });
});
