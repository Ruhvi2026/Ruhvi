import React from 'react';
import { createClient } from '@supabase/supabase-js';
import { Headphones, CheckCircle2, Clock, Users } from 'lucide-react';

export default async function SupportDashboard() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: tickets } = await supabase.from('support_tickets').select(`
      id,
      status,
      created_at,
      first_response_at,
      assigned_to,
      assignee:users!support_tickets_assigned_to_fkey(full_name, email)
    `);

  const totalTickets = (tickets || []).length;
  const resolvedTickets = (tickets || []).filter(
    (t) => t.status === 'resolved' || t.status === 'closed'
  ).length;

  const resolutionRate =
    totalTickets > 0
      ? ((resolvedTickets / totalTickets) * 100).toFixed(1)
      : '100.0';

  // Calculate Avg Response Time
  let totalResponseMs = 0;
  let respondedCount = 0;
  (tickets || []).forEach((t) => {
    if (t.first_response_at && t.created_at) {
      const diff =
        new Date(t.first_response_at).getTime() -
        new Date(t.created_at).getTime();
      if (diff > 0) {
        totalResponseMs += diff;
        respondedCount++;
      }
    }
  });

  const avgResponseHrs =
    respondedCount > 0
      ? (totalResponseMs / respondedCount / (1000 * 60 * 60)).toFixed(1)
      : '—';

  // Calculate Agent workloads
  const agentMap: Record<
    string,
    { name: string; email: string; count: number }
  > = {};
  (tickets || []).forEach((t) => {
    if (t.assigned_to) {
      const assigneeObj = Array.isArray(t.assignee)
        ? t.assignee[0]
        : t.assignee;
      const name = assigneeObj?.full_name || 'Support Executive';
      const email = assigneeObj?.email || 'N/A';
      if (!agentMap[t.assigned_to]) {
        agentMap[t.assigned_to] = { name, email, count: 0 };
      }
      agentMap[t.assigned_to].count++;
    }
  });

  const agentsList = Object.values(agentMap).sort((a, b) => b.count - a.count);
  const activeAgentsCount = Object.keys(agentMap).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Headphones className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Total Tickets
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{totalTickets}</p>
          <p className="mt-1 text-xs text-slate-500">Historical Lifetime</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Resolved</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {resolvedTickets}
          </p>
          <p className="mt-1 text-xs text-emerald-400">
            {resolutionRate}% Resolution Rate
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Avg Response Time
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {avgResponseHrs} {avgResponseHrs !== '—' ? 'Hrs' : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            From creation to response
          </p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Active Agents
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {activeAgentsCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Handling support queue</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Agent Workloads
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
                <th className="pb-3 font-medium">Agent Name</th>
                <th className="pb-3 font-medium">Agent Email</th>
                <th className="pb-3 text-right font-medium">Tickets Handled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {agentsList.map((agent, i) => (
                <tr key={i} className="transition-colors hover:bg-white/5">
                  <td className="py-3 font-medium text-white">{agent.name}</td>
                  <td className="py-3 text-slate-400">{agent.email}</td>
                  <td className="py-3 text-right font-semibold text-emerald-400">
                    {agent.count}
                  </td>
                </tr>
              ))}
              {agentsList.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="py-8 text-center text-xs text-slate-600"
                  >
                    No active support assignments found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
