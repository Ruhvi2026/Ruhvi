import 'server-only';

import { WorkerId } from './types';
import { workerRegistry } from './registry';

export type SingleWorkerIntent =
  | 'ANALYTICS'
  | 'MARKETING'
  | 'SEO'
  | 'PRODUCT'
  | 'COMPETITOR'
  | 'SALES_CONVERSION'
  | 'CUSTOMER_SUPPORT'
  | 'CONTENT'
  | 'INVENTORY'
  | 'REVIEW'
  | 'EXECUTION'
  | 'MONITORING';

export type CompositeIntent =
  | 'GROWTH_AUDIT'
  | 'CAMPAIGN_LAUNCH'
  | 'CONVERSION_RECOVERY'
  | 'INVENTORY_DEFENSE'
  | 'GENERAL_COMPOSITE';

export type GoalIntent = SingleWorkerIntent | CompositeIntent | 'UNKNOWN';

export interface PlannedWorkerStep {
  stepId: string;
  workerId: WorkerId;
  workerName: string;
  title: string;
  task: string;
  stageIndex: number;
  dependsOn: string[];
  isParallelSafe: boolean;
  requiresApproval: boolean;
  actionType?: string;
  parameters?: Record<string, any>;
}

export interface PlanStage {
  stageIndex: number;
  steps: PlannedWorkerStep[];
  isParallelStage: boolean;
}

export interface CoFounderExecutionPlan {
  planId: string;
  userGoal: string;
  intent: GoalIntent;
  isComposite: boolean;
  summary: string;
  stages: PlanStage[];
  allSteps: PlannedWorkerStep[];
  approvalRequiredStepsCount: number;
  estimatedExecutionRounds: number;
  conflictsDetected: string[];
  fallbackWorkerId?: WorkerId;
  createdAt: string;
}

export interface DecomposePlanOptions {
  timeframe?: string;
  userId?: string;
  userRole?: string;
  dryRun?: boolean;
  channel?: 'voice' | 'text';
  parameters?: Record<string, any>;
}

// Map single intent to standard primary worker
export const INTENT_WORKER_MAP: Record<SingleWorkerIntent, WorkerId> = {
  ANALYTICS: 'worker_analytics_performance',
  MARKETING: 'worker_marketing',
  SEO: 'worker_seo',
  PRODUCT: 'worker_product',
  COMPETITOR: 'worker_competitor_research',
  SALES_CONVERSION: 'worker_sales_conversion',
  CUSTOMER_SUPPORT: 'worker_customer_support',
  CONTENT: 'worker_content_blog',
  INVENTORY: 'worker_inventory',
  REVIEW: 'worker_review_feedback',
  EXECUTION: 'worker_execution',
  MONITORING: 'worker_monitoring_verification',
};

// Domain keywords and scoring weights
interface KeywordRule {
  intent: SingleWorkerIntent;
  keywords: string[];
  weight: number;
}

const DOMAIN_RULES: KeywordRule[] = [
  {
    intent: 'EXECUTION',
    keywords: [
      'execute approved',
      'run approval',
      'apply change',
      'execute action',
      'apply fix',
      'trigger update',
    ],
    weight: 3.0,
  },
  {
    intent: 'MONITORING',
    keywords: [
      'verify outcome',
      'check regression',
      'measure result',
      'monitor change',
      'outcome verification',
      'telemetry check',
    ],
    weight: 2.5,
  },
  {
    intent: 'COMPETITOR',
    keywords: [
      'competitor',
      'competition',
      'giva',
      'palmonas',
      'price comparison',
      'market benchmark',
      'http://',
      'https://',
    ],
    weight: 2.0,
  },
  {
    intent: 'SEO',
    keywords: [
      'seo',
      'meta description',
      'keyword',
      'schema',
      'google search',
      'search ranking',
      'sitemap',
      'organic traffic',
    ],
    weight: 2.0,
  },
  {
    intent: 'INVENTORY',
    keywords: [
      'stock',
      'inventory',
      'reorder',
      'warehouse',
      'out of stock',
      'stockout',
      'restock',
      'units in stock',
    ],
    weight: 2.0,
  },
  {
    intent: 'CUSTOMER_SUPPORT',
    keywords: [
      'support',
      'ticket',
      'complaint',
      'customer query',
      'tracking delay',
      'delayed order',
      'refund request',
      'csat',
    ],
    weight: 2.0,
  },
  {
    intent: 'REVIEW',
    keywords: [
      'customer review',
      'product review',
      'review feedback',
      '1-star',
      'defect',
      'customer reviews',
      'product flaws',
      'unhappy customer',
      'feedback',
      'rating',
      'star rating',
    ],
    weight: 2.0,
  },
  {
    intent: 'CONTENT',
    keywords: [
      'blog',
      'article',
      'editorial',
      'write post',
      'copywriting',
      'content guide',
      'newsletter',
    ],
    weight: 1.8,
  },
  {
    intent: 'SALES_CONVERSION',
    keywords: [
      'funnel',
      'checkout drop',
      'cart abandonment',
      'conversion rate',
      'cro',
      'abandoned cart',
      'bounce rate',
      'payment drop',
    ],
    weight: 2.2,
  },
  {
    intent: 'MARKETING',
    keywords: [
      'ad copy',
      'campaign',
      'marketing',
      'creative',
      'video reel',
      'hook',
      'promotional',
      'meta ads',
      'instagram ad',
      'influencer',
    ],
    weight: 1.8,
  },
  {
    intent: 'PRODUCT',
    keywords: [
      'catalog',
      'product description',
      'product detail',
      'merchandis',
      'sku',
      'product listing',
      'product title',
    ],
    weight: 1.6,
  },
  {
    intent: 'ANALYTICS',
    keywords: [
      'analytics',
      'metrics',
      'store performance',
      'traffic',
      'revenue',
      'sales volume',
      'kpi',
      'aov',
      'gross margin',
    ],
    weight: 1.5,
  },
];

