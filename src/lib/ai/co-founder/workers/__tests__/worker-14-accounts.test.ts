jest.mock('server-only', () => ({}));

jest.mock('@/lib/accounts/gstr3b-engine', () => ({
  computeGstr3bSummary: jest.fn().mockImplementation((period: string) => {
    return Promise.resolve({
      period,
      outwardSupplies: {
        taxableValue: 500000,
        cgst: 3750,
        sgst: 3750,
        igst: 7500,
        cess: 0,
      },
      itcAvailable: {
        cgst: 2000,
        sgst: 2000,
        igst: 4000,
        total: 8000,
      },
      netTaxPayable: {
        cgst: 1750,
        sgst: 1750,
        igst: 3500,
        total: 7000,
      },
      interestPayable: 0,
      filingDueDate: '2026-12-20',
      isOverdue: false,
    });
  }),
}));

jest.mock('@/lib/accounts/itc-engine', () => ({
  fetchMonthlyPurchases: jest.fn().mockResolvedValue([
    {
      id: 'pb-1',
      total_amount: 103000,
      taxable_value: 100000,
      cgst_input: 1500,
      sgst_input: 1500,
      igst_input: 0,
      itc_eligible: true,
      category: 'Bullion (Gold/Silver)',
      item_description: 'Gold Bullion',
    },
  ]),
  computeItcBreakdown: jest.fn().mockReturnValue({
    period: '112026',
    totalPurchases: 103000,
    taxablePurchases: 100000,
    cgstInputAvailable: 1500,
    sgstInputAvailable: 1500,
    igstInputAvailable: 0,
    totalItcAvailable: 3000,
    blockedCreditAmount: 0,
    eligibleBillsCount: 1,
    ineligibleBillsCount: 0,
  }),
}));

jest.mock('@/lib/accounts/income-tax-advisory', () => ({
  getIncomeTaxAdvisory: jest.fn().mockResolvedValue({
    financialYear: '2026-27',
    assessmentYear: '2027-28',
    estimatedAnnualGrossTurnover: 4500000,
    section44AbAuditApplicable: false,
    digitalTurnoverPercentage: 99.2,
    tcsSection206cApplicable: false,
    advanceTaxInstallments: [],
    recommendations: [
      'Statutory Tax Audit is not mandatory under digital threshold of ₹10 Crore.',
    ],
  }),
}));

jest.mock('@/lib/accounts/cashbook-engine', () => ({
  getDayBook: jest.fn().mockResolvedValue({
    date: '2026-11-02',
    totalReceipts: 35000,
    totalPayments: 10000,
    netCashFlow: 25000,
    vouchers: [],
  }),
}));

import { AccountsTaxWorker } from '../worker-14-accounts';
import { workerRegistry } from '../registry';
import { computeGstr3bSummary } from '@/lib/accounts/gstr3b-engine';

describe('Worker 14: Accounts & Tax Compliance Worker', () => {
  let worker: AccountsTaxWorker;

  beforeEach(() => {
    worker = new AccountsTaxWorker();
    jest.clearAllMocks();
  });

  it('correctly reports worker identity, role, and definition contract', () => {
    expect(worker.id).toBe('worker_accounts_tax');
    expect(worker.name).toBe('Accounts & Tax Compliance Worker');
    expect(worker.priority).toBe('HIGH');

    const def = worker.getDefinition();
    expect(def.id).toBe('worker_accounts_tax');
    expect(def.role).toContain('Accounts Officer');
    expect(def.requiredSkills).toContain(
      'Indian GST Law & Rule 46 Tax Invoicing'
    );
    expect(def.requiredTools).toContain('compute_gstr3b_summary');
    expect(def.isSystemWorker).toBe(false);
  });

  it('is properly registered and routed in the WorkerRegistry', () => {
    const registeredWorker = workerRegistry.getWorker('worker_accounts_tax');
    expect(registeredWorker).toBeDefined();
    expect(registeredWorker?.id).toBe('worker_accounts_tax');

    // Test routing via natural language English & Bengali queries
    expect(
      workerRegistry.findWorkerForTask(
        'Calculate our GSTR-3B tax payable and filing deadline'
      ).id
    ).toBe('worker_accounts_tax');
    expect(
      workerRegistry.findWorkerForTask(
        'What is our available ITC from bullion purchases this month?'
      ).id
    ).toBe('worker_accounts_tax');
    expect(
      workerRegistry.findWorkerForTask(
        'এই মাসের জিএসটি ট্যাক্স হিসাব কত এবং ভাউচার চেক করো'
      ).id
    ).toBe('worker_accounts_tax');
  });

  it('successfully executes a comprehensive tax & accounts audit', async () => {
    const result = await worker.execute({
      task: 'Audit store GST liability and available ITC for current month',
      parameters: { period: '112026' },
    });

    expect(result.workerId).toBe('worker_accounts_tax');
    expect(result.workerName).toBe('Accounts & Tax Compliance Worker');
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.evidence.length).toBeGreaterThan(0);
    expect(result.recommendations.length).toBeGreaterThan(0);

    // Verify key findings
    const findingsStr = result.findings.join(' ');
    expect(findingsStr).toContain('Taxable Turnover');
    expect(findingsStr).toContain('Input Tax Credit');
    expect(findingsStr).toContain('Net GST payable');

    // Verify evidence
    const evidenceStr = result.evidence.join(' ');
    expect(evidenceStr).toContain('GSTR-3B Table 3.1');
    expect(evidenceStr).toContain('Day-Book');
  });

  it('escalates priority to critical when GSTR-3B return is overdue', async () => {
    (computeGstr3bSummary as jest.Mock).mockResolvedValueOnce({
      period: '102026',
      outwardSupplies: {
        taxableValue: 400000,
        cgst: 3000,
        sgst: 3000,
        igst: 6000,
        cess: 0,
      },
      itcAvailable: { cgst: 0, sgst: 0, igst: 0, total: 0 },
      netTaxPayable: { cgst: 3000, sgst: 3000, igst: 6000, total: 12000 },
      interestPayable: 216,
      filingDueDate: '2026-11-20',
      isOverdue: true,
    });

    const result = await worker.execute({
      task: 'Check overdue tax status for last month',
      parameters: { period: '102026' },
    });

    expect(result.priority).toBe('critical');
    const problemsStr = result.problems.join(' ');
    expect(problemsStr).toContain('OVERDUE');
    expect(problemsStr).toContain('interest penalty');
  });

  it('computes SKU manufacturing COGS when SKU parameters are provided', async () => {
    const result = await worker.execute({
      task: 'Evaluate production COGS and gross margin for diamond choker',
      parameters: {
        sku: 'RJ-CHOKER-22K-09',
        purity: '22K',
        weight: 12,
        goldRate: 8000,
        targetPrice: 125000,
        costing: true,
      },
    });

    const findingsStr = result.findings.join(' ');
    expect(findingsStr).toContain('Manufacturing Costing: RJ-CHOKER-22K-09');
    expect(findingsStr).toContain('Gross Margin');
  });

  it('handles unexpected backend execution errors gracefully without crashing', async () => {
    (computeGstr3bSummary as jest.Mock).mockRejectedValueOnce(
      new Error('Supabase database connection timed out')
    );

    const result = await worker.execute({
      task: 'Audit GST position',
    });

    expect(result.workerId).toBe('worker_accounts_tax');
    expect(result.problems[0]).toContain(
      'Unable to fetch complete financial telemetry'
    );
    expect(result.evidence[0]).toContain(
      'Supabase database connection timed out'
    );
  });
});
