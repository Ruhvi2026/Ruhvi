import { getServiceClient } from '@/lib/supabase/service';
import {
  computeItcBreakdown,
  fetchMonthlyPurchases,
  parseGstPeriodToDates,
} from './itc-engine';
import type { Gstr3bSummary, AccountsInvoiceRecord } from './types';
import { RUHVI_GST_CONFIG } from './gst-engine';

export interface OutwardSupplySummary {
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalGross: number;
  intraStateCount: number;
  interStateCount: number;
}

/**
 * Calculates GSTR-3B filing due date for a given period (20th of next month)
 */
export function getGstr3bDueDate(period: string): {
  dueDateStr: string;
  isOverdue: boolean;
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

  // Next month
  let nextMonth = month + 1;
  let nextYear = year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }

  const due = new Date(Date.UTC(nextYear, nextMonth - 1, 20, 23, 59, 59));
  const now = new Date();

  return {
    dueDateStr: `${nextYear}-${String(nextMonth).padStart(2, '0')}-20`,
    isOverdue: now > due,
  };
}

/**
 * Aggregates outward supplies from orders and accounts_invoices
 */
export function aggregateOutwardSupplies(
  orders: any[],
  customInvoices: AccountsInvoiceRecord[] = []
): OutwardSupplySummary {
  let taxableValue = 0;
  let cgst = 0;
  let sgst = 0;
  let igst = 0;
  let totalGross = 0;
  let intraStateCount = 0;
  let interStateCount = 0;

  // Process store orders
  for (const ord of orders) {
    const gross = Number(ord.total) || 0;
    // Standard Indian Jewelry GST is 3% inclusive
    const taxable = Math.round((gross / 1.03) * 100) / 100;
    const tax = Math.round((gross - taxable) * 100) / 100;

    const state = ord.shipping_address?.state || 'West Bengal';
    const isInter = state.toLowerCase() !== 'west bengal';

    totalGross += gross;
    taxableValue += taxable;

    if (isInter) {
      igst += tax;
      interStateCount++;
    } else {
      const half = Math.round((tax / 2) * 100) / 100;
      cgst += half;
      sgst += tax - half;
      intraStateCount++;
    }
  }

  // Process custom accounts invoices (e.g. offline walk-ins, B2B)
  for (const inv of customInvoices) {
    totalGross += Number(inv.total_amount) || 0;
    taxableValue += Number(inv.taxable_value) || 0;
    cgst += Number(inv.cgst_amount) || 0;
    sgst += Number(inv.sgst_amount) || 0;
    igst += Number(inv.igst_amount) || 0;

    if (inv.is_inter_state) {
      interStateCount++;
    } else {
      intraStateCount++;
    }
  }

  return {
    taxableValue: Math.round(taxableValue * 100) / 100,
    cgst: Math.round(cgst * 100) / 100,
    sgst: Math.round(sgst * 100) / 100,
    igst: Math.round(igst * 100) / 100,
    totalGross: Math.round(totalGross * 100) / 100,
    intraStateCount,
    interStateCount,
  };
}

/**
 * Computes the complete GSTR-3B summary for a given tax period
 */
export async function computeGstr3bSummary(
  period: string
): Promise<Gstr3bSummary> {
  const { start, end } = parseGstPeriodToDates(period);
  const supabase = getServiceClient();

  // 1. Fetch live orders in timeframe
  let orders: any[] = [];
  try {
    const { data: ordData } = await supabase
      .from('orders')
      .select('*, shipping_address:addresses(*)')
      .gte('created_at', start)
      .lte('created_at', end);
    orders = ordData || [];
  } catch (err) {
    console.warn('Orders query warning for GSTR-3B:', err);
  }

  // 2. Fetch custom invoices
  let customInvoices: AccountsInvoiceRecord[] = [];
  try {
    const { data: invData } = await supabase
      .from('accounts_invoices')
      .select('*')
      .gte('invoice_date', start)
      .lte('invoice_date', end)
      .eq('invoice_type', 'tax_invoice');
    customInvoices = (invData as AccountsInvoiceRecord[]) || [];
  } catch (err) {
    console.warn('Accounts invoices query warning for GSTR-3B:', err);
  }

  // 3. Outward summary
  const outward = aggregateOutwardSupplies(orders, customInvoices);

  // 4. Fetch inward purchases and compute ITC
  const purchases = await fetchMonthlyPurchases(period);
  const itc = computeItcBreakdown(purchases, period);

  // 5. Net Tax calculations (liability offset by ITC)
  const netCgst = Math.max(
    0,
    Math.round((outward.cgst - itc.cgstInputAvailable) * 100) / 100
  );
  const netSgst = Math.max(
    0,
    Math.round((outward.sgst - itc.sgstInputAvailable) * 100) / 100
  );
  const netIgst = Math.max(
    0,
    Math.round((outward.igst - itc.igstInputAvailable) * 100) / 100
  );
  const totalNet = Math.round((netCgst + netSgst + netIgst) * 100) / 100;

  // 6. Due date and interest calculation
  const { dueDateStr, isOverdue } = getGstr3bDueDate(period);
  let interestPayable = 0;
  if (isOverdue && totalNet > 0) {
    // 18% annual interest on net tax payable
    const now = new Date();
    const dueDate = new Date(dueDateStr);
    const diffDays = Math.max(
      1,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );
    interestPayable =
      Math.round(((totalNet * 0.18 * diffDays) / 365) * 100) / 100;
  }

  return {
    period,
    outwardSupplies: {
      taxableValue: outward.taxableValue,
      cgst: outward.cgst,
      sgst: outward.sgst,
      igst: outward.igst,
      cess: 0,
    },
    itcAvailable: {
      cgst: itc.cgstInputAvailable,
      sgst: itc.sgstInputAvailable,
      igst: itc.igstInputAvailable,
      total: itc.totalItcAvailable,
    },
    netTaxPayable: {
      cgst: netCgst,
      sgst: netSgst,
      igst: netIgst,
      total: totalNet,
    },
    interestPayable,
    filingDueDate: dueDateStr,
    isOverdue,
  };
}
