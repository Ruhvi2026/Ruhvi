import { isItcBlocked, computeItcBreakdown } from '../itc-engine';
import { getGstr3bDueDate, aggregateOutwardSupplies } from '../gstr3b-engine';
import {
  calculateAdvanceTaxSchedule,
  checkSection44AbAudit,
} from '../income-tax-advisory';
import type { AccountsPurchaseRecord } from '../types';

describe('Phase 1: Accounts Core Tax & Financial Engines', () => {
  describe('ITC Engine (Section 17(5) Compliance)', () => {
    it('correctly classifies eligible vs blocked purchase categories under Section 17(5)', () => {
      // Eligible production categories
      expect(
        isItcBlocked('Bullion (Gold/Silver)', '24K Gold Granules for casting')
      ).toBe(false);
      expect(
        isItcBlocked('Making & Jobwork', 'Handcrafted filigree charges')
      ).toBe(false);
      expect(isItcBlocked('Packaging', 'Velvet jewelry boxes')).toBe(false);
      expect(isItcBlocked('Hallmarking', 'BIS hallmarking fee')).toBe(false);

      // Blocked categories under Section 17(5)
      expect(
        isItcBlocked('Office & Utilities', 'Staff catering and food buffet')
      ).toBe(true);
      expect(isItcBlocked('Other', 'Director personal car cab expenses')).toBe(
        true
      );
      expect(isItcBlocked('Other', 'Diwali personal gift hampers')).toBe(true);
    });

    it('accurately aggregates ITC breakdowns and separates eligible vs blocked credits', () => {
      const samplePurchases: AccountsPurchaseRecord[] = [
        {
          id: 'p1',
          bill_number: 'BULL-01',
          bill_date: '2026-11-05',
          vendor_name: 'MMTC PAMP',
          category: 'Bullion (Gold/Silver)',
          item_description: 'Pure 999.9 Gold Bullion',
          taxable_value: 100000,
          gst_rate: 3,
          cgst_input: 1500,
          sgst_input: 1500,
          igst_input: 0,
          total_amount: 103000,
          itc_eligible: true,
          payment_status: 'paid',
        },
        {
          id: 'p2',
          bill_number: 'JOB-01',
          bill_date: '2026-11-08',
          vendor_name: 'Bengal Artisan Jobwork',
          category: 'Making & Jobwork',
          item_description: 'Necklace casting & setting',
          taxable_value: 20000,
          gst_rate: 5,
          cgst_input: 500,
          sgst_input: 500,
          igst_input: 0,
          total_amount: 21000,
          itc_eligible: true,
          payment_status: 'paid',
        },
        {
          id: 'p3',
          bill_number: 'FOOD-01',
          bill_date: '2026-11-10',
          vendor_name: 'Catering Services',
          category: 'Office & Utilities',
          item_description: 'Food & beverage party',
          taxable_value: 5000,
          gst_rate: 5,
          cgst_input: 125,
          sgst_input: 125,
          igst_input: 0,
          total_amount: 5250,
          itc_eligible: true, // will be blocked by Section 17(5)
          payment_status: 'paid',
        },
      ];

      const breakdown = computeItcBreakdown(samplePurchases, '112026');

      expect(breakdown.totalPurchases).toBe(129250);
      expect(breakdown.taxablePurchases).toBe(125000);
      expect(breakdown.cgstInputAvailable).toBe(2000); // 1500 + 500
      expect(breakdown.sgstInputAvailable).toBe(2000); // 1500 + 500
      expect(breakdown.totalItcAvailable).toBe(4000);
      expect(breakdown.blockedCreditAmount).toBe(250); // food GST blocked
      expect(breakdown.eligibleBillsCount).toBe(2);
      expect(breakdown.ineligibleBillsCount).toBe(1);
    });
  });

  describe('GSTR-3B Engine', () => {
    it('computes filing due date as 20th of the following month', () => {
      const result = getGstr3bDueDate('112026'); // Nov 2026
      expect(result.dueDateStr).toBe('2026-12-20');
    });

    it('accurately aggregates outward supplies and differentiates intra vs inter state', () => {
      const mockOrders = [
        {
          total: 10300,
          shipping_address: { state: 'West Bengal' }, // Intra: 3% = 1.5% CGST + 1.5% SGST
        },
        {
          total: 20600,
          shipping_address: { state: 'Maharashtra' }, // Inter: 3% = IGST
        },
      ];

      const outward = aggregateOutwardSupplies(mockOrders, []);

      expect(outward.totalGross).toBe(30900);
      expect(outward.taxableValue).toBe(30000); // 10000 + 20000
      expect(outward.cgst).toBe(150); // 1.5% of 10000
      expect(outward.sgst).toBe(150); // 1.5% of 10000
      expect(outward.igst).toBe(600); // 3% of 20000
      expect(outward.intraStateCount).toBe(1);
      expect(outward.interStateCount).toBe(1);
    });
  });

  describe('Income Tax Advisory Engine', () => {
    it('generates 4 quarterly advance tax installments adding to 100%', () => {
      const estimatedTax = 100000;
      const schedule = calculateAdvanceTaxSchedule(estimatedTax, '2026-27');

      expect(schedule.length).toBe(4);
      expect(schedule[0].cumulativePercentageDue).toBe(15);
      expect(schedule[0].estimatedAmountDue).toBe(15000);
      expect(schedule[1].cumulativePercentageDue).toBe(45);
      expect(schedule[1].estimatedAmountDue).toBe(45000);
      expect(schedule[2].cumulativePercentageDue).toBe(75);
      expect(schedule[2].estimatedAmountDue).toBe(75000);
      expect(schedule[3].cumulativePercentageDue).toBe(100);
      expect(schedule[3].estimatedAmountDue).toBe(100000);
    });

    it('correctly evaluates Section 44AB threshold under 1 Cr standard vs 10 Cr digital exemption', () => {
      // Case 1: Standard non-digital turnover (digital < 95%)
      const res1 = checkSection44AbAudit(15000000, 80); // 1.5 Cr
      expect(res1.isAuditApplicable).toBe(true);
      expect(res1.thresholdUsed).toBe(10000000); // 1 Cr limit

      // Case 2: High digital turnover (>= 95%) under 10 Cr
      const res2 = checkSection44AbAudit(25000000, 98); // 2.5 Cr with 98% digital
      expect(res2.isAuditApplicable).toBe(false);
      expect(res2.thresholdUsed).toBe(100000000); // 10 Cr limit
    });
  });
});
