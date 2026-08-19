import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Public Ticket Status API
 * GET — Check status of a ticket by ticket number + email (case insensitive)
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
    const ticketNumber = searchParams.get('ticketNumber')?.trim();
    const email = searchParams.get('email')?.trim().toLowerCase();

    if (!ticketNumber || !email) {
      return NextResponse.json(
        { error: 'Ticket number and email are required.' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = await getSupabaseAdmin(cookieStore);

    // 1. Fetch ticket matching number
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select(
        `
        id, ticket_number, title, description, status, priority, created_at, updated_at,
        guest_email, guest_name,
        customer:customer_id(id, full_name, email),
        category:category_id(name),
        subcategory:subcategory_id(name)
      `
      )
      .eq('ticket_number', ticketNumber)
      .maybeSingle();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found. Please verify details.' },
        { status: 404 }
      );
    }

    // 2. Validate email matches either guest_email or customer email
    const customer = Array.isArray(ticket.customer)
      ? ticket.customer[0]
      : ticket.customer;
    const customerEmail = customer?.email?.toLowerCase();
    const guestEmail = ticket.guest_email?.toLowerCase();

    if (customerEmail !== email && guestEmail !== email) {
      return NextResponse.json(
        {
          error: 'Unauthorized. The email provided does not match this ticket.',
        },
        { status: 403 }
      );
    }

    // 3. Fetch public customer-visible messages
    const { data: messages, error: messagesError } = await supabase
      .from('support_messages')
      .select('id, sender_type, message, created_at')
      .eq('ticket_id', ticket.id)
      .eq('visibility', 'customer')
      .order('created_at', { ascending: true });

    if (messagesError) {
      console.error('Messages query error:', messagesError);
    }

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
    });
  } catch (err: any) {
    console.error('Status Check API Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