// Composite intent heuristics
const COMPOSITE_RULES: { intent: CompositeIntent; triggers: string[] }[] = [
  {
    intent: 'GROWTH_AUDIT',
    triggers: [
      'growth audit',
      'full audit',
      'store health',
      'business health check',
      'complete audit',
      'holistic review',
      'comprehensive audit',
    ],
  },
  {
    intent: 'CAMPAIGN_LAUNCH',
    triggers: [
      'campaign launch',
      'new campaign',
      'promotional launch',
      'launch campaign',
      'ad blitz',
      'marketing blitz',
      'festive launch',
    ],
  },
  {
    intent: 'CONVERSION_RECOVERY',
    triggers: [
      'conversion recovery',
      'fix checkout',
      'recover drop',
      'recover abandoned',
      'sales recovery',
      'fix funnel',
    ],
  },
  {
    intent: 'INVENTORY_DEFENSE',
    triggers: [
      'inventory defense',
      'stockout emergency',
      'reorder plan',
      'supply chain crisis',
      'low stock crisis',
    ],
  },
];

/**
 * Classifies high-level user goal into primary domain or composite intent
 */
export function classifyGoalIntent(goal: string): {
  intent: GoalIntent;
  confidence: number;
  matchedIntents: SingleWorkerIntent[];
  matchedWorkers: WorkerId[];
  isComposite: boolean;
} {
  const text = (goal || '').toLowerCase().trim();

  // 1. Check explicit composite markers
  for (const comp of COMPOSITE_RULES) {
    if (comp.triggers.some((trigger) => text.includes(trigger))) {
      return {
        intent: comp.intent,
        confidence: 0.95,
        matchedIntents: ['ANALYTICS', 'MARKETING', 'SALES_CONVERSION'],
        matchedWorkers: [
          'worker_analytics_performance',
          'worker_marketing',
          'worker_sales_conversion',
        ],
        isComposite: true,
      };
    }
  }

  // 2. Score single domain rules
  const scores: Map<SingleWorkerIntent, number> = new Map();

  for (const rule of DOMAIN_RULES) {
    let matchCount = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw)) {
        matchCount++;
      }
    }
    if (matchCount > 0) {
      const current = scores.get(rule.intent) || 0;
      scores.set(rule.intent, current + matchCount * rule.weight);
    }
  }

  // Sort matched intents by score descending
  const sortedMatches = Array.from(scores.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  const matchedIntents = sortedMatches.map(([intent]) => intent);
  const matchedWorkers = matchedIntents.map((i) => INTENT_WORKER_MAP[i]);

  // If 2 or more distinct strong domains matched with significant signals, check for composite
  if (sortedMatches.length >= 2) {
    const [topIntent, topScore] = sortedMatches[0];
    const [secondIntent, secondScore] = sortedMatches[1];

    const isDominant = topScore >= 1.8 * secondScore;
    const hasCoordinatingClause =
      text.includes(' and ') ||
      text.includes(' also ') ||
      text.includes(' plus ') ||
      text.includes(',') ||
      text.includes(' as well as ');

    if (!isDominant && secondScore >= 1.8 && hasCoordinatingClause) {
      return {
        intent: 'GENERAL_COMPOSITE',
        confidence: 0.85,
        matchedIntents,
        matchedWorkers,
        isComposite: true,
      };
    }
  }

  // Single dominant match
  if (sortedMatches.length > 0) {
    const [topIntent, topScore] = sortedMatches[0];
    const confidence = Math.min(0.99, Math.max(0.6, topScore / 4.0));
    return {
      intent: topIntent,
      confidence,
      matchedIntents: [topIntent],
      matchedWorkers: [INTENT_WORKER_MAP[topIntent]],
      isComposite: false,
    };
  }

  // Fallback to keyword router resolution
  const fallback = workerRegistry.findWorkerForTask(text);
  const fallbackIntent =
    (Object.keys(INTENT_WORKER_MAP) as SingleWorkerIntent[]).find(
      (key) => INTENT_WORKER_MAP[key] === fallback.id
    ) || 'ANALYTICS';

  return {
    intent: fallbackIntent,
    confidence: 0.5,
    matchedIntents: [fallbackIntent],
    matchedWorkers: [fallback.id],
    isComposite: false,
  };
}

