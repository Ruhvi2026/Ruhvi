import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { accountsWorker } from '@/lib/ai/co-founder/workers/worker-14-accounts';
import { computeGstr3bSummary } from '@/lib/accounts/gstr3b-engine';
import { getIncomeTaxAdvisory } from '@/lib/accounts/income-tax-advisory';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET: Quick accounts status & worker definition preview
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get('period');

    const now = new Date();
    const targetPeriod =
      period ||
      `${String(now.getMonth() + 1).padStart(2, '0')}${now.getFullYear()}`;

    const [gstr3b, itAdvisory] = await Promise.all([
      computeGstr3bSummary(targetPeriod),
      getIncomeTaxAdvisory(),
    ]);

    return NextResponse.json({
      worker: accountsWorker.getDefinition(),
      period: targetPeriod,
      liveGstPosition: {
        taxableValue: gstr3b.outwardSupplies.taxableValue,
        outputGst:
          gstr3b.outwardSupplies.cgst +
          gstr3b.outwardSupplies.sgst +
          gstr3b.outwardSupplies.igst,
        itcAvailable: gstr3b.itcAvailable.total,
        netTaxPayable: gstr3b.netTaxPayable.total,
        filingDueDate: gstr3b.filingDueDate,
        isOverdue: gstr3b.isOverdue,
        interestPayable: gstr3b.interestPayable,
      },
      incomeTaxOverview: {
        financialYear: itAdvisory.financialYear,
        assessmentYear: itAdvisory.assessmentYear,
        section44AbAuditApplicable: itAdvisory.section44AbAuditApplicable,
        digitalTurnoverPercentage: itAdvisory.digitalTurnoverPercentage,
        advanceTaxInstallments: itAdvisory.advanceTaxInstallments,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch accounts status' },
      { status: 500 }
    );
  }
}

/**
 * POST: Execute specialized accounting & tax compliance task
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status }
      );
    }

    const body = await req.json();
    const { task, parameters, timeframe } = body;

    if (!task) {
      return NextResponse.json(
        { error: 'Field "task" is required to dispatch the Accounts Worker.' },
        { status: 400 }
      );
    }

    const output = await accountsWorker.execute({
      task,
      parameters,
      timeframe,
    });

    return NextResponse.json({
      ok: true,
      workerId: output.workerId,
      workerName: output.workerName,
      task: output.task,
      findings: output.findings,
      evidence: output.evidence,
      problems: output.problems,
      opportunities: output.opportunities,
      recommendations: output.recommendations,
      priority: output.priority,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Accounts worker execution failed' },
      { status: 500 }
    );
  }
}
