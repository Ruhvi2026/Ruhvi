import { getServiceClient } from '@/lib/supabase/service';
import type {
  AccountsPurchaseRecord,
  ItcBreakdown,
  PurchaseCategory,
} from './types';
import { RUHVI_GST_CONFIG } from './gst-engine';

/**
 * Checks if a purchase category or item qualifies for blocked credit
 * under Section 17(5) of the Indian CGST Act 2017.
 */
export function isItcBlocked(
  category: PurchaseCategory,
  description: string = ''
): boolean {
  const desc = description.toLowerCase();

  // Section 17(5) statutory blocked items
  if (
    desc.includes('food') ||
    desc.includes('catering') ||
    desc.includes('beverage') ||
    desc.includes('personal') ||
    desc.includes('gift') ||
    desc.includes('health club') ||
    desc.includes('cab') ||
    desc.includes('motor vehicle') ||
    desc.includes('guest house')
  ) {
    return true;
  }

  // Core jewelry production & business categories are fully eligible
  switch (category) {
    case 'Bullion (Gold/Silver)':
    case 'Gemstones':
    case 'Making & Jobwork':
    case 'Hallmarking':
    case 'Packaging':
    case 'Tools & Machinery':
      return false;

    case 'Office & Utilities':
      // Utilities are eligible unless personal
      return false;

    case 'Other':
      return desc.includes('personal') || desc.includes('entertainment');

    default:
      return false;
  }
}

/**
 * Computes the aggregated ITC breakdown from a list of purchase records
 */
export function computeItcBreakdown(
  purchases: AccountsPurchaseRecord[],
  period: string
): ItcBreakdown {
  let totalPurchases = 0;
  let taxablePurchases = 0;
  let cgstInputAvailable = 0;
  let sgstInputAvailable = 0;
  let igstInputAvailable = 0;
  let blockedCreditAmount = 0;
  let eligibleBillsCount = 0;
  let ineligibleBillsCount = 0;

  for (const bill of purchases) {
    const gross = Number(bill.total_amount) || 0;
    const taxable = Number(bill.taxable_value) || 0;
    const cgst = Number(bill.cgst_input) || 0;
    const sgst = Number(bill.sgst_input) || 0;
    const igst = Number(bill.igst_input) || 0;
    const taxSum = cgst + sgst + igst;

    totalPurchases += gross;
    taxablePurchases += taxable;

    const blocked =
      !bill.itc_eligible || isItcBlocked(bill.category, bill.item_description);

    if (blocked) {
      blockedCreditAmount += taxSum;
      ineligibleBillsCount++;
    } else {
      cgstInputAvailable += cgst;
      sgstInputAvailable += sgst;
      igstInputAvailable += igst;
      eligibleBillsCount++;
    }
  }

  return {
    period,
    totalPurchases: Math.round(totalPurchases * 100) / 100,
    taxablePurchases: Math.round(taxablePurchases * 100) / 100,
    cgstInputAvailable: Math.round(cgstInputAvailable * 100) / 100,
    sgstInputAvailable: Math.round(sgstInputAvailable * 100) / 100,
    igstInputAvailable: Math.round(igstInputAvailable * 100) / 100,
    totalItcAvailable:
      Math.round(
        (cgstInputAvailable + sgstInputAvailable + igstInputAvailable) * 100
      ) / 100,
    blockedCreditAmount: Math.round(blockedCreditAmount * 100) / 100,
    eligibleBillsCount,
    ineligibleBillsCount,
  };
}

/**
 * Parses a standard GST period string (e.g. "112026" or "2026-11") into ISO dates
 */
export function parseGstPeriodToDates(period: string): {
  start: string;
  end: string;
} {
  let year: number;
  let month: number;

  if (period.includes('-')) {
    const [y, m] = period.split('-');
    year = parseInt(y, 10);
    month = parseInt(m, 10);
  } else if (period.length === 6) {
    month = parseInt(period.slice(0, 2), 10);
    year = parseInt(period.slice(2), 10);
  } else {
    const now = new Date();
    year = now.getFullYear();
    month = now.getMonth() + 1;
  }

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  return {
    start: startDate.toISOString().split('T')[0],
    end: endDate.toISOString().split('T')[0],
  };
}

/**
 * Fetches purchase bills from Supabase for a given GST month
 */
export async function fetchMonthlyPurchases(
  period: string
): Promise<AccountsPurchaseRecord[]> {
  try {
    const { start, end } = parseGstPeriodToDates(period);
    const supabase = getServiceClient();

    const { data, error } = await supabase
      .from('accounts_purchases')
      .select('*')
      .gte('bill_date', start)
      .lte('bill_date', end)
      .order('bill_date', { ascending: true });

    if (error) {
      console.warn('accounts_purchases query warning:', error.message);
      return [];
    }

    return (data as AccountsPurchaseRecord[]) || [];
  } catch (err) {
    console.warn('Error fetching monthly purchases:', err);
    return [];
  }
}

/**
 * Inserts or updates a vendor purchase bill with auto-evaluated ITC eligibility
 */
export async function recordPurchaseBill(
  billInput: Omit<AccountsPurchaseRecord, 'id' | 'created_at' | 'updated_at'>
): Promise<AccountsPurchaseRecord> {
  const supabase = getServiceClient();

  const isBlocked = isItcBlocked(
    billInput.category,
    billInput.item_description
  );
  const itcEligible = billInput.itc_eligible && !isBlocked;

  const payload = {
    ...billInput,
    itc_eligible: itcEligible,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('accounts_purchases')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to record purchase bill: ${error.message}`);
  }

  return data as AccountsPurchaseRecord;
}
