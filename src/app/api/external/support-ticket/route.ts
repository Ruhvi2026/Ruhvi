import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, hashApiKey, hasPermission } from '@/lib/api-keys';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

// ---------------------------------------------------------------------------
// Helper to authenticate request and check scopes
// ---------------------------------------------------------------------------
async function getAuthenticatedKey(
  req: NextRequest,
  minLevel: 'read' | 'write' | 'admin'
) {
  const rawKey = extractBearerToken(req.headers.get('authorization'));
  if (!rawKey) {
    return { error: 'Unauthorized', status: 401 };
  }

  const keyHash = hashApiKey(rawKey);
  const supabaseAuth = getServiceClient();
  const { data: keyRow } = await supabaseAuth
    .from('api_keys')
    .select('id, name, scopes, revoked_at')
    .eq('key_hash', keyHash)
    .maybeSingle();

  if (!keyRow || keyRow.revoked_at !== null) {
    return { error: 'Unauthorized', status: 401 };
  }

  const scopes: string[] = Array.isArray(keyRow.scopes) ? keyRow.scopes : [];
  if (!hasPermission(scopes, 'support_ticket', minLevel)) {
    return { error: 'Forbidden', status: 403 };
  }

  return { keyId: keyRow.id, keyName: keyRow.name, scopes };
}

// ---------------------------------------------------------------------------
// GET /api/external/support-ticket
// Read list of tickets or detail view (with conversation thread)
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'read');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get('ticketId');
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(searchParams.get('limit')) || 20)
  );

  const supabase = getServiceClient();

  if (ticketId) {
    // Detail mode with messages
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('*, customer:users!customer_id(id, first_name, last_name, email)')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) {
      console.error('[external/support-ticket GET] Detail error:', ticketError);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }
    if (!ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Fetch conversation
    const { data: messages, error: msgsError } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });

    return NextResponse.json(
      {
        success: true,
        ticket: { ...ticket, messages: messages || [] },
      },
      { status: 200 }
    );
  } else {
    // List mode
    const offset = (page - 1) * limit;
    const {
      data: tickets,
      error,
      count,
    } = await supabase
      .from('support_tickets')
      .select('*', { count: 'exact' })
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[external/support-ticket GET] List error:', error);
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        tickets: tickets || [],
        pagination: { page, limit, total: count || 0 },
      },
      { status: 200 }
    );
  }
}

// ---------------------------------------------------------------------------
// PUT /api/external/support-ticket
// Respond, change status, assign to staff (Admin only)
// ---------------------------------------------------------------------------
export async function PUT(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'write');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: Record<string, any>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const ticketId = body.ticketId as string | undefined;
  if (!ticketId) {
    return NextResponse.json(
      { error: '`ticketId` is required' },
      { status: 422 }
    );
  }

  const action = body.action as string | undefined;
  const supabase = getServiceClient();

  let messageResponse = false;
  let statusUpdated = false;
  let assignmentUpdated = false;

  // 1. Respond Action
  if (action === 'respond' || body.message) {
    const replyText = body.message as string | undefined;
    if (!replyText) {
      return NextResponse.json(
        { error: '`message` is required for respond action' },
        { status: 422 }
      );
    }

    // We log external API responses as 'system' sender type per our implementation plan
    const { error: msgError } = await supabase.from('support_messages').insert({
      ticket_id: ticketId,
      sender_type: 'system',
      message: replyText,
      visibility: body.visibility === 'internal' ? 'internal' : 'customer',
    });

    if (msgError) {
      console.error(
        '[external/support-ticket PUT] Message insert error:',
        msgError
      );
      return NextResponse.json(
        { error: 'Failed to insert response message' },
        { status: 500 }
      );
    }
    messageResponse = true;
  }

  // 2. Change Status Action
  if (body.status) {
    const newStatus = body.status;
    const { error: statusError } = await supabase
      .from('support_tickets')
      .update({ status: newStatus })
      .eq('id', ticketId);

    if (statusError) {
      console.error(
        '[external/support-ticket PUT] Status update error:',
        statusError
      );
      return NextResponse.json(
        { error: 'Failed to update ticket status' },
        { status: 500 }
      );
    }
    statusUpdated = true;

    // Dual-log into support_audit_logs
    await supabase.from('support_audit_logs').insert({
      ticket_id: ticketId,
      actor_type: 'system',
      action: 'status_changed',
      details: `Status changed to ${newStatus} via External API`,
      metadata: { apiKey: auth.keyId },
    });
  }

  // 3. Assign Staff Action (Admin Only)
  if (body.assigned_to !== undefined || action === 'assign') {
    if (!hasPermission(auth.scopes, 'support_ticket', 'admin')) {
      return NextResponse.json(
        { error: 'Forbidden: `assign` action requires Admin scope' },
        { status: 403 }
      );
    }

    const assignedUserId = body.assigned_to;
    const { error: assignError } = await supabase
      .from('support_tickets')
      .update({ assigned_to: assignedUserId })
      .eq('id', ticketId);

    if (assignError) {
      return NextResponse.json(
        { error: 'Failed to assign ticket' },
        { status: 500 }
      );
    }
    assignmentUpdated = true;

    // Optional: Log to support_assignments history table if needed, though status/audit is main priority.
    await supabase.from('support_audit_logs').insert({
      ticket_id: ticketId,
      actor_type: 'system',
      action: 'assigned',
      details: `Ticket assigned to ${assignedUserId || 'Unassigned'} via External API`,
      metadata: { apiKey: auth.keyId },
    });
  }

  if (!messageResponse && !statusUpdated && !assignmentUpdated) {
    return NextResponse.json(
      {
        error:
          'No valid update fields provided (requires `message`, `status`, or `assigned_to`)',
      },
      { status: 422 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_TICKET_UPDATE',
    entityType: 'ticket',
    entityId: ticketId,
    changes: {
      messageResponse,
      statusUpdated,
      assignmentUpdated,
      apiKey: auth.keyId,
    },
  });

  return NextResponse.json(
    { success: true, message: 'Ticket updated successfully' },
    { status: 200 }
  );
}

// ---------------------------------------------------------------------------
// DELETE /api/external/support-ticket
// Delete support ticket (Admin only)
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  const auth = await getAuthenticatedKey(req, 'admin');
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { searchParams } = new URL(req.url);
  const ticketId = searchParams.get('ticketId');

  if (!ticketId) {
    return NextResponse.json(
      { error: '`ticketId` is required in query parameters' },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  const { error } = await supabase
    .from('support_tickets')
    .delete()
    .eq('id', ticketId);

  if (error) {
    console.error('[external/support-ticket DELETE] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete support ticket: ' + error.message },
      { status: 500 }
    );
  }

  await logAuditEvent({
    portal: 'admin',
    action: 'EXTERNAL_API_TICKET_DELETE',
    entityType: 'ticket',
    entityId: ticketId,
    changes: { apiKey: auth.keyId },
  });

  return NextResponse.json(
    { success: true, message: 'Support ticket deleted successfully' },
    { status: 200 }
  );
}
