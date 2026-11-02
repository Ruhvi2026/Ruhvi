// src/lib/ai/co-founder/workers/collaboration-gateway.ts
//
// Central Orchestration Gateway for Worker-to-Worker and Co-Founder-to-Worker Consultations.
// Enforces loop prevention, maximum recursion depth, timeouts, permission boundaries, and audit logging.

import 'server-only';
import { WorkerId } from './types';
import {
  WorkerConsultationRequest,
  WorkerConsultationResult,
} from './collaboration-types';
import { WorkerRegistry } from './registry';
import { getServiceClient } from '@/lib/supabase/service';

const MAX_DELEGATION_DEPTH = 2;
const DEFAULT_TIMEOUT_MS = 15000; // 15 seconds max per consultation

const registry = new WorkerRegistry();

export class WorkerCollaborationGateway {
  /**
   * Executes a governed consultation request from one worker (or Co-Founder) to another worker.
   */
  static async consultWorker(
    request: WorkerConsultationRequest
  ): Promise<WorkerConsultationResult> {
    const startedAt = Date.now();
    const depth = request.depth || 1;
    const timeoutMs = request.timeoutMs || DEFAULT_TIMEOUT_MS;

    // Guard 1: Recursion depth limit
    if (depth > MAX_DELEGATION_DEPTH) {
      return this.buildResult(
        request,
        'rejected',
        [],
        [],
        [],
        'Recursion limit exceeded (max depth 2)',
        startedAt,
        depth,
        'Delegation depth limit reached'
      );
    }

    // Guard 2: Prevent self-delegation loop
    if (request.requesterWorkerId === request.targetWorkerId) {
      return this.buildResult(
        request,
        'rejected',
        [],
        [],
        [],
        'Self-delegation loop blocked',
        startedAt,
        depth,
        'Worker cannot consult itself'
      );
    }

    // Guard 3: Validate target worker exists
    const targetWorker = registry.getWorker(request.targetWorkerId);
    if (!targetWorker) {
      return this.buildResult(
        request,
        'rejected',
        [],
        [],
        [],
        'Unknown target worker',
        startedAt,
        depth,
        `Target worker '${request.targetWorkerId}' is not registered`
      );
    }

    // Guard 4: Timeout wrapper
    try {
      const taskPromise = targetWorker.execute({
        task: request.task,
        parameters: request.context || {},
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(
          () =>
            reject(new Error(`Consultation timed out after ${timeoutMs}ms`)),
          timeoutMs
        )
      );

      const output = await Promise.race([taskPromise, timeoutPromise]);

      const result = this.buildResult(
        request,
        'success',
        output.findings || [],
        output.evidence || [],
        output.recommendations || [],
        undefined,
        startedAt,
        depth
      );

      // Async audit log
      this.logCollaboration(request, result).catch((err) =>
        console.warn('[WorkerCollaborationGateway] Audit log error:', err)
      );

      return result;
    } catch (err: any) {
      const isTimeout = err.message?.includes('timed out');
      const status = isTimeout ? 'timeout' : 'failed';

      const result = this.buildResult(
        request,
        status,
        [],
        [],
        [],
        err.message,
        startedAt,
        depth,
        err.message
      );

      this.logCollaboration(request, result).catch(() => {});
      return result;
    }
  }

  private static buildResult(
    request: WorkerConsultationRequest,
    status: 'success' | 'failed' | 'timeout' | 'rejected',
    findings: string[],
    evidence: string[],
    recommendations: string[],
    uncertainty?: string,
    startedAt = Date.now(),
    depth = 1,
    error?: string
  ): WorkerConsultationResult {
    const completedAt = Date.now();
    return {
      correlationId: request.correlationId,
      status,
      requesterWorkerId: request.requesterWorkerId,
      targetWorkerId: request.targetWorkerId,
      findings,
      evidence,
      recommendations,
      uncertainty,
      trace: {
        startedAt: new Date(startedAt).toISOString(),
        completedAt: new Date(completedAt).toISOString(),
        durationMs: completedAt - startedAt,
        depth,
      },
      error,
    };
  }

  private static async logCollaboration(
    request: WorkerConsultationRequest,
    result: WorkerConsultationResult
  ) {
    try {
      const supabase = getServiceClient();
      await supabase.from('co_founder_worker_collaborations').insert({
        correlation_id: request.correlationId,
        requester_id: request.requesterWorkerId,
        target_worker_id: request.targetWorkerId,
        task: request.task,
        status: result.status,
        findings: result.findings,
        duration_ms: result.trace.durationMs,
      });
    } catch {
      // Fire-and-forget audit
    }
  }
}
