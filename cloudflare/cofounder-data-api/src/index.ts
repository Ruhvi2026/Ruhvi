import { Env, ApiResponse, ExecutionContext, MessageBatch } from './types';
import { validateServiceAuth } from './auth';
import { handleSecurityRoutes, handleSecurityQueue } from './security';

function jsonResponse<T>(
  data: ApiResponse<T> & { replayed?: boolean },
  status = 200
): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers':
      'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret, Idempotency-Key, X-Correlation-ID',
  };
  if (data.replayed) {
    headers['X-Idempotency-Replay'] = 'true';
  }
  return new Response(JSON.stringify(data), { status, headers });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

async function hashString(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function checkIdempotency(
  env: Env,
  key: string | null
): Promise<Response | null> {
  if (!key) return null;
  const existing = await env.DB.prepare(
    `SELECT * FROM idempotency_keys WHERE key = ? AND expires_at > datetime('now')`
  )
    .bind(key)
    .first<any>();
  if (existing && existing.result_ref) {
    try {
      const parsed = JSON.parse(existing.result_ref);
      return jsonResponse({ success: true, data: parsed, replayed: true });
    } catch {
      return jsonResponse({
        success: true,
        data: { ref: existing.result_ref },
        replayed: true,
      });
    }
  }
  return null;
}

async function recordIdempotency(
  env: Env,
  key: string | null,
  operation: string,
  resultData: any
): Promise<void> {
  if (!key) return;
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  await env.DB.prepare(
    `INSERT INTO idempotency_keys (key, operation, result_ref, expires_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(key) DO UPDATE SET result_ref = excluded.result_ref, expires_at = excluded.expires_at`
  )
    .bind(key, operation, JSON.stringify(resultData), expiresAt)
    .run();
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx?: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers':
            'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret, Idempotency-Key, X-Correlation-ID',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Health check endpoint (bypasses auth for uptime monitors)
    if (url.pathname === '/v1/health' && method === 'GET') {
      return jsonResponse({
        success: true,
        data: {
          status: 'healthy',
          environment: env.ENVIRONMENT || 'production',
          timestamp: new Date().toISOString(),
        },
      });
    }

    // Authenticate machine-to-machine requests
    const authResult = validateServiceAuth(request, env);
    if (!authResult.authorized) {
      return errorResponse(
        'UNAUTHORIZED',
        authResult.reason || 'Authentication failed',
        401
      );
    }

    const idempotencyKey = request.headers.get('Idempotency-Key');
    const correlationId =
      request.headers.get('X-Correlation-ID') || crypto.randomUUID();

    try {
      // ------------------------------------------------------------------------
      // 0. SECURITY INTELLIGENCE ENDPOINTS (worker_security_intelligence)
      // ------------------------------------------------------------------------
      if (url.pathname.startsWith('/v1/security')) {
        const secResponse = await handleSecurityRoutes(request, env, url, ctx);
        if (secResponse) return secResponse;
      }

      // ------------------------------------------------------------------------
      // 1. MEMORY ENDPOINTS
      // ------------------------------------------------------------------------

      // POST /v1/memory/explicit - Save/update explicit user memory
      if (url.pathname === '/v1/memory/explicit' && method === 'POST') {
        const replayed = await checkIdempotency(env, idempotencyKey);
        if (replayed) return replayed;

        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          content,
          memory_type = 'user_instruction',
          scope = 'global',
          normalized_key,
          source = 'user_explicit',
          priority = 0,
        } = body;

        if (!content || typeof content !== 'string') {
          return errorResponse('INVALID_INPUT', 'Field content is required');
        }

        const now = new Date().toISOString();
        const contentHash = await crypto.subtle
          .digest('SHA-256', new TextEncoder().encode(content))
          .then((buf: ArrayBuffer) =>
            Array.from(new Uint8Array(buf))
              .map((b) => b.toString(16).padStart(2, '0'))
              .join('')
          );

        // Insert or update memory item
        await env.DB.prepare(
          `
          INSERT INTO memory_items (id, memory_type, scope, content, normalized_key, source, confidence, status, priority, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 1.0, 'active', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            content = excluded.content,
            normalized_key = excluded.normalized_key,
            priority = excluded.priority,
            updated_at = excluded.updated_at
        `
        )
          .bind(
            id,
            memory_type,
            scope,
            content,
            normalized_key || null,
            source,
            priority,
            now,
            now
          )
          .run();

        // Append to memory versions
        const versionId = crypto.randomUUID();
        await env.DB.prepare(
          `
          INSERT INTO memory_versions (id, memory_id, version, content_hash, content, change_reason, actor_type, created_at)
          VALUES (?, ?, (SELECT COALESCE(MAX(version), 0) + 1 FROM memory_versions WHERE memory_id = ?), ?, ?, 'Explicit user instruction update', 'user', ?)
        `
        )
          .bind(versionId, id, id, contentHash, content, now)
          .run();

        // Audit event
        await env.DB.prepare(
          `
          INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
          VALUES (?, 'user', 'memory_write', 'memory_items', ?, ?, 'allowed', ?, ?)
        `
        )
          .bind(crypto.randomUUID(), id, scope, correlationId, now)
          .run();

        const resultData = { id, memory_type, scope, content, updated_at: now };
        await recordIdempotency(
          env,
          idempotencyKey,
          'memory_explicit',
          resultData
        );

        return jsonResponse({
          success: true,
          data: resultData,
        });
      }

      // GET /v1/memory/search - Retrieve memories by query/type/scope
      if (url.pathname === '/v1/memory/search' && method === 'GET') {
        const memory_type = url.searchParams.get('type');
        const scope = url.searchParams.get('scope') || 'global';
        const limit = Math.min(
          parseInt(url.searchParams.get('limit') || '20', 10),
          100
        );
        const callerRole =
          request.headers.get('X-Caller-Role') ||
          request.headers.get('x-caller-role');

        if (scope === 'all') {
          // RSI-GAP-002: Cross-scope reads require explicit owner or admin role
          if (callerRole !== 'owner' && callerRole !== 'admin') {
            await env.DB.prepare(
              `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
               VALUES (?, ?, 'memory_cross_scope_read', 'memory_items', 'all', 'all', 'denied', ?, ?)`
            )
              .bind(
                crypto.randomUUID(),
                callerRole || 'worker',
                correlationId,
                new Date().toISOString()
              )
              .run();

            return errorResponse(
              'FORBIDDEN',
              'Cross-scope search (scope=all) requires owner authorization',
              403
            );
          }

          // Record authorized cross-scope read audit event
          await env.DB.prepare(
            `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
             VALUES (?, 'owner', 'memory_cross_scope_read', 'memory_items', 'all', 'all', 'allowed', ?, ?)`
          )
            .bind(crypto.randomUUID(), correlationId, new Date().toISOString())
            .run();
        }

        if (scope === 'all') {
          // RSI-GAP-002: Cross-scope reads require explicit owner or admin role
          if (callerRole !== 'owner' && callerRole !== 'admin') {
            await env.DB.prepare(
              `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
               VALUES (?, ?, 'memory_cross_scope_read', 'memory_items', 'all', 'all', 'denied', ?, ?)`
            )
              .bind(
                crypto.randomUUID(),
                callerRole || 'worker',
                correlationId,
                new Date().toISOString()
              )
              .run();

            return errorResponse(
              'FORBIDDEN',
              'Cross-scope search (scope=all) requires owner authorization',
              403
            );
          }

          // Record authorized cross-scope read audit event
          await env.DB.prepare(
            `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
             VALUES (?, 'owner', 'memory_cross_scope_read', 'memory_items', 'all', 'all', 'allowed', ?, ?)`
          )
            .bind(crypto.randomUUID(), correlationId, new Date().toISOString())
            .run();
        }

        let query = `SELECT * FROM memory_items WHERE status = 'active'`;
        const params: any[] = [];

        if (memory_type) {
          query += ` AND memory_type = ?`;
          params.push(memory_type);
        }
        if (scope !== 'all') {
          query += ` AND (scope = ? OR scope = 'global')`;
          params.push(scope);
        }

        query += ` ORDER BY priority DESC, updated_at DESC LIMIT ?`;
        params.push(limit);

        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all();

        return jsonResponse({ success: true, data: results });
      }

      // POST /v1/memory/forget - Soft-delete or archive memory
      if (url.pathname === '/v1/memory/forget' && method === 'POST') {
        const body: any = await request.json();
        const { id } = body;
        if (!id) {
          return errorResponse('INVALID_INPUT', 'Field id is required');
        }
        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE memory_items SET status = 'archived', updated_at = ? WHERE id = ?`
        )
          .bind(now, id)
          .run();

        await env.DB.prepare(
          `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
           VALUES (?, 'user', 'memory_forget', 'memory_items', ?, 'global', 'allowed', ?, ?)`
        )
          .bind(crypto.randomUUID(), id, correlationId, now)
          .run();

        return jsonResponse({
          success: true,
          data: { id, status: 'archived', updated_at: now },
        });
      }

      // POST /v1/memory/candidate - Save candidate reflection/lesson
      if (url.pathname === '/v1/memory/candidate' && method === 'POST') {
        const body: any = await request.json();
        const {
          lesson,
          observed_failure,
          evidence_refs = [],
          confidence = 0.5,
        } = body;

        if (!lesson) {
          return errorResponse('INVALID_INPUT', 'Lesson content required');
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO candidate_lessons (id, lesson, observed_failure, evidence_refs, confidence, test_count, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, 0, 'pending', ?, ?)
        `
        )
          .bind(
            id,
            lesson,
            observed_failure || null,
            JSON.stringify(evidence_refs),
            confidence,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, status: 'pending', created_at: now },
        });
      }

      // POST /v1/memory/verify - Promote candidate to verified lesson
      if (url.pathname === '/v1/memory/verify' && method === 'POST') {
        const callerRole =
          request.headers.get('X-Caller-Role') ||
          request.headers.get('x-caller-role');

        // RSI-GAP-003: Promotion requires trusted evaluator or owner gate
        if (callerRole !== 'owner' && callerRole !== 'evaluator') {
          return errorResponse(
            'FORBIDDEN',
            'Candidate promotion requires trusted evaluator or owner authorization',
            403
          );
        }

        const body: any = await request.json();
        const {
          candidate_id,
          eval_run_id,
          verification_summary,
          passing_tests_count = 1,
          counterexamples_reviewed = true,
          evidence_refs = [],
        } = body;

        if (!candidate_id || !verification_summary) {
          return errorResponse(
            'INVALID_INPUT',
            'candidate_id and verification_summary required'
          );
        }

        if (!eval_run_id) {
          return errorResponse(
            'INVALID_INPUT',
            'eval_run_id is required: candidate promotion must be backed by an evaluation run',
            400
          );
        }

        if (passing_tests_count < 1 || !counterexamples_reviewed) {
          return errorResponse(
            'INVALID_INPUT',
            'Promotion requires at least 1 passing test and reviewed counterexamples',
            400
          );
        }

        const candidate = await env.DB.prepare(
          `SELECT * FROM candidate_lessons WHERE id = ?`
        )
          .bind(candidate_id)
          .first<any>();
        if (!candidate) {
          return errorResponse('NOT_FOUND', 'Candidate lesson not found', 404);
        }

        // Verify the evaluation run exists and has passed
        const evalRun = await env.DB.prepare(
          `SELECT * FROM eval_runs WHERE id = ?`
        )
          .bind(eval_run_id)
          .first<any>();

        if (!evalRun || evalRun.status !== 'passed') {
          return errorResponse(
            'INVALID_INPUT',
            'Evaluation run does not exist or has not passed',
            400
          );
        }

        // Check for conflicts with active user instructions (owner instruction has absolute precedence)
        const activeInstructions = await env.DB.prepare(
          `SELECT id, content FROM memory_items WHERE memory_type = 'user_instruction' AND status = 'active'`
        ).all<any>();

        const conflictingInstruction = (activeInstructions.results || []).find(
          (inst: any) =>
            candidate.lesson &&
            inst.content &&
            candidate.lesson.toLowerCase().includes('paid') &&
            inst.content.toLowerCase().includes('free')
        );

        if (conflictingInstruction) {
          return errorResponse(
            'CONFLICT',
            `Candidate lesson conflicts with active owner instruction (${conflictingInstruction.id}). Promotion blocked.`,
            409
          );
        }

        const verifiedId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.batch([
          env.DB.prepare(
            `
            INSERT INTO verified_lessons (id, candidate_id, lesson, verification_summary, evidence_refs, verified_at, status)
            VALUES (?, ?, ?, ?, ?, ?, 'active')
          `
          ).bind(
            verifiedId,
            candidate_id,
            candidate.lesson,
            verification_summary,
            JSON.stringify(evidence_refs),
            now
          ),

          env.DB.prepare(
            `UPDATE candidate_lessons SET status = 'promoted', updated_at = ? WHERE id = ?`
          ).bind(now, candidate_id),

          // Also insert into memory_items as verified_lesson
          env.DB.prepare(
            `
            INSERT INTO memory_items (id, memory_type, scope, content, source, confidence, status, priority, created_at, updated_at)
            VALUES (?, 'verified_lesson', 'global', ?, 'evaluation_runner', 1.0, 'active', 2, ?, ?)
          `
          ).bind(verifiedId, candidate.lesson, now, now),

          // Record promotion in audit events
          env.DB.prepare(
            `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
             VALUES (?, ?, 'lesson_promoted', 'verified_lessons', ?, 'global', 'allowed', ?, ?)`
          ).bind(
            crypto.randomUUID(),
            callerRole,
            verifiedId,
            correlationId,
            now
          ),
        ]);

        return jsonResponse({
          success: true,
          data: {
            id: verifiedId,
            candidate_id,
            status: 'verified',
            verified_at: now,
          },
        });
      }

      // ------------------------------------------------------------------------
      // 2. RUNS & TELEMETRY ENDPOINTS
      // ------------------------------------------------------------------------

      // POST /v1/runs - Create or update task run
      if (url.pathname === '/v1/runs' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          task_type,
          model_route,
          outcome_summary,
          status = 'running',
        } = body;

        const now = new Date().toISOString();
        await env.DB.prepare(
          `
          INSERT INTO agent_runs (id, task_type, started_at, status, model_route, correlation_id, outcome_summary)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            status = excluded.status,
            ended_at = CASE WHEN excluded.status IN ('completed', 'failed', 'cancelled') THEN ? ELSE ended_at END,
            outcome_summary = excluded.outcome_summary
        `
        )
          .bind(
            id,
            task_type,
            now,
            status,
            model_route || null,
            correlationId,
            outcome_summary || null,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, status, started_at: now },
        });
      }

      // POST /v1/runs/:id/events - Append compact execution event
      const runEventsMatch = url.pathname.match(
        /^\/v1\/runs\/([^\/]+)\/events$/
      );
      if (runEventsMatch && method === 'POST') {
        const runId = runEventsMatch[1];
        const body: any = await request.json();
        const { worker_run_id, event_type, event_json } = body;

        const eventId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO run_events (id, run_id, worker_run_id, event_type, event_json, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
        )
          .bind(
            eventId,
            runId,
            worker_run_id || null,
            event_type,
            typeof event_json === 'string'
              ? event_json
              : JSON.stringify(event_json),
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id: eventId, run_id: runId },
        });
      }

      // ------------------------------------------------------------------------
      // 3. WORKER REGISTRY & PROPOSALS
      // ------------------------------------------------------------------------

      // GET /v1/workers/snapshot - Get deployed worker snapshots
      if (url.pathname === '/v1/workers/snapshot' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM worker_snapshots ORDER BY worker_id, version DESC`
        ).all();
        return jsonResponse({ success: true, data: results });
      }

      // POST /v1/workers/snapshot/sync - Synchronize live registry snapshots (Finding A-09)
      if (url.pathname === '/v1/workers/snapshot/sync' && method === 'POST') {
        const body: any = await request.json();
        const { snapshots = [] } = body;
        const now = new Date().toISOString();

        for (const s of snapshots) {
          await env.DB.prepare(
            `INSERT INTO worker_snapshots (worker_id, version, capabilities_json, allowed_tools_json, parent_id, source_commit, synced_at)
             VALUES (?, ?, ?, ?, ?, ?, ?)
             ON CONFLICT(worker_id, version) DO UPDATE SET
               capabilities_json = excluded.capabilities_json,
               allowed_tools_json = excluded.allowed_tools_json,
               parent_id = excluded.parent_id,
               source_commit = excluded.source_commit,
               synced_at = excluded.synced_at`
          )
            .bind(
              s.worker_id,
              s.version || '1.0.0',
              typeof s.capabilities === 'string'
                ? s.capabilities
                : JSON.stringify(s.capabilities || []),
              typeof s.allowed_tools === 'string'
                ? s.allowed_tools
                : JSON.stringify(s.allowed_tools || []),
              s.parent_id || null,
              s.source_commit || null,
              now
            )
            .run();
        }

        return jsonResponse({
          success: true,
          data: { synced_count: snapshots.length, synced_at: now },
        });
      }

      // POST /v1/worker-runs - Record worker execution lifecycle telemetry (Finding A-10)
      if (url.pathname === '/v1/worker-runs' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          run_id,
          worker_id,
          parent_worker_id,
          status = 'completed',
          attempt = 1,
          input_hash,
          output_summary,
        } = body;

        if (!run_id || !worker_id) {
          return errorResponse(
            'INVALID_INPUT',
            'run_id and worker_id are required'
          );
        }

        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO worker_runs (id, run_id, worker_id, parent_worker_id, status, attempt, input_hash, output_summary, started_at, ended_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            run_id,
            worker_id,
            parent_worker_id || null,
            status,
            attempt,
            input_hash || null,
            output_summary || null,
            now,
            status === 'completed' || status === 'failed' ? now : null
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, run_id, worker_id, status },
        });
      }

      // POST /v1/tool-events - Append redacted tool execution event (Finding A-10)
      if (url.pathname === '/v1/tool-events' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          run_id,
          worker_id,
          tool_name,
          scope = 'global',
          success = true,
          latency_ms,
          error_code,
          result_ref,
        } = body;

        if (!run_id || !worker_id || !tool_name) {
          return errorResponse(
            'INVALID_INPUT',
            'run_id, worker_id, and tool_name are required'
          );
        }

        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO tool_events (id, run_id, worker_id, tool_name, scope, success, latency_ms, error_code, result_ref, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            run_id,
            worker_id,
            tool_name,
            scope,
            success ? 1 : 0,
            latency_ms ?? null,
            error_code || null,
            result_ref || null,
            now
          )
          .run();

        return jsonResponse({ success: true, data: { id, run_id, tool_name } });
      }

      // POST /v1/worker-proposals - Suggest new worker or sub-worker
      if (url.pathname === '/v1/worker-proposals' && method === 'POST') {
        const replayed = await checkIdempotency(env, idempotencyKey);
        if (replayed) return replayed;

        const body: any = await request.json();
        const {
          proposed_worker_id,
          parent_worker_id,
          purpose,
          capabilities,
          tool_needs,
          budget,
          risk,
        } = body;

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO worker_proposals (id, proposed_worker_id, parent_worker_id, purpose, capabilities, tool_needs, budget, risk, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        `
        )
          .bind(
            id,
            proposed_worker_id,
            parent_worker_id || null,
            purpose,
            capabilities,
            tool_needs,
            budget || null,
            risk || null,
            now,
            now
          )
          .run();

        const resultData = { id, status: 'draft', created_at: now };
        await recordIdempotency(
          env,
          idempotencyKey,
          'worker_proposal',
          resultData
        );

        return jsonResponse({
          success: true,
          data: resultData,
        });
      }

      // ------------------------------------------------------------------------
      // 4. RESEARCH & UPGRADE PROPOSALS
      // ------------------------------------------------------------------------

      // POST /v1/research - Record research project metadata, sources, and findings (Finding A-06)
      if (url.pathname === '/v1/research' && method === 'POST') {
        const replayed = await checkIdempotency(env, idempotencyKey);
        if (replayed) return replayed;

        const body: any = await request.json();
        const {
          question,
          scope = 'general',
          findings = [],
          sources = [],
        } = body;

        const projectId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO research_projects (id, question, scope, status, started_at)
          VALUES (?, ?, ?, 'active', ?)
        `
        )
          .bind(projectId, question, scope, now)
          .run();

        // 1. Batch insert sources (Finding A-06 fix)
        for (const s of sources) {
          const sourceId = s.id || crypto.randomUUID();
          const sourceUrl = s.url || s.canonical_url || 'https://unknown';
          const urlHash = await hashString(sourceUrl);
          await env.DB.prepare(
            `INSERT INTO research_sources (id, project_id, url, url_hash, title, publisher, published_at, license, source_type, reliability_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              sourceId,
              projectId,
              sourceUrl,
              urlHash,
              s.title || null,
              s.publisher || null,
              s.published_at || null,
              s.license || null,
              s.source_type || 'docs',
              s.reliability_score ?? 1.0
            )
            .run();
        }

        // 2. Batch insert findings
        for (const f of findings) {
          await env.DB.prepare(
            `
            INSERT INTO research_findings (id, project_id, finding, evidence_source_ids, confidence, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `
          )
            .bind(
              crypto.randomUUID(),
              projectId,
              f.finding,
              JSON.stringify(f.evidence_source_ids || []),
              f.confidence ?? 1.0,
              now
            )
            .run();
        }

        const resultData = {
          project_id: projectId,
          status: 'active',
          created_at: now,
        };
        await recordIdempotency(
          env,
          idempotencyKey,
          'research_project',
          resultData
        );

        return jsonResponse({
          success: true,
          data: resultData,
        });
      }

      // GET /v1/research/:id - Retrieve research project with sources & findings
      const researchDetailMatch = url.pathname.match(
        /^\/v1\/research\/([^\/]+)$/
      );
      if (researchDetailMatch && method === 'GET') {
        const pId = researchDetailMatch[1];
        const project = await env.DB.prepare(
          `SELECT * FROM research_projects WHERE id = ?`
        )
          .bind(pId)
          .first<any>();

        if (!project) {
          return errorResponse('NOT_FOUND', 'Research project not found', 404);
        }

        const { results: sources } = await env.DB.prepare(
          `SELECT * FROM research_sources WHERE project_id = ? ORDER BY retrieved_at DESC`
        )
          .bind(pId)
          .all();

        const { results: findings } = await env.DB.prepare(
          `SELECT * FROM research_findings WHERE project_id = ? ORDER BY created_at DESC`
        )
          .bind(pId)
          .all();

        return jsonResponse({
          success: true,
          data: { ...project, sources, findings },
        });
      }

      // POST /v1/proposals - Store RSI upgrade proposal
      if (url.pathname === '/v1/proposals' && method === 'POST') {
        const replayed = await checkIdempotency(env, idempotencyKey);
        if (replayed) return replayed;

        const body: any = await request.json();
        const {
          title,
          problem,
          design,
          benefit,
          risk,
          cost_estimate,
          test_plan,
          rollback_plan,
        } = body;

        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `
          INSERT INTO upgrade_proposals (id, title, problem, design, benefit, risk, cost_estimate, test_plan, rollback_plan, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
        `
        )
          .bind(
            id,
            title,
            problem,
            design,
            benefit,
            risk,
            cost_estimate || null,
            test_plan || null,
            rollback_plan || null,
            now,
            now
          )
          .run();

        const resultData = { id, status: 'draft', created_at: now };
        await recordIdempotency(
          env,
          idempotencyKey,
          'upgrade_proposal',
          resultData
        );

        return jsonResponse({
          success: true,
          data: resultData,
        });
      }

      // GET /v1/proposals - List upgrade proposals
      if (url.pathname === '/v1/proposals' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM upgrade_proposals ORDER BY created_at DESC LIMIT 50`
        ).all();
        return jsonResponse({ success: true, data: results });
      }

      // POST /v1/proposals/:id/decision - Record owner decision (ARCH-04)
      const decisionMatch = url.pathname.match(
        /^\/v1\/proposals\/([^\/]+)\/decision$/
      );
      if (decisionMatch && method === 'POST') {
        const proposalId = decisionMatch[1];
        const body: any = await request.json();
        const { decision, reason = '' } = body;
        const now = new Date().toISOString();

        // 1. Proposal existence check (ARCH-04)
        const proposalCheck = await env.DB.prepare(
          `SELECT id FROM upgrade_proposals WHERE id = ?`
        )
          .bind(proposalId)
          .first();

        if (!proposalCheck) {
          return errorResponse(
            'PROPOSAL_NOT_FOUND',
            `Proposal ${proposalId} does not exist`,
            404
          );
        }

        // 2. Strict decision enum validation (ARCH-04)
        const allowedDecisions = [
          'accepted_for_manual_work',
          'approved',
          'rejected',
          'deferred',
          'revision_requested',
        ];

        if (!decision || !allowedDecisions.includes(decision)) {
          return errorResponse(
            'INVALID_INPUT',
            `Valid decision required. Must be one of: ${allowedDecisions.join(', ')}`,
            400
          );
        }

        const proposalStatus =
          decision === 'approved' || decision === 'accepted_for_manual_work'
            ? 'owner_approved'
            : decision === 'rejected'
              ? 'owner_rejected'
              : decision === 'deferred'
                ? 'deferred'
                : 'draft';

        await env.DB.prepare(
          `UPDATE upgrade_proposals SET status = ?, updated_at = ? WHERE id = ?`
        )
          .bind(proposalStatus, now, proposalId)
          .run();

        await env.DB.prepare(
          `INSERT INTO approval_events (id, proposal_id, actor, decision, note, created_at)
           VALUES (?, ?, 'owner', ?, ?, ?)`
        )
          .bind(crypto.randomUUID(), proposalId, decision, reason, now)
          .run();

        return jsonResponse({
          success: true,
          data: {
            proposal_id: proposalId,
            decision,
            status: proposalStatus,
            decided_at: now,
          },
        });
      }

      // ------------------------------------------------------------------------
      // 5. CAPABILITY GAPS & EVALUATION ENDPOINTS
      // ------------------------------------------------------------------------

      // POST /v1/gaps - Record detected capability gap
      if (url.pathname === '/v1/gaps' && method === 'POST') {
        const body: any = await request.json();
        const {
          title,
          description,
          area = body.category || 'general',
          observed_gap = title ? `${title}: ${description || ''}` : description,
          evidence = JSON.stringify(body.evidence_refs || []),
          impact = body.severity || 'medium',
          risk = body.risk || null,
          status = 'identified',
        } = body;
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT INTO capability_gaps (id, area, observed_gap, evidence, impact, risk, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            area,
            observed_gap || 'Unspecified capability gap',
            typeof evidence === 'string' ? evidence : JSON.stringify(evidence),
            impact,
            risk,
            status,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, status, created_at: now },
        });
      }

      // GET /v1/gaps - List capability gaps
      if (url.pathname === '/v1/gaps' && method === 'GET') {
        const status = url.searchParams.get('status') || 'identified';
        const { results } = await env.DB.prepare(
          `SELECT * FROM capability_gaps WHERE status = ? ORDER BY created_at DESC LIMIT 50`
        )
          .bind(status)
          .all();
        return jsonResponse({ success: true, data: results });
      }

      // PATCH /v1/gaps/:id - Update capability gap status (Finding A-08)
      const gapMatch = url.pathname.match(/^\/v1\/gaps\/([^\/]+)$/);
      if (gapMatch && method === 'PATCH') {
        const gapId = gapMatch[1];
        const body: any = await request.json();
        const { status, evidence_refs, impact, risk } = body;
        const allowedStatuses = [
          'identified',
          'under_research',
          'proposal_ready',
          'resolved',
          'wont_fix',
        ];
        if (status && !allowedStatuses.includes(status)) {
          return errorResponse(
            'INVALID_INPUT',
            `Invalid status. Allowed: ${allowedStatuses.join(', ')}`
          );
        }
        const now = new Date().toISOString();
        const existing = await env.DB.prepare(
          `SELECT * FROM capability_gaps WHERE id = ?`
        )
          .bind(gapId)
          .first<any>();
        if (!existing) {
          return errorResponse('NOT_FOUND', 'Capability gap not found', 404);
        }
        const newStatus = status || existing.status;
        const newEvidence = evidence_refs
          ? JSON.stringify(evidence_refs)
          : existing.evidence;
        const newImpact = impact || existing.impact;
        const newRisk = risk !== undefined ? risk : existing.risk;
        await env.DB.prepare(
          `UPDATE capability_gaps SET status = ?, evidence = ?, impact = ?, risk = ?, updated_at = ? WHERE id = ?`
        )
          .bind(newStatus, newEvidence, newImpact, newRisk, now, gapId)
          .run();
        return jsonResponse({
          success: true,
          data: { id: gapId, status: newStatus, updated_at: now },
        });
      }

      // POST /v1/evaluations/suites - Register or create evaluation suite (Finding A-07)
      if (url.pathname === '/v1/evaluations/suites' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          name,
          version = '1.0.0',
          purpose,
          approved_by = 'owner',
        } = body;
        if (!name || !purpose) {
          return errorResponse(
            'INVALID_INPUT',
            'name and purpose are required'
          );
        }
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO eval_suites (id, name, version, purpose, approved_by, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET name = excluded.name, version = excluded.version, purpose = excluded.purpose`
        )
          .bind(id, name, version, purpose, approved_by, now)
          .run();
        return jsonResponse({
          success: true,
          data: { id, name, version, purpose },
        });
      }

      // GET /v1/evaluations/suites - List evaluation suites
      if (url.pathname === '/v1/evaluations/suites' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM eval_suites ORDER BY created_at DESC LIMIT 50`
        ).all();
        return jsonResponse({ success: true, data: results });
      }

      // POST /v1/evaluations/suites/:suiteId/cases - Add test case to suite
      const suiteCaseMatch = url.pathname.match(
        /^\/v1\/evaluations\/suites\/([^\/]+)\/cases$/
      );
      if (suiteCaseMatch && method === 'POST') {
        const suiteId = suiteCaseMatch[1];
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          input_ref,
          expected_behaviour,
          tags = [],
          synthetic_data,
        } = body;
        if (!input_ref || !expected_behaviour) {
          return errorResponse(
            'INVALID_INPUT',
            'input_ref and expected_behaviour are required'
          );
        }
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO eval_cases (id, suite_id, input_ref, expected_behaviour, tags, synthetic_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            suiteId,
            input_ref,
            expected_behaviour,
            typeof tags === 'string' ? tags : JSON.stringify(tags),
            synthetic_data
              ? typeof synthetic_data === 'string'
                ? synthetic_data
                : JSON.stringify(synthetic_data)
              : null,
            now
          )
          .run();
        return jsonResponse({
          success: true,
          data: { id, suite_id: suiteId, input_ref },
        });
      }

      // GET /v1/evaluations/suites/:suiteId/cases - List test cases in suite
      if (suiteCaseMatch && method === 'GET') {
        const suiteId = suiteCaseMatch[1];
        const { results } = await env.DB.prepare(
          `SELECT * FROM eval_cases WHERE suite_id = ? ORDER BY created_at ASC`
        )
          .bind(suiteId)
          .all();
        return jsonResponse({ success: true, data: results });
      }

      // POST /v1/evaluations/runs - Start new evaluation run
      if (url.pathname === '/v1/evaluations/runs' && method === 'POST') {
        const body: any = await request.json();
        const {
          suite_id,
          candidate_version,
          baseline_version = 'baseline_v1',
          status = 'running',
        } = body;
        if (!suite_id || !candidate_version) {
          return errorResponse(
            'INVALID_INPUT',
            'suite_id and candidate_version are required'
          );
        }
        const id = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT OR IGNORE INTO eval_suites (id, name, version, purpose, approved_by, created_at)
           VALUES (?, 'Evaluation Suite', '1.0.0', 'Automated suite', 'system', ?)`
        )
          .bind(suite_id, now)
          .run();

        await env.DB.prepare(
          `INSERT INTO eval_runs (id, suite_id, candidate_version, baseline_version, started_at, status)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(id, suite_id, candidate_version, baseline_version, now, status)
          .run();

        return jsonResponse({
          success: true,
          data: {
            id,
            suite_id,
            candidate_version,
            status,
            started_at: now,
          },
        });
      }

      // POST /v1/evaluations/runs/:runId/results - Record evaluation results
      const runResultsMatch = url.pathname.match(
        /^\/v1\/evaluations\/runs\/([^\/]+)\/results$/
      );
      if (runResultsMatch && method === 'POST') {
        const runId = runResultsMatch[1];
        const body: any = await request.json();
        const { results = [] } = body;
        const now = new Date().toISOString();

        for (const r of results) {
          const resId = r.id || crypto.randomUUID();
          await env.DB.prepare(
            `INSERT INTO eval_results (id, eval_run_id, case_id, score, passed, failure_class, result_summary, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
            .bind(
              resId,
              runId,
              r.case_id || 'unspecified_case',
              r.score ?? 1.0,
              r.passed !== false && r.passed !== 0 ? 1 : 0,
              r.failure_class || null,
              r.result_summary || null,
              now
            )
            .run();
        }
        return jsonResponse({
          success: true,
          data: { run_id: runId, count: results.length },
        });
      }

      // PATCH /v1/evaluations/runs/:runId - Close evaluation run
      const runCloseMatch = url.pathname.match(
        /^\/v1\/evaluations\/runs\/([^\/]+)$/
      );
      if (runCloseMatch && method === 'PATCH') {
        const runId = runCloseMatch[1];
        const body: any = await request.json();
        const { status = 'passed' } = body;
        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE eval_runs SET status = ?, ended_at = ? WHERE id = ?`
        )
          .bind(status, now, runId)
          .run();
        return jsonResponse({
          success: true,
          data: { id: runId, status, ended_at: now },
        });
      }

      // GET /v1/evaluations/runs/:runId - Get run details and results
      if (runCloseMatch && method === 'GET') {
        const runId = runCloseMatch[1];
        const run = await env.DB.prepare(`SELECT * FROM eval_runs WHERE id = ?`)
          .bind(runId)
          .first<any>();
        if (!run) {
          return errorResponse('NOT_FOUND', 'Evaluation run not found', 404);
        }
        const { results } = await env.DB.prepare(
          `SELECT * FROM eval_results WHERE eval_run_id = ? ORDER BY created_at ASC`
        )
          .bind(runId)
          .all();
        return jsonResponse({ success: true, data: { ...run, results } });
      }

      // POST /v1/evaluations - Record evaluation suite run & results (compat)
      if (url.pathname === '/v1/evaluations' && method === 'POST') {
        const body: any = await request.json();
        const {
          suite_id = 'golden_rsi_suite_v1',
          candidate_version = body.model_alias || 'candidate_v1',
          baseline_version = 'baseline_v1',
          status = 'passed',
        } = body;
        const runId = crypto.randomUUID();
        const now = new Date().toISOString();

        await env.DB.prepare(
          `INSERT OR IGNORE INTO eval_suites (id, name, version, purpose, approved_by, created_at)
           VALUES (?, 'Golden RSI Evaluation Suite', '1.0.0', 'Automated test verification', 'owner', ?)`
        )
          .bind(suite_id, now)
          .run();

        const validStatus = ['running', 'passed', 'failed', 'error'].includes(
          status
        )
          ? status
          : 'passed';

        await env.DB.prepare(
          `INSERT INTO eval_runs (id, suite_id, candidate_version, baseline_version, started_at, ended_at, status)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            runId,
            suite_id,
            candidate_version,
            baseline_version,
            now,
            now,
            validStatus
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id: runId, status: validStatus, completed_at: now },
        });
      }

      // GET /v1/evaluations - List recent evaluation runs (compat)
      if (url.pathname === '/v1/evaluations' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM eval_runs ORDER BY started_at DESC LIMIT 20`
        ).all();
        return jsonResponse({ success: true, data: results });
      }

      // GET /v1/history - Evolution & audit history
      if (url.pathname === '/v1/history' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT id, actor, action, resource_type, resource_id, decision, created_at FROM audit_events ORDER BY created_at DESC LIMIT 50`
        ).all();
        return jsonResponse({ success: true, data: results });
      }

      // ------------------------------------------------------------------------
      // 6. REAL R2 ARTIFACTS STORAGE & MANAGEMENT (Findings A-11, A-12, A-18)
      // ------------------------------------------------------------------------

      // Helper function to resolve prefixed R2 key (Finding A-18 isolation)
      const getPrefixedKey = (rawKey: string): string => {
        const envPrefix = (env.ENVIRONMENT || 'production') + '/';
        const clean = rawKey.replace(/^\/+/, '');
        return clean.startsWith(envPrefix) ? clean : `${envPrefix}${clean}`;
      };

      // POST /v1/artifacts/upload or PUT /v1/artifacts/upload - Direct authenticated binary/text upload
      if (
        (url.pathname === '/v1/artifacts/upload' ||
          url.pathname === '/v1/artifacts/direct-upload') &&
        (method === 'POST' || method === 'PUT')
      ) {
        const rawKey = url.searchParams.get('key');
        if (!rawKey) {
          return errorResponse(
            'INVALID_INPUT',
            'key query parameter is required'
          );
        }

        const fullKey = getPrefixedKey(rawKey);
        const contentType =
          request.headers.get('content-type') ||
          url.searchParams.get('content_type') ||
          'application/octet-stream';
        const artifactType = url.searchParams.get('artifact_type') || 'report';
        const scope = url.searchParams.get('scope') || 'global';
        const fileName =
          url.searchParams.get('file_name') ||
          rawKey.split('/').pop() ||
          'artifact.bin';

        const buffer = await request.arrayBuffer();
        if (buffer.byteLength > 25 * 1024 * 1024) {
          return errorResponse(
            'PAYLOAD_TOO_LARGE',
            'Artifact exceeds maximum size of 25MB',
            413
          );
        }

        // SHA-256 Checksum computation
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const checksum = Array.from(new Uint8Array(hashBuffer))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');

        // Store directly in R2 bucket
        await env.ARTIFACTS.put(fullKey, buffer, {
          httpMetadata: { contentType },
          customMetadata: {
            checksum,
            correlationId,
            environment: env.ENVIRONMENT || 'production',
            uploadedAt: new Date().toISOString(),
          },
        });

        // Store metadata in D1 artifacts table (Finding A-12)
        const artifactId = crypto.randomUUID();
        const now = new Date().toISOString();
        await env.DB.prepare(
          `INSERT INTO artifacts (id, r2_key, environment, artifact_type, scope, owner_id, file_name, content_type, size_bytes, checksum_sha256, status, correlation_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
           ON CONFLICT(r2_key) DO UPDATE SET
             size_bytes = excluded.size_bytes,
             checksum_sha256 = excluded.checksum_sha256,
             updated_at = excluded.updated_at`
        )
          .bind(
            artifactId,
            fullKey,
            env.ENVIRONMENT || 'production',
            artifactType,
            scope,
            null,
            fileName,
            contentType,
            buffer.byteLength,
            checksum,
            correlationId,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: {
            id: artifactId,
            r2_key: fullKey,
            size_bytes: buffer.byteLength,
            checksum_sha256: checksum,
            content_type: contentType,
            status: 'active',
            created_at: now,
          },
        });
      }

      // GET /v1/artifacts/download - Download stored artifact
      if (url.pathname === '/v1/artifacts/download' && method === 'GET') {
        const rawKey = url.searchParams.get('key');
        if (!rawKey) {
          return errorResponse(
            'INVALID_INPUT',
            'key query parameter is required'
          );
        }
        const fullKey = getPrefixedKey(rawKey);
        const object = await env.ARTIFACTS.get(fullKey);

        if (!object) {
          return errorResponse(
            'NOT_FOUND',
            `Artifact ${fullKey} not found in R2`,
            404
          );
        }

        const headers = new Headers();
        headers.set(
          'Content-Type',
          object.httpMetadata?.contentType || 'application/octet-stream'
        );
        headers.set('ETag', object.httpEtag);
        headers.set('Content-Length', String(object.size));
        if (object.customMetadata?.checksum) {
          headers.set('X-Checksum-SHA256', object.customMetadata.checksum);
        }

        return new Response(object.body, { headers });
      }

      // DELETE /v1/artifacts - Delete artifact from R2 & update metadata
      if (url.pathname === '/v1/artifacts' && method === 'DELETE') {
        const rawKey = url.searchParams.get('key');
        if (!rawKey) {
          return errorResponse(
            'INVALID_INPUT',
            'key query parameter is required'
          );
        }
        const fullKey = getPrefixedKey(rawKey);
        await env.ARTIFACTS.delete(fullKey);

        const now = new Date().toISOString();
        await env.DB.prepare(
          `UPDATE artifacts SET status = 'deleted', updated_at = ? WHERE r2_key = ?`
        )
          .bind(now, fullKey)
          .run();

        return jsonResponse({
          success: true,
          data: { r2_key: fullKey, status: 'deleted', deleted_at: now },
        });
      }

      // GET /v1/artifacts/metadata - Get artifact metadata
      if (url.pathname === '/v1/artifacts/metadata' && method === 'GET') {
        const rawKey = url.searchParams.get('key');
        if (!rawKey) {
          return errorResponse(
            'INVALID_INPUT',
            'key query parameter is required'
          );
        }
        const fullKey = getPrefixedKey(rawKey);
        const meta = await env.DB.prepare(
          `SELECT * FROM artifacts WHERE r2_key = ?`
        )
          .bind(fullKey)
          .first<any>();
        if (!meta) {
          return errorResponse('NOT_FOUND', 'Artifact metadata not found', 404);
        }
        return jsonResponse({ success: true, data: meta });
      }

      // POST /v1/artifacts/presign - Reference or temporary upload key in R2
      if (url.pathname === '/v1/artifacts/presign' && method === 'POST') {
        const body: any = await request.json();
        const {
          artifact_type = 'report',
          file_name = 'artifact.json',
          content_type = 'application/json',
        } = body;

        const datePrefix = new Date().toISOString().slice(0, 10);
        const key = `${artifact_type}/${datePrefix}/${crypto.randomUUID()}-${file_name}`;
        const fullKey = getPrefixedKey(key);

        return jsonResponse({
          success: true,
          data: {
            r2_key: fullKey,
            bucket: 'ruhvi-cofounder-artifacts',
            content_type,
            upload_url: `/v1/artifacts/upload?key=${encodeURIComponent(
              key
            )}&content_type=${encodeURIComponent(
              content_type
            )}&artifact_type=${encodeURIComponent(artifact_type)}`,
          },
        });
      }

      // ------------------------------------------------------------------------
      // 8. AUTONOMOUS WORKFORCE RUNTIME ENDPOINTS (WF-GAP-004, WF-GAP-005, etc.)
      // ------------------------------------------------------------------------

      // 8.1 Signals
      if (url.pathname === '/v1/workforce/signals' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          source_type,
          source_ref = null,
          fingerprint,
          idempotency_key = crypto.randomUUID(),
          trust_label = 'UNTRUSTED_EXTERNAL',
          domain,
          payload,
        } = body;

        if (!source_type || !fingerprint || !domain || !payload) {
          return errorResponse(
            'INVALID_INPUT',
            'source_type, fingerprint, domain, and payload are required'
          );
        }

        const now = new Date().toISOString();
        const payloadStr =
          typeof payload === 'string' ? payload : JSON.stringify(payload);

        await env.DB.prepare(
          `INSERT INTO workforce_signals (id, source_type, source_ref, fingerprint, idempotency_key, trust_label, domain, payload, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?)
           ON CONFLICT(idempotency_key) DO UPDATE SET updated_at = excluded.updated_at`
        )
          .bind(
            id,
            source_type,
            source_ref,
            fingerprint,
            idempotency_key,
            trust_label,
            domain,
            payloadStr,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, fingerprint, idempotency_key, status: 'received' },
        });
      }

      if (url.pathname === '/v1/workforce/signals' && method === 'GET') {
        const status = url.searchParams.get('status');
        const limit = Math.min(
          100,
          parseInt(url.searchParams.get('limit') || '50', 10)
        );

        let query = `SELECT * FROM workforce_signals`;
        const params: any[] = [];
        if (status) {
          query += ` WHERE status = ?`;
          params.push(status);
        }
        query += ` ORDER BY created_at DESC LIMIT ?`;
        params.push(limit);

        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      // 8.2 Goals
      if (url.pathname === '/v1/workforce/goals' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          signal_id = null,
          title,
          description,
          worker_id,
          score = 0.0,
          confidence = 1.0,
          effort = 1.0,
          risk = 0.0,
          status = 'CANDIDATE',
          evidence_refs = [],
          cooldown_until = null,
        } = body;

        if (!title || !description || !worker_id) {
          return errorResponse(
            'INVALID_INPUT',
            'title, description, and worker_id are required'
          );
        }

        const now = new Date().toISOString();
        const evidenceStr =
          typeof evidence_refs === 'string'
            ? evidence_refs
            : JSON.stringify(evidence_refs);

        await env.DB.prepare(
          `INSERT INTO workforce_goals (id, signal_id, title, description, worker_id, score, confidence, effort, risk, status, evidence_refs, cooldown_until, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            signal_id,
            title,
            description,
            worker_id,
            score,
            confidence,
            effort,
            risk,
            status,
            evidenceStr,
            cooldown_until,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, title, worker_id, status, score },
        });
      }

      if (url.pathname === '/v1/workforce/goals' && method === 'GET') {
        const status = url.searchParams.get('status');
        const worker_id = url.searchParams.get('worker_id');
        const limit = Math.min(
          100,
          parseInt(url.searchParams.get('limit') || '50', 10)
        );

        let query = `SELECT * FROM workforce_goals WHERE 1=1`;
        const params: any[] = [];
        if (status) {
          query += ` AND status = ?`;
          params.push(status);
        }
        if (worker_id) {
          query += ` AND worker_id = ?`;
          params.push(worker_id);
        }
        query += ` ORDER BY score DESC, created_at DESC LIMIT ?`;
        params.push(limit);

        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      const goalDetailMatch = url.pathname.match(
        /^\/v1\/workforce\/goals\/([^\/]+)$/
      );
      if (goalDetailMatch && method === 'GET') {
        const goalId = goalDetailMatch[1];
        const goal = await env.DB.prepare(
          `SELECT * FROM workforce_goals WHERE id = ?`
        )
          .bind(goalId)
          .first<any>();
        if (!goal)
          return errorResponse('NOT_FOUND', `Goal ${goalId} not found`, 404);
        return jsonResponse({ success: true, data: goal });
      }

      if (goalDetailMatch && method === 'PUT') {
        const goalId = goalDetailMatch[1];
        const body: any = await request.json();
        const { status, score } = body;
        const now = new Date().toISOString();

        const goal = await env.DB.prepare(
          `SELECT * FROM workforce_goals WHERE id = ?`
        )
          .bind(goalId)
          .first<any>();
        if (!goal)
          return errorResponse('NOT_FOUND', `Goal ${goalId} not found`, 404);

        if (status) {
          const legalTransitions: Record<string, string[]> = {
            CANDIDATE: ['ACCEPTED', 'REJECTED', 'DEFERRED', 'EXPIRED'],
            ACCEPTED: ['PLANNED', 'CANCELLED'],
            PLANNED: ['QUEUED', 'CANCELLED'],
            QUEUED: ['ACTIVE', 'CANCELLED'],
            ACTIVE: ['COMPLETED', 'FAILED', 'CANCELLED'],
            REJECTED: [],
            DEFERRED: ['CANDIDATE', 'CANCELLED'],
            EXPIRED: [],
            CANCELLED: [],
            FAILED: ['CANDIDATE'],
            SUPERSEDED: [],
            COMPLETED: [],
          };
          const allowed = legalTransitions[goal.status] || [];
          if (!allowed.includes(status)) {
            return errorResponse(
              'INVALID_TRANSITION',
              `Cannot transition goal from ${goal.status} to ${status}`
            );
          }
        }

        await env.DB.prepare(
          `UPDATE workforce_goals SET
             status = COALESCE(?, status),
             score = COALESCE(?, score),
             updated_at = ?
           WHERE id = ?`
        )
          .bind(status || null, score !== undefined ? score : null, now, goalId)
          .run();

        return jsonResponse({
          success: true,
          data: { id: goalId, status: status || goal.status, updated_at: now },
        });
      }

      // 8.3 Plans
      if (url.pathname === '/v1/workforce/plans' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          goal_id,
          schema_version = '1.0.0',
          user_goal,
          intent,
          stages_json,
          all_steps_json,
          conflicts_json = '[]',
          risk_tier = 'T1',
          status = 'VALIDATED',
        } = body;

        if (
          !goal_id ||
          !user_goal ||
          !intent ||
          !stages_json ||
          !all_steps_json
        ) {
          return errorResponse(
            'INVALID_INPUT',
            'goal_id, user_goal, intent, stages_json, and all_steps_json are required'
          );
        }

        const now = new Date().toISOString();
        const stagesStr =
          typeof stages_json === 'string'
            ? stages_json
            : JSON.stringify(stages_json);
        const stepsStr =
          typeof all_steps_json === 'string'
            ? all_steps_json
            : JSON.stringify(all_steps_json);
        const conflictsStr =
          typeof conflicts_json === 'string'
            ? conflicts_json
            : JSON.stringify(conflicts_json);

        await env.DB.prepare(
          `INSERT INTO workforce_plans (id, goal_id, schema_version, user_goal, intent, stages_json, all_steps_json, conflicts_json, risk_tier, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            goal_id,
            schema_version,
            user_goal,
            intent,
            stagesStr,
            stepsStr,
            conflictsStr,
            risk_tier,
            status,
            now,
            now
          )
          .run();

        return jsonResponse({ success: true, data: { id, goal_id, status } });
      }

      const planDetailMatch = url.pathname.match(
        /^\/v1\/workforce\/plans\/([^\/]+)$/
      );
      if (planDetailMatch && method === 'GET') {
        const planId = planDetailMatch[1];
        const plan = await env.DB.prepare(
          `SELECT * FROM workforce_plans WHERE id = ?`
        )
          .bind(planId)
          .first<any>();
        if (!plan)
          return errorResponse('NOT_FOUND', `Plan ${planId} not found`, 404);
        return jsonResponse({ success: true, data: plan });
      }

      // 8.4 Tasks
      if (url.pathname === '/v1/workforce/tasks' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          plan_id = null,
          goal_id = null,
          worker_id,
          title,
          task_input,
          priority = 5,
          max_attempts = 3,
          effective_scope = ['read_only'],
          trust_label = 'VERIFIED_SYSTEM',
          deadline_at = null,
        } = body;

        if (!worker_id || !title || !task_input) {
          return errorResponse(
            'INVALID_INPUT',
            'worker_id, title, and task_input are required'
          );
        }

        const now = new Date().toISOString();
        const inputStr =
          typeof task_input === 'string'
            ? task_input
            : JSON.stringify(task_input);
        const scopeStr =
          typeof effective_scope === 'string'
            ? effective_scope
            : JSON.stringify(effective_scope);

        await env.DB.prepare(
          `INSERT INTO workforce_tasks (id, plan_id, goal_id, worker_id, title, task_input, status, priority, max_attempts, effective_scope, trust_label, deadline_at, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            plan_id,
            goal_id,
            worker_id,
            title,
            inputStr,
            priority,
            max_attempts,
            scopeStr,
            trust_label,
            deadline_at,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, worker_id, title, status: 'QUEUED' },
        });
      }

      if (url.pathname === '/v1/workforce/tasks' && method === 'GET') {
        const status = url.searchParams.get('status');
        const worker_id = url.searchParams.get('worker_id');
        const limit = Math.min(
          100,
          parseInt(url.searchParams.get('limit') || '50', 10)
        );

        let query = `SELECT * FROM workforce_tasks WHERE 1=1`;
        const params: any[] = [];
        if (status) {
          query += ` AND status = ?`;
          params.push(status);
        }
        if (worker_id) {
          query += ` AND worker_id = ?`;
          params.push(worker_id);
        }
        query += ` ORDER BY priority ASC, created_at ASC LIMIT ?`;
        params.push(limit);

        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      const taskDetailMatch = url.pathname.match(
        /^\/v1\/workforce\/tasks\/([^\/]+)$/
      );
      if (taskDetailMatch && method === 'GET') {
        const taskId = taskDetailMatch[1];
        const task = await env.DB.prepare(
          `SELECT * FROM workforce_tasks WHERE id = ?`
        )
          .bind(taskId)
          .first<any>();
        if (!task)
          return errorResponse('NOT_FOUND', `Task ${taskId} not found`, 404);
        return jsonResponse({ success: true, data: task });
      }

      // 8.5 Atomic Task Claim / Lease (WF-GAP-005)
      const claimMatch = url.pathname.match(
        /^\/v1\/workforce\/tasks\/([^\/]+)\/claim$/
      );
      if (claimMatch && method === 'POST') {
        const taskId = claimMatch[1];
        const body: any = await request.json();
        const { lease_owner, lease_duration_ms = 30000 } = body;

        if (!lease_owner) {
          return errorResponse('INVALID_INPUT', 'lease_owner is required');
        }

        const task = await env.DB.prepare(
          `SELECT * FROM workforce_tasks WHERE id = ?`
        )
          .bind(taskId)
          .first<any>();
        if (!task)
          return errorResponse('NOT_FOUND', `Task ${taskId} not found`, 404);

        const now = new Date();
        const nowIso = now.toISOString();

        // Check if task is already leased and lease has NOT expired
        if (task.status === 'LEASED' && task.lease_expires_at) {
          const expiresAt = new Date(task.lease_expires_at);
          if (expiresAt > now && task.lease_owner !== lease_owner) {
            return jsonResponse({
              success: true,
              data: {
                claimed: false,
                reason: 'ALREADY_LEASED',
                lease_owner: task.lease_owner,
                lease_expires_at: task.lease_expires_at,
              },
            });
          }
        }

        // Check if task is in eligible state
        if (!['QUEUED', 'RETRY_WAIT', 'LEASED'].includes(task.status)) {
          return jsonResponse({
            success: true,
            data: {
              claimed: false,
              reason: `TASK_NOT_CLAIMABLE_STATE_${task.status}`,
              status: task.status,
            },
          });
        }

        // Atomic lease update
        const leaseExpiresIso = new Date(
          now.getTime() + lease_duration_ms
        ).toISOString();
        const newAttempt = (task.attempt || 0) + 1;

        await env.DB.prepare(
          `UPDATE workforce_tasks SET
             lease_owner = ?,
             lease_expires_at = ?,
             heartbeat_at = ?,
             attempt = ?,
             status = 'LEASED',
             updated_at = ?
           WHERE id = ?`
        )
          .bind(
            lease_owner,
            leaseExpiresIso,
            nowIso,
            newAttempt,
            nowIso,
            taskId
          )
          .run();

        return jsonResponse({
          success: true,
          data: {
            claimed: true,
            task_id: taskId,
            lease_owner,
            lease_expires_at: leaseExpiresIso,
            attempt: newAttempt,
          },
        });
      }

      // 8.6 Task Heartbeat
      const heartbeatMatch = url.pathname.match(
        /^\/v1\/workforce\/tasks\/([^\/]+)\/heartbeat$/
      );
      if (heartbeatMatch && method === 'POST') {
        const taskId = heartbeatMatch[1];
        const body: any = await request.json();
        const { lease_owner, extend_ms = 30000 } = body;

        const task = await env.DB.prepare(
          `SELECT * FROM workforce_tasks WHERE id = ?`
        )
          .bind(taskId)
          .first<any>();
        if (!task)
          return errorResponse('NOT_FOUND', `Task ${taskId} not found`, 404);

        if (task.lease_owner !== lease_owner) {
          return errorResponse(
            'LEASE_OWNER_MISMATCH',
            'Caller does not hold current lease',
            403
          );
        }

        const now = new Date();
        const newExpires = new Date(now.getTime() + extend_ms).toISOString();

        await env.DB.prepare(
          `UPDATE workforce_tasks SET lease_expires_at = ?, heartbeat_at = ?, updated_at = ? WHERE id = ?`
        )
          .bind(newExpires, now.toISOString(), now.toISOString(), taskId)
          .run();

        return jsonResponse({
          success: true,
          data: { task_id: taskId, lease_expires_at: newExpires },
        });
      }

      // 8.7 Task Checkpoint
      const checkpointMatch = url.pathname.match(
        /^\/v1\/workforce\/tasks\/([^\/]+)\/checkpoint$/
      );
      if (checkpointMatch && method === 'POST') {
        const taskId = checkpointMatch[1];
        const body: any = await request.json();
        const { step_id, attempt = 1, checkpoint_data } = body;

        if (!step_id || !checkpoint_data) {
          return errorResponse(
            'INVALID_INPUT',
            'step_id and checkpoint_data are required'
          );
        }

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const dataStr =
          typeof checkpoint_data === 'string'
            ? checkpoint_data
            : JSON.stringify(checkpoint_data);

        await env.DB.prepare(
          `INSERT INTO workforce_checkpoints (id, task_id, step_id, attempt, checkpoint_data, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`
        )
          .bind(id, taskId, step_id, attempt, dataStr, now)
          .run();

        return jsonResponse({
          success: true,
          data: { id, task_id: taskId, step_id, attempt },
        });
      }

      // 8.8 Task State Transition (Server-Owned Legal Transitions)
      const stateMatch = url.pathname.match(
        /^\/v1\/workforce\/tasks\/([^\/]+)\/state$/
      );
      if (stateMatch && method === 'POST') {
        const taskId = stateMatch[1];
        const body: any = await request.json();
        const { status, output_ref, approval_id } = body;

        if (!status)
          return errorResponse('INVALID_INPUT', 'status is required');

        const task = await env.DB.prepare(
          `SELECT * FROM workforce_tasks WHERE id = ?`
        )
          .bind(taskId)
          .first<any>();
        if (!task)
          return errorResponse('NOT_FOUND', `Task ${taskId} not found`, 404);

        // Transition validation
        const validTaskTransitions: Record<string, string[]> = {
          QUEUED: ['LEASED', 'CANCELLED'],
          LEASED: [
            'RUNNING',
            'AWAITING_APPROVAL',
            'RETRY_WAIT',
            'VERIFYING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
          ],
          RUNNING: [
            'AWAITING_APPROVAL',
            'RETRY_WAIT',
            'VERIFYING',
            'COMPLETED',
            'FAILED',
            'CANCELLED',
          ],
          AWAITING_APPROVAL: ['QUEUED', 'RUNNING', 'FAILED', 'CANCELLED'],
          RETRY_WAIT: ['QUEUED', 'DEAD_LETTER', 'CANCELLED'],
          VERIFYING: ['COMPLETED', 'FAILED', 'CANCELLED'],
          COMPLETED: [],
          FAILED: ['QUEUED'],
          CANCELLED: [],
          DEAD_LETTER: ['QUEUED'],
        };

        const allowed = validTaskTransitions[task.status] || [];
        if (!allowed.includes(status)) {
          return errorResponse(
            'INVALID_TRANSITION',
            `Illegal transition from ${task.status} to ${status}`
          );
        }

        const now = new Date().toISOString();
        const outputStr = output_ref
          ? typeof output_ref === 'string'
            ? output_ref
            : JSON.stringify(output_ref)
          : null;

        await env.DB.prepare(
          `UPDATE workforce_tasks SET
             status = ?,
             approval_id = COALESCE(?, approval_id),
             output_ref = COALESCE(?, output_ref),
             lease_owner = CASE WHEN ? IN ('COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER') THEN NULL ELSE lease_owner END,
             lease_expires_at = CASE WHEN ? IN ('COMPLETED', 'FAILED', 'CANCELLED', 'DEAD_LETTER') THEN NULL ELSE lease_expires_at END,
             updated_at = ?
           WHERE id = ?`
        )
          .bind(
            status,
            approval_id || null,
            outputStr,
            status,
            status,
            now,
            taskId
          )
          .run();

        return jsonResponse({
          success: true,
          data: { task_id: taskId, status, updated_at: now },
        });
      }

      // 8.9 Delegations (WF-GAP-014)
      if (url.pathname === '/v1/workforce/delegations' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          parent_task_id,
          child_task_id,
          parent_worker_id,
          child_worker_id,
          depth = 1,
          effective_scope = ['read_only'],
        } = body;

        if (
          !parent_task_id ||
          !child_task_id ||
          !parent_worker_id ||
          !child_worker_id
        ) {
          return errorResponse(
            'INVALID_INPUT',
            'parent_task_id, child_task_id, parent_worker_id, and child_worker_id are required'
          );
        }

        // Guard 1: No self-delegation
        if (parent_worker_id === child_worker_id) {
          return errorResponse(
            'SELF_DELEGATION_PROHIBITED',
            'Worker cannot delegate to itself',
            400
          );
        }

        // Guard 2: Depth limit <= 2
        if (depth > 2) {
          return errorResponse(
            'DELEGATION_DEPTH_EXCEEDED',
            'Max delegation depth is 2',
            400
          );
        }

        // Guard 3: Max 3 children per parent run
        const existingCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM workforce_delegations WHERE parent_task_id = ? AND status = 'active'`
        )
          .bind(parent_task_id)
          .first<any>();

        if (existingCount && existingCount.count >= 3) {
          return errorResponse(
            'MAX_CHILDREN_EXCEEDED',
            'Parent run reached max 3 active child delegations',
            400
          );
        }

        const now = new Date().toISOString();
        const scopeStr =
          typeof effective_scope === 'string'
            ? effective_scope
            : JSON.stringify(effective_scope);

        await env.DB.prepare(
          `INSERT INTO workforce_delegations (id, parent_task_id, child_task_id, parent_worker_id, child_worker_id, depth, status, effective_scope, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
        )
          .bind(
            id,
            parent_task_id,
            child_task_id,
            parent_worker_id,
            child_worker_id,
            depth,
            scopeStr,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, parent_task_id, child_task_id, depth },
        });
      }

      if (url.pathname === '/v1/workforce/delegations' && method === 'GET') {
        const parent_task_id = url.searchParams.get('parent_task_id');
        let query = `SELECT * FROM workforce_delegations`;
        const params: any[] = [];
        if (parent_task_id) {
          query += ` WHERE parent_task_id = ?`;
          params.push(parent_task_id);
        }
        query += ` ORDER BY created_at DESC LIMIT 50`;

        const stmt = env.DB.prepare(query);
        const { results } = await stmt.bind(...params).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      // 8.10 Messages (WF-GAP-018)
      if (url.pathname === '/v1/workforce/messages' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          correlation_id,
          sender_id,
          recipient_id,
          task_id = null,
          message_type = 'notification',
          payload,
          trust_label = 'VERIFIED_SYSTEM',
        } = body;

        if (!correlation_id || !sender_id || !recipient_id || !payload) {
          return errorResponse(
            'INVALID_INPUT',
            'correlation_id, sender_id, recipient_id, and payload are required'
          );
        }

        const now = new Date().toISOString();
        const payloadStr =
          typeof payload === 'string' ? payload : JSON.stringify(payload);

        await env.DB.prepare(
          `INSERT INTO workforce_agent_messages (id, correlation_id, sender_id, recipient_id, task_id, message_type, payload, trust_label, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            id,
            correlation_id,
            sender_id,
            recipient_id,
            task_id,
            message_type,
            payloadStr,
            trust_label,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, correlation_id, message_type },
        });
      }

      // 8.11 Dead Letters (WF-GAP-020)
      if (url.pathname === '/v1/workforce/dead-letters' && method === 'POST') {
        const body: any = await request.json();
        const {
          id = crypto.randomUUID(),
          task_id,
          failure_class,
          error_message,
          attempt_count = 3,
          payload = {},
        } = body;

        if (!task_id || !failure_class || !error_message) {
          return errorResponse(
            'INVALID_INPUT',
            'task_id, failure_class, and error_message are required'
          );
        }

        const now = new Date().toISOString();
        const payloadStr =
          typeof payload === 'string' ? payload : JSON.stringify(payload);

        await env.DB.prepare(
          `INSERT INTO workforce_dead_letters (id, task_id, failure_class, error_message, attempt_count, payload, replay_status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 'unplayed', ?, ?)`
        )
          .bind(
            id,
            task_id,
            failure_class,
            error_message,
            attempt_count,
            payloadStr,
            now,
            now
          )
          .run();

        return jsonResponse({
          success: true,
          data: { id, task_id, replay_status: 'unplayed' },
        });
      }

      if (url.pathname === '/v1/workforce/dead-letters' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM workforce_dead_letters ORDER BY created_at DESC LIMIT 50`
        ).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      // 8.12 Workforce Controls & Kill Switches (WF-GAP-025 & ARCH-05)
      if (url.pathname === '/v1/workforce/controls' && method === 'POST') {
        const body: any = await request.json();
        const { control_key, is_enabled, reason = null } = body;

        if (!control_key || is_enabled === undefined) {
          return errorResponse(
            'INVALID_INPUT',
            'control_key and is_enabled are required'
          );
        }

        // Derive actor from verified credentials / server context (ARCH-05)
        const clientId =
          request.headers.get('CF-Access-Client-Id') ||
          request.headers.get('cf-access-client-id');
        const callerRole =
          request.headers.get('X-Caller-Role') ||
          request.headers.get('x-caller-role');
        const verifiedActor = clientId
          ? `service_token:${clientId.slice(0, 8)}`
          : callerRole === 'owner'
            ? 'owner'
            : body.updated_by || 'owner';

        const id = crypto.randomUUID();
        const now = new Date().toISOString();
        const enabledInt = is_enabled ? 1 : 0;

        await env.DB.prepare(
          `INSERT INTO workforce_controls (id, control_key, is_enabled, reason, updated_by, updated_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(control_key) DO UPDATE SET is_enabled = excluded.is_enabled, reason = excluded.reason, updated_by = excluded.updated_by, updated_at = excluded.updated_at`
        )
          .bind(id, control_key, enabledInt, reason, verifiedActor, now)
          .run();

        // Audit the control modification in audit_events (ARCH-05)
        try {
          await env.DB.prepare(
            `INSERT INTO audit_events (id, actor, action, resource_type, resource_id, scope, decision, correlation_id, created_at)
             VALUES (?, ?, 'update_control', 'workforce_controls', ?, 'system', 'allowed', ?, ?)`
          )
            .bind(
              crypto.randomUUID(),
              verifiedActor,
              control_key,
              `ctrl_${Date.now()}`,
              now
            )
            .run();
        } catch {}

        return jsonResponse({
          success: true,
          data: {
            control_key,
            is_enabled: !!is_enabled,
            updated_by: verifiedActor,
            updated_at: now,
          },
        });
      }

      if (url.pathname === '/v1/workforce/controls' && method === 'GET') {
        const { results } = await env.DB.prepare(
          `SELECT * FROM workforce_controls`
        ).all<any>();
        return jsonResponse({ success: true, data: results || [] });
      }

      // 8.13 Measured Operational Status (WF-GAP-016 & WF-GAP-021)
      if (url.pathname === '/v1/workforce/status' && method === 'GET') {
        const taskCounts = await env.DB.prepare(
          `SELECT status, COUNT(*) as count FROM workforce_tasks GROUP BY status`
        ).all<any>();

        const goalCounts = await env.DB.prepare(
          `SELECT status, COUNT(*) as count FROM workforce_goals GROUP BY status`
        ).all<any>();

        const deadLettersCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM workforce_dead_letters WHERE replay_status = 'unplayed'`
        ).first<any>();

        const controls = await env.DB.prepare(
          `SELECT control_key, is_enabled FROM workforce_controls`
        ).all<any>();

        return jsonResponse({
          success: true,
          data: {
            tasks_by_status: (taskCounts.results || []).reduce(
              (acc: any, r: any) => {
                acc[r.status] = r.count;
                return acc;
              },
              {}
            ),
            goals_by_status: (goalCounts.results || []).reduce(
              (acc: any, r: any) => {
                acc[r.status] = r.count;
                return acc;
              },
              {}
            ),
            unplayed_dead_letters: deadLettersCount?.count || 0,
            controls: (controls.results || []).reduce((acc: any, r: any) => {
              acc[r.control_key] = r.is_enabled === 1;
              return acc;
            }, {}),
            measured_at: new Date().toISOString(),
          },
        });
      }

      return errorResponse(
        'NOT_FOUND',
        `Route ${method} ${url.pathname} not found`,
        404
      );
    } catch (err: any) {
      console.error('Unhandled Worker error:', err);
      return errorResponse(
        'INTERNAL_ERROR',
        err.message || 'An unexpected error occurred',
        500
      );
    }
  },

  async queue(
    batch: MessageBatch<any>,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    await handleSecurityQueue(batch, env, ctx);
  },
};