/**
 * Validates plan execution graph and detects conflicts or safety violations
 */
export function detectPlanConflicts(steps: PlannedWorkerStep[]): string[] {
  const conflicts: string[] = [];
  const stepIds = new Set(steps.map((s) => s.stepId));

  // Check 1: Circular or unknown dependencies
  for (const step of steps) {
    for (const dep of step.dependsOn) {
      if (!stepIds.has(dep)) {
        conflicts.push(
          `Step "${step.stepId}" depends on non-existent step "${dep}".`
        );
      }
      if (dep === step.stepId) {
        conflicts.push(
          `Step "${step.stepId}" has circular dependency on itself.`
        );
      }
    }
  }

  // Check 2: Execution worker steps without approval flag
  for (const step of steps) {
    if (step.workerId === 'worker_execution' && !step.requiresApproval) {
      conflicts.push(
        `Step "${step.stepId}" (${step.title}) executes mutations without required human approval gate.`
      );
    }
  }

  // Check 3: Mutating/execution steps must not run concurrently with baseline read steps in same stage
  const stageGroups = new Map<number, PlannedWorkerStep[]>();
  for (const step of steps) {
    const existing = stageGroups.get(step.stageIndex) || [];
    existing.push(step);
    stageGroups.set(step.stageIndex, existing);
  }

  stageGroups.forEach((stageSteps, stageIdx) => {
    const hasExecution = stageSteps.some(
      (s) => s.workerId === 'worker_execution'
    );
    const hasRead = stageSteps.some((s) => s.workerId !== 'worker_execution');
    if (hasExecution && hasRead) {
      conflicts.push(
        `Stage ${stageIdx} combines write/execution steps with investigative read steps concurrently.`
      );
    }
  });

  return conflicts;
}

/**
 * Decomposes user goal into a multi-worker, dependency-ordered CoFounderExecutionPlan
 */
