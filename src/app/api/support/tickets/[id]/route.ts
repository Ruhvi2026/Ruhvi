import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { sendTicketResolvedEmail } from '@/lib/resend';
import { pushTicketUpdateToEspo } from '@/lib/espo/sync';

/**
 * Single Ticket Operations
 * GET   — Full ticket detail with messages, attachments, timeline
 * PATCH — Update status, priority, assignment
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

export async function GET(
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

    const { searchParams } = new URL(req.url);
    const mine = searchParams.get('mine') === 'true';

    const supabase = await getSupabaseAdmin(cookieStore);
    const isStaff = [
      'super_admin',
      'SUPER_ADMIN',
      'admin',
      'manager',
      'staff',
    ].includes(user.role);

    // Fetch ticket
    const ticketQuery = supabase
      .from('support_tickets')
      .select(
        `
        *,
        customer:customer_id(id, full_name, email, phone, created_at, wallet_balance, reward_coins),
        assigned:assigned_to(id, full_name, email),
        category:category_id(id, name, slug),
        subcategory:subcategory_id(id, name, slug),
        order:order_id(
          id, order_number, status, total, payment_status, payment_method,
          created_at, shipping_charge,
          shipping_address_id
        ),
        product:product_id(id, name, slug, price, sku)
      `
      )
      .eq('id', id);

    const { data: ticket, error } = await ticketQuery.maybeSingle();

    if (error || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Access control: staff see everything; authenticated non-staff only see own
    // tickets (email-based guest lookup is handled by the /status endpoint).
    // When requested from the customer account area (`?mine=true`), even staff
    // are restricted to their own tickets so the account tab stays scoped.
    if (!isStaff || mine) {
      if (ticket.customer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch messages. Customers only see customer-visible messages. Staff see
    // everything in the staff console, but when a staff member opens their own
    // ticket from the customer account area (?mine=true) they are in customer
    // context, so internal notes must still be hidden there.
    let messagesQuery = supabase
      .from('support_ticket_messages')
      .select(
        `
        id, sender_type, sender_id, message, visibility, created_at,
        sender:sender_id(id, full_name, email, role)
      `
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (!isStaff || mine) {
      messagesQuery = messagesQuery.eq('visibility', 'customer');
    }

    const { data: messages } = await messagesQuery;

    // Fetch attachments (same visibility rules as messages)
    let attachmentsQuery = supabase
      .from('support_ticket_attachments')
      .select(
        'id, file_name, file_type, file_size, storage_url, created_at, uploaded_by'
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (!isStaff || mine) {
      attachmentsQuery = attachmentsQuery.eq('visibility', 'customer');
    }

    const { data: attachments } = await attachmentsQuery;

    // Fetch audit logs (staff only)
    let auditLogs: any[] = [];
    if (isStaff) {
      const { data: logs } = await supabase
        .from('support_ticket_audit_log')
        .select(
          `
          id, action, old_value, new_value, actor_type, created_at,
          actor:actor_id(id, full_name, email)
        `
        )
        .eq('ticket_id', id)
        .order('created_at', { ascending: true });
      auditLogs = logs || [];
    }

    // Fetch assignment history (staff only)
    let assignments: any[] = [];
    if (isStaff) {
      const { data: assignmentData } = await supabase
        .from('support_assignments')
        .select(
          `
          id, assigned_at, unassigned_at,
          assignee:assigned_to(id, full_name, email),
          assigner:assigned_by(id, full_name, email)
        `
        )
        .eq('ticket_id', id)
        .order('assigned_at', { ascending: true });
      assignments = assignmentData || [];
    }

    // Fetch order items if order is linked (for staff)
    let orderItems: any[] = [];
    if (ticket.order_id && isStaff) {
      const { data: items } = await supabase
        .from('order_items')
        .select(
          `
          id, sku, quantity, price_at_purchase,
          product:product_id(id, name, slug, price)
        `
        )
        .eq('order_id', ticket.order_id);
      orderItems = items || [];
    }

    // Fetch customer's other tickets (staff only, for context)
    let previousTickets: any[] = [];
    if (isStaff && ticket.customer_id) {
      const { data: prevTickets } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, priority, created_at')
        .eq('customer_id', ticket.customer_id)
        .neq('id', id)
        .order('created_at', { ascending: false })
        .limit(5);
      previousTickets = prevTickets || [];
    }

    // Fetch tracking updates if order has AWB
    let trackingUpdates: any[] = [];
    if (ticket.order?.awb_code) {
      const { data: tracking } = await supabase
        .from('tracking_updates')
        .select('id, status, activity, timestamp')
        .eq('order_id', ticket.order_id)
        .order('timestamp', { ascending: false })
        .limit(10);
      trackingUpdates = tracking || [];
    }

    return NextResponse.json({
      ticket,
      messages: messages || [],
      attachments: attachments || [],
      auditLogs,
      assignments,
      orderItems,
      previousTickets,
      trackingUpdates,
    });
  } catch (err: any) {
    console.error('Ticket Detail Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
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
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await getSupabaseAdmin(cookieStore);
    const body = await req.json();

    const validStatuses = [
      'new',
      'open',
      'in_progress',
      'waiting_for_customer',
      'waiting_for_team',
      'resolved',
      'closed',
      'reopened',
      'rejected',
      'duplicate',
    ];
    const validPriorities = ['low', 'normal', 'high', 'urgent'];

    if (body.status && !validStatuses.includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    if (body.priority && !validPriorities.includes(body.priority)) {
      return NextResponse.json({ error: 'Invalid priority' }, { status: 400 });
    }

    // Single transactional call: state change + audit trail + assignment
    // history are written in the same database operation (spec Section 9).
    const { data: result, error } = await supabase.rpc(
      'support_update_ticket_state',
      {
        p_ticket_id: id,
        p_status: body.status ?? null,
        p_priority: body.priority ?? null,
        p_assigned_to: body.assigned_to ?? null,
        p_actor_id: user.id,
        p_actor_type: 'staff',
      }
    );

    if (error) {
      console.error('Ticket state RPC error:', error);
      const msg = (error as any)?.message || '';
      if (msg.includes('ticket_not_found')) {
        return NextResponse.json(
          { error: 'Ticket not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    // Send email notification to customer if ticket was resolved or closed
    const nextStatus = body.status;
    if (nextStatus === 'resolved' || nextStatus === 'closed') {
      try {
        const { data: ticketForEmail } = await supabase
          .from('support_tickets')
          .select(
            'ticket_number, customer_id, customer:customer_id(email, full_name)'
          )
          .eq('id', id)
          .maybeSingle();
        const cust = Array.isArray(ticketForEmail?.customer)
          ? ticketForEmail.customer[0]
          : ticketForEmail?.customer;

        if (cust?.email) {
          await sendTicketResolvedEmail(
            ticketForEmail?.ticket_number || id,
            cust.email,
            cust.full_name || 'Customer'
          );
        }
      } catch (emailErr) {
        console.error('Failed to send Ticket Resolved email:', emailErr);
      }
    }

    // Fire-and-forget sync to EspoCRM (non-blocking, never breaks the flow).
    void pushTicketUpdateToEspo(id, {
      status: body.status,
      priority: body.priority,
    });

    return NextResponse.json({ ticket: result });
  } catch (err: any) {
    console.error('Ticket PATCH Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
