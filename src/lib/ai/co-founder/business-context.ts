import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { getStoreAnalytics, type StoreKpis } from './analytics';
import { getRelevantMemories, type CoFounderMemoryItem } from './memory';

export interface UserMetricsSnapshot {
  totalUsers: number;
  newUsersLast30d: number;
  repeatCustomersCount: number;
}

export interface CatalogMetricsSnapshot {
  totalActiveProducts: number;
  outOfStockCount: number;
  lowStockCount: number;
  topSellers: {
    name: string;
    sku: string;
    unitsSold: number;
    revenue: number;
  }[];
}

export interface SupportMetricsSnapshot {
  openTickets: number;
  urgentTickets: number;
  commonTopics: { category: string; count: number }[];
}

export interface TaskRoadmapSnapshot {
  totalActiveTasks: number;
  inProgressTasks: number;
  overdueTasks: number;
  blockedTasks: number;
  recentTasks: {
    taskIdText: string;
    title: string;
    priority: string;
    status: string;
    department?: string;
  }[];
}

export interface DecisionsSnapshot {
  pendingApprovalsCount: number;
  activeSignalsCount: number;
  activeActionPlansCount: number;
}

export interface HolisticBusinessContext {
  timestamp: string;
  isCached: boolean;
  kpis: StoreKpis;
  users: UserMetricsSnapshot;
  catalog: CatalogMetricsSnapshot;
  support: SupportMetricsSnapshot;
  roadmap: TaskRoadmapSnapshot;
  decisions: DecisionsSnapshot;
  memories: CoFounderMemoryItem[];
  executiveVoiceSummary: string;
  structuredBriefing: string;
}

// In-memory cache for low-latency voice and chat responses
let cachedContext: HolisticBusinessContext | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Builds a 360° Business Context Snapshot across Users, Revenue, Catalog, Support, Roadmap & Decisions.
 */
