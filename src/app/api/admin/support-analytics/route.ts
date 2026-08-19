import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

/**
 * Admin Support Analytics API
 * GET — Returns aggregated support metrics
 */

export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('__session')?.value;

    if (!sessionCookie) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = decodeJwt(sessionCookie);
    const uid = decoded.sub;

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Verify admin role
    const { data: identity } = await supabase
      .from('customer_identities')
      .select('customer_id')
      .eq('firebase_uid', uid)
      .maybeSingle();

    let user = null;
    if (identity?.customer_id) {
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', identity.customer_id)
        .maybeSingle();
      user = profile;
    }

    const isAdmin =
      user?.role === 'admin' || decoded.email === 'ruhvi.main@gmail.com';
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get date range from query params
    const { searchParams } = new URL(req.url);
    const dateFrom =
      searchParams.get('from') ||
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const dateTo = searchParams.get('to') || new Date().toISOString();

    // Call the analytics RPC
    const { data: analytics, error } = await supabase.rpc(
      'get_support_analytics',
      {
        p_date_from: dateFrom,
        p_date_to: dateTo,
      }
    );

    if (error) {
      console.error('Analytics RPC error:', error);
      // Fallback: compute manually
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select(
          'id, status, priority, created_at, first_response_at, resolved_at, sla_breached, ai_created, assigned_to, category_id'
        );

      const allTickets = tickets || [];
      const rangeTickets = allTickets.filter(
        (t: any) =>
          new Date(t.created_at) >= new Date(dateFrom) &&
          new Date(t.created_at) <= new Date(dateTo)
      );

      return NextResponse.json({
        ticket_counts: {
          total: allTickets.length,
          today: allTickets.filter(
            (t: any) =>
              new Date(t.created_at).toDateString() ===
              new Date().toDateString()
          ).length,
          this_week: allTickets.filter((t: any) => {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return new Date(t.created_at) >= weekAgo;
          }).length,
          this_month: allTickets.filter((t: any) => {
            const d = new Date(t.created_at);
            return (
              d.getMonth() === new Date().getMonth() &&
              d.getFullYear() === new Date().getFullYear()
            );
          }).length,
        },
        by_status: {
          new: allTickets.filter((t: any) => t.status === 'new').length,
          open: allTickets.filter((t: any) => t.status === 'open').length,
          in_progress: allTickets.filter((t: any) => t.status === 'in_progress')
            .length,
          waiting_for_customer: allTickets.filter(
            (t: any) => t.status === 'waiting_for_customer'
          ).length,
          resolved: allTickets.filter((t: any) => t.status === 'resolved')
            .length,
          closed: allTickets.filter((t: any) => t.status === 'closed').length,
        },
        by_priority: {
          low: allTickets.filter((t: any) => t.priority === 'low').length,
          normal: allTickets.filter((t: any) => t.priority === 'normal').length,
          high: allTickets.filter((t: any) => t.priority === 'high').length,
          urgent: allTickets.filter((t: any) => t.priority === 'urgent').length,
        },
        performance: {
          sla_breach_count: allTickets.filter((t: any) => t.sla_breached)
            .length,
          resolution_rate:
            allTickets.length > 0
              ? Math.round(
                  (allTickets.filter((t: any) =>
                    ['resolved', 'closed'].includes(t.status)
                  ).length /
                    allTickets.length) *
                    100
                )
              : 0,
        },
        ai_metrics: {
          ai_created_tickets: rangeTickets.filter((t: any) => t.ai_created)
            .length,
          total_tickets: rangeTickets.length,
          ai_creation_rate:
            rangeTickets.length > 0
              ? Math.round(
                  (rangeTickets.filter((t: any) => t.ai_created).length /
                    rangeTickets.length) *
                    100
                )
              : 0,
        },
      });
    }

    return NextResponse.json(analytics);
  } catch (err: any) {
    console.error('Analytics Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
