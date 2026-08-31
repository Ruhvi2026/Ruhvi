import React, { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Users, TrendingUp, AlertTriangle, Clock } from 'lucide-react';
import { getServerUser } from '@/lib/auth/server';
import { redirect } from 'next/navigation';
import ProductivityFilters from './ProductivityFilters';
import ProductivityTable, { type StaffRow } from './ProductivityTable';
import ProductivityConfigPanel from './ProductivityConfigPanel';

// ─── Helper: default date range (last 30 days) ───────────────────────────────
function getDefaultRange() {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const from = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { from, to };
}

function validateDate(d: string | undefined): string | null {
  if (!d) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return null;
  return d;
}

function formatHours(h: number | null): string {
  if (h === null) return '—';
  if (h < 1) return `${Math.round(h * 60)}m`;
  return `${h.toFixed(1)}h`;
}

export default async function StaffProductivityPage({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    sort_by?: string;
    sort_dir?: string;
    role_filter?: string;
    staff_id?: string;
  }>;
}) {
  // ── Auth guard ─────────────────────────────────────────────────────────────
  const { user } = await getServerUser();
  if (!user) {
    redirect('/admin/login');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  // Verify super_admin (additional server-side check beyond middleware)
  const { data: callerUser } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (
    !callerUser ||
    !['super_admin', 'admin'].includes(callerUser.role)
  ) {
    redirect('/admin/dashboard');
  }

  const isSuperAdmin = callerUser.role === 'super_admin';

  // ── Parse search params ────────────────────────────────────────────────────
  const resolvedParams = await searchParams;
  const defaults = getDefaultRange();
  const from = validateDate(resolvedParams.from) ?? defaults.from;
  const to = validateDate(resolvedParams.to) ?? defaults.to;
  const safeFrom = from <= to ? from : to;
  const safeTo = to;

  const sortBy = resolvedParams.sort_by || 'activity_actions';
  const sortDir = resolvedParams.sort_dir === 'asc' ? 'asc' : 'desc';
  const roleFilter = resolvedParams.role_filter || '';
  const staffId = resolvedParams.staff_id || '';

  const fromISO = `${safeFrom}T00:00:00.000Z`;
  const toISO = `${safeTo}T23:59:59.999Z`;

  // ── Parallel data fetches ──────────────────────────────────────────────────
  const [productivityResult, configResult, staffListResult] = await Promise.all([
    // Call the RPC
    supabase.rpc('get_staff_productivity', {
      p_from: fromISO,
      p_to: toISO,
      p_staff_id: staffId || null,
    }),
    // Load config from settings
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'super_admin_productivity_config')
      .maybeSingle(),
    // Staff list for the filter dropdown
    supabase
      .from('users')
      .select('id, full_name, role')
      .not('role', 'in', '("customer","guest")')
      .order('full_name'),
  ]);

  let rows: StaffRow[] = (productivityResult.data || []) as StaffRow[];
  const config = configResult.data?.value || null;
  const staffList = (staffListResult.data || []).map((u) => ({
    id: u.id,
    full_name: u.full_name || u.id,
    role: u.role,
  }));

  // Filter by role client-side (simpler than extra RPC param)
  if (roleFilter) {
    rows = rows.filter((r) => r.role === roleFilter);
  }

  // ── Summary stats ──────────────────────────────────────────────────────────
  const negligenceDays = config?.negligence_threshold_days ?? 3;
  const totalStaff = rows.length;
  const negligentCount = rows.filter((r) => {
    if (!r.last_active_at) return true;
    const days =
      (Date.now() - new Date(r.last_active_at).getTime()) /
      (1000 * 60 * 60 * 24);
    return days >= negligenceDays;
  }).length;

  const avgResponseHrs =
    rows.length > 0
      ? rows
          .filter((r) => r.avg_first_response_hrs !== null)
          .reduce((sum, r) => sum + (r.avg_first_response_hrs ?? 0), 0) /
        Math.max(
          1,
          rows.filter((r) => r.avg_first_response_hrs !== null).length
        )
      : null;

  const totalOrdersHandled = rows.reduce((s, r) => s + r.orders_handled, 0);
  const totalTicketsClosed = rows.reduce((s, r) => s + r.tickets_closed, 0);
  const totalOverdue = rows.reduce((s, r) => s + r.tickets_overdue, 0);

  return (
    <div className="mx-auto max-w-[1400px] space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold text-white">Staff Productivity</h1>
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            Live
          </span>
        </div>
        <p className="text-xs text-slate-500">
          Per-staff performance metrics for the selected period ·{' '}
          <span className="font-semibold text-slate-400">
            {new Date(safeFrom).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}{' '}
            →{' '}
            {new Date(safeTo).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </p>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-500/10">
              <Users className="h-4.5 w-4.5 text-blue-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Staff Members
              </p>
              <p className="text-xl font-bold text-white">{totalStaff}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">In selected period</p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Orders Handled
              </p>
              <p className="text-xl font-bold text-white">
                {totalOrdersHandled.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            {totalTicketsClosed} tickets closed
          </p>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10">
              <Clock className="h-4.5 w-4.5 text-cyan-400" />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Avg Response
              </p>
              <p className="text-xl font-bold text-white">
                {formatHours(avgResponseHrs)}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            Across all staff in period
          </p>
        </div>

        <div
          className={`rounded-2xl border p-5 ${
            negligentCount > 0
              ? 'border-amber-500/20 bg-amber-500/5'
              : 'border-white/5 bg-[#131726]'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                negligentCount > 0 ? 'bg-amber-500/10' : 'bg-slate-500/10'
              }`}
            >
              <AlertTriangle
                className={`h-4.5 w-4.5 ${negligentCount > 0 ? 'text-amber-400' : 'text-slate-500'}`}
              />
            </div>
            <div>
              <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                Negligence Flags
              </p>
              <p
                className={`text-xl font-bold ${negligentCount > 0 ? 'text-amber-400' : 'text-white'}`}
              >
                {negligentCount}
              </p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            No activity for {negligenceDays}+ days
          </p>
        </div>
      </div>

      {/* Overdue Alerts Banner */}
      {totalOverdue > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 text-rose-400" />
          <p className="text-xs font-semibold text-rose-400">
            {totalOverdue} support ticket
            {totalOverdue !== 1 ? 's' : ''} overdue SLA across all staff in this
            period
          </p>
        </div>
      )}

      {/* Config Panel — visible to super_admin only */}
      {isSuperAdmin && (
        <Suspense fallback={null}>
          <ProductivityConfigPanel />
        </Suspense>
      )}

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Filters &amp; Sort
        </h2>
        <Suspense
          fallback={
            <div className="h-10 w-full animate-pulse rounded-xl bg-white/5" />
          }
        >
          <ProductivityFilters
            from={safeFrom}
            to={safeTo}
            sortBy={sortBy}
            sortDir={sortDir}
            roleFilter={roleFilter}
            staffId={staffId}
            staffList={staffList}
          />
        </Suspense>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-2xl border border-white/5 bg-[#131726]">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">
              Staff Performance
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {rows.length} member{rows.length !== 1 ? 's' : ''} ·{' '}
              {sortBy.replace(/_/g, ' ')} (
              {sortDir === 'asc' ? 'ascending' : 'descending'})
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              On Track
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              Partial
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-rose-500" />
              Below Target
            </span>
          </div>
        </div>

        <ProductivityTable
          rows={rows}
          config={config}
          sortBy={sortBy}
          sortDir={sortDir}
          from={safeFrom}
          to={safeTo}
        />
      </div>

      {/* Empty state for RPC error */}
      {productivityResult.error && (
        <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 px-4 py-3 text-xs text-rose-400">
          ⚠ Error loading productivity data: {productivityResult.error.message}
          <br />
          Make sure migration 0075 has been applied to your Supabase project.
        </div>
      )}
    </div>
  );
}
