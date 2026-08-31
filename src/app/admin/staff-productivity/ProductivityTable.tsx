import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MinusCircle,
  Clock,
  Activity,
} from 'lucide-react';

export interface StaffRow {
  staff_id: string;
  full_name: string;
  email: string;
  role: string;
  department_name: string;
  orders_handled: number;
  tickets_total: number;
  tickets_closed: number;
  tickets_overdue: number;
  tickets_open: number;
  avg_first_response_hrs: number | null;
  avg_resolution_hrs: number | null;
  activity_actions: number;
  inventory_movements: number;
  last_active_at: string | null;
}

interface DesignationKpi {
  min_orders: number;
  min_tickets: number;
  max_response_hours: number;
  min_activity_actions: number;
  min_inventory_movements: number;
}

interface ProductivityTableProps {
  rows: StaffRow[];
  config: {
    negligence_threshold_days: number;
    designation_kpis: Record<string, DesignationKpi>;
  } | null;
  sortBy: string;
  sortDir: string;
  from: string;
  to: string;
}

// ── KPI Status calculation ────────────────────────────────────────────────────
function getKpiStatus(
  row: StaffRow,
  config: ProductivityTableProps['config']
): 'green' | 'amber' | 'red' {
  if (!config) return 'amber';
  const thresholds =
    config.designation_kpis[row.role] ||
    config.designation_kpis['staff'] ||
    null;
  if (!thresholds) return 'amber';

  let met = 0;
  let total = 0;

  if (thresholds.min_orders > 0) {
    total++;
    if (row.orders_handled >= thresholds.min_orders) met++;
  }
  if (thresholds.min_tickets > 0) {
    total++;
    if (row.tickets_closed >= thresholds.min_tickets) met++;
  }
  if (thresholds.max_response_hours > 0 && row.avg_first_response_hrs !== null) {
    total++;
    if (row.avg_first_response_hrs <= thresholds.max_response_hours) met++;
  }
  if (thresholds.min_activity_actions > 0) {
    total++;
    if (row.activity_actions >= thresholds.min_activity_actions) met++;
  }
  if (thresholds.min_inventory_movements > 0) {
    total++;
    if (row.inventory_movements >= thresholds.min_inventory_movements) met++;
  }

  if (total === 0) return 'green'; // no applicable thresholds
  const pct = met / total;
  if (pct >= 1) return 'green';
  if (pct >= 0.5) return 'amber';
  return 'red';
}

