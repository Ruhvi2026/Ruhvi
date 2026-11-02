import {
  generateDoubleEntryPairs,
  computeTrialBalance,
  classifyAccountType,
} from '../cashbook-engine';
import {
  computeSkuCogs,
  calculateOrderBatchCogs,
  STANDARD_BIS_HALLMARKING_FEE,
} from '../manufacturing-costing';
import type { AccountsVoucherRecord, AccountsLedgerRecord } from '../types';

describe('Phase 2: Cash Book & Manufacturing Costing Engines', () => {
  describe('Cash Book & Double-Entry Ledger Engine', () => {
    it('correctly classifies standard accounting account types', () => {
      expect(classifyAccountType('Online Sales Revenue')).toBe('income');
      expect(classifyAccountType('Gold Bullion Purchase')).toBe('expense');
      expect(classifyAccountType('HDFC Current Bank Account')).toBe('asset');
      expect(classifyAccountType('Sundry Creditor MMTC')).toBe('liability');
      expect(classifyAccountType('Output CGST 1.5%')).toBe('tax_output');
      expect(classifyAccountType('Input CGST 1.5%')).toBe('tax_input');
    });

    it('generates balanced double-entry pairs where Debit === Credit', () => {
      const mockVoucher: AccountsVoucherRecord = {
        id: 'v-101',
        voucher_number: 'RV-2026-0001',
        voucher_type: 'receipt',
        voucher_date: '2026-11-02',
        description: 'Customer payment received via UPI',
        amount: 25000,
        debit_account: 'HDFC Current Bank Account',
        credit_account: 'Online Sales Revenue',
        payment_mode: 'upi',
      };

      const pairs = generateDoubleEntryPairs(mockVoucher);

      expect(pairs.length).toBe(2);
      expect(pairs[0].debit).toBe(25000);
      expect(pairs[0].credit).toBe(0);
      expect(pairs[0].account_name).toBe('HDFC Current Bank Account');

      expect(pairs[1].debit).toBe(0);
      expect(pairs[1].credit).toBe(25000);
      expect(pairs[1].account_name).toBe('Online Sales Revenue');
    });

    it('rejects vouchers with zero or negative amounts', () => {
      const invalidVoucher: AccountsVoucherRecord = {
        id: 'v-102',
        voucher_number: 'PV-2026-0001',
        voucher_type: 'payment',
        voucher_date: '2026-11-02',
        description: 'Invalid payment',
        amount: 0,
        debit_account: 'Packaging Expense',
        credit_account: 'Cash in Hand',
        payment_mode: 'cash',
      };

      expect(() => generateDoubleEntryPairs(invalidVoucher)).toThrow(
        'Voucher amount must be strictly greater than zero.'
      );
    });

    it('computes a balanced trial balance from multi-account ledger entries', () => {
      const mockLedger: AccountsLedgerRecord[] = [
        {
          id: 'l1',
          ledger_date: '2026-11-01',
          account_name: 'HDFC Bank',
          account_type: 'asset',
          debit: 50000,
          credit: 0,
          balance: 50000,
        },
        {
          id: 'l2',
          ledger_date: '2026-11-01',
          account_name: 'Sales Revenue',
          account_type: 'income',
          debit: 0,
          credit: 50000,
          balance: 50000,
        },
        {
          id: 'l3',
          ledger_date: '2026-11-02',
          account_name: 'Gold Purchase',
          account_type: 'expense',
          debit: 30000,
          credit: 0,
          balance: 30000,
        },
        {
          id: 'l4',
          ledger_date: '2026-11-02',
          account_name: 'HDFC Bank',
          account_type: 'asset',
          debit: 0,
          credit: 30000,
          balance: 20000,
        },
      ];

      const tb = computeTrialBalance(mockLedger);

      expect(tb.totalDebitSum).toBe(80000);
      expect(tb.totalCreditSum).toBe(80000);
      expect(tb.isBalanced).toBe(true);
      expect(
        tb.items.find((i) => i.accountName === 'HDFC Bank')?.netDebit
      ).toBe(20000);
      expect(
        tb.items.find((i) => i.accountName === 'Sales Revenue')?.netCredit
      ).toBe(50000);
    });
  });

  describe('Jewelry Manufacturing Costing Engine', () => {
    it('computes granular COGS and gross margin for a 22K gold necklace SKU', () => {
      const cogs = computeSkuCogs({
        sku: 'RJ-NECK-22K-001',
        metalPurity: '22K',
        grossWeightGrams: 10, // 10 grams 22K gold
        liveGold24kRatePerGram: 8000, // 24K = 8000 -> 22K (0.916) = 7328/gram
        makingChargeType: 'percentage',
        makingChargeValue: 12, // 12% making charges
        wastagePercentage: 2.5, // 2.5% casting wastage
        packagingCost: 350,
        targetSellingPrice: 110000,
      });

      // Metal base = 10 * 7328 = 73280
      // Wastage (2.5%) = 1832
      // Metal cost = 75112
      expect(cogs.liveGoldRatePerGram).toBe(7328);
      expect(cogs.metalCost).toBe(75112);
      expect(cogs.makingCharges).toBe(8793.6); // 12% of 73280
      expect(cogs.hallmarkingCost).toBe(STANDARD_BIS_HALLMARKING_FEE);
      expect(cogs.packagingCost).toBe(350);

      // Total COGS = 75112 + 8793.6 + 45 + 350 = 84300.6
      expect(cogs.totalCogs).toBe(84300.6);
      expect(cogs.grossMarginAmount).toBe(25699.4); // 110000 - 84300.6
      expect(cogs.grossMarginPercentage).toBe(23.4);
    });

    it('calculates order batch COGS across multiple items', () => {
      const batch = calculateOrderBatchCogs([
        {
          sku: 'RING-01',
          metalPurity: '18K',
          grossWeightGrams: 4,
          liveGold24kRatePerGram: 8000,
          targetSellingPrice: 40000,
        },
        {
          sku: 'SILV-01',
          metalPurity: '925 Silver',
          grossWeightGrams: 20,
          liveSilverRatePerGram: 100,
          targetSellingPrice: 5000,
        },
      ]);

      expect(batch.skuBreakdowns.length).toBe(2);
      expect(batch.totalSellingPrice).toBe(45000);
      expect(batch.totalOrderCogs).toBeGreaterThan(0);
      expect(batch.totalGrossMargin).toBe(
        batch.totalSellingPrice - batch.totalOrderCogs
      );
      expect(batch.overallMarginPercentage).toBeGreaterThan(0);
    });
  });
});
