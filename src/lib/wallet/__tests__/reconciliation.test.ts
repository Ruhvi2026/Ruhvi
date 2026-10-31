import {
  calculateLedgerBalance,
  reconcileWalletState,
  generateWalletReconciliationReport,
  type WalletLedgerEntry,
} from '../reconciliation';

describe('Auditable Wallet Balance & Ledger Reconciliation (Phase 53)', () => {
  const USER_ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
  const USER_EMAIL = 'customer@ruhvi.in';

  describe('Mathematical Ledger Balance Calculation', () => {
    it('returns 0.00 when ledger has no records or is null/undefined', () => {
      expect(calculateLedgerBalance([])).toBe(0);
      expect(calculateLedgerBalance(null)).toBe(0);
      expect(calculateLedgerBalance(undefined)).toBe(0);
    });

    it('calculates balance correctly from a single credit transaction', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_1',
          amount: 50.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
      ];
      expect(calculateLedgerBalance(entries)).toBe(50.0);
    });

    it('calculates balance correctly from cashback bonuses', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_cb',
          amount: 250.0,
          type: 'cashback',
          created_at: '2026-10-02T10:00:00Z',
        },
      ];
      expect(calculateLedgerBalance(entries)).toBe(250.0);
    });

    it('clamps negative balance at zero if debits exceed credits', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_deb',
          amount: 100.0,
          type: 'debit',
          created_at: '2026-10-01T10:00:00Z',
        },
      ];
      expect(calculateLedgerBalance(entries)).toBe(0);
    });

    it('accurately reconciles a known complex ledger stream', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: '1',
          amount: 50.0,
          type: 'credit',
          description: 'Signup Bonus',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          amount: 50.0,
          type: 'credit',
          description: 'Phone Verification',
          created_at: '2026-10-01T10:05:00Z',
        },
        {
          id: '3',
          amount: 5000.0,
          type: 'credit',
          description: 'Wallet Top-Up',
          created_at: '2026-10-05T12:00:00Z',
        },
        {
          id: '4',
          amount: 250.0,
          type: 'cashback',
          description: 'Top-Up Cashback',
          created_at: '2026-10-05T12:00:01Z',
        },
        {
          id: '5',
          amount: 3500.0,
          type: 'debit',
          description: 'Diamond Ring Order',
          created_at: '2026-10-10T14:30:00Z',
        },
        {
          id: '6',
          amount: 1000.0,
          type: 'debit',
          description: 'Gold Pendant Order',
          created_at: '2026-10-15T09:15:00Z',
        },
      ];

      // Net: 50 + 50 + 5000 + 250 - 3500 - 1000 = 850.00
      const balance = calculateLedgerBalance(entries);
      expect(balance).toBe(850.0);
    });

    it('preserves 2-decimal floating point precision without imprecision drift', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: '1',
          amount: 0.1,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          amount: 0.2,
          type: 'credit',
          created_at: '2026-10-01T10:01:00Z',
        },
      ];
      // 0.1 + 0.2 in raw JS is 0.30000000000000004; reconciliation must yield 0.30
      expect(calculateLedgerBalance(entries)).toBe(0.3);

      const complexPrecision: WalletLedgerEntry[] = [
        {
          id: 'a',
          amount: '19.99',
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: 'b',
          amount: '10.01',
          type: 'credit',
          created_at: '2026-10-01T10:01:00Z',
        },
        {
          id: 'c',
          amount: '5.50',
          type: 'debit',
          created_at: '2026-10-01T10:02:00Z',
        },
      ];
      // 19.99 + 10.01 - 5.50 = 24.50
      expect(calculateLedgerBalance(complexPrecision)).toBe(24.5);
    });
  });

  describe('Reconciliation Status & Discrepancy Detection', () => {
    it('returns RECONCILED when cached balance perfectly matches the ledger sum', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: '1',
          amount: 500.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          amount: 150.0,
          type: 'debit',
          created_at: '2026-10-02T10:00:00Z',
        },
      ];
      const cachedBalance = 350.0;

      const result = reconcileWalletState(cachedBalance, entries);

      expect(result.isReconciled).toBe(true);
      expect(result.status).toBe('RECONCILED');
      expect(result.hasDiscrepancy).toBe(false);
      expect(result.authoritativeBalance).toBe(350.0);
      expect(result.cachedBalance).toBe(350.0);
      expect(result.discrepancy).toBe(0.0);
      expect(result.breakdown.totalCredits).toBe(500.0);
      expect(result.breakdown.totalDebits).toBe(150.0);
    });

    it('returns NO_TRANSACTIONS when both ledger and cached balance are zero', () => {
      const result = reconcileWalletState(0, []);
      expect(result.isReconciled).toBe(true);
      expect(result.status).toBe('NO_TRANSACTIONS');
      expect(result.hasDiscrepancy).toBe(false);
      expect(result.authoritativeBalance).toBe(0);
    });

    it('detects LEDGER_AHEAD discrepancy and reports it transparently without hiding', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: '1',
          amount: 50.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: '2',
          amount: 50.0,
          type: 'credit',
          created_at: '2026-10-02T10:00:00Z',
        },
      ];
      // Profile cache only shows 50.00 (e.g. stale cache before verification bonus)
      const cachedBalance = 50.0;

      const result = reconcileWalletState(cachedBalance, entries);

      expect(result.isReconciled).toBe(false);
      expect(result.status).toBe('LEDGER_AHEAD');
      expect(result.hasDiscrepancy).toBe(true);
      expect(result.authoritativeBalance).toBe(100.0);
      expect(result.cachedBalance).toBe(50.0);
      expect(result.discrepancy).toBe(-50.0);
      expect(result.explanation).toContain('exceeds the account cache');
      expect(result.explanation).toContain('₹50.00');
    });

    it('detects CACHE_AHEAD discrepancy and reports it transparently without hiding', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: '1',
          amount: 100.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
      ];
      // Profile cache shows 150.00 (e.g. unledgered manual balance edit)
      const cachedBalance = 150.0;

      const result = reconcileWalletState(cachedBalance, entries);

      expect(result.isReconciled).toBe(false);
      expect(result.status).toBe('CACHE_AHEAD');
      expect(result.hasDiscrepancy).toBe(true);
      expect(result.authoritativeBalance).toBe(100.0);
      expect(result.cachedBalance).toBe(150.0);
      expect(result.discrepancy).toBe(50.0);
      expect(result.explanation).toContain(
        'exceeds verified ledger transactions'
      );
    });
  });

  describe('Auditable Reconciliation Report Generation', () => {
    it('generates a structured, non-destructive audit report for reconciled accounts', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_101',
          amount: 1000.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
      ];
      const report = generateWalletReconciliationReport(
        { id: USER_ID, email: USER_EMAIL },
        1000.0,
        entries
      );

      expect(report.reportId.startsWith('WREC_')).toBe(true);
      expect(report.userId).toBe(USER_ID);
      expect(report.userEmail).toBe(USER_EMAIL);
      expect(report.reconciliation.isReconciled).toBe(true);
      expect(report.requiresManualReview).toBe(false);
      expect(report.recommendedAction).toBe('NONE');
      expect(report.entriesAudited).toHaveLength(1);
      expect(report.entriesAudited[0].amount).toBe(1000.0);
    });

    it('flags requiresManualReview and recommends SYNC_PROFILE_TO_LEDGER when ledger is ahead', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_101',
          amount: 1000.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
        {
          id: 'txn_102',
          amount: 500.0,
          type: 'credit',
          created_at: '2026-10-02T10:00:00Z',
        },
      ];
      const report = generateWalletReconciliationReport(
        { id: USER_ID, email: USER_EMAIL },
        1000.0,
        entries
      );

      expect(report.reconciliation.isReconciled).toBe(false);
      expect(report.requiresManualReview).toBe(true);
      expect(report.recommendedAction).toBe('SYNC_PROFILE_TO_LEDGER');
      expect(report.reconciliation.discrepancy).toBe(-500.0);
    });

    it('flags requiresManualReview and recommends INVESTIGATE_UNLINKED_CREDIT when cache is ahead', () => {
      const entries: WalletLedgerEntry[] = [
        {
          id: 'txn_101',
          amount: 100.0,
          type: 'credit',
          created_at: '2026-10-01T10:00:00Z',
        },
      ];
      const report = generateWalletReconciliationReport(
        { id: USER_ID, email: USER_EMAIL },
        250.0,
        entries
      );

      expect(report.reconciliation.isReconciled).toBe(false);
      expect(report.requiresManualReview).toBe(true);
      expect(report.recommendedAction).toBe('INVESTIGATE_UNLINKED_CREDIT');
      expect(report.reconciliation.discrepancy).toBe(150.0);
    });
  });
});
