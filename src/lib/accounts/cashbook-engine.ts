import { getServiceClient } from '@/lib/supabase/service';
import type {
  AccountsVoucherRecord,
  AccountsLedgerRecord,
  AccountType,
  VoucherType,
  PaymentMode,
} from './types';

export interface VoucherInput {
  voucher_number?: string;
  voucher_type: VoucherType;
  voucher_date: string;
  description: string;
  amount: number;
  debit_account: string;
  credit_account: string;
  payment_mode: PaymentMode;
  reference_number?: string;
  related_invoice_id?: string;
  related_purchase_id?: string;
  created_by?: string;
}

export interface DayBookSummary {
  date: string;
  totalReceipts: number;
  totalPayments: number;
  netCashFlow: number;
  vouchers: AccountsVoucherRecord[];
}

export interface TrialBalanceItem {
  accountName: string;
  accountType: AccountType;
  totalDebit: number;
  totalCredit: number;
  netDebit: number;
  netCredit: number;
}

/**
 * Standard classification for chart of accounts
 */
export function classifyAccountType(accountName: string): AccountType {
  const name = accountName.toLowerCase();

  // Taxes
  if (name.includes('output') && name.includes('gst')) {
    return 'tax_output';
  }
  if (name.includes('input') && name.includes('gst')) {
    return 'tax_input';
  }

  // Cash / Bank / Assets
  if (
    name.includes('cash') ||
    name.includes('bank') ||
    name.includes('hdfc') ||
    name.includes('receivable') ||
    name.includes('inventory') ||
    name.includes('asset')
  ) {
    return 'asset';
  }

  // Liabilities
  if (
    name.includes('payable') ||
    name.includes('loan') ||
    name.includes('creditor') ||
    name.includes('liability')
  ) {
    return 'liability';
  }

  // Income
  if (
    name.includes('sales') ||
    name.includes('revenue') ||
    name.includes('income')
  ) {
    return 'income';
  }

  // Expenses (using word boundaries for short words like 'rent')
  if (
    name.includes('purchase') ||
    name.includes('making') ||
    name.includes('packaging') ||
    name.includes('expense') ||
    name.includes('logistics') ||
    name.includes('salary') ||
    /\brent\b/.test(name) ||
    name.includes('marketing')
  ) {
    return 'expense';
  }

  if (
    name.includes('capital') ||
    name.includes('equity') ||
    name.includes('retained')
  ) {
    return 'equity';
  }

  return 'asset';
}

/**
 * Creates double-entry ledger rows from a validated voucher input.
 * Strictly verifies that Debit Amount === Credit Amount.
 */
export function generateDoubleEntryPairs(
  voucher: AccountsVoucherRecord
): Omit<AccountsLedgerRecord, 'id' | 'created_at'>[] {
  const amount = Number(voucher.amount) || 0;
  if (amount <= 0) {
    throw new Error('Voucher amount must be strictly greater than zero.');
  }

  const debitAccountType = classifyAccountType(voucher.debit_account);
  const creditAccountType = classifyAccountType(voucher.credit_account);

  // Debit Leg
  const debitEntry: Omit<AccountsLedgerRecord, 'id' | 'created_at'> = {
    ledger_date: voucher.voucher_date,
    account_name: voucher.debit_account,
    account_type: debitAccountType,
    debit: amount,
    credit: 0,
    balance: amount, // will be reconciled on ledger aggregation
    voucher_id: voucher.id,
    narration: `[${voucher.voucher_type.toUpperCase()} / ${voucher.voucher_number}] ${voucher.description}`,
  };

  // Credit Leg
  const creditEntry: Omit<AccountsLedgerRecord, 'id' | 'created_at'> = {
    ledger_date: voucher.voucher_date,
    account_name: voucher.credit_account,
    account_type: creditAccountType,
    debit: 0,
    credit: amount,
    balance: amount,
    voucher_id: voucher.id,
    narration: `[${voucher.voucher_type.toUpperCase()} / ${voucher.voucher_number}] ${voucher.description}`,
  };

  return [debitEntry, creditEntry];
}

/**
 * Generates an auto-incrementing sequential voucher code
 */
export function generateVoucherCode(
  type: VoucherType,
  sequenceNumber: number
): string {
  const prefixMap: Record<VoucherType, string> = {
    receipt: 'RV',
    payment: 'PV',
    journal: 'JV',
    contra: 'CV',
  };
  const year = new Date().getFullYear();
  return `${prefixMap[type]}-${year}-${String(sequenceNumber).padStart(4, '0')}`;
}

/**
 * Records a voucher and writes the corresponding double-entry ledger entries into database
 */
