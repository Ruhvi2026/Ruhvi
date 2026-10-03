import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import { StrategicSolution } from './strategy-engine';
import { createOutcomeRecord } from './outcomes';

export interface PlannedTaskStep {
  title: string;
  order: number;
}

export interface PlannedTask {
  title: string;
  description: string;
  departmentName?: string;
  priorityName: 'Normal' | 'High' | 'Important' | 'Immediate';
  dueDaysFromNow: number;
  steps: PlannedTaskStep[];
  tags?: string[];
  relatedProductId?: string;
  relatedOrderId?: string;
}

export interface PlannedSuccessMetric {
  metricKey: string;
  metricLabel: string;
  baselineValue: number;
  targetValue: number;
  unit: string;
  verificationWindowDays: number;
}

export interface ComprehensiveActionPlan {
  id?: string;
  title: string;
  goal: string;
  strategy: string;
  project: string;
  problemStatement: string;
  rootCauseSummary?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  recommendationId?: string;
  signalId?: string;
  tasks: PlannedTask[];
  successMetrics: PlannedSuccessMetric[];
  expectedImpact: string;
  effortCost: string;
  tradeOffs: string;
  createdTasks?: { id: string; taskIdText: string; title: string }[];
  createdAt?: string;
}

/**
 * Converts a Strategic Solution into a fully decomposed Action Plan:
 * Goal → Strategy → Project → Tasks → Steps → Success Metrics.
 */