export function decomposeGoalIntoPlan(
  goal: string,
  options: DecomposePlanOptions = {}
): CoFounderExecutionPlan {
  const planId = `plan_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
  const text = goal || '';
  const classification = classifyGoalIntent(text);

  let allSteps: PlannedWorkerStep[] = [];

  // 1. Single-domain plan
  if (!classification.isComposite) {
    const workerId =
      classification.matchedWorkers[0] || 'worker_analytics_performance';
    const worker = workerRegistry.getWorker(workerId);
    const workerName = worker?.name || 'Analytics & Performance Worker';
    const isExecution = workerId === 'worker_execution';

    allSteps = [
      {
        stepId: 'step_1',
        workerId,
        workerName,
        title: `Execute ${workerName} analysis`,
        task: text,
        stageIndex: 0,
        dependsOn: [],
        isParallelSafe: !isExecution,
        requiresApproval: isExecution,
        parameters: options.parameters,
      },
    ];
  } else {
    // 2. Composite plan decomposition
    switch (classification.intent) {
      case 'GROWTH_AUDIT': {
        allSteps = [
          {
            stepId: 'step_1',
            workerId: 'worker_analytics_performance',
            workerName: 'Analytics & Performance Worker',
            title: 'Audit storewide revenue, conversion, and traffic baseline',
            task: `Audit storewide revenue, orders, traffic, and sales performance: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_2',
            workerId: 'worker_competitor_research',
            workerName: 'Competitor Intelligence Worker',
            title: 'Benchmark competitor pricing and current market offers',
            task: `Benchmark competitor catalog, pricing, and active promotions against our store: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_3',
            workerId: 'worker_seo',
            workerName: 'SEO & Search Engine Worker',
            title: 'Analyze organic search footprint and metadata health',
            task: `Audit SEO health, search rankings, and product discoverability: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_4',
            workerId: 'worker_sales_conversion',
            workerName: 'Sales & Conversion Funnel Worker',
            title: 'Pinpoint funnel leakages and checkout friction',
            task: `Analyze conversion drop-offs, checkout barriers, and cart abandonment: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1'],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_5',
            workerId: 'worker_marketing',
            workerName: 'Growth Marketing Worker',
            title:
              'Synthesize cross-channel growth opportunities and campaigns',
            task: `Develop high-impact marketing strategy, promotional campaigns, and ad hooks based on findings: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1', 'step_2', 'step_4'],
            isParallelSafe: true,
            requiresApproval: false,
          },
        ];
        break;
      }

      case 'CAMPAIGN_LAUNCH': {
        allSteps = [
          {
            stepId: 'step_1',
            workerId: 'worker_product',
            workerName: 'Product & Catalog Worker',
            title: 'Identify hero products and catalog inventory readiness',
            task: `Inspect product inventory, pricing, and catalog details for the campaign: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_2',
            workerId: 'worker_competitor_research',
            workerName: 'Competitor Intelligence Worker',
            title: 'Inspect competitor promotional angles and pricing',
            task: `Analyze competitor promotional campaigns and pricing strategies: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_3',
            workerId: 'worker_content_blog',
            workerName: 'Content & Editorial Worker',
            title:
              'Draft campaign storytelling narrative and editorial articles',
            task: `Produce campaign editorial copy, story angles, and promotional blog draft: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1'],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_4',
            workerId: 'worker_marketing',
            workerName: 'Growth Marketing Worker',
            title:
              'Generate high-converting ad copy, hooks, and creative variations',
            task: `Create multi-channel marketing campaigns, social hooks, and ad copy: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1', 'step_2'],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_5',
            workerId: 'worker_execution',
            workerName: 'Execution & Automation Worker',
            title:
              'Queue campaign activation and promotional updates for human approval',
            task: `Prepare campaign execution payload and register approval request: ${text}`,
            stageIndex: 2,
            dependsOn: ['step_4'],
            isParallelSafe: false,
            requiresApproval: true,
            actionType: 'campaign_launch',
          },
        ];
        break;
      }

      case 'CONVERSION_RECOVERY': {
        allSteps = [
          {
            stepId: 'step_1',
            workerId: 'worker_sales_conversion',
            workerName: 'Sales & Conversion Funnel Worker',
            title: 'Analyze checkout drop-off rates and cart abandonment',
            task: `Analyze checkout drop-offs, abandoned carts, and conversion leakages: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_2',
            workerId: 'worker_customer_support',
            workerName: 'Customer Support Intelligence Worker',
            title:
              'Inspect customer tickets for reported checkout or payment errors',
            task: `Scan customer support tickets for checkout issues, payment failures, or delivery questions: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_3',
            workerId: 'worker_review_feedback',
            workerName: 'Review & Feedback Intelligence Worker',
            title:
              'Audit customer reviews for product defect or packaging feedback',
            task: `Analyze customer reviews for negative feedback impacting buyer trust: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_4',
            workerId: 'worker_marketing',
            workerName: 'Growth Marketing Worker',
            title:
              'Develop abandoned checkout email incentives and retargeting hooks',
            task: `Design conversion recovery hooks, abandoned cart recovery offers, and urgent incentive messaging: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1', 'step_2'],
            isParallelSafe: false,
            requiresApproval: false,
          },
        ];
        break;
      }

      case 'INVENTORY_DEFENSE': {
        allSteps = [
          {
            stepId: 'step_1',
            workerId: 'worker_inventory',
            workerName: 'Inventory & Supply Intelligence Worker',
            title: 'Audit stock levels and identify stockout risks',
            task: `Identify critical low-stock SKUs, out of stock items, and warehouse restock priorities: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_2',
            workerId: 'worker_analytics_performance',
            workerName: 'Analytics & Performance Worker',
            title:
              'Calculate 30-day sales velocity and runway for low-stock items',
            task: `Calculate 30-day sales velocity, burn rate, and stockout timeline: ${text}`,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          },
          {
            stepId: 'step_3',
            workerId: 'worker_execution',
            workerName: 'Execution & Automation Worker',
            title:
              'Queue supplier reorder action and register human approval request',
            task: `Generate purchase order and register reorder approval request: ${text}`,
            stageIndex: 1,
            dependsOn: ['step_1', 'step_2'],
            isParallelSafe: false,
            requiresApproval: true,
            actionType: 'inventory_reorder',
          },
        ];
        break;
      }

      default: {
        // GENERAL_COMPOSITE: Dynamically assign matched workers into stages
        const readWorkers: WorkerId[] = [];
        const creativeWorkers: WorkerId[] = [];
        let needsExecution = false;

        for (const wId of classification.matchedWorkers) {
          if (wId === 'worker_execution') {
            needsExecution = true;
          } else if (
            wId === 'worker_marketing' ||
            wId === 'worker_content_blog' ||
            wId === 'worker_sales_conversion'
          ) {
            creativeWorkers.push(wId);
          } else {
            readWorkers.push(wId);
          }
        }

        let stepCounter = 1;
        const stage0Ids: string[] = [];

        // Stage 0: Read workers
        for (const rId of readWorkers) {
          const stepId = `step_${stepCounter++}`;
          stage0Ids.push(stepId);
          const w = workerRegistry.getWorker(rId);
          allSteps.push({
            stepId,
            workerId: rId,
            workerName: w?.name || rId,
            title: `Investigate via ${w?.name || rId}`,
            task: text,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          });
        }

        // If no read workers matched, put first creative in stage 0
        if (stage0Ids.length === 0 && creativeWorkers.length > 0) {
          const firstCreative = creativeWorkers.shift()!;
          const stepId = `step_${stepCounter++}`;
          stage0Ids.push(stepId);
          const w = workerRegistry.getWorker(firstCreative);
          allSteps.push({
            stepId,
            workerId: firstCreative,
            workerName: w?.name || firstCreative,
            title: `Execute ${w?.name || firstCreative}`,
            task: text,
            stageIndex: 0,
            dependsOn: [],
            isParallelSafe: true,
            requiresApproval: false,
          });
        }

        // Stage 1: Synthesis/Creative workers
        for (const cId of creativeWorkers) {
          const stepId = `step_${stepCounter++}`;
          const w = workerRegistry.getWorker(cId);
          allSteps.push({
            stepId,
            workerId: cId,
            workerName: w?.name || cId,
            title: `Synthesize recommendations with ${w?.name || cId}`,
            task: text,
            stageIndex: 1,
            dependsOn: [...stage0Ids],
            isParallelSafe: true,
            requiresApproval: false,
          });
        }

        // Stage 2: Execution worker (if requested)
        if (needsExecution) {
          const stepId = `step_${stepCounter++}`;
          const lastDependencies = allSteps
            .filter((s) => s.stageIndex <= 1)
            .map((s) => s.stepId);
          allSteps.push({
            stepId,
            workerId: 'worker_execution',
            workerName: 'Execution & Automation Worker',
            title: 'Apply changes via human approval gate',
            task: `Execute approved actions: ${text}`,
            stageIndex: 2,
            dependsOn: lastDependencies,
            isParallelSafe: false,
            requiresApproval: true,
            actionType: 'worker_composite_execution',
          });
        }
        break;
      }
    }
  }

  // 3. Group steps into stages
  const stageMap = new Map<number, PlannedWorkerStep[]>();
  for (const step of allSteps) {
    const list = stageMap.get(step.stageIndex) || [];
    list.push(step);
    stageMap.set(step.stageIndex, list);
  }

  const stages: PlanStage[] = Array.from(stageMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([stageIndex, steps]) => ({
      stageIndex,
      steps,
      isParallelStage: steps.length > 1 && steps.every((s) => s.isParallelSafe),
    }));

  // 4. Validate and detect any safety conflicts
  const conflictsDetected = detectPlanConflicts(allSteps);
  const approvalRequiredStepsCount = allSteps.filter(
    (s) => s.requiresApproval
  ).length;

  const summary = classification.isComposite
    ? `Multi-worker composite plan (${classification.intent}): ${allSteps.length} steps scheduled across ${stages.length} execution stages.`
    : `Single-worker direct plan (${classification.intent}): Assigned to ${allSteps[0]?.workerName || 'Analytics'}.`;

  return {
    planId,
    userGoal: text,
    intent: classification.intent,
    isComposite: classification.isComposite,
    summary,
    stages,
    allSteps,
    approvalRequiredStepsCount,
    estimatedExecutionRounds: stages.length,
    conflictsDetected,
    fallbackWorkerId:
      classification.matchedWorkers[0] || 'worker_analytics_performance',
    createdAt: new Date().toISOString(),
  };
}

/**
 * Convenience helper to resolve the single best worker with fallback
 */
export function resolveTargetWorker(goal: string): WorkerId {
  const classification = classifyGoalIntent(goal);
  if (classification.matchedWorkers.length > 0) {
    return classification.matchedWorkers[0];
  }
  return workerRegistry.findWorkerForTask(goal).id;
}
