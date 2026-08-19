import { NextResponse, NextRequest } from 'next/server';
import {
  getCurrentSupportUser,
  getSupabaseAdminClient,
} from '@/lib/support/serverAuth';

/**
 * POST /api/support/auto-assign
 * Automatically distributes unassigned support tickets to staff members with the lowest workload.
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
    const body = await req.json().catch(() => ({}));
    const { ticket_id, ticket_ids, all_unassigned = false } = body;

    // 1. Fetch all eligible staff members
    const { data: staffMembers, error: staffError } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .in('role', ['staff', 'manager', 'admin'])
      .order('full_name', { ascending: true });

    if (staffError || !staffMembers || staffMembers.length === 0) {
      return NextResponse.json(
        { error: 'No support staff members available for assignment' },
        { status: 400 }
      );
    }

    // 2. Fetch current active tickets count per staff member
    const { data: activeTickets, error: activeTicketsError } = await supabase
      .from('support_tickets')
      .select('id, assigned_to')
      .in('status', ['new', 'open', 'in_progress', 'waiting_for_customer'])
      .not('assigned_to', 'is', null);

    if (activeTicketsError) {
      console.error('Error fetching active tickets:', activeTicketsError);
    }

    // Initialize workload tracking map: staffId -> active count
    const workloadMap = new Map<string, number>();
    staffMembers.forEach((s) => workloadMap.set(s.id, 0));

    (activeTickets || []).forEach((t) => {
      if (t.assigned_to && workloadMap.has(t.assigned_to)) {
        workloadMap.set(
          t.assigned_to,
          (workloadMap.get(t.assigned_to) || 0) + 1
        );
      }
    });

    // 3. Find tickets to assign
    let ticketsToAssign: any[] = [];

    if (ticket_id) {
      const { data: singleTicket } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, assigned_to')
        .eq('id', ticket_id)
        .maybeSingle();

      if (singleTicket) ticketsToAssign = [singleTicket];
    } else if (
      ticket_ids &&
      Array.isArray(ticket_ids) &&
      ticket_ids.length > 0
    ) {
      const { data: batchTickets } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, assigned_to')
        .in('id', ticket_ids);

      ticketsToAssign = batchTickets || [];
    } else if (all_unassigned) {
      const { data: unassignedList } = await supabase
        .from('support_tickets')
        .select('id, ticket_number, title, status, assigned_to')
        .is('assigned_to', null)
        .in('status', ['new', 'open', 'in_progress', 'waiting_for_customer'])
        .order('created_at', { ascending: true });

      ticketsToAssign = unassignedList || [];
    } else {
      return NextResponse.json(
        {
          error:
            'Please specify ticket_id, ticket_ids, or all_unassigned: true',
        },
        { status: 400 }
      );
    }

    if (ticketsToAssign.length === 0) {
      return NextResponse.json({
        message: 'No unassigned tickets found to distribute',
        assigned_count: 0,
        results: [],
      });
    }

    const assignmentResults: any[] = [];
    const auditLogs: any[] = [];
    const assignmentRecords: any[] = [];

    // Prioritize 'staff' role first if available, else 'manager' or 'admin'
    // To do fair least-workload distribution:
    for (const ticket of ticketsToAssign) {
      // Find staff with lowest current workload count
      let minLoad = Infinity;
      let chosenStaff: any = null;

      // First try among role === 'staff'
      const dedicatedStaff = staffMembers.filter((s) => s.role === 'staff');
      const candidatePool =
        dedicatedStaff.length > 0 ? dedicatedStaff : staffMembers;

      for (const candidate of candidatePool) {
        const currentLoad = workloadMap.get(candidate.id) || 0;
        if (currentLoad < minLoad) {
          minLoad = currentLoad;
          chosenStaff = candidate;
        }
      }

      if (!chosenStaff) {
        chosenStaff = candidatePool[0];
      }

      // Assign ticket to chosenStaff
      const newStatus = ticket.status === 'new' ? 'open' : ticket.status;

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update({
          assigned_to: chosenStaff.id,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticket.id);

      if (!updateError) {
        // Increment workload count locally so subsequent tickets balance evenly
        workloadMap.set(
          chosenStaff.id,
          (workloadMap.get(chosenStaff.id) || 0) + 1
        );

        // Record assignment
        assignmentRecords.push({
          ticket_id: ticket.id,
          assigned_to: chosenStaff.id,
          assigned_by: user.id,
          assigned_at: new Date().toISOString(),
        });

        // Record audit log
        auditLogs.push({
          ticket_id: ticket.id,
          actor_id: user.id,
          actor_type: 'system',
          action: 'auto_assigned_workload',
          old_value: { assigned_to: ticket.assigned_to },
          new_value: {
            assigned_to: chosenStaff.id,
            staff_name: chosenStaff.full_name || chosenStaff.email,
            workload_after: workloadMap.get(chosenStaff.id),
          },
        });

        assignmentResults.push({
          ticket_id: ticket.id,
          ticket_number: ticket.ticket_number,
          title: ticket.title,
          assigned_to: {
            id: chosenStaff.id,
            name: chosenStaff.full_name || chosenStaff.email.split('@')[0],
            email: chosenStaff.email,
            role: chosenStaff.role,
          },
          current_active_load: workloadMap.get(chosenStaff.id),
        });
      }
    }

    // Insert batch assignment records & audit logs
    if (assignmentRecords.length > 0) {
      await supabase.from('support_assignments').insert(assignmentRecords);
    }
    if (auditLogs.length > 0) {
      await supabase.from('support_audit_logs').insert(auditLogs);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully auto-assigned ${assignmentResults.length} ticket(s) based on lowest workload`,
      assigned_count: assignmentResults.length,
      results: assignmentResults,
    });
  } catch (err: any) {
    console.error('Auto-assign Error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
