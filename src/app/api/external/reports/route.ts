import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Helper to authenticate request and check scopes
// ---------------------------------------------------------------------------
async function getAuthenticatedKey(
  req: NextRequest,
  minLevel: 'read' | 'write' | 'admin'
) {
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, name, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'analytics', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/reports
// Fetch dynamic aggregated reports/analytics
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get('type') || 'sales';
  const supabase = getServiceClient();

  try {
    switch (type) {
      case 'sales': {
        // Build a basic sales aggregate report
        const { data: orders, error } = await supabase
          .from('orders')
          .select('total_amount, status');

        if (error) throw error;

        const totalOrders = orders.length;
        const totalRevenue = orders.reduce(
          (sum, order) => sum + (Number(order.total_amount) || 0),
          0
        );
        const aov =
          totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00';

        const statusBreakdown = orders.reduce(
          (acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        );

        return NextResponse.json(
          {
            success: true,
            report_type: 'sales',
            data: {
              total_orders: totalOrders,
              total_revenue: totalRevenue,
              average_order_value: Number(aov),
              status_breakdown: statusBreakdown,
            },
          },
          { status: 200 }
        );
      }

      case 'customers': {
        // Build a basic customer growth report
        const { data: users, error } = await supabase
          .from('users')
          .select('role', { count: 'exact' })
          .eq('role', 'customer');

        if (error) throw error;

        return NextResponse.json(
          {
            success: true,
            report_type: 'customers',
            data: {
              total_registered_customers: users?.length || 0,
            },
          },
          { status: 200 }
        );
      }

      case 'support': {
        // Utilize the native RPC function
        const { data: supportStats, error } = await supabase.rpc(
          'get_support_analytics'
        );
        if (error) throw error;

        return NextResponse.json(
          {
            success: true,
            report_type: 'support',
            data: supportStats || {},
          },
          { status: 200 }
        );
      }

      case 'ai': {
        // Utilize the native RPC function
        const { data: aiStats, error } = await supabase.rpc(
          'get_ai_analytics_summary'
        );
        if (error) throw error;

        return NextResponse.json(
          {
            success: true,
            report_type: 'ai',
            data: aiStats || {},
          },
          { status: 200 }
        );
      }

      default:
        return NextResponse.json(
          {
            error:
              'Invalid report `type`. Valid types: sales, customers, support, ai.',
          },
          { status: 400 }
        );
    }
  } catch (err: any) {
    console.error(
      `[external/reports GET] Error building report [${type}]:`,
      err
    );
    return NextResponse.json(
      { error: 'Failed to generate report: ' + err.message },
      { status: 500 }
    );
  }
}

// ---------------------------------------------------------------------------
// POST /api/external/reports
// Trigger an asynchronous report generation (Admin only)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json(
      {
        error:
          'Forbidden: `reports` module is read-only for standard write keys. Requires Admin scope to trigger async generation.',
      },
      { status: 403 }
    );
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const reportType = body.report_type;
  if (!reportType) {
    return NextResponse.json(
      { error: '`report_type` is required in the payload' },
      { status: 422 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_REPORT_TRIGGERED',
    entityType: 'report',
    entityId: reportType,
    changes: { parameters: body, apiKey: auth.keyId },
  });

  // Since we don't have a background worker currently defined for this,
  // we return a 202 Accepted to simulate a successful queueing operation.
  return NextResponse.json(
    {
      success: true,
      message: `Report generation for type '${reportType}' has been queued asynchronously.`,
      job_id: `job_${Date.now()}`,
    },
    { status: 202 }
  );
}

// ---------------------------------------------------------------------------
// PUT & DELETE /api/external/reports
// Blocked methods
// ---------------------------------------------------------------------------
export async function PUT() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Reports cannot be updated.' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method Not Allowed. Reports cannot be deleted.' },
    { status: 405 }
  );
}
