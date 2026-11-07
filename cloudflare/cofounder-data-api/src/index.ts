import { Env, ApiResponse, ExecutionContext } from './types';
import { validateServiceAuth } from './auth';

function jsonResponse<T>(data: ApiResponse<T>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, CF-Access-Client-Id, CF-Access-Client-Secret, Idempotency-Key, X-Correlation-ID',
    },
  });
}

function errorResponse(code: string, message: string, status = 400): Response {
  return jsonResponse({ success: false, error: { code, message } }, status);
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
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
      // 1. MEMORY ENDPOINTS
      // ------------------------------------------------------------------------

      // POST /v1/memory/explicit - Save/update explicit user memory
      if (url.pathname === '/v1/memory/explicit' && method === 'POST') {
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
          .then((buf) =>
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

        return jsonResponse({
          success: true,
          data: { id, memory_type, scope, content, updated_at: now },
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
        const body: any = await request.json();
        const { candidate_id, verification_summary, evidence_refs = [] } = body;

        if (!candidate_id || !verification_summary) {
          return errorResponse(
            'INVALID_INPUT',
            'candidate_id and verification_summary required'
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

      // POST /v1/worker-proposals - Suggest new worker or sub-worker
      if (url.pathname === '/v1/worker-proposals' && method === 'POST') {
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

        return jsonResponse({
          success: true,
          data: { id, status: 'draft', created_at: now },
        });
      }

      // ------------------------------------------------------------------------
      // 4. RESEARCH & UPGRADE PROPOSALS
      // ------------------------------------------------------------------------

      // POST /v1/research - Record research project metadata and findings
      if (url.pathname === '/v1/research' && method === 'POST') {
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

        // Batch insert findings if provided
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
              f.confidence || 1.0,
              now
            )
            .run();
        }

        return jsonResponse({
          success: true,
          data: { project_id: projectId, status: 'active', created_at: now },
        });
      }

      // POST /v1/proposals - Store RSI upgrade proposal
      if (url.pathname === '/v1/proposals' && method === 'POST') {
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

        return jsonResponse({
          success: true,
          data: { id, status: 'draft', created_at: now },
        });
      }

      // ------------------------------------------------------------------------
      // 5. ARTIFACTS PRESIGN / R2
      // ------------------------------------------------------------------------

      // POST /v1/artifacts/presign - Reference or temporary upload key in R2
      if (url.pathname === '/v1/artifacts/presign' && method === 'POST') {
        const body: any = await request.json();
        const {
          artifact_type = 'report',
          file_name,
          content_type = 'application/json',
        } = body;

        const datePrefix = new Date().toISOString().slice(0, 10);
        const key = `${artifact_type}/${datePrefix}/${crypto.randomUUID()}-${file_name || 'artifact.json'}`;

        return jsonResponse({
          success: true,
          data: {
            r2_key: key,
            bucket: 'ruhvi-cofounder-artifacts',
            content_type,
            upload_url: `/v1/artifacts/direct-upload?key=${encodeURIComponent(key)}`,
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
};
