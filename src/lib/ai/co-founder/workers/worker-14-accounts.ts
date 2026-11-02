import 'server-only';

import {
  AIWorkerInterface,
  WorkerDefinition,
  WorkerId,
  WorkerPriority,
  WorkerStructuredOutput,
  WorkerTaskInput,
} from './types';
import { computeGstr3bSummary } from '@/lib/accounts/gstr3b-engine';
import {
  computeItcBreakdown,
  fetchMonthlyPurchases,
} from '@/lib/accounts/itc-engine';
import { getIncomeTaxAdvisory } from '@/lib/accounts/income-tax-advisory';
import { getDayBook } from '@/lib/accounts/cashbook-engine';
import { computeSkuCogs } from '@/lib/accounts/manufacturing-costing';

export class AccountsTaxWorker implements AIWorkerInterface {
  readonly id: WorkerId = 'worker_accounts_tax';
  readonly name = 'Accounts & Tax Compliance Worker';
  readonly priority: WorkerPriority = 'HIGH';

  getDefinition(): WorkerDefinition {
    return {
      id: this.id,
      name: this.name,
      role: 'Chief Accounts Officer & GST Compliance Manager',
      objective:
        'Continuous audit and execution of Indian GST Rule 46 invoicing, GSTR-1 & GSTR-3B filings, Input Tax Credit (ITC) reconciliation under Section 17(5), double-entry cash book ledgering, and Income Tax Section 44AB/206C compliance.',
      priority: this.priority,
      responsibilities: [
        'Real-time GST output liability tracking (Intra-state 1.5% CGST+1.5% SGST vs Inter-state 3% IGST for HSN 7113 Jewelry)',
        'Input Tax Credit (ITC) ledger computation from vendor bullion, jobwork, and packaging bills',
        'Section 17(5) blocked credit detection and statutory audit warnings',
        'GSTR-3B monthly return synthesis (Output Tax minus Available ITC = Net Tax Payable)',
        'Double-entry cash book, day-book, and voucher management (Receipt, Payment, Journal, Contra)',
        'Jewelry manufacturing COGS estimation (Metal base rate × purity factor + making charges + hallmarking + packaging)',
        'Income Tax Section 44AB audit threshold monitoring and Section 206C TCS high-value cash tracking',
        'Strict human-in-the-loop approval gating for any financial writes, bill adjustments, or voucher executions',
      ],
      requiredSkills: [
        'Indian GST Law & Rule 46 Tax Invoicing',
        'HSN 7113 Jewelry Tax Computation (3% GST)',
        'GSTR-1, GSTR-2B & GSTR-3B Return Synthesis',
        'Input Tax Credit (ITC) Section 17(5) Evaluation',
        'Double-Entry Bookkeeping & Trial Balance Equilibrium',
        'Jewelry Manufacturing COGS & Gross Margin Modeling',
        'Income Tax Section 44AB & Advance Tax Planning',
      ],
      requiredTools: [
        'compute_gstr3b_summary',
        'compute_itc_breakdown',
        'get_income_tax_advisory',
        'get_day_book',
        'compute_sku_manufacturing_cogs',
        'create_double_entry_voucher',
        'record_purchase_bill',
      ],
      permissionScope: [
        'accounts:read',
        'accounts:write',
        'mcp_tools:read',
        'admin:accounts',
      ],
      isSystemWorker: false,
    };
  }

