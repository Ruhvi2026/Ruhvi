import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { cookies } from 'next/headers';

/**
 * GET /api/admin/cross-portal/summary
 *
 * Single aggregated endpoint that returns a cross-portal snapshot for the
 * admin overview dashboard. Pulls from all 4 portals in parallel via the
 * service role key (bypasses RLS — only callable by admin-level roles).
 *
 * Query params:
 *   from  - ISO date string (YYYY-MM-DD), defaults to 30 days ago
 *   to    - ISO date string (YYYY-MM-DD), defaults to today
 */

export async function GET(req: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;
    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = await verifySessionToken(sessionCookie);
    if (!decoded?.sub) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Role check
    const { data: caller } = await supabase
      .from('users')
      .select('role')
      .eq('id', decoded.sub)
      .maybeSingle();

    if (
      !caller ||
      !['super_admin', 'admin', 'manager'].includes(caller.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Date range
    const { searchParams } = new URL(req.url);
    const now = new Date();
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];
    const defaultTo = now.toISOString().split('T')[0];

    const from = searchParams.get('from') || defaultFrom;
    const to = searchParams.get('to') || defaultTo;
    const fromISO = `${from}T00:00:00.000Z`;
    const toISO = `${to}T23:59:59.999Z`;

    // All portal queries in parallel
    const [
      // Operations portal
      { data: products },
      { count: pendingQC },
      { count: activeSuppliers },
      { count: lowStockItems },

      // Orders portal
      { count: pendingOrders },
      { count: shippedOrders },
      { count: rtoOrders },
      { count: totalOrdersInRange },

      // Support portal
      { count: openTickets },
      { count: slaBreachedTickets },
      { count: unassignedTickets },
      { count: totalTicketsInRange },

      // Marketing portal
      { count: activeCoupons },
      { count: activeSubscribers },
    ] = await Promise.all([
      // Operations: products with stock info
      supabase.from('products').select('stock_quantity, low_stock_threshold'),

      // QC — items flagged for quality control (if qc_items table exists)
      supabase
        .from('quality_control_items')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .then((r) => ({ count: r.count ?? 0 })),

      // Active suppliers
      supabase
        .from('suppliers')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .then((r) => ({ count: r.count ?? 0 })),

      // Low stock items (point-in-time)
      supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .lte('stock_quantity', 5)
        .gt('stock_quantity', 0)
        .then((r) => ({ count: r.count ?? 0 })),

      // Orders: pending
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['pending', 'confirmed', 'processing'])
        .then((r) => ({ count: r.count ?? 0 })),

      // Orders: shipped in range
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'shipped')
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .then((r) => ({ count: r.count ?? 0 })),

      // Orders: RTO in range
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['rto_initiated', 'rto_received'])
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .then((r) => ({ count: r.count ?? 0 })),

      // Orders: total in range
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .then((r) => ({ count: r.count ?? 0 })),

      // Support: open tickets
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .in('status', ['new', 'open', 'in_progress'])
        .then((r) => ({ count: r.count ?? 0 })),

      // Support: SLA breached (unresolved)
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .eq('sla_breached', true)
        .not('status', 'in', '("resolved","closed")')
        .then((r) => ({ count: r.count ?? 0 })),

      // Support: unassigned tickets
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .is('assigned_to', null)
        .not('status', 'in', '("resolved","closed","rejected","duplicate")')
        .then((r) => ({ count: r.count ?? 0 })),

      // Support: total in range
      supabase
        .from('support_tickets')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', fromISO)
        .lte('created_at', toISO)
        .then((r) => ({ count: r.count ?? 0 })),

      // Marketing: active coupons
      supabase
        .from('coupons')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .then((r) => ({ count: r.count ?? 0 })),

      // Marketing: active email subscribers
      supabase
        .from('email_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'subscribed')
        .then((r) => ({ count: r.count ?? 0 })),
    ]);

    const lowStockCount = (products || []).filter(
      (p) =>
        (p.stock_quantity || 0) <= (p.low_stock_threshold || 5) &&
        (p.stock_quantity || 0) > 0
    ).length;

    return NextResponse.json({
      from,
      to,
      operations: {
        low_stock_items: lowStockCount,
        pending_qc: pendingQC,
        active_suppliers: activeSuppliers,
      },
      orders: {
        pending_orders: pendingOrders,
        shipped_in_range: shippedOrders,
        rto_in_range: rtoOrders,
        total_in_range: totalOrdersInRange,
      },
      support: {
        open_tickets: openTickets,
        sla_breached: slaBreachedTickets,
        unassigned: unassignedTickets,
        total_in_range: totalTicketsInRange,
      },
      marketing: {
        active_coupons: activeCoupons,
        active_subscribers: activeSubscribers,
      },
    });
  } catch (err) {
    console.error('[cross-portal/summary]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
