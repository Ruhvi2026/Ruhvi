'use client';

import React, { useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, ChevronDown } from 'lucide-react';
import DateRangePicker from '@/app/admin/dashboard/DateRangePicker';

interface StaffMember {
  id: string;
  full_name: string;
  role: string;
}

interface ProductivityFiltersProps {
  from: string;
  to: string;
  sortBy: string;
  sortDir: string;
  roleFilter: string;
  staffId: string;
  staffList: StaffMember[];
}

const SORT_OPTIONS = [
  { value: 'full_name', label: 'Name' },
  { value: 'orders_handled', label: 'Orders Handled' },
  { value: 'tickets_total', label: 'Tickets Total' },
  { value: 'tickets_closed', label: 'Tickets Closed' },
  { value: 'tickets_overdue', label: 'Tickets Overdue' },
  { value: 'avg_first_response_hrs', label: 'Avg Response Time' },
  { value: 'avg_resolution_hrs', label: 'Avg Resolution Time' },
  { value: 'activity_actions', label: 'Activity Actions' },
  { value: 'inventory_movements', label: 'Inventory Movements' },
  { value: 'last_active_at', label: 'Last Active' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'All Roles' },
  { value: 'super_admin', label: 'Super Admin' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
  { value: 'operations_manager', label: 'Ops Manager' },
  { value: 'orders_manager', label: 'Orders Manager' },
  { value: 'support_manager', label: 'Support Manager' },
  { value: 'operations_staff', label: 'Ops Staff' },
  { value: 'orders_staff', label: 'Orders Staff' },
  { value: 'support_staff', label: 'Support Staff' },
];

const SELECT_STYLE =
  'appearance-none rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 pr-8';

export default function ProductivityFilters({
  from,
  to,
  sortBy,
  sortDir,
  roleFilter,
  staffId,
  staffList,
}: ProductivityFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function push(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '') {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }

  function toggleSortDir() {
    push({ sort_dir: sortDir === 'asc' ? 'desc' : 'asc' });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Date Range */}
      <DateRangePicker from={from} to={to} />

      {/* Role filter */}
      <div className="relative">
        <select
          value={roleFilter}
          onChange={(e) => push({ role_filter: e.target.value })}
          disabled={isPending}
          className={SELECT_STYLE}
        >
          {ROLE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-500" />
      </div>

      {/* Staff selector */}
      <div className="relative">
        <select
          value={staffId}
          onChange={(e) => push({ staff_id: e.target.value })}
          disabled={isPending}
          className={`${SELECT_STYLE} max-w-[180px]`}
        >
          <option value="">All Staff</option>
          {staffList.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-500" />
      </div>

      {/* Sort column */}
      <div className="relative">
        <select
          value={sortBy}
          onChange={(e) => push({ sort_by: e.target.value })}
          disabled={isPending}
          className={SELECT_STYLE}
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              Sort: {o.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 text-slate-500" />
      </div>

      {/* Sort direction toggle */}
      <button
        onClick={toggleSortDir}
        disabled={isPending}
        title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
        className="flex items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-400 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
      >
        {sortDir === 'asc' ? '↑ Asc' : '↓ Desc'}
      </button>

      {isPending && (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
      )}
    </div>
  );
}
