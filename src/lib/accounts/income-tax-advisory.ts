import { getServiceClient } from '@/lib/supabase/service';
import type { IncomeTaxAdvisoryResult } from './types';

/**
 * Computes the Indian Income Tax advance tax schedule for a given estimated tax liability
 */
export function calculateAdvanceTaxSchedule(
  estimatedTax: number,
  fy: string = '2026-27'
): IncomeTaxAdvisoryResult['advanceTaxInstallments'] {
  const currentYear = parseInt(fy.split('-')[0], 10);
  const nextYear = currentYear + 1;
  const now = new Date();

  const deadlines = [
    {
      quarter: 'Q1 (15%)',
      dueDate: `${currentYear}-06-15`,
      percentage: 15,
      amount: Math.round(estimatedTax * 0.15),
    },
    {
      quarter: 'Q2 (45%)',
      dueDate: `${currentYear}-09-15`,
      percentage: 45,
      amount: Math.round(estimatedTax * 0.45),
    },
    {
      quarter: 'Q3 (75%)',
      dueDate: `${currentYear}-12-15`,
      percentage: 75,
      amount: Math.round(estimatedTax * 0.75),
    },
    {
      quarter: 'Q4 (100%)',
      dueDate: `${nextYear}-03-15`,
      percentage: 100,
      amount: Math.round(estimatedTax * 1.0),
    },
  ];

  return deadlines.map((d) => {
    const dueTime = new Date(d.dueDate).getTime();
    const isOverdue = now.getTime() > dueTime;
    const diffDays = (dueTime - now.getTime()) / (1000 * 60 * 60 * 24);
    const isDue = !isOverdue && diffDays <= 15;

    return {
      quarter: d.quarter,
      dueDate: d.dueDate,
      cumulativePercentageDue: d.percentage,
      estimatedAmountDue: d.amount,
      status: isOverdue ? 'overdue' : isDue ? 'due' : 'upcoming',
    };
  });
}

/**
 * Checks Section 44AB tax audit threshold based on turnover and digital payment mix.
 * Normal limit: ₹1 Crore.
 * Relaxed limit (if digital >= 95%): ₹10 Crore.
 */
export function checkSection44AbAudit(
  grossTurnover: number,
  digitalTurnoverPercentage: number
): { isAuditApplicable: boolean; thresholdUsed: number; reason: string } {
  const isHighDigital = digitalTurnoverPercentage >= 95;
  const threshold = isHighDigital ? 100000000 : 10000000; // 10 Cr vs 1 Cr

  const isAuditApplicable = grossTurnover > threshold;

  const reason = isAuditApplicable
    ? `Turnover of ₹${grossTurnover.toLocaleString('en-IN')} exceeds the ${
        isHighDigital
          ? 'digital-relaxed threshold of ₹10 Crore'
          : 'prescribed limit of ₹1 Crore'
      }. Mandatory Tax Audit under Section 44AB applies.`
    : `Turnover of ₹${grossTurnover.toLocaleString('en-IN')} is within the ${
        isHighDigital
          ? 'digital-relaxed threshold of ₹10 Crore (digital: ' +
            digitalTurnoverPercentage +
            '%)'
          : 'limit of ₹1 Crore'
      }. Statutory Tax Audit is not mandatory.`;

  return { isAuditApplicable, thresholdUsed: threshold, reason };
}

/**
 * Evaluates Indian Income Tax and TCS obligations from annual store telemetry
 */
export async function getIncomeTaxAdvisory(
  fy: string = '2026-27'
): Promise<IncomeTaxAdvisoryResult> {
  const currentYear = parseInt(fy.split('-')[0], 10);
  const nextYear = currentYear + 1;
  const assessmentYear = `${nextYear}-${(nextYear + 1).toString().slice(2)}`;

  const startDate = `${currentYear}-04-01`;
  const endDate = `${nextYear}-03-31`;

  const supabase = getServiceClient();

  // 1. Fetch orders in the financial year
  let totalGross = 0;
  let digitalGross = 0;
  let cashSalesAbove5Lakhs = false;

  try {
    const { data: orders } = await supabase
      .from('orders')
      .select('total, payment_method, created_at')
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    if (orders && orders.length > 0) {
      for (const ord of orders) {
        const val = Number(ord.total) || 0;
        totalGross += val;
        const method = (ord.payment_method || '').toLowerCase();
        if (method !== 'cash' && method !== 'cod') {
          digitalGross += val;
        } else if (val > 500000) {
          cashSalesAbove5Lakhs = true;
        }
      }
    }
  } catch (err) {
    console.warn('Orders query warning for Income Tax Advisory:', err);
  }

  const digitalTurnoverPercentage =
    totalGross > 0 ? Math.round((digitalGross / totalGross) * 1000) / 10 : 98.5; // fallback default to 98.5% digital for online jewelry

  // 2. Audit check
  const auditResult = checkSection44AbAudit(
    totalGross,
    digitalTurnoverPercentage
  );

  // 3. Estimated net taxable profit (~15% net margin for fine jewelry retail)
  const estimatedNetProfit = Math.round(totalGross * 0.15);
  // Corporate tax rate (~25% + cess = 26% for domestic companies)
  const estimatedTaxLiability = Math.round(estimatedNetProfit * 0.26);

  // 4. Advance Tax schedule
  const advanceTaxSchedule = calculateAdvanceTaxSchedule(
    estimatedTaxLiability,
    fy
  );

  // 5. Build recommendations
  const recommendations: string[] = [];

  recommendations.push(auditResult.reason);

  if (cashSalesAbove5Lakhs) {
    recommendations.push(
      'ALERT: Detected cash receipt exceeding ₹5,00,000 for high-value jewelry. Ensure 1% TCS Section 206C collection and Form 27EQ filing.'
    );
  }

  const overdueInstallment = advanceTaxSchedule.find(
    (s) => s.status === 'overdue'
  );
  const upcomingInstallment = advanceTaxSchedule.find(
    (s) => s.status === 'due'
  );

  if (overdueInstallment) {
    recommendations.push(
      `URGENT: ${overdueInstallment.quarter} Advance Tax deadline passed on ${overdueInstallment.dueDate}. Pay immediately to prevent Section 234B/C interest penalties.`
    );
  } else if (upcomingInstallment) {
    recommendations.push(
      `Upcoming: ${upcomingInstallment.quarter} Advance Tax installment due by ${upcomingInstallment.dueDate} (Estimated: ₹${upcomingInstallment.estimatedAmountDue.toLocaleString('en-IN')}).`
    );
  }

  return {
    financialYear: fy,
    assessmentYear,
    estimatedAnnualGrossTurnover: totalGross,
    section44AbAuditApplicable: auditResult.isAuditApplicable,
    digitalTurnoverPercentage,
    tcsSection206cApplicable: cashSalesAbove5Lakhs || totalGross > 100000000,
    advanceTaxInstallments: advanceTaxSchedule,
    recommendations,
  };
}