export async function recordVoucherWithLedger(
  input: VoucherInput
): Promise<{
  voucher: AccountsVoucherRecord;
  ledgerEntries: AccountsLedgerRecord[];
}> {
  const supabase = getServiceClient();

  // 1. Generate voucher code if not provided
  let voucherNumber = input.voucher_number;
  if (!voucherNumber) {
    const { count } = await supabase
      .from('accounts_vouchers')
      .select('id', { count: 'exact', head: true });
    voucherNumber = generateVoucherCode(input.voucher_type, (count || 0) + 1);
  }

  // 2. Insert voucher record
  const { data: voucherData, error: voucherErr } = await supabase
    .from('accounts_vouchers')
    .insert({
      voucher_number: voucherNumber,
      voucher_type: input.voucher_type,
      voucher_date: input.voucher_date,
      description: input.description,
      amount: input.amount,
      debit_account: input.debit_account,
      credit_account: input.credit_account,
      payment_mode: input.payment_mode,
      reference_number: input.reference_number || null,
      related_invoice_id: input.related_invoice_id || null,
      related_purchase_id: input.related_purchase_id || null,
      created_by: input.created_by || 'system',
    })
    .select()
    .single();

  if (voucherErr) {
    throw new Error(`Failed to save voucher: ${voucherErr.message}`);
  }

  const savedVoucher = voucherData as AccountsVoucherRecord;

  // 3. Generate double-entry pairs
  const ledgerPairs = generateDoubleEntryPairs(savedVoucher);

  // 4. Insert double-entry ledger lines
  const { data: ledgerData, error: ledgerErr } = await supabase
    .from('accounts_ledger')
    .insert(ledgerPairs)
    .select();

  if (ledgerErr) {
    console.error('Failed to create ledger entries for voucher:', ledgerErr);
    throw new Error(
      `Voucher created but ledger posting failed: ${ledgerErr.message}`
    );
  }

  return {
    voucher: savedVoucher,
    ledgerEntries: (ledgerData as AccountsLedgerRecord[]) || [],
  };
}

/**
 * Generates Day Book report for a given date
 */
export async function getDayBook(dateStr: string): Promise<DayBookSummary> {
  const supabase = getServiceClient();

  const { data, error } = await supabase
    .from('accounts_vouchers')
    .select('*')
    .eq('voucher_date', dateStr)
    .order('created_at', { ascending: true });

  const vouchers: AccountsVoucherRecord[] =
    !error && data ? (data as AccountsVoucherRecord[]) : [];

  let totalReceipts = 0;
  let totalPayments = 0;

  for (const v of vouchers) {
    const amt = Number(v.amount) || 0;
    if (v.voucher_type === 'receipt') {
      totalReceipts += amt;
    } else if (v.voucher_type === 'payment') {
      totalPayments += amt;
    }
  }

  return {
    date: dateStr,
    totalReceipts: Math.round(totalReceipts * 100) / 100,
    totalPayments: Math.round(totalPayments * 100) / 100,
    netCashFlow: Math.round((totalReceipts - totalPayments) * 100) / 100,
    vouchers,
  };
}

/**
 * Computes Trial Balance from all ledger entries
 */
export function computeTrialBalance(entries: AccountsLedgerRecord[]): {
  items: TrialBalanceItem[];
  totalDebitSum: number;
  totalCreditSum: number;
  isBalanced: boolean;
} {
  const accountMap = new Map<
    string,
    { type: AccountType; debit: number; credit: number }
  >();

  for (const e of entries) {
    const acc = e.account_name;
    const current = accountMap.get(acc) || {
      type: e.account_type,
      debit: 0,
      credit: 0,
    };
    current.debit += Number(e.debit) || 0;
    current.credit += Number(e.credit) || 0;
    accountMap.set(acc, current);
  }

  let totalDebitSum = 0;
  let totalCreditSum = 0;
  const items: TrialBalanceItem[] = [];

  for (const [accountName, vals] of accountMap.entries()) {
    const d = Math.round(vals.debit * 100) / 100;
    const c = Math.round(vals.credit * 100) / 100;
    totalDebitSum += d;
    totalCreditSum += c;

    items.push({
      accountName,
      accountType: vals.type,
      totalDebit: d,
      totalCredit: c,
      netDebit: d > c ? Math.round((d - c) * 100) / 100 : 0,
      netCredit: c > d ? Math.round((c - d) * 100) / 100 : 0,
    });
  }

  totalDebitSum = Math.round(totalDebitSum * 100) / 100;
  totalCreditSum = Math.round(totalCreditSum * 100) / 100;

  return {
    items,
    totalDebitSum,
    totalCreditSum,
    isBalanced: Math.abs(totalDebitSum - totalCreditSum) < 0.01,
  };
}
