import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { sendTicketUpdateEmail } from '@/lib/resend';

/**
 * Ticket Messages API
 * POST — Add a message (customer reply, staff reply, or internal note)
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
    const { id: ticketId } = await params;
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    const supabase = await getSupabaseAdmin(cookieStore);
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
        id, ticket_number, customer_id, status, guest_email,
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

      if (cleanEmail !== customerEmail && cleanEmail !== guestEmail) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }

      senderType = 'customer';
      messageVisibility = 'customer';
      senderId = null;
    }

    // Insert message
    const { data: newMessage, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: senderType,
        sender_id: senderId,
        message: message.trim(),
        visibility: messageVisibility,
      })
      .select('id, sender_type, sender_id, message, visibility, created_at')
      .single();

    if (error) {
      console.error('Message insert error:', error);
      return NextResponse.json(
        { error: 'Failed to add message' },
        { status: 500 }
      );
    }

    // Insert attachments if provided
    if (body.attachments && Array.isArray(body.attachments)) {
      const attachmentsToInsert = body.attachments.map((att: any) => ({
        ticket_id: ticketId,
        message_id: newMessage.id,
        uploaded_by: senderId || null,
        file_name: att.file_name,
        file_type: att.file_type,
        file_size: att.file_size || 0,
        storage_url: att.storage_url,
      }));

      const { error: attachError } = await supabase
        .from('support_attachments')
        .insert(attachmentsToInsert);

      if (attachError) {
        console.error('Failed to insert message attachments:', attachError);
      }
    }

    // Audit log
    await supabase.from('support_audit_logs').insert({
      ticket_id: ticketId,
      actor_id: senderId,
      actor_type: senderType,
      action:
        messageVisibility === 'internal'
          ? 'internal_note_added'
          : `${senderType}_reply`,
      new_value: { message_id: newMessage.id, visibility: messageVisibility },
    });

    // Update ticket status based on who replied
    const statusUpdates: any = {};

    if (isStaff && messageVisibility === 'customer') {
      // Staff replied to customer
      if (ticket.status === 'new') {
        statusUpdates.status = 'open';
        statusUpdates.first_response_at = new Date().toISOString();
      }
      // If was waiting for customer and staff responds, could mean follow-up
    } else if (!isStaff) {
      // Customer replied
      if (ticket.status === 'waiting_for_customer') {
        statusUpdates.status = 'open';
      }
    }

    if (Object.keys(statusUpdates).length > 0) {
      await supabase
        .from('support_tickets')
        .update(statusUpdates)
        .eq('id', ticketId);
    }

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

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (err: any) {
    console.error('Messages POST Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
