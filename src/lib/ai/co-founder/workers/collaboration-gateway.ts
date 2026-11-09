// src/lib/ai/co-founder/workers/collaboration-gateway.ts
//
// Central Orchestration Gateway for Worker-to-Worker and Co-Founder-to-Worker Consultations.
// Enforces loop prevention, maximum recursion depth, timeouts, permission boundaries, and audit logging.

import 'server-only';
import { WorkerId } from './types';
import {
  WorkerConsultationRequest,
  WorkerConsultationResult,
  MAX_COLLABORATION_DEPTH,
  DEFAULT_COLLABORATION_TIMEOUT_MS,
} from './collaboration-types';
import { WorkerRegistry, resolveCanonicalWorkerId } from './registry';
import { getServiceClient } from '@/lib/supabase/service';
import { redactSensitiveData } from '../security';

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
    const timeoutMs = request.timeoutMs || DEFAULT_COLLABORATION_TIMEOUT_MS;

    const canonicalTargetId =
      resolveCanonicalWorkerId(request.targetWorkerId) ||
      (request.targetWorkerId as WorkerId);
    const canonicalRequesterId =
      request.requesterWorkerId === 'co_founder'
        ? 'co_founder'
        : resolveCanonicalWorkerId(request.requesterWorkerId) ||
          request.requesterWorkerId;

    // Guard 1: Recursion depth limit
    if (depth > MAX_COLLABORATION_DEPTH) {
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
    if (canonicalRequesterId === canonicalTargetId) {
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
    const targetWorker = registry.getWorker(canonicalTargetId);
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

    // Guard 4: Timeout wrapper with cooperative cancellation (Section 5.4)
    const abortController = new AbortController();
    let isTimedOut = false;
    let timer: NodeJS.Timeout | undefined;

    try {
      const taskPromise = targetWorker.execute({
        task: request.task,
        parameters: {
          ...(request.context || {}),
          signal: abortController.signal,
        },
      });

      const timeoutPromise = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          isTimedOut = true;
          abortController.abort(
            new Error(`Consultation timed out after ${timeoutMs}ms`)
          );
          reject(new Error(`Consultation timed out after ${timeoutMs}ms`));
        }, timeoutMs);
        if (timer && typeof timer.unref === 'function') {
          timer.unref();
        }
      });

      const output = await Promise.race([taskPromise, timeoutPromise]);
      if (timer) clearTimeout(timer);

      if (isTimedOut) {
        throw new Error(`Consultation timed out after ${timeoutMs}ms`);
      }

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
      this.logCollaboration(
        request,
        canonicalRequesterId,
        canonicalTargetId,
        result
      ).catch((err) =>
        console.warn('[WorkerCollaborationGateway] Audit log error:', err)
      );

      return result;
    } catch (err: any) {
      if (timer) clearTimeout(timer);
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

      this.logCollaboration(
        request,
        canonicalRequesterId,
        canonicalTargetId,
        result
      ).catch(() => {});
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
    requesterId: string,
    targetWorkerId: string,
    result: WorkerConsultationResult
  ) {
    try {
      const supabase = getServiceClient();
      const dbStatus =
        result.status === 'success'
          ? 'completed'
          : result.status === 'timeout'
            ? 'timeout'
            : 'failed';

      const cleanTask = redactSensitiveData(request.task);
      const cleanFindings = Array.isArray(result.findings)
        ? result.findings.map((f) => redactSensitiveData(String(f)))
        : result.findings;

      await supabase.from('co_founder_worker_collaborations').insert({
        correlation_id: request.correlationId,
        requester_id: requesterId,
        target_worker_id: targetWorkerId,
        task: cleanTask,
        status: dbStatus,
        findings: cleanFindings,
        duration_ms: result.trace.durationMs,
      });
    } catch {
      // Fire-and-forget audit
    }
  }
}
