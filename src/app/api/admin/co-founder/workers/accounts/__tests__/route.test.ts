import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { requireAdmin } from '@/lib/auth/require-admin';
import { accountsWorker } from '@/lib/ai/co-founder/workers/worker-14-accounts';
import { computeGstr3bSummary } from '@/lib/accounts/gstr3b-engine';
import { getIncomeTaxAdvisory } from '@/lib/accounts/income-tax-advisory';

jest.mock('@/lib/auth/require-admin', () => ({
  requireAdmin: jest.fn(),
}));

jest.mock('@/lib/ai/co-founder/workers/worker-14-accounts', () => ({
  accountsWorker: {
    getDefinition: jest.fn().mockReturnValue({
      id: 'worker_accounts_tax',
      name: 'Accounts & Tax Compliance Worker',
      role: 'Chief Accounts Officer & GST Compliance Manager',
    }),
    execute: jest.fn().mockResolvedValue({
      workerId: 'worker_accounts_tax',
      workerName: 'Accounts & Tax Compliance Worker',
      task: 'Audit store GST position',
      findings: ['Taxable turnover: ₹5,00,000'],
      evidence: ['Table 3.1: ₹15,000'],
      problems: [],
      opportunities: ['Full ITC recovered'],
      recommendations: ['File GSTR-3B by Dec 20'],
      priority: 'high',
    }),
  },
}));

jest.mock('@/lib/accounts/gstr3b-engine', () => ({
  computeGstr3bSummary: jest.fn().mockResolvedValue({
    period: '112026',
    outwardSupplies: {
      taxableValue: 500000,
      cgst: 3750,
      sgst: 3750,
      igst: 7500,
      cess: 0,
    },
    itcAvailable: { cgst: 2000, sgst: 2000, igst: 4000, total: 8000 },
    netTaxPayable: { cgst: 1750, sgst: 1750, igst: 3500, total: 7000 },
    interestPayable: 0,
    filingDueDate: '2026-12-20',
    isOverdue: false,
  }),
}));

jest.mock('@/lib/accounts/income-tax-advisory', () => ({
  getIncomeTaxAdvisory: jest.fn().mockResolvedValue({
    financialYear: '2026-27',
    assessmentYear: '2027-28',
    section44AbAuditApplicable: false,
    digitalTurnoverPercentage: 99.1,
    advanceTaxInstallments: [],
  }),
}));

describe('/api/admin/co-founder/workers/accounts API Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Endpoint', () => {
    it('returns 401 when unauthorized', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        ok: false,
        status: 401,
        error: 'Unauthorized',
      });

      const req = new NextRequest(
        'http://localhost/api/admin/co-founder/workers/accounts'
      );
      const res = await GET(req);

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('returns live GST position and income tax overview when authenticated', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        ok: true,
        uid: 'admin-1',
        role: 'admin',
      });

      const req = new NextRequest(
        'http://localhost/api/admin/co-founder/workers/accounts?period=112026'
      );
      const res = await GET(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.worker.id).toBe('worker_accounts_tax');
      expect(json.period).toBe('112026');
      expect(json.liveGstPosition.taxableValue).toBe(500000);
      expect(json.liveGstPosition.netTaxPayable).toBe(7000);
      expect(json.incomeTaxOverview.digitalTurnoverPercentage).toBe(99.1);
    });
  });

  describe('POST Endpoint', () => {
    it('returns 400 when task description is missing', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        ok: true,
        uid: 'admin-1',
        role: 'admin',
      });

      const req = new NextRequest(
        'http://localhost/api/admin/co-founder/workers/accounts',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Field "task" is required');
    });

    it('dispatches task to worker and returns structured output', async () => {
      (requireAdmin as jest.Mock).mockResolvedValue({
        ok: true,
        uid: 'admin-1',
        role: 'admin',
      });

      const req = new NextRequest(
        'http://localhost/api/admin/co-founder/workers/accounts',
        {
          method: 'POST',
          body: JSON.stringify({
            task: 'Audit store GST position',
            parameters: { period: '112026' },
          }),
        }
      );
      const res = await POST(req);

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(json.workerId).toBe('worker_accounts_tax');
      expect(json.findings).toContain('Taxable turnover: ₹5,00,000');
      expect(json.recommendations).toContain('File GSTR-3B by Dec 20');
      expect(accountsWorker.execute).toHaveBeenCalledWith({
        task: 'Audit store GST position',
        parameters: { period: '112026' },
        timeframe: undefined,
      });
    });
  });
});