export function generateActionPlanFromStrategy(
  strategy: StrategicSolution,
  options: {
    recommendationId?: string;
    signalId?: string;
    problemStatement?: string;
    rootCauseSummary?: string;
  } = {}
): ComprehensiveActionPlan {
  const isCod =
    strategy.title.toLowerCase().includes('whatsapp') ||
    strategy.title.toLowerCase().includes('cod');
  const isStock =
    strategy.title.toLowerCase().includes('stock') ||
    strategy.title.toLowerCase().includes('inventory');
  const isRevenue =
    strategy.title.toLowerCase().includes('bundle') ||
    strategy.title.toLowerCase().includes('revenue');

  const tasks: PlannedTask[] = [];
  const successMetrics: PlannedSuccessMetric[] = [];

  if (isCod) {
    tasks.push({
      title: 'Configure Automated WhatsApp COD Confirmation Template',
      description:
        'Set up automated WhatsApp order confirmation template with 1-tap "Confirm Delivery Address" button for new COD orders.',
      departmentName: 'Customer Support',
      priorityName: 'High',
      dueDaysFromNow: 2,
      steps: [
        {
          title: 'Draft conversational Bengali & English WhatsApp copy',
          order: 1,
        },
        { title: 'Configure webhook trigger on new order creation', order: 2 },
        {
          title: 'Test 1-tap button response tracking in admin dashboard',
          order: 3,
        },
      ],
      tags: ['COD', 'WhatsApp', 'Automation', 'Retention'],
    });

    tasks.push({
      title: 'Train Warehouse Dispatch Staff on Verification Gating',
      description:
        'Enforce protocol where warehouse packing only proceeds after WhatsApp confirmation or phone call verification.',
      departmentName: 'Operations',
      priorityName: 'Normal',
      dueDaysFromNow: 3,
      steps: [
        { title: 'Update internal SOP in operations manual', order: 1 },
        {
          title: 'Add "COD Verified" visual badge to packing slip screen',
          order: 2,
        },
        {
          title: 'Review unverified order handling after 24h timeout',
          order: 3,
        },
      ],
      tags: ['Operations', 'Fulfillment', 'SOP'],
    });

    successMetrics.push({
      metricKey: 'cancellation_rate',
      metricLabel: 'COD Cancellation & Return Rate',
      baselineValue: 24.5,
      targetValue: 8.0,
      unit: '%',
      verificationWindowDays: 21,
    });
  } else if (isStock) {
    tasks.push({
      title: 'Place Priority Reorder Batch for Top 5 Core SKUs',
      description:
        'Issue urgent manufacturing batch order to silversmith partner for low-inventory bestsellers with 7-day turnaround delivery.',
      departmentName: 'Operations',
      priorityName: 'Immediate',
      dueDaysFromNow: 1,
      steps: [
        {
          title: 'Calculate exact unit replenishment counts per SKU',
          order: 1,
        },
        { title: 'Issue formal purchase order to silver supplier', order: 2 },
        { title: 'Schedule QC inspection upon workshop delivery', order: 3 },
      ],
      tags: ['Inventory', 'Suppliers', 'Catalog', 'HighPriority'],
    });

    tasks.push({
      title: 'Automate 10-Unit Safety Stock Telegram/Email Alerts',
      description:
        'Implement automated daily monitor that flags items with less than 10 units directly to the Operations manager.',
      departmentName: 'Tech / IT',
      priorityName: 'High',
      dueDaysFromNow: 4,
      steps: [
        { title: 'Verify threshold query in daily automated cron', order: 1 },
        {
          title: 'Send alert digest to operations channel at 9:00 AM IST',
          order: 2,
        },
      ],
      tags: ['Automation', 'Alerts', 'Dev'],
    });

    successMetrics.push({
      metricKey: 'low_stock_count',
      metricLabel: 'Catalog Low Stock Items Count',
      baselineValue: 8,
      targetValue: 0,
      unit: 'items',
      verificationWindowDays: 14,
    });
  } else if (isRevenue) {
    tasks.push({
      title: 'Create Curated Matching Jewelry Gift Set Bundles',
      description:
        'Assemble high-converting 2-piece and 3-piece matching sets (choker + studs) in the catalog with 10% bundle pricing.',
      departmentName: 'Marketing',
      priorityName: 'High',
      dueDaysFromNow: 3,
      steps: [
        {
          title:
            'Select top pairing pieces based on customer order co-occurrence',
          order: 1,
        },
        {
          title: 'Configure bundle product listings in admin catalog',
          order: 2,
        },
        {
          title: 'Create lifestyle banner for homepage and collection page',
          order: 3,
        },
      ],
      tags: ['Marketing', 'Bundles', 'AOV', 'Merchandising'],
    });

    tasks.push({
      title: 'Procure & Configure Velvet Gift Pouches for ₹2,500+ Orders',
      description:
        'Partner with packaging vendor for 200 branded velvet pouches and add free gift banner on cart page.',
      departmentName: 'Operations',
      priorityName: 'Normal',
      dueDaysFromNow: 5,
      steps: [
        {
          title:
            'Confirm sample quality and delivery date from packaging supplier',
          order: 1,
        },
        { title: 'Update cart threshold notification on storefront', order: 2 },
      ],
      tags: ['Packaging', 'CustomerExperience', 'Gift'],
    });

    successMetrics.push({
      metricKey: 'aov',
      metricLabel: 'Average Order Value (AOV)',
      baselineValue: 1450,
      targetValue: 1720,
      unit: '₹',
      verificationWindowDays: 28,
    });
  } else {
    tasks.push({
      title: `Execute Phased Action Plan: ${strategy.title}`,
      description: strategy.recommendedSolution,
      departmentName: 'Operations',
      priorityName: 'High',
      dueDaysFromNow: 7,
      steps: [
        { title: 'Brief responsible department team lead', order: 1 },
        { title: 'Implement operational modifications', order: 2 },
        { title: 'Review 14-day metric telemetry', order: 3 },
      ],
      tags: ['StrategicPlan'],
    });

    successMetrics.push({
      metricKey: 'operational_efficiency',
      metricLabel: strategy.expectedImpact.targetMetric || 'Target Outcome',
      baselineValue: 0,
      targetValue: 100,
      unit: '%',
      verificationWindowDays: 14,
    });
  }

  return {
    title: strategy.title,
    goal: strategy.strategicObjective,
    strategy: strategy.recommendedSolution,
    project: `Strategic Initiative: ${strategy.title}`,
    problemStatement: options.problemStatement || strategy.problemSummary,
    rootCauseSummary: options.rootCauseSummary,
    priority: strategy.priority,
    status: 'draft',
    recommendationId: options.recommendationId,
    signalId: options.signalId,
    tasks,
    successMetrics,
    expectedImpact: strategy.expectedImpact.quantitativeProjection,
    effortCost: `${strategy.effortAndCost.level.toUpperCase()} effort | ${strategy.effortAndCost.timeline}`,
    tradeOffs: strategy.tradeOffsAndRisks.join('; '),
  };
}

