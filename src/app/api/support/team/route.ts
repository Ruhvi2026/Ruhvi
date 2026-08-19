import { NextResponse, NextRequest } from 'next/server';
import {
  getCurrentSupportUser,
  getSupabaseAdminClient,
} from '@/lib/support/serverAuth';

/**
 * GET /api/support/team
 * Returns support team members (staff, managers, admins) with active ticket workload and metrics.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentSupportUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStaff = ['admin', 'manager', 'staff'].includes(user.role);
    if (!isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const supabase = await getSupabaseAdminClient();

    // 1. Fetch all users with staff, manager, or admin roles
    const { data: teamMembers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name, email, phone, role, created_at')
      .in('role', ['staff', 'manager', 'admin'])
      .order('full_name', { ascending: true });

    if (usersError) {
      console.error('Failed to fetch team members:', usersError);
      return NextResponse.json(
        { error: 'Failed to fetch team members' },
        { status: 500 }
      );
    }

    // 2. Fetch all active tickets to compute workload per agent
    const { data: activeTickets, error: ticketsError } = await supabase
      .from('support_tickets')
      .select(
        'id, ticket_number, title, status, priority, assigned_to, created_at'
      )
      .in('status', ['new', 'open', 'in_progress', 'waiting_for_customer']);

    if (ticketsError) {
      console.error(
        'Failed to fetch active tickets for workload calculation:',
        ticketsError
      );
    }

    // 3. Fetch resolved tickets count today and this week
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const { data: resolvedTickets } = await supabase
      .from('support_tickets')
      .select('id, assigned_to, resolved_at')
      .in('status', ['resolved', 'closed'])
      .gte('resolved_at', startOfWeek.toISOString());

    // 4. Calculate workloads and stats for each member
    const tickets = activeTickets || [];
    const resolved = resolvedTickets || [];

    const unassignedTickets = tickets.filter((t) => !t.assigned_to);

    const team = (teamMembers || []).map((member) => {
      const assignedActive = tickets.filter((t) => t.assigned_to === member.id);
      const resolvedToday = resolved.filter(
        (t) =>
          t.assigned_to === member.id &&
          t.resolved_at &&
          new Date(t.resolved_at) >= today
      );
      const resolvedThisWeek = resolved.filter(
        (t) => t.assigned_to === member.id
      );

      const activeCount = assignedActive.length;
      let capacityLevel: 'optimal' | 'moderate' | 'heavy' = 'optimal';
      if (activeCount >= 10) capacityLevel = 'heavy';
      else if (activeCount >= 5) capacityLevel = 'moderate';

      return {
        id: member.id,
        full_name: member.full_name || member.email.split('@')[0],
        email: member.email,
        phone: member.phone,
        role: member.role,
        active_tickets_count: activeCount,
        active_tickets: assignedActive.slice(0, 5), // top 5 recent
        resolved_today_count: resolvedToday.length,
        resolved_week_count: resolvedThisWeek.length,
        capacity_level: capacityLevel,
      };
    });

    // Sort by active workload (lowest to highest) so lowest load is first
    team.sort((a, b) => a.active_tickets_count - b.active_tickets_count);

    return NextResponse.json({
      team,
      total_staff: team.length,
      unassigned_count: unassignedTickets.length,
      unassigned_tickets: unassignedTickets.slice(0, 10),
    });
  } catch (err: any) {
    console.error('Support Team GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
