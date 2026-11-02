// src/lib/ai/co-founder/workers/collaboration-types.ts
//
// Typed contracts for Worker-to-Worker and Co-Founder-to-Worker Collaboration Gateway.

import { WorkerId } from './types';

export interface WorkerConsultationRequest {
  correlationId: string;
  requesterWorkerId: WorkerId | 'co_founder';
  targetWorkerId: WorkerId;
  task: string;
  context?: Record<string, any>;
  depth?: number;
  timeoutMs?: number;
}

export interface WorkerConsultationResult {
  correlationId: string;
  status: 'success' | 'failed' | 'timeout' | 'rejected';
  requesterWorkerId: WorkerId | 'co_founder';
  targetWorkerId: WorkerId;
  findings: string[];
  evidence: string[];
  recommendations: string[];
  uncertainty?: string;
  trace: {
    startedAt: string;
    completedAt: string;
    durationMs: number;
    depth: number;
  };
  error?: string;
}

export interface CollaborationTraceRecord {
  id: string;
  correlationId: string;
  rootConversationId?: string;
  requesterId: string;
  targetWorkerId: WorkerId;
  status: 'pending' | 'completed' | 'failed' | 'timeout';
  summary?: string;
  durationMs?: number;
  createdAt: string;
}
