import {
  ExplicitMemoryPayload,
  MemorySearchParams,
  CandidateLessonPayload,
  VerifyLessonPayload,
  AgentRunPayload,
  RunEventPayload,
  WorkerProposalPayload,
  ResearchProjectPayload,
  UpgradeProposalPayload,
  PresignArtifactPayload,
  CapabilityGapPayload,
  EvaluationRunPayload,
  ProposalDecisionPayload,
} from './types';
import { generateIdempotencyKey } from './idempotency';

export interface CofounderDataClientConfig {
  baseUrl?: string;
  clientId?: string;
  clientSecret?: string;
  timeoutMs?: number;
}

export class CofounderDataClient {
  private baseUrl: string;
  private clientId: string;
  private clientSecret: string;
  private timeoutMs: number;

  constructor(config: CofounderDataClientConfig = {}) {
    this.baseUrl = (
      config.baseUrl ||
      process.env.COFOUNDER_DATA_API_URL ||
      'https://cofounder-data.ruhvi.in'
    ).replace(/\/+$/, '');
    this.clientId =
      config.clientId || process.env.COFOUNDER_DATA_API_CLIENT_ID || '';
    this.clientSecret =
      config.clientSecret || process.env.COFOUNDER_DATA_API_CLIENT_SECRET || '';
    this.timeoutMs = config.timeoutMs || 10000;
  }

  private async request<T = any>(
    path: string,
    options: {
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
      body?: any;
      idempotencyKey?: string;
      correlationId?: string;
    } = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    const { method = 'GET', body, idempotencyKey, correlationId } = options;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.clientId) {
      headers['CF-Access-Client-Id'] = this.clientId;
    }
    if (this.clientSecret) {
      headers['CF-Access-Client-Secret'] = this.clientSecret;
    }
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    if (correlationId) {
      headers['X-Correlation-ID'] = correlationId;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Data API returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      return { success: true, data: json.data };
    } catch (err: any) {
      clearTimeout(timer);
      console.warn(
        `[CofounderDataClient] Request failed for ${path}:`,
        err.message
      );
      return { success: false, error: err.message };
    }
  }

  /**
   * Health Check
   */
  async health() {
    return this.request<{ status: string; environment: string }>('/v1/health');
  }

  /**
   * Save Explicit User Instruction Memory
   */
  async saveExplicitMemory(
    payload: ExplicitMemoryPayload,
    correlationId?: string
  ) {
    const key = generateIdempotencyKey('memory_explicit', payload);
    return this.request('/v1/memory/explicit', {
      method: 'POST',
      body: payload,
      idempotencyKey: key,
      correlationId,
    });
  }

  /**
   * Search Active Memories
   */
  async searchMemories(params: MemorySearchParams = {}) {
    const query = new URLSearchParams();
    if (params.type) query.set('type', params.type);
    if (params.scope) query.set('scope', params.scope);
    if (params.limit) query.set('limit', String(params.limit));

    const path = `/v1/memory/search${query.toString() ? `?${query.toString()}` : ''}`;
    return this.request<any[]>(path, { method: 'GET' });
  }

  /**
   * Save Candidate Lesson
   */
  async saveCandidateLesson(payload: CandidateLessonPayload) {
    return this.request('/v1/memory/candidate', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Verify Candidate Lesson
   */
  async verifyLesson(payload: VerifyLessonPayload) {
    return this.request('/v1/memory/verify', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Create or Update Task Run Metadata
   */
  async createOrUpdateRun(payload: AgentRunPayload) {
    return this.request('/v1/runs', {
      method: 'POST',
      body: payload,
      correlationId: payload.correlation_id,
    });
  }

  /**
   * Append Execution Event to Run
   */
  async appendRunEvent(runId: string, payload: RunEventPayload) {
    return this.request(`/v1/runs/${encodeURIComponent(runId)}/events`, {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Propose Worker / Child Worker
   */
  async createWorkerProposal(payload: WorkerProposalPayload) {
    return this.request('/v1/worker-proposals', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Store Research Findings
   */
  async createResearchProject(payload: ResearchProjectPayload) {
    return this.request('/v1/research', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Store RSI Upgrade Proposal
   */
  async createUpgradeProposal(payload: UpgradeProposalPayload) {
    return this.request('/v1/proposals', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Forget / Archive Memory
   */
  async forgetMemory(id: string) {
    return this.request('/v1/memory/forget', {
      method: 'POST',
      body: { id },
    });
  }

  /**
   * Presign / Allocate Key in R2 Artifacts Bucket
   */
  async presignArtifact(payload: PresignArtifactPayload) {
    return this.request<{
      r2_key: string;
      bucket: string;
      content_type: string;
    }>('/v1/artifacts/presign', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Record Detected Capability Gap
   */
  async recordCapabilityGap(payload: CapabilityGapPayload) {
    return this.request('/v1/gaps', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List Capability Gaps
   */
  async listCapabilityGaps(status = 'open') {
    return this.request<any[]>(
      `/v1/gaps?status=${encodeURIComponent(status)}`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Record Evaluation Run
   */
  async recordEvaluation(payload: EvaluationRunPayload) {
    return this.request('/v1/evaluations', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List Recent Evaluations
   */
  async listEvaluations() {
    return this.request<any[]>('/v1/evaluations', {
      method: 'GET',
    });
  }

  /**
   * Record Owner Decision on Upgrade Proposal
   */
  async recordProposalDecision(
    proposalId: string,
    payload: ProposalDecisionPayload
  ) {
    return this.request(
      `/v1/proposals/${encodeURIComponent(proposalId)}/decision`,
      {
        method: 'POST',
        body: payload,
      }
    );
  }

  /**
   * List Upgrade Proposals
   */
  async listProposals() {
    return this.request<any[]>('/v1/proposals', {
      method: 'GET',
    });
  }

  /**
   * Get Evolution & Audit History
   */
  async getEvolutionHistory() {
    return this.request<any[]>('/v1/history', {
      method: 'GET',
    });
  }
}
