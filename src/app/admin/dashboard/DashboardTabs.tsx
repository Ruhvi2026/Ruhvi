import Link from 'next/link';

export default function DashboardTabs({ currentTab }: { currentTab: string }) {
  const tabs = [
    { id: 'sales', label: 'Sales & Revenue' },
    { id: 'orders', label: 'Order Analytics' },
    { id: 'marketing', label: 'Marketing & Ads' },
    { id: 'operations', label: 'Operations & Stock' },
    { id: 'support', label: 'Support & Tickets' },
  ];

  return (
    <div className="flex w-full overflow-x-auto border-b border-white/10 pb-px">
      {tabs.map((tab) => {
        const isActive = currentTab === tab.id;
        return (
          <Link
            key={tab.id}
            href={`/admin/dashboard?tab=${tab.id}`}
            className={`whitespace-nowrap border-b-2 px-6 py-3 text-sm font-medium transition-colors ${
              isActive
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-300'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
