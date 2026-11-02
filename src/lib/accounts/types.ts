import type { InvoiceItem } from './gst-engine';

export type AccountsInvoiceType =
  'tax_invoice' | 'proforma' | 'quotation' | 'credit_note' | 'debit_note';

export type AccountsPaymentStatus =
  'unpaid' | 'partially_paid' | 'paid' | 'refunded' | 'cancelled';

export interface AccountsInvoiceRecord {
  id: string;
  invoice_number: string;
  invoice_type: AccountsInvoiceType;
  invoice_date: string;
  due_date?: string | null;
  customer_name: string;
  customer_email?: string | null;
  customer_phone?: string | null;
  customer_gstin?: string | null;
  customer_address?: string | null;
  place_of_supply: string;
  is_inter_state: boolean;
  items: InvoiceItem[];
  taxable_value: number;
  cgst_amount: number;
  sgst_amount: number;
  igst_amount: number;
  total_amount: number;
  payment_status: AccountsPaymentStatus;
  payment_method?: string | null;
  order_id?: string | null;
  notes?: string | null;
  terms?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type PurchaseCategory =
  | 'Bullion (Gold/Silver)'
  | 'Gemstones'
  | 'Making & Jobwork'
  | 'Hallmarking'
  | 'Packaging'
  | 'Tools & Machinery'
  | 'Office & Utilities'
  | 'Other';

export interface AccountsPurchaseRecord {
  id: string;
  bill_number: string;
  bill_date: string;
  vendor_name: string;
  vendor_gstin?: string | null;
  category: PurchaseCategory;
  item_description: string;
  hsn_code?: string | null;
  quantity?: number | null;
  unit?: string | null;
  taxable_value: number;
  gst_rate: number;
  cgst_input: number;
  sgst_input: number;
  igst_input: number;
  total_amount: number;
  itc_eligible: boolean;
  payment_status: 'unpaid' | 'partially_paid' | 'paid';
  payment_method?: string | null;
  ocr_source?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type VoucherType = 'receipt' | 'payment' | 'journal' | 'contra';

export type PaymentMode =
  'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'card' | 'journal_adjustment';

export interface AccountsVoucherRecord {
  id: string;
  voucher_number: string;
  voucher_type: VoucherType;
  voucher_date: string;
  description: string;
  amount: number;
  debit_account: string;
  credit_account: string;
  payment_mode: PaymentMode;
  reference_number?: string | null;
  related_invoice_id?: string | null;
  related_purchase_id?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export type AccountType =
  | 'income'
  | 'expense'
  | 'asset'
  | 'liability'
  | 'equity'
  | 'tax_output'
  | 'tax_input';

export interface AccountsLedgerRecord {
  id: string;
  ledger_date: string;
  account_name: string;
  account_type: AccountType;
  debit: number;
  credit: number;
  balance: number;
  voucher_id?: string | null;
  narration?: string | null;
  created_at?: string;
}

// ── Financial Intelligence & Compliance Types ──

export interface ItcBreakdown {
  period: string; // e.g. "112026"
  totalPurchases: number;
  taxablePurchases: number;
  cgstInputAvailable: number;
  sgstInputAvailable: number;
  igstInputAvailable: number;
  totalItcAvailable: number;
  blockedCreditAmount: number;
  eligibleBillsCount: number;
  ineligibleBillsCount: number;
}

export interface Gstr3bSummary {
  period: string;
  outwardSupplies: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    cess: number;
  };
  itcAvailable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  netTaxPayable: {
    cgst: number;
    sgst: number;
    igst: number;
    total: number;
  };
  interestPayable: number;
  filingDueDate: string;
  isOverdue: boolean;
}

export interface SkuCogsBreakdown {
  sku: string;
  metalPurity: '22K' | '18K' | '14K' | '925 Silver';
  grossWeightGrams: number;
  netWeightGrams: number;
  liveGoldRatePerGram: number;
  metalCost: number;
  makingCharges: number;
  makingChargesPercentage: number;
  hallmarkingCost: number;
  packagingCost: number;
  totalCogs: number;
  targetSellingPrice: number;
  grossMarginAmount: number;
  grossMarginPercentage: number;
}

export interface IncomeTaxAdvisoryResult {
  financialYear: string; // e.g. "2026-27"
  assessmentYear: string; // e.g. "2027-28"
  estimatedAnnualGrossTurnover: number;
  section44AbAuditApplicable: boolean; // turnover > 1 Crore (or 10 Crore if 95% digital)
  digitalTurnoverPercentage: number;
  tcsSection206cApplicable: boolean; // cash receipt > 5 Lakhs or total turnover > 10 Cr + sale > 50L
  advanceTaxInstallments: {
    quarter: string;
    dueDate: string;
    cumulativePercentageDue: number;
    estimatedAmountDue: number;
    status: 'upcoming' | 'due' | 'overdue';
  }[];
  recommendations: string[];
}
