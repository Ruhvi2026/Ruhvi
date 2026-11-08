/**
 * Ruhvi AI Co-Founder — RSI Self-Observer & Execution Intelligence
 * Phase 3: Captures compact, redacted telemetry and aggregates system performance metrics.
 */

import { getCofounderDataClient } from '../data-client';
import { assertRsiOperationAllowed } from './governance';

export interface ExecutionObservation {
  runId: string;
  workerId: string;
  taskType: string;
  modelRoute?: string;
  latencyMs: number;
  success: boolean;
  toolCallsCount: number;
  errorClass?: string;
  metadata?: Record<string, any>;
}

export class RsiSelfObserver {
  private client = getCofounderDataClient();

  /**
   * Redacts sensitive personal information (PII) and secret credentials.
   */
  redactSensitiveData(text: string): string {
    if (!text || typeof text !== 'string') return text;
    return text
      .replace(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_EMAIL]')
      .replace(/(?:\+91|91|0)?[6-9]\d{9}/g, '[REDACTED_PHONE]')
      .replace(/cfast_[a-zA-Z0-9_-]+/g, '[REDACTED_SECRET]')
      .replace(/cfut_[a-zA-Z0-9_-]+/g, '[REDACTED_SECRET]')
      .replace(/Bearer\s+[a-zA-Z0-9._-]+/gi, 'Bearer [REDACTED_TOKEN]');
  }

  /**
   * Records a compact execution observation to Cloudflare D1
   */
  async recordObservation(observation: ExecutionObservation): Promise<void> {
    assertRsiOperationAllowed('telemetry_write');

    const sanitizedError = observation.errorClass
      ? this.redactSensitiveData(observation.errorClass)
      : undefined;

    // Append compact event into D1 run_events
    await this.client.appendRunEvent(observation.runId, {
      worker_run_id: observation.workerId,
      event_type: 'observation',
      event_json: {
        task_type: observation.taskType,
        model_route: observation.modelRoute,
        latency_ms: observation.latencyMs,
        success: observation.success,
        tool_calls_count: observation.toolCallsCount,
        error_class: sanitizedError,
        timestamp: new Date().toISOString(),
      },
    });
  }

  /**
   * Aggregates key reliability metrics from recent observations
   */
  aggregateMetrics(observations: ExecutionObservation[]) {
    if (!observations.length) {
      return {
        totalRuns: 0,
        successRate: 1.0,
        averageLatencyMs: 0,
        errorRatesByClass: {},
      };
    }

    const totalRuns = observations.length;
    const successfulRuns = observations.filter((o) => o.success).length;
    const totalLatency = observations.reduce((acc, o) => acc + o.latencyMs, 0);

    const errorCounts: Record<string, number> = {};
    for (const obs of observations) {
      if (!obs.success && obs.errorClass) {
        errorCounts[obs.errorClass] = (errorCounts[obs.errorClass] || 0) + 1;
      }
    }

    return {
      totalRuns,
      successRate: successfulRuns / totalRuns,
      averageLatencyMs: Math.round(totalLatency / totalRuns),
      errorRatesByClass: errorCounts,
    };
  }
}
