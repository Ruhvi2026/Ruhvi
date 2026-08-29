import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

/**
 * POST /api/support/tickets/[id]/reopen
 * Customer self-service reopen (spec §3.2).
 *
 * Allowed only when:
 *   - the caller owns the ticket (or is staff),
 *   - the ticket was auto-closed (close_reason = 'auto_closed_no_reply'),
 *   - still inside the 30-day window (now <= auto_close_eligible_until).
 *
 * On reopen: status -> 'reopened', clears close_reason/closed_at/
 * auto_close_eligible_until/pending_customer_reply_since (which also resets the
 * 30-day attachment-deletion timer, since the ticket is active again), writes an
 * audit entry, and notifies the previously-assigned agent.
 */

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
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
}

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;

    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role')
      .eq('id', uid)
      .maybeSingle();

    return user;
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStaff = [
      'super_admin',
      'SUPER_ADMIN',
      'admin',
      'manager',
      'staff',
    ].includes(user.role);

    const supabase = await getSupabaseAdmin(cookieStore);

    const { data: ticket, error: fetchErr } = await supabase
      .from('support_tickets')
      .select(
        'id, ticket_number, status, close_reason, closed_at, auto_close_eligible_until, customer_id, assigned_to, customer:customer_id(email, full_name)'
      )
      .eq('id', id)
      .maybeSingle();

    if (fetchErr || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    if (!isStaff && ticket.customer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Reopen is a customer self-service path for auto-closed tickets within 30 days.
    if (ticket.status !== 'closed') {
      return NextResponse.json(
        { error: 'Only closed tickets can be reopened.' },
        { status: 400 }
      );
    }

    const wasAutoClosed = ticket.close_reason === 'auto_closed_no_reply';
    const withinWindow =
      ticket.auto_close_eligible_until &&
      new Date(ticket.auto_close_eligible_until) >= new Date();

    if (isStaff) {
      // Staff override is always allowed (spec §3.2: staff can manually intervene).
    } else if (!wasAutoClosed || !withinWindow) {
      return NextResponse.json(
        {
          error:
            'This ticket is permanently closed and cannot be reopened through self-service. Please raise a new ticket or contact support.',
        },
        { status: 400 }
      );
    }

    // Reopen: transactional state change + audit (spec §9).
    const { data: result, error: rpcErr } = await supabase.rpc(
      'support_update_ticket_state',
      {
        p_ticket_id: id,
        p_status: 'reopened',
        p_priority: null,
        p_assigned_to: null,
        p_actor_id: isStaff ? user.id : null,
        p_actor_type: isStaff ? 'staff' : 'customer',
      }
    );

    if (rpcErr) {
      console.error('Reopen RPC error:', rpcErr);
      return NextResponse.json(
        { error: 'Failed to reopen ticket' },
        { status: 500 }
      );
    }

    // Reopening resets the 30-day attachment-deletion timer. The purge cron only
    // targets tickets with status 'closed' older than 30 days, so simply clearing
    // the close state (done by the RPC) achieves the reset.

    // Notify the previously-assigned agent (in-app only for now — see §6 open Qs).
    if (ticket.assigned_to && !isStaff) {
      try {
        await supabase.from('support_ticket_audit_log').insert({
          ticket_id: id,
          actor_id: user.id,
          actor_type: 'customer',
          action: 'ticket_reopened_by_customer',
          new_value: {
            assigned_agent_notified: true,
            assigned_to: ticket.assigned_to,
          },
        });
      } catch (auditErr) {
        console.error('Reopen audit notify error:', auditErr);
      }
    }

    return NextResponse.json({
      ticket: result,
      message:
        'Your ticket has been reopened. Our team will follow up shortly.',
    });
  } catch (err: any) {
    console.error('Reopen Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
