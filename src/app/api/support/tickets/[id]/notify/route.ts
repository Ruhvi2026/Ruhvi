import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Ticket Notification Endpoint
 * POST — Trigger email notifications for ticket events
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

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params;
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdmin(cookieStore);
    const body = await req.json();
    const { type } = body;

    // Fetch ticket with customer info
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select(
        `
        id, ticket_number, title, description, status, priority, created_at,
        customer:customer_id(id, full_name, email),
        category:category_id(name)
      `
      )
      .eq('id', ticketId)
      .single();

    const customer = Array.isArray(ticket.customer)
      ? ticket.customer[0]
      : ticket.customer;

    if (!ticket || !customer?.email) {
      return NextResponse.json(
        { error: 'Ticket or customer not found' },
        { status: 404 }
      );
    }

    // Dynamic import to avoid loading resend in non-email contexts
    const { sendSupportTicketEmail } = await import('@/lib/resend');

    switch (type) {
      case 'ticket_created':
        await sendSupportTicketEmail(customer.email, {
          type: 'created',
          ticket: {
            number: ticket.ticket_number,
            title: ticket.title,
            description: ticket.description,
            status: 'New',
            priority: ticket.priority,
            category: ticket.category?.name || 'General',
            created_at: new Date(ticket.created_at).toLocaleDateString(
              'en-IN',
              {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }
            ),
          },
          customer: {
            name: customer.full_name || 'Customer',
          },
        });
        break;

      case 'staff_reply':
        await sendSupportTicketEmail(customer.email, {
          type: 'reply',
          ticket: {
            number: ticket.ticket_number,
            title: ticket.title,
          },
          customer: {
            name: customer.full_name || 'Customer',
          },
          reply_preview: body.reply_preview || '',
        });
        break;

      case 'status_changed':
        // Only send for customer-facing status changes
        const customerStatuses = ['resolved', 'closed', 'waiting_for_customer'];
        if (body.new_status && customerStatuses.includes(body.new_status)) {
          const statusLabels: Record<string, string> = {
            waiting_for_customer: 'Waiting for Your Response',
            resolved: 'Resolved',
            closed: 'Closed',
          };
          await sendSupportTicketEmail(customer.email, {
            type: 'status_update',
            ticket: {
              number: ticket.ticket_number,
              title: ticket.title,
              new_status: statusLabels[body.new_status] || body.new_status,
            },
            customer: {
              name: customer.full_name || 'Customer',
            },
          });
        }
        break;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Ticket notification error:', err);
    return NextResponse.json({ error: 'Notification failed' }, { status: 500 });
  }
}