  async execute(input: WorkerTaskInput): Promise<WorkerStructuredOutput> {
    const findings: string[] = [];
    const evidence: string[] = [];
    const problems: string[] = [];
    const opportunities: string[] = [];
    const recommendations: string[] = [];
    let priority: 'critical' | 'high' | 'medium' | 'low' = 'high';

    try {
      // 1. Determine tax period (default to current month, e.g. "112026")
      const now = new Date();
      const defaultPeriod = `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;
      const period =
        input.parameters?.period || input.timeframe || defaultPeriod;

      // 2. Compute GSTR-3B Summary (combining outward sales + inward ITC)
      const gstr3b = await computeGstr3bSummary(period);

      const gross = gstr3b.outwardSupplies.taxableValue * 1.03;
      const taxable = gstr3b.outwardSupplies.taxableValue;
      const outputTax =
        gstr3b.outwardSupplies.cgst +
        gstr3b.outwardSupplies.sgst +
        gstr3b.outwardSupplies.igst;
      const itcTotal = gstr3b.itcAvailable.total;
      const netPayable = gstr3b.netTaxPayable.total;

      findings.push(
        `[GST Position - Period ${period}] Taxable Turnover: ₹${taxable.toLocaleString(
          'en-IN'
        )} | Total Output GST (3%): ₹${outputTax.toLocaleString('en-IN')}.`
      );
      findings.push(
        `[Input Tax Credit (ITC)] Available ITC from verified vendor purchases: ₹${itcTotal.toLocaleString(
          'en-IN'
        )} (CGST: ₹${gstr3b.itcAvailable.cgst.toLocaleString(
          'en-IN'
        )}, SGST: ₹${gstr3b.itcAvailable.sgst.toLocaleString(
          'en-IN'
        )}, IGST: ₹${gstr3b.itcAvailable.igst.toLocaleString('en-IN')}).`
      );
      findings.push(
        `[Net Tax Payable] Net GST payable to government after ITC offset: ₹${netPayable.toLocaleString(
          'en-IN'
        )}.`
      );

      evidence.push(
        `GSTR-3B Table 3.1: CGST ₹${gstr3b.outwardSupplies.cgst.toLocaleString(
          'en-IN'
        )}, SGST ₹${gstr3b.outwardSupplies.sgst.toLocaleString(
          'en-IN'
        )}, IGST ₹${gstr3b.outwardSupplies.igst.toLocaleString('en-IN')}.`
      );
      evidence.push(
        `GSTR-3B Table 4 (Eligible ITC): Total ₹${itcTotal.toLocaleString(
          'en-IN'
        )} offset against outward liability.`
      );

      if (gstr3b.isOverdue && netPayable > 0) {
        priority = 'critical';
        problems.push(
          `GSTR-3B return for period ${period} was due on ${gstr3b.filingDueDate} and is currently OVERDUE. Accrued interest penalty: ₹${gstr3b.interestPayable.toLocaleString(
            'en-IN'
          )} (18% p.a.).`
        );
        recommendations.push(
          `URGENT: File GSTR-3B return and deposit net cash tax of ₹${netPayable.toLocaleString(
            'en-IN'
          )} on GSTN portal immediately to halt Section 50 interest accumulation.`
        );
      } else {
        recommendations.push(
          `GSTR-3B return for period ${period} is due on ${gstr3b.filingDueDate}. Net tax to discharge in cash: ₹${netPayable.toLocaleString(
            'en-IN'
          )}.`
        );
      }

      // 3. Purchase & ITC Ingestion
      const purchases = await fetchMonthlyPurchases(period);
      const itcBreakdown = computeItcBreakdown(purchases, period);

      if (itcBreakdown.blockedCreditAmount > 0) {
        problems.push(
          `Detected ₹${itcBreakdown.blockedCreditAmount.toLocaleString(
            'en-IN'
          )} in blocked input tax credit under Section 17(5) across ${
            itcBreakdown.ineligibleBillsCount
          } bill(s). Blocked amounts excluded from GSTR-3B claim.`
        );
      }

      if (purchases.length === 0) {
        opportunities.push(
          `No vendor purchase bills recorded for period ${period}. Ensure all gold bullion, making charges, and box packaging bills are entered to claim legitimate ITC offsets.`
        );
      } else {
        opportunities.push(
          `Successfully recovered ₹${itcTotal.toLocaleString(
            'en-IN'
          )} via Input Tax Credit, reducing cash tax liability from ₹${outputTax.toLocaleString(
            'en-IN'
          )} to ₹${netPayable.toLocaleString('en-IN')}.`
        );
      }

      // 4. Income Tax & Advance Tax Check
      const fy = `${now.getFullYear()}-${(now.getFullYear() + 1).toString().slice(2)}`;
      const itAdvisory = await getIncomeTaxAdvisory(fy);

      findings.push(
        `[Income Tax Compliance - FY ${fy}] Estimated Gross Turnover: ₹${itAdvisory.estimatedAnnualGrossTurnover.toLocaleString(
          'en-IN'
        )} (Digital mix: ${itAdvisory.digitalTurnoverPercentage}%).`
      );

      for (const rec of itAdvisory.recommendations) {
        if (rec.includes('URGENT') || rec.includes('ALERT')) {
          problems.push(rec);
          if (priority !== 'critical') priority = 'high';
        } else {
          recommendations.push(rec);
        }
      }

      // 5. Cash Book / Day Book audit
      const todayStr = now.toISOString().split('T')[0];
      const dayBook = await getDayBook(todayStr);
      evidence.push(
        `Day-Book (${todayStr}): Receipts: ₹${dayBook.totalReceipts.toLocaleString(
          'en-IN'
        )}, Payments: ₹${dayBook.totalPayments.toLocaleString(
          'en-IN'
        )}, Net Movement: ₹${dayBook.netCashFlow.toLocaleString('en-IN')}.`
      );

      // 6. Optional SKU Manufacturing Costing check if requested
      if (input.parameters?.sku || input.parameters?.costing) {
        const skuCosting = computeSkuCogs({
          sku: input.parameters.sku || 'SAMPLE-SKU',
          metalPurity: input.parameters.purity || '22K',
          grossWeightGrams: input.parameters.weight || 10,
          liveGold24kRatePerGram: input.parameters.goldRate || 7800,
          targetSellingPrice: input.parameters.targetPrice || 100000,
        });

        findings.push(
          `[Manufacturing Costing: ${skuCosting.sku}] COGS: ₹${skuCosting.totalCogs.toLocaleString(
            'en-IN'
          )} | Gross Margin: ₹${skuCosting.grossMarginAmount.toLocaleString('en-IN')} (${
            skuCosting.grossMarginPercentage
          }%).`
        );

        if (skuCosting.grossMarginPercentage < 20) {
          problems.push(
            `SKU ${skuCosting.sku} has an unusually slim gross margin of ${skuCosting.grossMarginPercentage}%. Consider revising making charges or retail price.`
          );
        }
      }

      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings,
        evidence,
        problems,
        opportunities,
        recommendations,
        priority,
      };
    } catch (err: any) {
      console.error('[worker_accounts_tax] Execution failure:', err);
      return {
        workerId: this.id,
        workerName: this.name,
        task: input.task,
        findings: [
          'Accounts audit partially halted due to an unexpected database or telemetry error.',
        ],
        evidence: [`Error details: ${err?.message || 'Unknown error'}`],
        problems: [
          'Unable to fetch complete financial telemetry for the specified tax period.',
        ],
        opportunities: [
          'Retry after ensuring Supabase service-role connectivity and migration 0122 status.',
        ],
        recommendations: [
          'Inspect accounts_purchases and accounts_vouchers tables.',
        ],
        priority: 'high',
      };
    }
  }
}

export const accountsWorker = new AccountsTaxWorker();
