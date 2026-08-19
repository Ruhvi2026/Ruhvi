import React from 'react';
import { Headphones, CheckCircle2, Clock, Users } from 'lucide-react';

export default function SupportDashboard() {
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
          <p className="mt-2 text-2xl font-bold text-white">342</p>
          <p className="mt-1 text-xs text-slate-500">This month</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Resolved</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">310</p>
          <p className="mt-1 text-xs text-emerald-400">90.6% Resolution Rate</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Avg Resolution Time
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">4.2 Hrs</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Users className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Active Agents
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">4</p>
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">
          Agent Performance
        </h3>
        <table className="w-full text-left text-sm text-slate-300">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase text-slate-500">
              <th className="pb-3 font-medium">Agent Name</th>
              <th className="pb-3 font-medium">Tickets Handled</th>
              <th className="pb-3 font-medium">Avg Response</th>
              <th className="pb-3 font-medium">Customer Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            <tr>
              <td className="py-3">Sarah Connor</td>
              <td className="py-3">124</td>
              <td className="py-3">2.1 Hrs</td>
              <td className="py-3 text-emerald-400">4.8/5</td>
            </tr>
            <tr>
              <td className="py-3">John Doe</td>
              <td className="py-3">98</td>
              <td className="py-3">3.4 Hrs</td>
              <td className="py-3 text-emerald-400">4.5/5</td>
            </tr>
            <tr>
              <td className="py-3">Alice Smith</td>
              <td className="py-3">88</td>
              <td className="py-3">1.5 Hrs</td>
              <td className="py-3 text-emerald-400">4.9/5</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
