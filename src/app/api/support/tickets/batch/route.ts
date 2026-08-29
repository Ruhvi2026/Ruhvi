import { NextResponse, NextRequest } from 'next/server';
import {
  getCurrentSupportUser,
  getSupabaseAdminClient,
} from '@/lib/support/serverAuth';

/**
 * POST /api/support/tickets/batch
 * Batch operations for tickets: assign, auto_assign, status, priority.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentSupportUser();
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

    const supabase = await getSupabaseAdminClient();
    const body = await req.json();
    const { ticket_ids, action, value } = body;

    if (!ticket_ids || !Array.isArray(ticket_ids) || ticket_ids.length === 0) {
      return NextResponse.json(
        { error: 'ticket_ids array is required' },
        { status: 400 }
      );
    }

    if (!action) {
      return NextResponse.json(
        { error: 'action is required' },
        { status: 400 }
      );
    }

    const auditEntries: any[] = [];
    const assignmentRecords: any[] = [];

    if (action === 'assign') {
      const assignedTo = value || null;

      // Update tickets
      const { error } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: assignedTo,
          updated_at: new Date().toISOString(),
        })
        .in('id', ticket_ids);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to assign tickets' },
          { status: 500 }
        );
      }

      if (assignedTo) {
        for (const tid of ticket_ids) {
          assignmentRecords.push({
            ticket_id: tid,
            assigned_to: assignedTo,
            assigned_by: user.id,
            assigned_at: new Date().toISOString(),
          });
          auditEntries.push({
            ticket_id: tid,
            actor_id: user.id,
            actor_type: 'staff',
            action: 'batch_assignment',
            new_value: { assigned_to: assignedTo },
          });
        }
      }
    } else if (action === 'status') {
      const validStatuses = [
        'new',
        'open',
        'in_progress',
        'waiting_for_customer',
        'resolved',
        'closed',
      ];
      if (!validStatuses.includes(value)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
      }

      const updates: any = {
        status: value,
        updated_at: new Date().toISOString(),
      };
      if (value === 'resolved') updates.resolved_at = new Date().toISOString();
      if (value === 'closed') updates.closed_at = new Date().toISOString();

      const { error } = await supabase
        .from('support_tickets')
        .update(updates)
        .in('id', ticket_ids);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update status' },
          { status: 500 }
        );
      }

      for (const tid of ticket_ids) {
        auditEntries.push({
          ticket_id: tid,
          actor_id: user.id,
          actor_type: 'staff',
          action: 'batch_status_changed',
          new_value: { status: value },
        });
      }
    } else if (action === 'priority') {
      const validPriorities = ['low', 'normal', 'high', 'urgent'];
      if (!validPriorities.includes(value)) {
        return NextResponse.json(
          { error: 'Invalid priority' },
          { status: 400 }
        );
      }

      const { error } = await supabase
        .from('support_tickets')
        .update({
          priority: value,
          updated_at: new Date().toISOString(),
        })
        .in('id', ticket_ids);

      if (error) {
        return NextResponse.json(
          { error: 'Failed to update priority' },
          { status: 500 }
        );
      }

      for (const tid of ticket_ids) {
        auditEntries.push({
          ticket_id: tid,
          actor_id: user.id,
          actor_type: 'staff',
          action: 'batch_priority_changed',
          new_value: { priority: value },
        });
      }
    } else {
      return NextResponse.json(
        { error: 'Unsupported batch action' },
        { status: 400 }
      );
    }

    if (assignmentRecords.length > 0) {
      await supabase.from('support_assignments').insert(assignmentRecords);
    }
    if (auditEntries.length > 0) {
      await supabase.from('support_ticket_audit_log').insert(auditEntries);
    }

    return NextResponse.json({
      success: true,
      message: `Batch operation '${action}' executed successfully on ${ticket_ids.length} ticket(s)`,
      affected: ticket_ids.length,
    });
  } catch (err: any) {
    console.error('Batch ticket action error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