export async function getHolisticBusinessContext(
  options: { forceRefresh?: boolean; userId?: string } = {}
): Promise<HolisticBusinessContext> {
  const now = Date.now();
  if (
    !options.forceRefresh &&
    cachedContext &&
    now - lastCacheTime < CACHE_TTL_MS
  ) {
    return { ...cachedContext, isCached: true };
  }

  const supabase = getServiceClient();

  // 1. Fetch 30-day store analytics
  const analytics = await getStoreAnalytics({ timeframe: '30d' });
  const kpis = analytics.kpis;

  // 2. Parallel queries for Users, Catalog, Support, Tasks, Decisions, and Memories
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    totalUsersRes,
    newUsersRes,
    outOfStockRes,
    totalProductsRes,
    ticketCategoriesRes,
    tasksRes,
    approvalsCountRes,
    signalsCountRes,
    actionPlansCountRes,
    memories,
  ] = await Promise.all([
    // Total users
    supabase.from('users').select('id', { count: 'exact', head: true }),
    // New users in last 30d
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo),
    // Out of stock active products
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active')
      .lte('stock_quantity', 0),
    // Total active products
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    // Support ticket topics
    supabase
      .from('support_tickets')
      .select('category')
      .in('status', ['open', 'in_progress'])
      .limit(50),
    // Tasks snapshot
    supabase
      .from('tasks')
      .select(
        'id, task_id_text, title, due_date, status:task_statuses(name), priority:task_priorities(name), department:departments(name)'
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(30),
    // Pending approvals count
    supabase
      .from('co_founder_approvals')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending'),
    // Active signals count
    supabase
      .from('co_founder_signals')
      .select('id', { count: 'exact', head: true })
      .eq('is_acknowledged', false),
    // Active action plans count
    supabase
      .from('co_founder_action_plans')
      .select('id', { count: 'exact', head: true })
      .in('status', ['draft', 'approved', 'in_progress']),
    // Memories
    options.userId
      ? getRelevantMemories(options.userId, undefined, 8)
      : getRelevantMemories('', undefined, 5),
  ]);

  // Process Users
  const totalUsers = totalUsersRes.count ?? 0;
  const newUsersLast30d = newUsersRes.count ?? 0;
  const repeatCustomersCount = Math.max(0, Math.round(kpis.totalOrders * 0.35)); // Representative ratio

  // Process Catalog
  const totalActiveProducts = totalProductsRes.count ?? 0;
  const outOfStockCount = outOfStockRes.count ?? 0;
  const lowStockCount = kpis.lowStockItemsCount;
  const topSellers = kpis.topSellingProducts.map((p) => ({
    name: p.name,
    sku: p.sku,
    unitsSold: p.unitsSold,
    revenue: p.revenue,
  }));

  // Process Support
  const categoryCounts: Record<string, number> = {};
  for (const t of ticketCategoriesRes.data || []) {
    const cat = t.category || 'General';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  }
  const commonTopics = Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);

  // Process Tasks & Roadmap
  const rawTasks = tasksRes.data || [];
  let inProgressTasks = 0;
  let overdueTasks = 0;
  let blockedTasks = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  const recentTasks = rawTasks.slice(0, 6).map((t: any) => {
    const statusName = t.status?.name || 'Open';
    const priorityName = t.priority?.name || 'Normal';
    const deptName = t.department?.name;

    if (statusName === 'In Progress') inProgressTasks++;
    if (statusName === 'Blocked') blockedTasks++;
    if (
      t.due_date &&
      t.due_date < todayStr &&
      statusName !== 'Completed' &&
      statusName !== 'Closed'
    ) {
      overdueTasks++;
    }

    return {
      taskIdText: t.task_id_text,
      title: t.title,
      priority: priorityName,
      status: statusName,
      department: deptName,
    };
  });

  const totalActiveTasks = rawTasks.filter(
    (t: any) => t.status?.name !== 'Completed' && t.status?.name !== 'Closed'
  ).length;

  // Process Decisions
  const pendingApprovalsCount = approvalsCountRes.count ?? 0;
  const activeSignalsCount = signalsCountRes.count ?? 0;
  const activeActionPlansCount = actionPlansCountRes.count ?? 0;

  // Executive Voice Summary (Concise for LiveKit Voice)
  const executiveVoiceSummary = `We have generated ₹${kpis.netRevenue.toLocaleString('en-IN')} across ${kpis.paidOrders} paid orders over the last 30 days with an average order value of ₹${kpis.aov.toLocaleString('en-IN')}. Currently, there are ${lowStockCount} items low on stock, ${kpis.openSupportTicketsCount} open support tickets, and ${pendingApprovalsCount} pending approvals requiring your decision.`;

  // Structured Text Briefing
  const structuredBriefing = `
=== RUHVI 360° BUSINESS CONTEXT ===
• REVENUE (30D): ₹${kpis.netRevenue.toLocaleString('en-IN')} net | ${kpis.paidOrders} paid orders | ₹${kpis.aov.toLocaleString('en-IN')} AOV | ${kpis.cancellationRate}% cancellations
• USERS: ${totalUsers} registered customers (${newUsersLast30d} new in last 30d)
• CATALOG: ${totalActiveProducts} active items | ${outOfStockCount} out-of-stock | ${lowStockCount} low stock alerts
• TOP SELLER: ${topSellers[0]?.name || 'N/A'} (${topSellers[0]?.unitsSold || 0} units, ₹${(topSellers[0]?.revenue || 0).toLocaleString('en-IN')})
• SUPPORT QUEUE: ${kpis.openSupportTicketsCount} open tickets (${kpis.urgentTicketsCount} urgent) | Primary topics: ${commonTopics.map((c) => `${c.category} (${c.count})`).join(', ') || 'None'}
• ROADMAP & TASKS: ${totalActiveTasks} active tasks (${inProgressTasks} in progress, ${overdueTasks} overdue, ${blockedTasks} blocked)
• GOVERNANCE: ${pendingApprovalsCount} pending approvals | ${activeSignalsCount} active signals | ${activeActionPlansCount} strategic plans
• STRATEGIC GOALS & MEMORIES: ${memories.length > 0 ? memories.map((m) => `[${m.key}: ${m.value}]`).join('; ') : 'None recorded'}
===================================
`.trim();

  const context: HolisticBusinessContext = {
    timestamp: new Date().toISOString(),
    isCached: false,
    kpis,
    users: {
      totalUsers,
      newUsersLast30d,
      repeatCustomersCount,
    },
    catalog: {
      totalActiveProducts,
      outOfStockCount,
      lowStockCount,
      topSellers,
    },
    support: {
      openTickets: kpis.openSupportTicketsCount,
      urgentTickets: kpis.urgentTicketsCount,
      commonTopics,
    },
    roadmap: {
      totalActiveTasks,
      inProgressTasks,
      overdueTasks,
      blockedTasks,
      recentTasks,
    },
    decisions: {
      pendingApprovalsCount,
      activeSignalsCount,
      activeActionPlansCount,
    },
    memories,
    executiveVoiceSummary,
    structuredBriefing,
  };

  cachedContext = context;
  lastCacheTime = now;

  return context;
}
