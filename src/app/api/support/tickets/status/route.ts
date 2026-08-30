import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Public Ticket Status API
 * GET — Check status of a ticket by ticket number (or UUID id) + email (case insensitive)
 *
 * Guest users can view a ticket only when they provide the correct
 * ticket identifier (ticketNumber or UUID id) AND the email address
 * associated with that ticket.
 *
 * Accepted query params:
 *   - ticket      : either a ticket_number (e.g. RUV-2026-000001) or a UUID id
 *   - ticketNumber: alias for ticket (legacy, superseded by `ticket`)
 *   - id          : explicit UUID lookup
 *   - email       : email address associated with the ticket
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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ticketIdentifier =
      searchParams.get('ticket')?.trim() ||
      searchParams.get('ticketNumber')?.trim() ||
      searchParams.get('id')?.trim();
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!ticketIdentifier || !email) {
      return NextResponse.json(
        { error: 'Ticket number (or ID) and email are required.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await getSupabaseAdmin(cookieStore);

    // Detect whether the identifier is a UUID or a ticket_number
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        ticketIdentifier
      );

    // 1. Fetch ticket matching either ticket_number or UUID id
    let query = supabase.from('support_tickets').select(
      `
        id, ticket_number, title, description, status, priority, created_at, updated_at,
        guest_email, guest_name, customer_email,
        customer:customer_id(id, full_name, email),
        category:category_id(name),
        subcategory:subcategory_id(name)
      `
    );

    if (isUuid) {
      query = query.eq('id', ticketIdentifier);
    } else {
      query = query.eq('ticket_number', ticketIdentifier);
    }

    const { data: ticket, error: ticketError } = await query.maybeSingle();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found. Please verify details.' },
        { status: 404 }
      );
    }

    // 2. Validate email matches guest_email, customer_email, or linked customer email
    const customer = Array.isArray(ticket.customer)
      ? ticket.customer[0]
      : ticket.customer;
    const customerEmail = customer?.email?.toLowerCase();
    const guestEmail = ticket.guest_email?.toLowerCase();
    const ticketCustomerEmail = ticket.customer_email?.toLowerCase();

    const emailMatches =
      (customerEmail && customerEmail === email) ||
      (guestEmail && guestEmail === email) ||
      (ticketCustomerEmail && ticketCustomerEmail === email);

    if (!emailMatches) {
      return NextResponse.json(
        {
          error: 'Unauthorized. The email provided does not match this ticket.',
        },
        { status: 403 }
      );
    }

    // 3. Fetch public customer-visible messages
    const { data: messages, error: messagesError } = await supabase
      .from('support_ticket_messages')
      .select('id, sender_type, message, created_at')
      .eq('ticket_id', ticket.id)
      .eq('visibility', 'customer')
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages query error:', messagesError);
    }

    // 4. Fetch attachments
    const { data: attachments } = await supabase
      .from('support_ticket_attachments')
      .select(
        'id, file_name, file_type, file_size, storage_url, created_at, message_id'
      )
      .eq('ticket_id', ticket.id)
      .order('created_at', { ascending: true });

    const categoryObj = Array.isArray(ticket.category)
      ? ticket.category[0]
      : ticket.category;
    const subcategoryObj = Array.isArray(ticket.subcategory)
      ? ticket.subcategory[0]
      : ticket.subcategory;

    return NextResponse.json({
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        priority: ticket.priority,
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        category: categoryObj?.name || 'General',
        subcategory: subcategoryObj?.name || null,
        customer_name: customer?.full_name || ticket.guest_name || 'Customer',
      },
      messages: messages || [],
      attachments: attachments || [],
    });
  } catch (err: any) {
    console.error('Status Check API Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
