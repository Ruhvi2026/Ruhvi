import 'server-only';

import { AgentNode } from '@/components/ai/motion-engine/types';
import { INITIAL_AI_HIERARCHY } from '@/components/ai/motion-engine/nodes-data';
import { getServiceClient } from '@/lib/supabase/service';
import { WorkerRegistry, workerRegistry } from './registry';
import { WorkerDefinition } from './types';

interface SignalRecord {
  id: string;
  signal_type: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: string;
  title: string;
  summary: string;
  detail: string;
  metrics: Record<string, any>;
  is_acknowledged: boolean;
  created_at: string;
}

interface ApprovalRecord {
  id: string;
  action_type: string;
  scope_description: string;
  risk_level: string;
  status: string;
  created_at: string;
}

const WORKER_REGISTRY_TO_NODE: Record<string, string> = {
  worker_analytics_performance: 'worker_1',
  worker_marketing: 'worker_2',
  worker_seo: 'worker_3',
  worker_product: 'worker_4',
  worker_competitor_research: 'worker_5',
  worker_sales_conversion: 'worker_6',
  worker_customer_support: 'worker_7',
  worker_content_blog: 'worker_8',
  worker_inventory: 'worker_9',
  worker_review_feedback: 'worker_10',
  worker_execution: 'worker_11',
  worker_monitoring_verification: 'worker_12',
};

const SIGNAL_CATEGORY_TO_WORKERS: Record<string, string[]> = {
  BUSINESS: ['worker_1', 'worker_2', 'worker_6', 'worker_9'],
  RISK: ['worker_7', 'worker_12', 'worker_4'],
  OPPORTUNITY: ['worker_2', 'worker_8', 'worker_5'],
  FOLLOW_UP: ['worker_5', 'worker_10', 'worker_8'],
  SYSTEM: ['worker_11', 'worker_12'],
};

export interface WorkforceStatus {
  nodes: AgentNode[];
  activeSignals: number;
  criticalSignals: number;
  pendingApprovals: number;
}

function deepCloneNodes(): AgentNode[] {
  return JSON.parse(JSON.stringify(INITIAL_AI_HIERARCHY));
}

export async function buildLiveWorkforceStatus(
  registry: WorkerRegistry = workerRegistry
): Promise<WorkforceStatus> {
  const nodes = deepCloneNodes();
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const supabase = getServiceClient();

  const { data: signals } = (await supabase
    .from('co_founder_signals')
    .select('id,signal_type,category,severity,confidence,title,summary,detail,metrics,is_acknowledged,created_at')
    .eq('is_acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(50)) as { data: SignalRecord[] | null };

  const { data: approvals } = (await supabase
    .from('co_founder_approvals')
    .select('id,action_type,scope_description,risk_level,status,created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(50)) as { data: ApprovalRecord[] | null };

  const definitions = registry.getAllDefinitions();

  const signalMap = new Map<string, SignalRecord[]>();
  let activeSignals = 0;
  let criticalSignals = 0;

  (signals || []).forEach((signal) => {
    activeSignals++;
    if (signal.severity === 'critical') criticalSignals++;

    const workers =
      SIGNAL_CATEGORY_TO_WORKERS[signal.category] ||
      SIGNAL_CATEGORY_TO_WORKERS.BUSINESS;

    workers.forEach((workerId) => {
      const list = signalMap.get(workerId) || [];
      list.push(signal);
      signalMap.set(workerId, list);
    });
  });

  const pendingApprovals = (approvals || []).length;

  nodes.forEach((node) => {
    const def = definitions.find(
      (d) => WORKER_REGISTRY_TO_NODE[d.id] === node.id
    );

    const nodeSignals = signalMap.get(node.id);
    const hasCriticalSignal =
      nodeSignals && nodeSignals.some((s) => s.severity === 'critical');
    const hasHighSignal =
      nodeSignals && nodeSignals.some((s) => s.severity === 'high');
    const hasActiveSignal = nodeSignals && nodeSignals.length > 0;

    if (hasCriticalSignal) {
      node.state = 'analyzing';
    } else if (hasHighSignal) {
      node.state = 'analyzing';
    } else if (hasActiveSignal) {
      node.state = node.state === 'completed' ? 'analyzing' : node.state;
    }

    if (def) {
      node.telemetry.computeLoadPct = Math.min(
        100,
        20 + (nodeSignals?.length || 0) * 15
      );

      if (nodeSignals && nodeSignals.length > 0) {
        const latest = nodeSignals[0];
        node.telemetry.currentAction = latest.title;
        node.telemetry.latencyMs = Math.max(
          60,
          Math.floor(
            (Date.now() - new Date(latest.created_at).getTime()) / 1000
          )
        );
        node.telemetry.tokensPerSec = parseFloat(
          (40 + Math.random() * 40).toFixed(1)
        );
        node.telemetry.activeTool = `${def.role}.handleSignal('${latest.signal_type}')`;
      } else {
        node.telemetry.currentAction = `${def.objective.split('.')[0]} — standing by`;
      }
    }
  });

  const coFounder = nodeMap.get('co_founder');
  if (coFounder) {
    coFounder.telemetry.currentAction =
      activeSignals > 0
        ? `Orchestrating ${nodes.filter((n) => n.level === 'core_worker').length} autonomous workers • ${activeSignals} active signals • ${pendingApprovals} pending approvals`
        : 'All systems nominal. Standing by for founder directives.';

    if (criticalSignals > 0) {
      coFounder.state = 'analyzing';
    } else if (activeSignals > 0) {
      coFounder.state = 'thinking';
    }

    coFounder.telemetry.latencyMs = 100 + Math.floor(Math.random() * 50);
    coFounder.telemetry.tokensPerSec = 60 + Math.random() * 20;
    coFounder.telemetry.computeLoadPct = Math.min(
      100,
      25 + activeSignals * 8 + pendingApprovals * 5
    );
  }

  return {
    nodes,
    activeSignals,
    criticalSignals,
    pendingApprovals,
  };
}
