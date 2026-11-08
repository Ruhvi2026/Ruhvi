// ==============================================================================
// Ruhvi AI Co-Founder — Security Intelligence Worker Endpoints & Queue Consumer
// Architecture Reference: RUHVI_SECURITY_INTELLIGENCE_WORKER_IMPLEMENTATION_SPEC.md
// ==============================================================================

import {
  Env,
  ApiResponse,
  ExecutionContext,
  MessageBatch,
  SecurityEventPayload,
  SecurityScanIngestPayload,
  SecurityActionProposalPayload,
} from './types';

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

const REDACT_KEYS = new Set([
  'password',
  'passwd',
  'token',
  'secret',
  'authorization',
  'apikey',
  'api_key',
  'credit_card',
  'card_number',
  'cvv',
  'cookie',
  'jwt',
]);

function redactPayload(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(redactPayload);

  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (REDACT_KEYS.has(k.toLowerCase())) {
      clean[k] = '[REDACTED]';
    } else if (typeof v === 'object') {
      clean[k] = redactPayload(v);
    } else {
      clean[k] = v;
    }
  }
  return clean;
}

async function sha256Hex(str: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(str)
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

const PREAPPROVED_ACTIONS = new Set([
  'quarantine_file',
  'reject_webhook',
  'rate_limit_ip',
  'temporary_ip_block',
  'revoke_session',
]);

export async function handleSecurityRoutes(
  request: Request,
  env: Env,
  url: URL,
  ctx?: ExecutionContext
): Promise<Response | null> {
  const path = url.pathname;
  const method = request.method.toUpperCase();

  // 1. INGEST RUNTIME SECURITY EVENT
  // POST /v1/security/events
  if (path === '/v1/security/events' && method === 'POST') {
    try {
      const body = (await request.json()) as SecurityEventPayload;
      if (!body.event_type || !body.source) {
        return errorResponse('INVALID_EVENT', 'Missing event_type or source');
      }

      const eventId = body.event_id || crypto.randomUUID();
      const idempotencyKey = body.idempotency_key || eventId;
      const environment =
        body.environment || (env.ENVIRONMENT as any) || 'prod';
      const occurredAt = body.occurred_at || new Date().toISOString();
      const correlationId = body.correlation_id || crypto.randomUUID();
      const redacted = redactPayload(body.payload || {});

      // Idempotency check in receipts
      const existing = await env.DB.prepare(
        `SELECT id, event_id, status FROM security_event_receipts WHERE idempotency_key = ? OR event_id = ?`
      )
        .bind(idempotencyKey, eventId)
        .first<any>();

      if (existing) {
        return jsonResponse({
          success: true,
          data: {
            receipt_id: existing.id,
            event_id: existing.event_id,
            status: existing.status,
            replayed: true,
          },
        });
      }

      const receiptId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO security_event_receipts 
         (id, event_id, idempotency_key, event_type, source, environment, occurred_at, correlation_id, status, payload_redacted_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'received', ?)`
      )
        .bind(
          receiptId,
          eventId,
          idempotencyKey,
          body.event_type,
          body.source,
          environment,
          occurredAt,
          correlationId,
          JSON.stringify(redacted)
        )
        .run();

      // Dispatch to Cloudflare Queue if bound
      if (env.SECURITY_QUEUE) {
        if (ctx) {
          ctx.waitUntil(
            env.SECURITY_QUEUE.send({
              receipt_id: receiptId,
              event_id: eventId,
              event_type: body.event_type,
              source: body.source,
              environment,
              correlation_id: correlationId,
              payload: redacted,
              occurred_at: occurredAt,
            })
          );
        } else {
          await env.SECURITY_QUEUE.send({
            receipt_id: receiptId,
            event_id: eventId,
            event_type: body.event_type,
            source: body.source,
            environment,
            correlation_id: correlationId,
            payload: redacted,
            occurred_at: occurredAt,
          });
        }
      }

      return jsonResponse(
        {
          success: true,
          data: {
            receipt_id: receiptId,
            event_id: eventId,
            status: 'received',
            queued: !!env.SECURITY_QUEUE,
          },
        },
        201
      );
    } catch (err: any) {
      return errorResponse(
        'EVENT_INGEST_FAILED',
        err.message || 'Failed to ingest security event',
        500
      );
    }
  }

  // 2. INGEST SCAN RUN & FINDINGS (CI/CD SCANNERS)
  // POST /v1/security/scans
  if (path === '/v1/security/scans' && method === 'POST') {
    try {
      const body = (await request.json()) as SecurityScanIngestPayload;
      if (!body.provider || !body.workflow || !body.run_id) {
        return errorResponse(
          'INVALID_SCAN_PAYLOAD',
          'Missing provider, workflow, or run_id'
        );
      }

      const scanRunId = crypto.randomUUID();
      const environment =
        body.environment || (env.ENVIRONMENT as any) || 'prod';
      const startedAt = new Date().toISOString();

      await env.DB.prepare(
        `INSERT INTO security_scan_runs 
         (id, provider, workflow, run_id, commit_sha, branch, environment, started_at, finished_at, status, scanner_versions, summary_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), 'completed', ?, ?)`
      )
        .bind(
          scanRunId,
          body.provider,
          body.workflow,
          body.run_id,
          body.commit_sha || null,
          body.branch || null,
          environment,
          startedAt,
          JSON.stringify(body.scanner_versions || {}),
          JSON.stringify(body.summary || {})
        )
        .run();

      // Store raw scan artifact in R2 if provided
      if (body.artifact_raw && env.ARTIFACTS) {
        const artifactType = body.artifact_type || 'json';
        const r2Key = `security/${environment}/scans/${scanRunId}/${body.provider}.${artifactType}`;
        const sha256 = await sha256Hex(body.artifact_raw);
        const sizeBytes = new TextEncoder().encode(
          body.artifact_raw
        ).byteLength;

        await env.ARTIFACTS.put(r2Key, body.artifact_raw, {
          httpMetadata: {
            contentType:
              artifactType === 'sarif'
                ? 'application/json'
                : 'application/json',
          },
          customMetadata: {
            provider: body.provider,
            run_id: body.run_id,
            sha256,
          },
        });

        await env.DB.prepare(
          `INSERT INTO security_scan_artifacts 
           (id, scan_run_id, artifact_type, r2_key, sha256, size_bytes, redaction_status)
           VALUES (?, ?, ?, ?, ?, ?, 'clean')`
        )
          .bind(
            crypto.randomUUID(),
            scanRunId,
            artifactType,
            r2Key,
            sha256,
            sizeBytes
          )
          .run();
      }

      // Ingest and normalize findings
      let ingestedFindings = 0;
      if (Array.isArray(body.findings) && body.findings.length > 0) {
        for (const f of body.findings) {
          const fingerprint =
            f.fingerprint ||
            (await sha256Hex(`${body.provider}:${f.category}:${f.title}`));
          const findingId = crypto.randomUUID();
          const cleanDesc = redactPayload(f.description || '');

          await env.DB.prepare(
            `INSERT INTO security_findings 
             (id, fingerprint, source, category, title, description_redacted, severity, confidence, environment, first_seen_at, last_seen_at, status, evidence_refs_json, risk_factors_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), 'open', ?, ?)
             ON CONFLICT(fingerprint) DO UPDATE SET 
               last_seen_at = datetime('now'),
               severity = excluded.severity,
               status = CASE WHEN status = 'remediated' THEN 'open' ELSE status END`
          )
            .bind(
              findingId,
              fingerprint,
              body.provider,
              f.category || 'other',
              f.title,
              cleanDesc,
              f.severity,
              f.confidence || 1.0,
              environment,
              JSON.stringify(f.evidence_refs || []),
              JSON.stringify(f.risk_factors || {})
            )
            .run();

          ingestedFindings++;
        }
      }

      return jsonResponse(
        {
          success: true,
          data: {
            scan_run_id: scanRunId,
            findings_count: ingestedFindings,
            status: 'completed',
          },
        },
        201
      );
    } catch (err: any) {
      return errorResponse(
        'SCAN_INGEST_FAILED',
        err.message || 'Failed to ingest scan report',
        500
      );
    }
  }

  // 3. QUERY FINDINGS
  // GET /v1/security/findings
  if (path === '/v1/security/findings' && method === 'GET') {
    const severity = url.searchParams.get('severity');
    const status = url.searchParams.get('status');
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    );
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    let query = `SELECT * FROM security_findings WHERE 1=1`;
    const params: any[] = [];

    if (severity) {
      query += ` AND severity = ?`;
      params.push(severity);
    }
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    query += ` ORDER BY CASE severity 
                 WHEN 'CRITICAL' THEN 1 
                 WHEN 'HIGH' THEN 2 
                 WHEN 'MEDIUM' THEN 3 
                 WHEN 'LOW' THEN 4 
                 ELSE 5 END, last_seen_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const findings = await env.DB.prepare(query)
      .bind(...params)
      .all<any>();
    return jsonResponse({ success: true, data: findings.results || [] });
  }

  // 4. QUERY / CREATE INCIDENTS
  // GET /v1/security/incidents
  if (path === '/v1/security/incidents' && method === 'GET') {
    const state = url.searchParams.get('state');
    const severity = url.searchParams.get('severity');
    let query = `SELECT * FROM security_incidents WHERE 1=1`;
    const params: any[] = [];
    if (state) {
      query += ` AND state = ?`;
      params.push(state);
    }
    if (severity) {
      query += ` AND severity = ?`;
      params.push(severity);
    }
    query += ` ORDER BY last_activity_at DESC LIMIT 50`;
    const incidents = await env.DB.prepare(query)
      .bind(...params)
      .all<any>();
    return jsonResponse({ success: true, data: incidents.results || [] });
  }

  // POST /v1/security/incidents
  if (path === '/v1/security/incidents' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      const incidentId = body.id || crypto.randomUUID();

      await env.DB.prepare(
        `INSERT INTO security_incidents 
         (id, title, incident_type, severity, confidence, state, impact_summary, root_cause, timeline_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET 
           state = excluded.state,
           severity = excluded.severity,
           last_activity_at = datetime('now'),
           impact_summary = excluded.impact_summary,
           root_cause = excluded.root_cause,
           timeline_json = excluded.timeline_json`
      )
        .bind(
          incidentId,
          body.title || 'Security Incident',
          body.incident_type || 'anomaly',
          body.severity || 'P2_MEDIUM',
          body.confidence || 1.0,
          body.state || 'investigating',
          body.impact_summary || null,
          body.root_cause || null,
          JSON.stringify(
            body.timeline || [
              {
                timestamp: new Date().toISOString(),
                message: 'Incident registered',
              },
            ]
          )
        )
        .run();

      // Audit log
      await env.DB.prepare(
        `INSERT INTO security_audit_log (id, actor_type, actor_ref, action, resource_type, resource_id, decision, details_redacted_json)
         VALUES (?, 'worker_security', 'worker_security_intelligence', 'incident_upsert', 'security_incident', ?, 'ALLOW', ?)`
      )
        .bind(
          crypto.randomUUID(),
          incidentId,
          JSON.stringify({ title: body.title, state: body.state })
        )
        .run();

      return jsonResponse(
        { success: true, data: { incident_id: incidentId } },
        201
      );
    } catch (err: any) {
      return errorResponse(
        'INCIDENT_FAILED',
        err.message || 'Failed to update incident',
        500
      );
    }
  }

  // 5. ACTION PROPOSALS & AUTONOMOUS CONTAINMENT
  // GET /v1/security/proposals
  if (path === '/v1/security/proposals' && method === 'GET') {
    const status = url.searchParams.get('status');
    let query = `SELECT * FROM security_action_proposals WHERE 1=1`;
    const params: any[] = [];
    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }
    query += ` ORDER BY created_at DESC LIMIT 50`;
    const proposals = await env.DB.prepare(query)
      .bind(...params)
      .all<any>();
    return jsonResponse({ success: true, data: proposals.results || [] });
  }

  // POST /v1/security/proposals
  if (path === '/v1/security/proposals' && method === 'POST') {
    try {
      const body = (await request.json()) as SecurityActionProposalPayload;
      if (!body.action_type || !body.target_ref || !body.policy_key) {
        return errorResponse(
          'INVALID_PROPOSAL',
          'Missing action_type, target_ref, or policy_key'
        );
      }

      // Normalize action name contract (SEC-P0-003)
      if ((body.action_type as string) === 'quarantine_uploaded_file') {
        body.action_type = 'quarantine_file';
      }

      const proposalId = crypto.randomUUID();
      const idempotencyKey = body.idempotency_key || proposalId;
      const riskLevel = body.risk_level || 'T1_REVERSIBLE_CONTAINMENT';
      const isPreapproved = PREAPPROVED_ACTIONS.has(body.action_type);
      const canAutoExecute =
        isPreapproved &&
        riskLevel === 'T1_REVERSIBLE_CONTAINMENT' &&
        body.auto_execute_if_preapproved !== false;

      const initialStatus = canAutoExecute ? 'executed' : 'proposed';

      await env.DB.prepare(
        `INSERT INTO security_action_proposals 
         (id, incident_id, action_type, target_ref, scope_json, risk_level, confidence, policy_key, idempotency_key, status, rollback_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          proposalId,
          body.incident_id || null,
          body.action_type,
          body.target_ref,
          JSON.stringify(body.scope || {}),
          riskLevel,
          body.confidence || 1.0,
          body.policy_key,
          idempotencyKey,
          initialStatus,
          JSON.stringify(body.rollback_data || {})
        )
        .run();

      // Execute pre-approved autonomous containment action
      if (canAutoExecute) {
        if (
          body.action_type === 'temporary_ip_block' ||
          body.action_type === 'rate_limit_ip'
        ) {
          const targetIp = (body.target_ref || '').trim();
          const isLoopbackOrPrivate =
            targetIp === '127.0.0.1' ||
            targetIp === 'localhost' ||
            targetIp === '::1' ||
            targetIp.startsWith('10.') ||
            targetIp.startsWith('192.168.') ||
            targetIp.startsWith('172.16.') ||
            targetIp.startsWith('172.31.');

          if (isLoopbackOrPrivate) {
            return errorResponse(
              'INVALID_TARGET',
              'Internal, loopback, or private subnet IPs cannot be blocked via perimeter containment'
            );
          }

          const ttlMinutes = body.scope?.ttl_minutes || 30;
          const expiresAt = new Date(
            Date.now() + ttlMinutes * 60 * 1000
          ).toISOString();

          await env.DB.prepare(
            `INSERT INTO security_blocked_entities 
             (id, entity_type, entity_value, reason, risk_level, blocked_by, expires_at, status)
             VALUES (?, 'ip', ?, ?, 'T1_REVERSIBLE_CONTAINMENT', 'worker_security_intelligence', ?, 'active')`
          )
            .bind(
              crypto.randomUUID(),
              body.target_ref,
              `Autonomous containment via ${body.policy_key}`,
              expiresAt
            )
            .run();
        }

        // Execution record (SEC-P0-003: D1 ledger insertion is 'recorded_only', not 'verified_effective' on external WAF)
        await env.DB.prepare(
          `INSERT INTO security_action_executions 
           (id, proposal_id, executor, ended_at, result_redacted_json, verification_status)
           VALUES (?, ?, 'worker_security_intelligence', datetime('now'), ?, 'recorded_only')`
        )
          .bind(
            crypto.randomUUID(),
            proposalId,
            JSON.stringify({ auto_executed: true, target: body.target_ref })
          )
          .run();

        // Audit log
        await env.DB.prepare(
          `INSERT INTO security_audit_log (id, actor_type, actor_ref, action, resource_type, resource_id, decision, details_redacted_json)
           VALUES (?, 'worker_security', 'worker_security_intelligence', 'autonomous_containment', 'security_action', ?, 'ALLOW', ?)`
        )
          .bind(
            crypto.randomUUID(),
            proposalId,
            JSON.stringify({
              action_type: body.action_type,
              target: body.target_ref,
            })
          )
          .run();
      }

      return jsonResponse(
        {
          success: true,
          data: {
            proposal_id: proposalId,
            status: initialStatus,
            auto_executed: canAutoExecute,
          },
        },
        201
      );
    } catch (err: any) {
      return errorResponse(
        'PROPOSAL_FAILED',
        err.message || 'Failed to register proposal',
        500
      );
    }
  }

  // 6. BLOCKED ENTITIES LOOKUP & MANAGEMENT
  // GET /v1/security/blocked
  if (path === '/v1/security/blocked' && method === 'GET') {
    const ip = url.searchParams.get('ip');
    if (ip) {
      const active = await env.DB.prepare(
        `SELECT * FROM security_blocked_entities 
         WHERE entity_type = 'ip' AND entity_value = ? AND status = 'active' AND expires_at > datetime('now')`
      )
        .bind(ip)
        .first<any>();
      return jsonResponse({
        success: true,
        data: { is_blocked: !!active, details: active || null },
      });
    }

    const all = await env.DB.prepare(
      `SELECT * FROM security_blocked_entities WHERE status = 'active' AND expires_at > datetime('now') ORDER BY created_at DESC LIMIT 100`
    ).all<any>();
    return jsonResponse({ success: true, data: all.results || [] });
  }

  // 7. QUARANTINE REGISTRY
  // GET /v1/security/quarantine
  if (path === '/v1/security/quarantine' && method === 'GET') {
    const records = await env.DB.prepare(
      `SELECT * FROM security_quarantine_records ORDER BY created_at DESC LIMIT 50`
    ).all<any>();
    return jsonResponse({ success: true, data: records.results || [] });
  }

  // POST /v1/security/quarantine
  if (path === '/v1/security/quarantine' && method === 'POST') {
    try {
      const body = (await request.json()) as any;
      if (!body.sha256 || !body.original_filename) {
        return errorResponse(
          'INVALID_QUARANTINE_DATA',
          'Missing sha256 or original_filename'
        );
      }

      const qId = crypto.randomUUID();
      await env.DB.prepare(
        `INSERT INTO security_quarantine_records 
         (id, original_filename, original_mime, detected_mime, file_size_bytes, sha256, quarantine_r2_key, threat_summary, detection_source, uploader_ref, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'quarantined')
         ON CONFLICT(sha256) DO UPDATE SET status = 'quarantined'`
      )
        .bind(
          qId,
          body.original_filename,
          body.original_mime || 'application/octet-stream',
          body.detected_mime || 'application/octet-stream',
          body.file_size_bytes || 0,
          body.sha256,
          body.quarantine_r2_key || `quarantine/${body.sha256}`,
          body.threat_summary || 'Suspicious file payload quarantined',
          body.detection_source || 'magic_byte_analyzer',
          body.uploader_ref || null
        )
        .run();

      return jsonResponse(
        { success: true, data: { quarantine_id: qId, sha256: body.sha256 } },
        201
      );
    } catch (err: any) {
      return errorResponse('QUARANTINE_REGISTRATION_FAILED', err.message, 500);
    }
  }

  // 8. SECURITY AUDIT LOG
  // GET /v1/security/audit
  if (path === '/v1/security/audit' && method === 'GET') {
    const limit = Math.min(
      parseInt(url.searchParams.get('limit') || '50', 10),
      100
    );
    const logs = await env.DB.prepare(
      `SELECT * FROM security_audit_log ORDER BY created_at DESC LIMIT ?`
    )
      .bind(limit)
      .all<any>();
    return jsonResponse({ success: true, data: logs.results || [] });
  }

  return null;
}

/**
 * Cloudflare Queues batch consumer for runtime security events.
 * Executes deterministic lightweight checks without calling LLMs or external network APIs.
 */
export async function handleSecurityQueue(
  batch: MessageBatch<any>,
  env: Env,
  ctx: ExecutionContext
): Promise<void> {
  for (const message of batch.messages) {
    try {
      const event = message.body;
      if (!event || !event.event_type) {
        message.ack();
        continue;
      }

      // Check for brute-force or high-frequency anomaly patterns
      if (event.event_type === 'auth_login_failure' && event.payload?.ip) {
        const ip = event.payload.ip;
        // Count failed logins from this IP within the last 5 minutes
        const failCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM security_event_receipts 
           WHERE event_type = 'auth_login_failure' 
             AND json_extract(payload_redacted_json, '$.ip') = ? 
             AND received_at > datetime('now', '-5 minutes')`
        )
          .bind(ip)
          .first<{ count: number }>();

        if (failCount && failCount.count >= 10) {
          // Trigger reversible temporary IP rate-limit / block for 15 minutes
          const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          await env.DB.prepare(
            `INSERT INTO security_blocked_entities 
             (id, entity_type, entity_value, reason, risk_level, blocked_by, expires_at, status)
             VALUES (?, 'ip', ?, 'Excessive authentication failures (brute-force defense)', 'T1_REVERSIBLE_CONTAINMENT', 'worker_security_intelligence', ?, 'active')`
          )
            .bind(crypto.randomUUID(), ip, expiresAt)
            .run();
        }
      }

      // Mark receipt as processed in D1
      if (event.receipt_id) {
        await env.DB.prepare(
          `UPDATE security_event_receipts SET status = 'correlated' WHERE id = ?`
        )
          .bind(event.receipt_id)
          .run();
      }

      message.ack();
    } catch (err) {
      console.error('Queue message processing error:', err);
      message.retry();
    }
  }
}
