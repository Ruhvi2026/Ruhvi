import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { sendTicketUpdateEmail } from '@/lib/resend';
import { pushMessageToEspo } from '@/lib/espo/sync';

/**
 * Ticket Messages API
 * POST — Add a message (customer reply, staff reply, or internal note)
 */

import { getServiceClient } from '@/lib/supabase/service';

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;

  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;

    const supabase = getServiceClient();
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
    const { id: ticketId } = await params;
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    const supabase = getServiceClient();
    const body = await req.json();
    const { message, visibility, email } = body;

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Verify ticket existence and retrieve details
    const { data: ticket } = await supabase
      .from('support_tickets')
      .select(
        `
        id, ticket_number, customer_id, status, guest_email, customer_email,
        customer:customer_id(email)
      `
      )
      .eq('id', ticketId)
      .maybeSingle();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    let senderType: string;
    let messageVisibility: string;
    let isStaff = false;
    let senderId: string | null = null;

    if (user) {
      isStaff = [
        'super_admin',
        'SUPER_ADMIN',
        'admin',
        'manager',
        'staff',
      ].includes(user.role);
      senderId = user.id;

      // Customers can only message on their own tickets
      if (!isStaff && ticket.customer_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      if (isStaff) {
        senderType = 'staff';
        messageVisibility = visibility === 'internal' ? 'internal' : 'customer';
      } else {
        senderType = 'customer';
        messageVisibility = 'customer';
      }
    } else {
      // Guest user posting comment
      if (!email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const cleanEmail = email.trim().toLowerCase();
      const customerObj = Array.isArray(ticket.customer)
        ? ticket.customer[0]
        : ticket.customer;
      const customerEmail = customerObj?.email?.toLowerCase();
      const guestEmail = ticket.guest_email?.toLowerCase();
      const ticketCustomerEmail = ticket.customer_email?.toLowerCase();

      const emailMatches =
        (customerEmail && customerEmail === cleanEmail) ||
        (guestEmail && guestEmail === cleanEmail) ||
        (ticketCustomerEmail && ticketCustomerEmail === cleanEmail);

      if (!emailMatches) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      senderType = 'customer';
      messageVisibility = 'customer';
      senderId = null;
    }

    // Insert message + attachments + audit log in a single transactional RPC
    // (spec Section 9 — the audit entry is a side effect of the write itself).
    const attachmentsPayload =
      body.attachments && Array.isArray(body.attachments)
        ? body.attachments.map((att: any) => ({
            file_name: att.file_name,
            file_type: att.file_type,
            file_size: att.file_size || 0,
            storage_url: att.storage_url,
            cloudinary_public_id: att.cloudinary_public_id || null,
          }))
        : [];

    const { data: rpcResult, error } = await supabase.rpc(
      'support_add_ticket_message',
      {
        p_ticket_id: ticketId,
        p_sender_type: senderType,
        p_sender_id: senderId,
        p_message: message.trim(),
        p_visibility: messageVisibility,
        p_attachments: attachmentsPayload,
        p_actor_id: senderId,
        p_actor_type: senderType,
      }
    );

    if (error) {
      console.error('Message insert RPC error:', error);
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      );
    }

    const newMessage = {
      id: rpcResult?.id,
      sender_type: senderType,
      sender_id: senderId,
      message: message.trim(),
      visibility: messageVisibility,
      created_at: new Date().toISOString(),
    };

    // Send email notification to customer if staff replied
    if (isStaff && messageVisibility === 'customer') {
      try {
        const { data: customerData } = await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', ticket.customer_id)
          .single();

        if (customerData?.email) {
          await sendTicketUpdateEmail(
            ticket.ticket_number || ticket.id,
            message.trim(),
            customerData.email,
            customerData.full_name || 'Customer'
          );
        }
      } catch (emailErr) {
        console.error('Failed to send Ticket Update email:', emailErr);
      }
    }

    // Fire-and-forget sync to EspoCRM (adds note to the Case).
    void pushMessageToEspo(ticketId, {
      sender_type: senderType,
      message: message.trim(),
      visibility: messageVisibility,
      created_at: newMessage.created_at,
    });

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: any) {
    console.error('Messages POST Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
