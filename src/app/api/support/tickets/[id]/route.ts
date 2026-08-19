import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';

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
    const decoded = decodeJwt(sessionCookie);
    const uid = decoded.sub;
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

    const supabase = await getSupabaseAdmin(cookieStore);
    const isStaff = ['admin', 'manager', 'staff'].includes(user.role);

    // Fetch ticket
    let ticketQuery = supabase
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
          created_at, shipping_charge, shiprocket_order_id, awb_code, courier_name,
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

    // Access control check: staff can see anything, customers see their own, guests see if email matches
    if (!isStaff) {
      const isOwner = ticket.customer_id === user.id;
      const isEmailMatch =
        (ticket.customer?.email &&
          ticket.customer.email.toLowerCase() === user.email?.toLowerCase()) ||
        (ticket.guest_email &&
          ticket.guest_email.toLowerCase() === user.email?.toLowerCase());

      if (!isOwner && !isEmailMatch) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // Fetch messages (customers only see customer-visible, staff see all)
    let messagesQuery = supabase
      .from('support_messages')
      .select(
        `
        id, sender_type, sender_id, message, visibility, created_at,
        sender:sender_id(id, full_name, email, role)
      `
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (!isStaff) {
      messagesQuery = messagesQuery.eq('visibility', 'customer');
    }

    const { data: messages } = await messagesQuery;

    // Fetch attachments
    const { data: attachments } = await supabase
      .from('support_attachments')
      .select(
        'id, file_name, file_type, file_size, storage_url, created_at, uploaded_by'
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    // Fetch audit logs (staff only)
    let auditLogs: any[] = [];
    if (isStaff) {
      const { data: logs } = await supabase
        .from('support_audit_logs')
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

    const isStaff = ['admin', 'manager', 'staff'].includes(user.role);
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await getSupabaseAdmin(cookieStore);
    const body = await req.json();

    // Get current ticket state for audit
    const { data: currentTicket } = await supabase
      .from('support_tickets')
      .select('status, priority, assigned_to')
      .eq('id', id)
      .single();

    if (!currentTicket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    const updates: any = {};
    const auditEntries: any[] = [];

    // Status change
    if (body.status && body.status !== currentTicket.status) {
      const validStatuses = [
        'new',
        'open',
        'in_progress',
        'waiting_for_customer',
        'resolved',
        'closed',
      ];
      if (!validStatuses.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }
      updates.status = body.status;

      // Track first response
      if (!currentTicket.status || currentTicket.status === 'new') {
        updates.first_response_at = new Date().toISOString();
      }

      // Track resolution
      if (body.status === 'resolved') {
        updates.resolved_at = new Date().toISOString();
      }
      if (body.status === 'closed') {
        updates.closed_at = new Date().toISOString();
      }

      auditEntries.push({
        ticket_id: id,
        actor_id: user.id,
        actor_type: 'staff',
        action: 'status_changed',
        old_value: { status: currentTicket.status },
        new_value: { status: body.status },
      });
    }

    // Priority change
    if (body.priority && body.priority !== currentTicket.priority) {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(body.priority)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        );
      }
      updates.priority = body.priority;

      auditEntries.push({
        ticket_id: id,
        actor_id: user.id,
        actor_type: 'staff',
        action: 'priority_changed',
        old_value: { priority: currentTicket.priority },
        new_value: { priority: body.priority },
      });
    }

    // Assignment change
    if (
      body.assigned_to !== undefined &&
      body.assigned_to !== currentTicket.assigned_to
    ) {
      updates.assigned_to = body.assigned_to || null;

      // Unassign previous
      if (currentTicket.assigned_to) {
        await supabase
          .from('support_assignments')
          .update({ unassigned_at: new Date().toISOString() })
          .eq('ticket_id', id)
          .eq('assigned_to', currentTicket.assigned_to)
          .is('unassigned_at', null);
      }

      // Create new assignment
      if (body.assigned_to) {
        await supabase.from('support_assignments').insert({
          ticket_id: id,
          assigned_to: body.assigned_to,
          assigned_by: user.id,
        });

        // Auto-set to open if new
        if (currentTicket.status === 'new') {
          updates.status = 'open';
        }
      }

      auditEntries.push({
        ticket_id: id,
        actor_id: user.id,
        actor_type: 'staff',
        action: 'assignment_changed',
        old_value: { assigned_to: currentTicket.assigned_to },
        new_value: { assigned_to: body.assigned_to },
      });
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid updates provided' },
        { status: 400 }
      );
    }

    const { data: updated, error } = await supabase
      .from('support_tickets')
      .update(updates)
      .eq('id', id)
      .select('id, ticket_number, status, priority, assigned_to')
      .single();

    if (error) {
      console.error('Ticket update error:', error);
      return NextResponse.json(
        { error: 'Failed to update ticket' },
        { status: 500 }
      );
    }

    // Insert audit entries
    if (auditEntries.length > 0) {
      await supabase.from('support_audit_logs').insert(auditEntries);
    }

    return NextResponse.json({ ticket: updated });
  } catch (err: any) {
    console.error('Ticket PATCH Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
