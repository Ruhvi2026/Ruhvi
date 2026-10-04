export type AgentHierarchyLevel = 'apex_co_founder' | 'core_worker' | 'co_worker';

export type AgentWorkState =
  | 'idle'
  | 'listening'
  | 'speaking'
  | 'thinking'
  | 'analyzing'
  | 'generating'
  | 'executing'
  | 'completed'
  | 'waiting_approval';

export interface AgentTelemetry {
  latencyMs: number;
  tokensPerSec: number;
  computeLoadPct: number;
  activeTool?: string;
  activeModel?: string;
  autonomyLevel: 'Supervised' | 'Autonomous' | 'Approval Required';
  currentAction: string;
  progressPct: number;
  logLines: Array<{
    timestamp: string;
    level: 'info' | 'exec' | 'warn' | 'success';
    message: string;
  }>;
}

export interface AgentNode {
  id: string;
  name: string;
  title: string;
  level: AgentHierarchyLevel;
  parentId?: string; // id of parent node in hierarchy
  category: string;
  color: string;
  accentColor: string;
  dotCount: number;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  orbitElevation: number; // Y offset in 3D
  state: AgentWorkState;
  telemetry: AgentTelemetry;
  capabilities: string[];
  subagentIds?: string[];
}

export interface NeuralSynapse {
  fromId: string;
  toId: string;
  activityLevel: number; // 0 (inactive) to 1 (high throughput)
  packets: Array<{ progress: number; speed: number; color: string }>;
}
