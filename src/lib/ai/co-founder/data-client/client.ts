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
  WorkerSnapshotPayload,
  WorkerRunPayload,
  ToolEventPayload,
  EvaluationSuitePayload,
  EvaluationCasePayload,
  EvaluationResultPayload,
  SecurityEventPayload,
  SecurityScanIngestPayload,
  SecurityActionProposalPayload,
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
      method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
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

  /**
   * Synchronize live worker registry snapshots (Finding A-09)
   */
  async syncWorkerSnapshots(snapshots: WorkerSnapshotPayload[]) {
    return this.request<{ synced_count: number; synced_at: string }>(
      '/v1/workers/snapshot/sync',
      {
        method: 'POST',
        body: { snapshots },
      }
    );
  }

  /**
   * Record worker execution lifecycle telemetry (Finding A-10)
   */
  async recordWorkerRun(payload: WorkerRunPayload) {
    return this.request<{
      id: string;
      run_id: string;
      worker_id: string;
      status: string;
    }>('/v1/worker-runs', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Record redacted tool execution event (Finding A-10)
   */
  async recordToolEvent(payload: ToolEventPayload) {
    return this.request<{ id: string; run_id: string; tool_name: string }>(
      '/v1/tool-events',
      {
        method: 'POST',
        body: payload,
      }
    );
  }

  /**
   * Update capability gap status (Finding A-08)
   */
  async updateCapabilityGapStatus(
    gapId: string,
    status:
      | 'identified'
      | 'under_research'
      | 'proposal_ready'
      | 'resolved'
      | 'wont_fix',
    options?: { evidence_refs?: string[]; impact?: string; risk?: string }
  ) {
    return this.request(`/v1/gaps/${encodeURIComponent(gapId)}`, {
      method: 'PATCH',
      body: { status, ...options },
    });
  }

  /**
   * Create evaluation suite (Finding A-07)
   */
  async createEvaluationSuite(payload: EvaluationSuitePayload) {
    return this.request('/v1/evaluations/suites', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List evaluation suites (Finding A-07)
   */
  async listEvaluationSuites() {
    return this.request<any[]>('/v1/evaluations/suites', {
      method: 'GET',
    });
  }

  /**
   * Add test case to evaluation suite (Finding A-07)
   */
  async createEvaluationCase(suiteId: string, payload: EvaluationCasePayload) {
    return this.request(
      `/v1/evaluations/suites/${encodeURIComponent(suiteId)}/cases`,
      {
        method: 'POST',
        body: payload,
      }
    );
  }

  /**
   * List test cases in evaluation suite (Finding A-07)
   */
  async listEvaluationCases(suiteId: string) {
    return this.request<any[]>(
      `/v1/evaluations/suites/${encodeURIComponent(suiteId)}/cases`,
      {
        method: 'GET',
      }
    );
  }

  /**
   * Start evaluation run (Finding A-07)
   */
  async startEvaluationRun(payload: {
    suite_id: string;
    candidate_version: string;
    baseline_version?: string;
    status?: string;
  }) {
    return this.request('/v1/evaluations/runs', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Record evaluation results (Finding A-07)
   */
  async recordEvaluationResults(
    runId: string,
    results: EvaluationResultPayload[]
  ) {
    return this.request(
      `/v1/evaluations/runs/${encodeURIComponent(runId)}/results`,
      {
        method: 'POST',
        body: { results },
      }
    );
  }

  /**
   * Close evaluation run (Finding A-07)
   */
  async closeEvaluationRun(
    runId: string,
    status: 'passed' | 'failed' | 'error' = 'passed'
  ) {
    return this.request(`/v1/evaluations/runs/${encodeURIComponent(runId)}`, {
      method: 'PATCH',
      body: { status },
    });
  }

  /**
   * Get evaluation run with results (Finding A-07)
   */
  async getEvaluationRun(runId: string) {
    return this.request(`/v1/evaluations/runs/${encodeURIComponent(runId)}`, {
      method: 'GET',
    });
  }

  /**
   * Upload binary or text artifact directly to R2 (Finding A-11 & A-18)
   */
  async uploadArtifact(
    key: string,
    data: ArrayBuffer | Uint8Array | string,
    options: {
      contentType?: string;
      artifactType?: string;
      scope?: string;
      fileName?: string;
    } = {}
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    const query = new URLSearchParams();
    query.set('key', key);
    if (options.contentType) query.set('content_type', options.contentType);
    if (options.artifactType) query.set('artifact_type', options.artifactType);
    if (options.scope) query.set('scope', options.scope);
    if (options.fileName) query.set('file_name', options.fileName);

    const headers: Record<string, string> = {
      'Content-Type': options.contentType || 'application/octet-stream',
    };
    if (this.clientId) headers['CF-Access-Client-Id'] = this.clientId;
    if (this.clientSecret)
      headers['CF-Access-Client-Secret'] = this.clientSecret;

    const bodyBuffer =
      typeof data === 'string'
        ? new TextEncoder().encode(data)
        : data instanceof Uint8Array
          ? data
          : new Uint8Array(data);

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/artifacts/upload?${query.toString()}`,
        {
          method: 'POST',
          headers,
          body: bodyBuffer as any,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Data API upload returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
        };
      }

      const json = await response.json();
      return { success: true, data: json.data };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Download artifact from R2 (Finding A-11)
   */
  async downloadArtifact(key: string): Promise<{
    success: boolean;
    data?: ArrayBuffer;
    contentType?: string;
    error?: string;
  }> {
    const headers: Record<string, string> = {};
    if (this.clientId) headers['CF-Access-Client-Id'] = this.clientId;
    if (this.clientSecret)
      headers['CF-Access-Client-Secret'] = this.clientSecret;

    try {
      const response = await fetch(
        `${this.baseUrl}/v1/artifacts/download?key=${encodeURIComponent(key)}`,
        {
          method: 'GET',
          headers,
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        return {
          success: false,
          error: `Data API download returned HTTP ${response.status}: ${errText.slice(0, 200)}`,
        };
      }

      const buffer = await response.arrayBuffer();
      const contentType =
        response.headers.get('content-type') || 'application/octet-stream';
      return { success: true, data: buffer, contentType };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Delete artifact from R2 (Finding A-11)
   */
  async deleteArtifact(key: string) {
    return this.request(`/v1/artifacts?key=${encodeURIComponent(key)}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get artifact metadata (Finding A-12)
   */
  async getArtifactMetadata(key: string) {
    return this.request(
      `/v1/artifacts/metadata?key=${encodeURIComponent(key)}`,
      {
        method: 'GET',
      }
    );
  }

  // --------------------------------------------------------------------------
  // WORKFORCE RUNTIME APIS (WF-GAP-004, WF-GAP-005, WF-GAP-014, WF-GAP-025)
  // --------------------------------------------------------------------------

  /**
   * Save incoming normalized workforce signal
   */
  async saveWorkforceSignal(signal: {
    id?: string;
    source_type: string;
    source_ref?: string;
    fingerprint: string;
    idempotency_key: string;
    trust_label?: string;
    domain: string;
    payload: any;
  }) {
    return this.request('/v1/workforce/signals', {
      method: 'POST',
      body: signal,
      idempotencyKey: signal.idempotency_key,
    });
  }

  /**
   * Save workforce candidate goal
   */
  async saveWorkforceGoal(goal: {
    id?: string;
    signal_id?: string;
    title: string;
    description: string;
    worker_id: string;
    score?: number;
    confidence?: number;
    effort?: number;
    risk?: number;
    status?: string;
    evidence_refs?: string[];
    cooldown_until?: string;
  }) {
    return this.request('/v1/workforce/goals', {
      method: 'POST',
      body: goal,
    });
  }

  /**
   * Update workforce goal state
   */
  async updateWorkforceGoal(
    goalId: string,
    update: { status?: string; score?: number }
  ) {
    return this.request(`/v1/workforce/goals/${encodeURIComponent(goalId)}`, {
      method: 'PUT',
      body: update,
    });
  }

  /**
   * Save validated workforce execution plan
   */
  async saveWorkforcePlan(plan: {
    id?: string;
    goal_id: string;
    schema_version?: string;
    user_goal: string;
    intent: string;
    stages_json: any;
    all_steps_json: any;
    conflicts_json?: any;
    risk_tier?: string;
    status?: string;
  }) {
    return this.request('/v1/workforce/plans', {
      method: 'POST',
      body: plan,
    });
  }

  /**
   * Create durable workforce task
   */
  async createWorkforceTask(task: {
    id?: string;
    plan_id?: string;
    goal_id?: string;
    worker_id: string;
    title: string;
    task_input: any;
    priority?: number;
    max_attempts?: number;
    effective_scope?: string[];
    trust_label?: string;
    deadline_at?: string;
  }) {
    return this.request('/v1/workforce/tasks', {
      method: 'POST',
      body: task,
    });
  }

  /**
   * Atomic task claim / lease (WF-GAP-005)
   */
  async claimWorkforceTask(
    taskId: string,
    leaseOwner: string,
    leaseDurationMs = 30000
  ) {
    return this.request<{
      claimed: boolean;
      task_id?: string;
      lease_owner?: string;
      lease_expires_at?: string;
      attempt?: number;
      reason?: string;
    }>(`/v1/workforce/tasks/${encodeURIComponent(taskId)}/claim`, {
      method: 'POST',
      body: { lease_owner: leaseOwner, lease_duration_ms: leaseDurationMs },
    });
  }

  /**
   * Heartbeat to extend active lease
   */
  async heartbeatWorkforceTask(
    taskId: string,
    leaseOwner: string,
    extendMs = 30000
  ) {
    return this.request(
      `/v1/workforce/tasks/${encodeURIComponent(taskId)}/heartbeat`,
      {
        method: 'POST',
        body: { lease_owner: leaseOwner, extend_ms: extendMs },
      }
    );
  }

  /**
   * Save checkpoint for task step
   */
  async saveWorkforceCheckpoint(
    taskId: string,
    stepId: string,
    attempt: number,
    checkpointData: any
  ) {
    return this.request(
      `/v1/workforce/tasks/${encodeURIComponent(taskId)}/checkpoint`,
      {
        method: 'POST',
        body: { step_id: stepId, attempt, checkpoint_data: checkpointData },
      }
    );
  }

  /**
   * Transition workforce task state
   */
  async updateWorkforceTaskState(
    taskId: string,
    status: string,
    options?: { outputRef?: any; approvalId?: string }
  ) {
    return this.request(
      `/v1/workforce/tasks/${encodeURIComponent(taskId)}/state`,
      {
        method: 'POST',
        body: {
          status,
          output_ref: options?.outputRef,
          approval_id: options?.approvalId,
        },
      }
    );
  }

  /**
   * Record durable child delegation (WF-GAP-014)
   */
  async recordWorkforceDelegation(delegation: {
    parent_task_id: string;
    child_task_id: string;
    parent_worker_id: string;
    child_worker_id: string;
    depth?: number;
    effective_scope?: string[];
  }) {
    return this.request('/v1/workforce/delegations', {
      method: 'POST',
      body: delegation,
    });
  }

  /**
   * Record dead letter
   */
  async recordWorkforceDeadLetter(deadLetter: {
    task_id: string;
    failure_class: string;
    error_message: string;
    attempt_count?: number;
    payload?: any;
  }) {
    return this.request('/v1/workforce/dead-letters', {
      method: 'POST',
      body: deadLetter,
    });
  }

  /**
   * Get measured workforce status (WF-GAP-016 & WF-GAP-021)
   */
  async getWorkforceStatus() {
    return this.request('/v1/workforce/status', { method: 'GET' });
  }

  /**
   * Set workforce server-side control / kill switch (WF-GAP-025)
   */
  async setWorkforceControl(
    controlKey: string,
    isEnabled: boolean,
    reason?: string
  ) {
    return this.request('/v1/workforce/controls', {
      method: 'POST',
      body: { control_key: controlKey, is_enabled: isEnabled, reason },
    });
  }

  // ==========================================================================
  // Security Intelligence Endpoints (/v1/security/*)
  // ==========================================================================

  /**
   * Ingest runtime security event
   */
  async recordSecurityEvent(payload: SecurityEventPayload) {
    return this.request('/v1/security/events', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Ingest CI/CD scanner findings
   */
  async ingestSecurityScan(payload: SecurityScanIngestPayload) {
    return this.request('/v1/security/scans', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Query security findings
   */
  async getSecurityFindings(
    params: {
      severity?: string;
      status?: string;
      limit?: number;
      offset?: number;
    } = {}
  ) {
    const qs = new URLSearchParams();
    if (params.severity) qs.set('severity', params.severity);
    if (params.status) qs.set('status', params.status);
    if (params.limit) qs.set('limit', String(params.limit));
    if (params.offset) qs.set('offset', String(params.offset));
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/v1/security/findings${query}`, { method: 'GET' });
  }

  /**
   * Query active security incidents
   */
  async getSecurityIncidents(
    params: { state?: string; severity?: string } = {}
  ) {
    const qs = new URLSearchParams();
    if (params.state) qs.set('state', params.state);
    if (params.severity) qs.set('severity', params.severity);
    const query = qs.toString() ? `?${qs.toString()}` : '';
    return this.request(`/v1/security/incidents${query}`, { method: 'GET' });
  }

  /**
   * Create or update security incident
   */
  async createSecurityIncident(incident: {
    id?: string;
    title: string;
    incident_type?: string;
    severity?: string;
    confidence?: number;
    state?: string;
    impact_summary?: string;
    root_cause?: string;
    timeline?: any[];
  }) {
    return this.request('/v1/security/incidents', {
      method: 'POST',
      body: incident,
    });
  }

  /**
   * Propose autonomous reversible containment action
   */
  async proposeSecurityAction(payload: SecurityActionProposalPayload) {
    return this.request('/v1/security/proposals', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * List security containment proposals
   */
  async listSecurityProposals(status?: string) {
    const qs = status ? `?status=${encodeURIComponent(status)}` : '';
    return this.request(`/v1/security/proposals${qs}`, { method: 'GET' });
  }

  /**
   * Record file quarantine metadata
   */
  async quarantineFile(metadata: {
    filename: string;
    mime: string;
    r2_key: string;
    sha256: string;
    reason?: string;
  }) {
    return this.request('/v1/security/quarantine', {
      method: 'POST',
      body: metadata,
    });
  }

  /**
   * List blocked entities (IPs, accounts)
   */
  async listBlockedEntities(activeOnly = true) {
    const qs = activeOnly ? '?active=true' : '';
    return this.request(`/v1/security/blocked-entities${qs}`, {
      method: 'GET',
    });
  }
}