function isNegligent(
  row: StaffRow,
  thresholdDays: number
): boolean {
  if (!row.last_active_at) return true;
  const lastActive = new Date(row.last_active_at);
  const daysSinceActive =
    (Date.now() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceActive >= thresholdDays;
}

function KpiStatusBadge({ status }: { status: 'green' | 'amber' | 'red' }) {
  if (status === 'green')
    return (
      <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> On Track
      </span>
    );
  if (status === 'amber')
    return (
      <span className="flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
        <MinusCircle className="h-3 w-3" /> Partial
      </span>
    );
  return (
    <span className="flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold text-rose-400">
      <AlertTriangle className="h-3 w-3" /> Below Target
    </span>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colorMap: Record<string, string> = {
    super_admin: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
    admin: 'bg-blue-500/15 text-blue-300 border-blue-500/20',
    manager: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
    operations_manager: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
    orders_manager: 'bg-teal-500/15 text-teal-300 border-teal-500/20',
    support_manager: 'bg-sky-500/15 text-sky-300 border-sky-500/20',
    staff: 'bg-slate-500/15 text-slate-300 border-slate-500/20',
    operations_staff: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/20',
    orders_staff: 'bg-green-500/15 text-green-300 border-green-500/20',
    support_staff: 'bg-lime-500/15 text-lime-300 border-lime-500/20',
  };
  const cls =
    colorMap[role] || 'bg-slate-500/15 text-slate-300 border-slate-500/20';
  const label = role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {label}
    </span>
  );
}

function Cell({ val, dim }: { val: string | number | null; dim?: boolean }) {
  if (val === null || val === undefined)
    return <span className="text-slate-700">—</span>;
  return (
    <span className={dim ? 'text-slate-400' : 'text-white'}>{val}</span>
  );
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

function formatLastActive(dt: string | null): string {
  if (!dt) return 'Never';
  const d = new Date(dt);
  const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  return `${Math.floor(days)}d ago`;
}

const SORT_COL_LABEL: Record<string, string> = {
  full_name: 'Name',
  orders_handled: 'Orders',
  tickets_total: 'Tickets',
  tickets_closed: 'Closed',
  tickets_overdue: 'Overdue',
  avg_first_response_hrs: 'Response',
  avg_resolution_hrs: 'Resolution',
  activity_actions: 'Activity',
  inventory_movements: 'Inv. Moves',
  last_active_at: 'Last Active',
};

export default function ProductivityTable({
  rows,
  config,
  sortBy,
  sortDir,
  from,
  to,
}: ProductivityTableProps) {
  const negligenceDays = config?.negligence_threshold_days ?? 3;

  // Sort the rows on the server side
  const sorted = [...rows].sort((a, b) => {
    let av: any = (a as any)[sortBy];
    let bv: any = (b as any)[sortBy];

    // Null handling — nulls always go to end
    if (av === null) av = sortDir === 'asc' ? Infinity : -Infinity;
    if (bv === null) bv = sortDir === 'asc' ? Infinity : -Infinity;

    if (typeof av === 'string' && typeof bv === 'string') {
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return sortDir === 'asc' ? av - bv : bv - av;
  });

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Activity className="mb-3 h-10 w-10 text-slate-700" />
        <p className="text-sm font-semibold text-slate-500">
          No staff members found
        </p>
        <p className="mt-1 text-xs text-slate-700">
          Try adjusting your filters or date range
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1100px] text-xs">
        <thead>
          <tr className="border-b border-white/5 text-[10px] uppercase tracking-wider text-slate-600">
            <th className="sticky left-0 bg-[#131726] px-4 py-3 text-left font-semibold">
              Staff
            </th>
            <th className="px-4 py-3 text-left font-semibold">Department</th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'orders_handled' ? (
                <span className="text-emerald-400">Orders ↕</span>
              ) : 'Orders'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'tickets_total' ? (
                <span className="text-emerald-400">Total Tickets ↕</span>
              ) : 'Total Tickets'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'tickets_closed' ? (
                <span className="text-emerald-400">Closed ↕</span>
              ) : 'Closed'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'tickets_overdue' ? (
                <span className="text-emerald-400">Overdue ↕</span>
              ) : 'Overdue'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'avg_first_response_hrs' ? (
                <span className="text-emerald-400">Avg Resp ↕</span>
              ) : 'Avg Resp'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'avg_resolution_hrs' ? (
                <span className="text-emerald-400">Avg Resol ↕</span>
              ) : 'Avg Resol'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'activity_actions' ? (
                <span className="text-emerald-400">Activity ↕</span>
              ) : 'Activity'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'inventory_movements' ? (
                <span className="text-emerald-400">Inv. Moves ↕</span>
              ) : 'Inv. Moves'}
            </th>
            <th className="px-4 py-3 text-right font-semibold">
              {sortBy === 'last_active_at' ? (
                <span className="text-emerald-400">Last Active ↕</span>
              ) : 'Last Active'}
            </th>
            <th className="px-4 py-3 text-center font-semibold">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {sorted.map((row) => {
            const status = getKpiStatus(row, config);
            const negligent = isNegligent(row, negligenceDays);

            return (
              <tr
                key={row.staff_id}
                className={`transition-colors hover:bg-white/[0.02] ${
                  negligent ? 'bg-amber-500/[0.03]' : ''
                }`}
              >
                {/* Name + role badge */}
                <td className="sticky left-0 bg-inherit px-4 py-3">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">
                        {row.full_name}
                      </span>
                      {negligent && (
                        <span
                          title={`No activity for >${negligenceDays} days`}
                          className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-400"
                        >
                          ⚠ Negligent
                        </span>
                      )}
                    </div>
                    <RoleBadge role={row.role} />
                    <span className="text-[10px] text-slate-600">
                      {row.email}
                    </span>
                  </div>
                </td>

                {/* Department */}
                <td className="px-4 py-3 capitalize text-slate-400">
                  {row.department_name}
                </td>

                {/* Orders */}
                <td className="px-4 py-3 text-right">
                  <Cell val={row.orders_handled} />
                </td>

                {/* Tickets total */}
                <td className="px-4 py-3 text-right">
                  <Cell val={row.tickets_total} />
                </td>

                {/* Tickets closed */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-emerald-400">
                    {row.tickets_closed}
                  </span>
                </td>

                {/* Tickets overdue */}
                <td className="px-4 py-3 text-right">
                  {row.tickets_overdue > 0 ? (
                    <span className="font-semibold text-rose-400">
                      {row.tickets_overdue}
                    </span>
                  ) : (
                    <span className="text-slate-700">0</span>
                  )}
                </td>

                {/* Avg first response */}
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatHours(row.avg_first_response_hrs)}
                </td>

                {/* Avg resolution */}
                <td className="px-4 py-3 text-right text-slate-300">
                  {formatHours(row.avg_resolution_hrs)}
                </td>

                {/* Activity actions */}
                <td className="px-4 py-3 text-right">
                  <Cell val={row.activity_actions} />
                </td>

                {/* Inventory movements */}
                <td className="px-4 py-3 text-right">
                  <Cell
                    val={row.inventory_movements || 0}
                    dim={row.inventory_movements === 0}
                  />
                </td>

                {/* Last active */}
                <td className="px-4 py-3 text-right">
                  <span
                    className={
                      negligent ? 'text-amber-400' : 'text-slate-400'
                    }
                  >
                    {formatLastActive(row.last_active_at)}
                  </span>
                </td>

                {/* KPI Status */}
                <td className="px-4 py-3 text-center">
                  <KpiStatusBadge status={status} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
