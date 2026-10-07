import { AgentNode } from '@/components/ai/motion-engine/types';
import {
  SwarmWorkerNode,
  SWARM_NODES,
} from '@/components/co-founder/swarm/swarmTypes';
import {
  WorkerNodeData,
  SubAgent,
} from '@/components/co-founder/workforce/WorkerGrid';

const WORKER_NODE_TO_ROLE: Record<string, SwarmWorkerNode['role']> = {
  worker_1: 'analyst',
  worker_2: 'marketer',
  worker_3: 'researcher',
  worker_4: 'designer',
  worker_5: 'researcher',
  worker_6: 'analyst',
  worker_7: 'writer',
  worker_8: 'writer',
  worker_9: 'coder',
  worker_10: 'analyst',
  worker_11: 'coder',
  worker_12: 'analyst',
};

export function agentNodesToSwarmNodes(nodes: AgentNode[]): SwarmWorkerNode[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return SWARM_NODES.map((swarmNode) => {
    if (swarmNode.id === 'co_founder') {
      const node = nodeMap.get('co_founder');
      if (!node) return swarmNode;
      return {
        ...swarmNode,
        status: mapAgentStateToSwarmStatus(node.state),
        activeTask: node.telemetry.currentAction,
        latencyMs: node.telemetry.latencyMs,
        tokensPerSec: node.telemetry.tokensPerSec,
      };
    }

    const workerId = nodes
      .filter((n) => n.level === 'core_worker')
      .find((n) => WORKER_NODE_TO_ROLE[n.id] === swarmNode.role)?.id;

    if (!workerId) return swarmNode;

    const node = nodeMap.get(workerId);
    if (!node) return swarmNode;

    return {
      ...swarmNode,
      status: mapAgentStateToSwarmStatus(node.state),
      activeTask: node.telemetry.currentAction,
      latencyMs: node.telemetry.latencyMs,
      tokensPerSec: node.telemetry.tokensPerSec,
    };
  });
}

function mapAgentStateToSwarmStatus(
  state: AgentNode['state']
): SwarmWorkerNode['status'] {
  switch (state) {
    case 'analyzing':
      return 'analyzing';
    case 'thinking':
      return 'thinking';
    case 'executing':
      return 'executing';
    case 'generating':
      return 'generating';
    case 'completed':
      return 'active';
    case 'waiting_approval':
      return 'analyzing';
    default:
      return 'active';
  }
}

function mapAgentStateToWorkerStatus(
  state: AgentNode['state']
): WorkerNodeData['status'] {
  switch (state) {
    case 'analyzing':
    case 'thinking':
      return 'thinking';
    case 'executing':
    case 'generating':
    case 'listening':
    case 'speaking':
      return 'working';
    case 'completed':
      return 'completed';
    case 'waiting_approval':
      return 'thinking';
    default:
      return 'idle';
  }
}

export function agentNodesToWorkerGrid(nodes: AgentNode[]): WorkerNodeData[] {
  return nodes
    .filter((n) => n.level === 'core_worker')
    .map((node): WorkerNodeData | null => {
      const role = WORKER_NODE_TO_ROLE[node.id];
      if (!role) return null;

      const subAgents: SubAgent[] =
        node.subagentIds?.map((subId) => {
          const sub = nodes.find((n) => n.id === subId);
          return {
            id: subId,
            name: sub ? sub.name.replace(/^coworker_|/g, '') : subId,
            roleDescription: sub?.category || 'Specialized sub-agent',
            status: sub ? mapAgentStateToWorkerStatus(sub.state) : 'idle',
            tool: sub?.telemetry.activeTool || 'agent.subtask()',
            lastExecutionMs: sub ? Math.round(sub.telemetry.latencyMs) : 0,
          };
        }) || [];

      return {
        id: node.id,
        role: role as WorkerNodeData['role'],
        name: node.name.replace(/^Worker \d:\s*/, ''),
        title: node.title,
        description: node.category,
        status: mapAgentStateToWorkerStatus(node.state),
        activeTask: node.telemetry.currentAction,
        latencyMs: node.telemetry.latencyMs,
        tokensPerSec: node.telemetry.tokensPerSec,
        subAgents,
      };
    })
    .filter((n): n is WorkerNodeData => n !== null);
}

export interface WorkforceSummary {
  totalWorkers: number;
  activeWorkers: number;
  disabledWorkers: number;
  pendingApprovals: number;
  activeSignals: number;
  criticalSignals: number;
}

export function computeWorkforceSummary(
  nodes: AgentNode[],
  activeSignals: number,
  pendingApprovals: number
): WorkforceSummary {
  const coreWorkers = nodes.filter(
    (n) => n.level === 'core_worker' || n.level === 'co_worker'
  );

  return {
    totalWorkers: nodes.length,
    activeWorkers: coreWorkers.filter(
      (n) =>
        n.state === 'analyzing' ||
        n.state === 'executing' ||
        n.state === 'generating' ||
        n.state === 'thinking' ||
        n.state === 'waiting_approval'
    ).length,
    disabledWorkers: coreWorkers.filter(
      (n) =>
        n.telemetry.computeLoadPct === 0 &&
        n.state === 'idle' &&
        n.telemetry.latencyMs === 0
    ).length,
    pendingApprovals,
    activeSignals,
    criticalSignals: activeSignals,
  };
}