/**
 * Saves a Comprehensive Action Plan to public.co_founder_action_plans.
 */
export async function saveActionPlan(
  plan: ComprehensiveActionPlan,
  userId?: string
): Promise<{ success: boolean; planId?: string; error?: string }> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('co_founder_action_plans')
      .insert({
        title: plan.title,
        goal: plan.goal,
        strategy: plan.strategy,
        problem_statement: plan.problemStatement,
        root_cause_summary: plan.rootCauseSummary,
        priority: plan.priority,
        status: plan.status || 'draft',
        recommendation_id: plan.recommendationId,
        signal_id: plan.signalId,
        tasks_created: plan.tasks || [],
        success_metrics: plan.successMetrics || [],
        expected_impact: plan.expectedImpact,
        effort_cost: plan.effortCost,
        trade_offs: plan.tradeOffs,
        created_by: userId || null,
      })
      .select('id')
      .single();

    if (error) throw error;
    return { success: true, planId: data.id };
  } catch (err: any) {
    console.error('Error saving action plan:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Executes an Action Plan by generating real tasks in the Ruhvi Task Manager
 * (`public.tasks` and `public.task_checklists`), setting up departmental routing,
 * and registering closed-loop outcome trackers in `public.co_founder_outcomes`.
 */
export async function executeActionPlanToTaskManager(
  planId: string,
  staffUserId: string
): Promise<{
  success: boolean;
  tasksCreatedCount: number;
  createdTasks: { id: string; taskIdText: string; title: string }[];
  voiceSummary: string;
  error?: string;
}> {
  const supabase = getServiceClient();

  try {
    // 1. Fetch action plan
    const { data: plan, error: planErr } = await supabase
      .from('co_founder_action_plans')
      .select('*')
      .eq('id', planId)
      .maybeSingle();

    if (planErr || !plan) {
      throw new Error(`Action plan ${planId} not found.`);
    }

    const tasksToCreate: PlannedTask[] = Array.isArray(plan.tasks_created)
      ? plan.tasks_created
      : [];
    const successMetrics: PlannedSuccessMetric[] = Array.isArray(
      plan.success_metrics
    )
      ? plan.success_metrics
      : [];

    // Pre-fetch priorities, statuses, and departments for resolution
    const [prioritiesRes, statusesRes, departmentsRes] = await Promise.all([
      supabase.from('task_priorities').select('id, name'),
      supabase.from('task_statuses').select('id, name'),
      supabase.from('departments').select('id, name'),
    ]);

    const priorityMap = new Map(
      (prioritiesRes.data || []).map((p) => [p.name.toLowerCase(), p.id])
    );
    const statusMap = new Map(
      (statusesRes.data || []).map((s) => [s.name.toLowerCase(), s.id])
    );
    const departmentMap = new Map(
      (departmentsRes.data || []).map((d) => [d.name.toLowerCase(), d.id])
    );

    const defaultStatusId =
      statusMap.get('open') || (statusesRes.data?.[0]?.id ?? null);
    const defaultPriorityId =
      priorityMap.get('normal') || (prioritiesRes.data?.[0]?.id ?? null);

    const createdTasks: { id: string; taskIdText: string; title: string }[] =
      [];

    // Helper to generate task id text
    const generateId = () =>
      `TM-AI-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;

    // 2. Iterate and create each task in public.tasks
    for (const t of tasksToCreate) {
      const priorityId =
        priorityMap.get(t.priorityName.toLowerCase()) || defaultPriorityId;
      const departmentId = t.departmentName
        ? departmentMap.get(t.departmentName.toLowerCase())
        : null;

      const dueDate = new Date(
        Date.now() + (t.dueDaysFromNow || 3) * 24 * 60 * 60 * 1000
      )
        .toISOString()
        .split('T')[0];

      const taskIdText = generateId();

      const { data: newTask, error: insertErr } = await supabase
        .from('tasks')
        .insert({
          task_id_text: taskIdText,
          title: t.title,
          description: `${t.description}\n\n[Initiative: ${plan.title}]`,
          created_by: staffUserId,
          priority_id: priorityId,
          status_id: defaultStatusId,
          department_id: departmentId,
          due_date: dueDate,
          tags: [...(t.tags || []), 'AI_CoFounder_Initiative'],
          assigned_type: departmentId ? 'department' : 'direct_user',
        })
        .select('id, task_id_text, title')
        .single();

      if (insertErr || !newTask) {
        console.error('Failed to insert planned task:', insertErr);
        continue;
      }

      createdTasks.push({
        id: newTask.id,
        taskIdText: newTask.task_id_text,
        title: newTask.title,
      });

      // Insert checklist steps if defined
      if (t.steps && t.steps.length > 0) {
        const stepPayloads = t.steps.map((s, idx) => ({
          task_id: newTask.id,
          title: s.title,
          sort_order: s.order || idx + 1,
          completed: false,
        }));

        await supabase.from('task_checklists').insert(stepPayloads);
      }

      // Record activity
      await supabase.from('task_activity').insert({
        task_id: newTask.id,
        user_id: staffUserId,
        action: 'created',
        new_value: {
          title: newTask.title,
          action_plan_id: planId,
          source: 'ai_co_founder_planner',
        },
      });
    }

    // 3. Register outcome trackers in public.co_founder_outcomes for closed-loop learning
    for (const sm of successMetrics) {
      const windowEnd = new Date(
        Date.now() + (sm.verificationWindowDays || 14) * 24 * 60 * 60 * 1000
      ).toISOString();

      await createOutcomeRecord({
        entityType: 'action',
        entityId: planId,
        eventType: 'action_executed',
        expectedOutcome: `${sm.metricLabel}: move from baseline ${sm.baselineValue}${sm.unit} to target ${sm.targetValue}${sm.unit} within ${sm.verificationWindowDays} days.`,
        verificationStatus: 'pending',
        verificationSource: 'authoritative_db',
        evidence: {
          metricKey: sm.metricKey,
          baseline: sm.baselineValue,
          target: sm.targetValue,
          unit: sm.unit,
        },
        measurementWindowEnd: windowEnd,
        userId: staffUserId,
      });
    }

    // 4. Update action plan status to in_progress with created task references
    await supabase
      .from('co_founder_action_plans')
      .update({
        status: 'in_progress',
        tasks_created: createdTasks,
        updated_at: new Date().toISOString(),
      })
      .eq('id', planId);

    const voiceSummary = `Strategic action plan "${plan.title}" has been executed. I have created ${createdTasks.length} tasks in the Task Manager with assigned checklist steps and registered automated 21-day metric verification.`;

    return {
      success: true,
      tasksCreatedCount: createdTasks.length,
      createdTasks,
      voiceSummary,
    };
  } catch (err: any) {
    console.error('Error executing action plan:', err);
    return {
      success: false,
      tasksCreatedCount: 0,
      createdTasks: [],
      voiceSummary: `Execution failed: ${err.message}`,
      error: err.message,
    };
  }
}
