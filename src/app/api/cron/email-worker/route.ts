import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { EmailOrchestrator } from '@/lib/email-orchestrator/service';
import { EMAIL_CONFIG } from '@/lib/email-orchestrator/config';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  return handleDispatch(request);
}

export async function POST(request: NextRequest) {
  return handleDispatch(request);
}

async function handleDispatch(request: NextRequest) {
  // Authorization check via Bearer or Cron Secret
  const authHeader = request.headers.get('Authorization');
  const cronSecret =
    process.env.CRON_SECRET || process.env.EMAIL_DISPATCH_HMAC_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const workerId = `worker-${process.pid}-${Date.now().toString(36)}`;
  const batchSize = 10;
  const processed: Array<{
    id: string;
    success: boolean;
    provider?: string;
    error?: string;
  }> = [];

  try {
    const supabase = await getSupabaseAdmin();
    const { data: deliveries, error } = await supabase.rpc(
      'claim_email_deliveries',
      {
        p_batch_size: batchSize,
        p_worker_id: workerId,
        p_lease_seconds: 60,
      }
    );

    if (error || !deliveries || deliveries.length === 0) {
      return NextResponse.json({
        success: true,
        claimed: 0,
        workerId,
      });
    }

    for (const delivery of deliveries) {
      const result = await EmailOrchestrator.send({
        category: delivery.category,
        eventKey: delivery.event_key,
        eventType: delivery.event_type,
        recipientEmail: delivery.recipient_email,
        recipientName: delivery.recipient_name,
        subject: delivery.subject,
        templateFileName: delivery.template_key,
        variables: delivery.template_variables || {},
        priority: delivery.priority,
      });

      processed.push({
        id: delivery.id,
        success: result.success,
        provider: result.provider,
        error: result.error,
      });
    }

    return NextResponse.json({
      success: true,
      claimed: deliveries.length,
      processed,
      workerId,
    });
  } catch (err: any) {
    console.error('[EmailWorker] Execution failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
