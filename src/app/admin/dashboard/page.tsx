import React from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { getServerUser } from '@/lib/auth/server';
import DashboardTabs from './DashboardTabs';
import SalesDashboard from './SalesDashboard';
import OrdersDashboard from './OrdersDashboard';
import MarketingDashboard from './MarketingDashboard';
import OperationsDashboard from './OperationsDashboard';
import SupportDashboard from './SupportDashboard';

export default async function AdminDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = 'sales' } = await searchParams;

  // Get current admin user from our signed session cookie
  const { user: adminUser } = await getServerUser();

  const renderDashboard = () => {
    switch (tab) {
      case 'sales':
        return <SalesDashboard />;
      case 'orders':
        return <OrdersDashboard />;
      case 'marketing':
        return <MarketingDashboard />;
      case 'operations':
        return <OperationsDashboard />;
      case 'support':
        return <SupportDashboard />;
      default:
        return <SalesDashboard />;
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="mb-0.5 text-xs font-semibold text-emerald-400">
            Welcome back, {adminUser?.email?.split('@')[0] ?? 'Admin'} 👋
          </p>
          <h1 className="text-xl font-bold text-white">Analytics Hub</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <DashboardTabs currentTab={tab} />

      {/* Render Active Dashboard */}
      <div className="mt-6">{renderDashboard()}</div>
    </div>
  );
}
