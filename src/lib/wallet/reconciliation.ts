/**
 * ============================================================================
 * AUDITABLE WALLET BALANCE & LEDGER RECONCILIATION ENGINE (PHASE 53)
 * ============================================================================
 * Implements deterministic double-entry reconciliation between the authoritative
 * append-only public.wallet_ledger journal and the cached public.users.wallet_balance.
 *
 * Rules:
 * 1. Authoritative Journal: wallet_ledger is the immutable single source of truth.
 * 2. Deterministic Precision: Floating point arithmetic is rounded to 2 decimal places.
 * 3. Non-Destructive Audit: Never silently alters balances; discrepancies are explicitly
 *    flagged and surfaced to users and administrators.
 * 4. Transparent Reporting: Clear reconciliation reports for audits and user peace-of-mind.
 */

export interface WalletLedgerEntry {
  id: string;
  user_id?: string;
  order_id?: string | null;
  amount: number | string;
  type: 'credit' | 'debit' | 'cashback';
  description?: string | null;
  created_at: string;
}

export type WalletReconciliationStatus =
  'RECONCILED' | 'LEDGER_AHEAD' | 'CACHE_AHEAD' | 'NO_TRANSACTIONS';

export interface WalletReconciliationResult {
  isReconciled: boolean;
  status: WalletReconciliationStatus;
  authoritativeBalance: number; // Reconciled balance calculated from immutable ledger
  cachedBalance: number; // Cached balance reported by users profile
  discrepancy: number; // cachedBalance - authoritativeBalance
  hasDiscrepancy: boolean;
  transactionCount: number;
  breakdown: {
    totalCredits: number;
    creditsCount: number;
    totalDebits: number;
    debitsCount: number;
    totalCashback: number;
    cashbackCount: number;
  };
  explanation: string;
  reconciledAt: string;
}

export interface WalletAuditReport {
  reportId: string;
  userId: string;
  userEmail?: string | null;
  reconciliation: WalletReconciliationResult;
  requiresManualReview: boolean;
  recommendedAction:
    'NONE' | 'SYNC_PROFILE_TO_LEDGER' | 'INVESTIGATE_UNLINKED_CREDIT';
  entriesAudited: Array<{
    id: string;
    type: string;
    amount: number;
    date: string;
  }>;
  generatedAt: string;
}

/**
 * Calculates the authoritative wallet balance from an array of ledger entries.
 * Rounds to 2 decimal places to avoid floating point imprecision.
 */
export function calculateLedgerBalance(
  entries: WalletLedgerEntry[] | null | undefined
): number {
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  const rawSum = entries.reduce((acc, curr) => {
    const amt =
      typeof curr.amount === 'number'
        ? curr.amount
        : parseFloat(String(curr.amount)) || 0;

    if (curr.type === 'credit' || curr.type === 'cashback') {
      return acc + amt;
    }
    if (curr.type === 'debit') {
      return acc - amt;
    }
    return acc;
  }, 0);

  // Precision rounding to 2 decimal places (subject to balance >= 0)
  return Math.max(0, Math.round((rawSum + Number.EPSILON) * 100) / 100);
}

/**
 * Reconciles a cached profile balance against authoritative ledger entries.
 * Flags any discrepancy without silently altering state.
 */
export function reconcileWalletState(
  cachedBalance: number | string | null | undefined,
  entries: WalletLedgerEntry[] | null | undefined
): WalletReconciliationResult {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeCached =
    Math.round(
      ((typeof cachedBalance === 'number'
        ? cachedBalance
        : parseFloat(String(cachedBalance))) || 0) * 100
    ) / 100;

  const authoritative = calculateLedgerBalance(safeEntries);
  const diff = Math.round((safeCached - authoritative) * 100) / 100;
  const hasDiscrepancy = Math.abs(diff) >= 0.01;

  let status: WalletReconciliationStatus = 'RECONCILED';
  let explanation = 'Wallet balance matches all verified ledger transactions.';

  if (safeEntries.length === 0 && safeCached === 0) {
    status = 'NO_TRANSACTIONS';
    explanation = 'No ledger transactions recorded; wallet balance is zero.';
  } else if (hasDiscrepancy) {
    if (diff < 0) {
      status = 'LEDGER_AHEAD';
      explanation = `Ledger transactions total ₹${authoritative.toFixed(
        2
      )}, which exceeds the account cache of ₹${safeCached.toFixed(
        2
      )} by ₹${Math.abs(diff).toFixed(2)}.`;
    } else {
      status = 'CACHE_AHEAD';
      explanation = `Account cache of ₹${safeCached.toFixed(
        2
      )} exceeds verified ledger transactions of ₹${authoritative.toFixed(
        2
      )} by ₹${diff.toFixed(2)}.`;
    }
  }

  // Calculate detailed breakdown
  let totalCredits = 0;
  let creditsCount = 0;
  let totalDebits = 0;
  let debitsCount = 0;
  let totalCashback = 0;
  let cashbackCount = 0;

  for (const e of safeEntries) {
    const amt =
      typeof e.amount === 'number'
        ? e.amount
        : parseFloat(String(e.amount)) || 0;

    if (e.type === 'credit') {
      totalCredits += amt;
      creditsCount++;
    } else if (e.type === 'debit') {
      totalDebits += amt;
      debitsCount++;
    } else if (e.type === 'cashback') {
      totalCashback += amt;
      cashbackCount++;
    }
  }

  return {
    isReconciled: !hasDiscrepancy,
    status,
    authoritativeBalance: authoritative,
    cachedBalance: safeCached,
    discrepancy: diff,
    hasDiscrepancy,
    transactionCount: safeEntries.length,
    breakdown: {
      totalCredits: Math.round(totalCredits * 100) / 100,
      creditsCount,
      totalDebits: Math.round(totalDebits * 100) / 100,
      debitsCount,
      totalCashback: Math.round(totalCashback * 100) / 100,
      cashbackCount,
    },
    explanation,
    reconciledAt: new Date().toISOString(),
  };
}

/**
 * Generates an auditable, human-verifiable reconciliation report for an account.
 * Follows statutory compliance rules: does not perform destructive writes.
 */
export function generateWalletReconciliationReport(
  user: { id: string; email?: string | null },
  cachedBalance: number | string | null | undefined,
  entries: WalletLedgerEntry[] | null | undefined
): WalletAuditReport {
  const reconciliation = reconcileWalletState(cachedBalance, entries);
  const safeEntries = Array.isArray(entries) ? entries : [];

  let recommendedAction: WalletAuditReport['recommendedAction'] = 'NONE';
  if (reconciliation.hasDiscrepancy) {
    if (reconciliation.status === 'LEDGER_AHEAD') {
      recommendedAction = 'SYNC_PROFILE_TO_LEDGER';
    } else {
      recommendedAction = 'INVESTIGATE_UNLINKED_CREDIT';
    }
  }

  return {
    reportId: `WREC_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    userId: user.id,
    userEmail: user.email || null,
    reconciliation,
    requiresManualReview: reconciliation.hasDiscrepancy,
    recommendedAction,
    entriesAudited: safeEntries.map((e) => ({
      id: e.id,
      type: e.type,
      amount:
        typeof e.amount === 'number'
          ? e.amount
          : parseFloat(String(e.amount)) || 0,
      date: e.created_at,
    })),
    generatedAt: new Date().toISOString(),
  };
}
