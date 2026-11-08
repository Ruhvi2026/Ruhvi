import worker from '../index';
import { Env } from '../types';

describe('Cloudflare Worker: cofounder-data-api (A-15)', () => {
  let mockEnv: Env;
  let mockDbData: Record<string, any[]>;
  let r2Objects: Map<
    string,
    { body: Uint8Array; httpMetadata?: any; customMetadata?: any }
  >;

  beforeEach(() => {
    mockDbData = {
      memory_items: [],
      memory_versions: [],
      candidate_lessons: [],
      verified_lessons: [],
      agent_runs: [],
      run_events: [],
      worker_snapshots: [],
      worker_runs: [],
      tool_events: [],
      worker_proposals: [],
      research_projects: [],
      research_sources: [],
      research_findings: [],
      upgrade_proposals: [],
      approval_events: [],
      capability_gaps: [],
      eval_suites: [],
      eval_cases: [],
      eval_runs: [],
      eval_results: [],
      audit_events: [],
      idempotency_keys: [],
      artifacts: [],
    };

    r2Objects = new Map();

    const mockPrepare = (sql: string) => {
      let boundArgs: any[] = [];
      const stmt: any = {
        bind: (...args: any[]) => {
          boundArgs = args;
          return stmt;
        },
        first: async <T = any>() => {
          // SELECT * FROM candidate_lessons WHERE id = ?
          if (sql.includes('candidate_lessons WHERE id = ?')) {
            return (mockDbData.candidate_lessons.find(
              (c) => c.id === boundArgs[0]
            ) || null) as T;
          }
          // SELECT * FROM research_projects WHERE id = ?
          if (sql.includes('research_projects WHERE id = ?')) {
            return (mockDbData.research_projects.find(
              (p) => p.id === boundArgs[0]
            ) || null) as T;
          }
          // SELECT * FROM capability_gaps WHERE id = ?
          if (sql.includes('capability_gaps WHERE id = ?')) {
            return (mockDbData.capability_gaps.find(
              (g) => g.id === boundArgs[0]
            ) || null) as T;
          }
          // SELECT * FROM eval_runs WHERE id = ?
          if (sql.includes('eval_runs WHERE id = ?')) {
            return (mockDbData.eval_runs.find((r) => r.id === boundArgs[0]) ||
              null) as T;
          }
          // SELECT * FROM artifacts WHERE r2_key = ?
          if (sql.includes('artifacts WHERE r2_key = ?')) {
            return (mockDbData.artifacts.find(
              (a) => a.r2_key === boundArgs[0]
            ) || null) as T;
          }
          // SELECT result_ref FROM idempotency_keys WHERE key = ?
          if (sql.includes('idempotency_keys WHERE key = ?')) {
            const found = mockDbData.idempotency_keys.find(
              (k) => k.key === boundArgs[0]
            );
            return (found ? { result_ref: found.result_ref } : null) as T;
          }
          return null as T;
        },
        all: async <T = any>() => {
          if (sql.includes('FROM worker_snapshots')) {
            return { results: mockDbData.worker_snapshots as T[] };
          }
          if (sql.includes('FROM capability_gaps')) {
            const status = boundArgs[0];
            const filtered = status
              ? mockDbData.capability_gaps.filter((g) => g.status === status)
              : mockDbData.capability_gaps;
            return { results: filtered as T[] };
          }
          if (sql.includes('FROM eval_suites')) {
            return { results: mockDbData.eval_suites as T[] };
          }
          if (sql.includes('FROM eval_cases WHERE suite_id = ?')) {
            return {
              results: mockDbData.eval_cases.filter(
                (c) => c.suite_id === boundArgs[0]
              ) as T[],
            };
          }
          if (sql.includes('FROM eval_runs')) {
            return { results: mockDbData.eval_runs as T[] };
          }
          if (sql.includes('FROM eval_results WHERE eval_run_id = ?')) {
            return {
              results: mockDbData.eval_results.filter(
                (r) => r.eval_run_id === boundArgs[0]
              ) as T[],
            };
          }
          if (sql.includes('FROM research_sources WHERE project_id = ?')) {
            return {
              results: mockDbData.research_sources.filter(
                (s) => s.project_id === boundArgs[0]
              ) as T[],
            };
          }
          if (sql.includes('FROM research_findings WHERE project_id = ?')) {
            return {
              results: mockDbData.research_findings.filter(
                (f) => f.project_id === boundArgs[0]
              ) as T[],
            };
          }
          if (sql.includes('FROM upgrade_proposals')) {
            return { results: mockDbData.upgrade_proposals as T[] };
          }
          if (sql.includes('FROM memory_items')) {
            return { results: mockDbData.memory_items as T[] };
          }
          return { results: [] as T[] };
        },
        run: async () => {
          if (sql.includes('INSERT INTO idempotency_keys')) {
            mockDbData.idempotency_keys.push({
              key: boundArgs[0],
              operation: boundArgs[1],
              result_ref: boundArgs[2],
            });
          } else if (sql.includes('INSERT INTO memory_items')) {
            mockDbData.memory_items.push({
              id: boundArgs[0],
              memory_type: boundArgs[1],
              scope: boundArgs[2],
              content: boundArgs[3],
              source: boundArgs[4],
              confidence: boundArgs[5],
            });
          } else if (sql.includes('INSERT INTO worker_snapshots')) {
            mockDbData.worker_snapshots.push({
              worker_id: boundArgs[0],
              version: boundArgs[1],
              capabilities_json: boundArgs[2],
              allowed_tools_json: boundArgs[3],
            });
          } else if (sql.includes('INSERT INTO worker_runs')) {
            mockDbData.worker_runs.push({
              id: boundArgs[0],
              run_id: boundArgs[1],
              worker_id: boundArgs[2],
              status: boundArgs[4],
            });
          } else if (sql.includes('INSERT INTO tool_events')) {
            mockDbData.tool_events.push({
              id: boundArgs[0],
              run_id: boundArgs[1],
              worker_id: boundArgs[2],
              tool_name: boundArgs[3],
            });
          } else if (sql.includes('INSERT INTO research_projects')) {
            mockDbData.research_projects.push({
              id: boundArgs[0],
              question: boundArgs[1],
              scope: boundArgs[2],
            });
          } else if (sql.includes('INSERT INTO research_sources')) {
            mockDbData.research_sources.push({
              id: boundArgs[0],
              project_id: boundArgs[1],
              url: boundArgs[2],
              title: boundArgs[4],
            });
          } else if (sql.includes('INSERT INTO research_findings')) {
            mockDbData.research_findings.push({
              id: boundArgs[0],
              project_id: boundArgs[1],
              finding: boundArgs[2],
            });
          } else if (sql.includes('INSERT INTO capability_gaps')) {
            mockDbData.capability_gaps.push({
              id: boundArgs[0],
              area: boundArgs[1],
              observed_gap: boundArgs[2],
              status: boundArgs[6],
            });
          } else if (sql.includes('UPDATE capability_gaps SET status = ?')) {
            const gap = mockDbData.capability_gaps.find(
              (g) => g.id === boundArgs[6]
            );
            if (gap) gap.status = boundArgs[0];
          } else if (sql.includes('INSERT INTO eval_suites')) {
            mockDbData.eval_suites.push({
              id: boundArgs[0],
              name: boundArgs[1],
              version: boundArgs[2],
              purpose: boundArgs[3],
            });
          } else if (sql.includes('INSERT INTO eval_cases')) {
            mockDbData.eval_cases.push({
              id: boundArgs[0],
              suite_id: boundArgs[1],
              input_ref: boundArgs[2],
              expected_behaviour: boundArgs[3],
            });
          } else if (sql.includes('INSERT INTO eval_runs')) {
            mockDbData.eval_runs.push({
              id: boundArgs[0],
              suite_id: boundArgs[1],
              candidate_version: boundArgs[2],
              baseline_version: boundArgs[3],
              status: boundArgs[5],
            });
          } else if (sql.includes('INSERT INTO eval_results')) {
            mockDbData.eval_results.push({
              id: boundArgs[0],
              eval_run_id: boundArgs[1],
              case_id: boundArgs[2],
              score: boundArgs[3],
              passed: boundArgs[4],
            });
          } else if (sql.includes('UPDATE eval_runs SET status = ?')) {
            const run = mockDbData.eval_runs.find((r) => r.id === boundArgs[2]);
            if (run) run.status = boundArgs[0];
          } else if (sql.includes('INSERT INTO artifacts')) {
            mockDbData.artifacts.push({
              id: boundArgs[0],
              r2_key: boundArgs[1],
              environment: boundArgs[2],
              artifact_type: boundArgs[3],
              scope: boundArgs[4],
              file_name: boundArgs[6],
              size_bytes: boundArgs[8],
              checksum_sha256: boundArgs[9],
              status: 'active',
            });
          } else if (sql.includes("UPDATE artifacts SET status = 'deleted'")) {
            const art = mockDbData.artifacts.find(
              (a) => a.r2_key === boundArgs[1]
            );
            if (art) art.status = 'deleted';
          } else if (sql.includes('INSERT INTO upgrade_proposals')) {
            mockDbData.upgrade_proposals.push({
              id: boundArgs[0],
              title: boundArgs[1],
              problem: boundArgs[2],
              design: boundArgs[3],
              status: 'draft',
            });
          } else if (sql.includes('UPDATE upgrade_proposals SET status = ?')) {
            const prop = mockDbData.upgrade_proposals.find(
              (p) => p.id === boundArgs[2]
            );
            if (prop) prop.status = boundArgs[0];
          } else if (sql.includes('INSERT INTO approval_events')) {
            mockDbData.approval_events.push({
              id: boundArgs[0],
              proposal_id: boundArgs[1],
              actor: 'owner',
              decision: boundArgs[3],
              note: boundArgs[4],
            });
          } else if (sql.includes('INSERT INTO audit_events')) {
            mockDbData.audit_events.push({
              id: boundArgs[0],
              actor: boundArgs[1],
              action: boundArgs[2],
            });
          } else if (sql.includes('INSERT INTO verified_lessons')) {
            mockDbData.verified_lessons.push({
              id: boundArgs[0],
              candidate_id: boundArgs[1],
              lesson: boundArgs[2],
              verification_summary: boundArgs[3],
            });
          } else if (sql.includes('UPDATE candidate_lessons SET status = ?')) {
            const cand = mockDbData.candidate_lessons.find(
              (c) => c.id === boundArgs[1]
            );
            if (cand) cand.status = boundArgs[0];
          }
          return { success: true };
        },
      };
      return stmt;
    };

    const mockDb: any = {
      prepare: mockPrepare,
      batch: async (stmts: any[]) => {
        for (const s of stmts) {
          await s.run();
        }
        return [];
      },
    };

    const mockArtifacts: any = {
      put: async (key: string, data: ArrayBuffer | Uint8Array, opts?: any) => {
        const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
        r2Objects.set(key, {
          body: bytes,
          httpMetadata: opts?.httpMetadata,
          customMetadata: opts?.customMetadata,
        });
      },
      get: async (key: string) => {
        const obj = r2Objects.get(key);
        if (!obj) return null;
        return {
          body: obj.body,
          size: obj.body.byteLength,
          httpEtag: '"mock-etag"',
          httpMetadata: obj.httpMetadata,
          customMetadata: obj.customMetadata,
        };
      },
      delete: async (key: string) => {
        r2Objects.delete(key);
      },
    };

    mockEnv = {
      DB: mockDb,
      ARTIFACTS: mockArtifacts,
      ENVIRONMENT: 'dev',
      ACCESS_CLIENT_ID: '4ba61411-4c06-4d15-9c47-fd5a6d023a98',
      ACCESS_CLIENT_SECRET: 'test-secret-value-for-unit-test',
    };
  });

  const authedHeaders = {
    'CF-Access-Client-Id': '4ba61411-4c06-4d15-9c47-fd5a6d023a98',
    'CF-Access-Client-Secret': 'test-secret-value-for-unit-test',
    'Content-Type': 'application/json',
  };

  describe('1. Health & Security Boundary (A-03)', () => {
    it('returns minimal health info without authentication', async () => {
      const req = new Request('https://cofounder-data.ruhvi.in/v1/health');
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('healthy');
      expect(json.data.environment).toBe('dev');
      expect(json.data.timestamp).toBeDefined();
    });

    it('rejects protected routes when authentication is missing (401)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/workers/snapshot'
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects forged JWT assertion headers without valid signature/tokens (401)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/workers/snapshot',
        {
          headers: { 'Cf-Access-Jwt-Assertion': 'fake.jwt.token' },
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(401);
    });

    it('allows protected access with valid service tokens (200)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/workers/snapshot',
        {
          headers: authedHeaders,
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
    });
  });

  describe('2. Idempotency & Memory Management (A-01, A-04)', () => {
    it('persists explicit memory and enforces idempotency replay', async () => {
      const payload = {
        content: 'Check wholesale gold rates before publishing',
        memory_type: 'user_instruction',
        scope: 'global',
      };

      const req1 = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/explicit',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'Idempotency-Key': 'idem_mem_test_123',
          },
          body: JSON.stringify(payload),
        }
      );

      const res1 = await worker.fetch(req1, mockEnv);
      expect(res1.status).toBe(200);
      const json1 = await res1.json();
      expect(json1.success).toBe(true);
      expect(json1.data.content).toBe(payload.content);
      const initialId = json1.data.id;

      // Duplicate request with exact same idempotency key
      const req2 = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/explicit',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'Idempotency-Key': 'idem_mem_test_123',
          },
          body: JSON.stringify(payload),
        }
      );

      const res2 = await worker.fetch(req2, mockEnv);
      expect(res2.status).toBe(200);
      const json2 = await res2.json();
      expect(json2.replayed).toBe(true);
      expect(json2.data.id).toBe(initialId);
      // Ensure only 1 record created in DB
      expect(mockDbData.memory_items.length).toBe(1);
    });

    it('enforces scope authorization: rejects scope=all without owner role (403) (RSI-GAP-002)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/search?scope=all',
        {
          method: 'GET',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'worker',
          },
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error.message).toContain('Cross-scope search');
    });

    it('permits scope=all for authorized owner role (RSI-GAP-002)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/search?scope=all',
        {
          method: 'GET',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'owner',
          },
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it('rejects candidate lesson promotion if caller is not evaluator or owner (403) (RSI-GAP-003)', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/verify',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'worker',
          },
          body: JSON.stringify({
            candidate_id: 'cand-1',
            eval_run_id: 'run-1',
            verification_summary: 'Self certified summary',
          }),
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(403);
    });

    it('rejects candidate promotion if evaluation run does not exist or failed (400) (RSI-GAP-003)', async () => {
      mockDbData.candidate_lessons.push({
        id: 'cand-failed',
        lesson: 'Use aggressive discounting',
        status: 'pending',
      });

      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/verify',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'evaluator',
          },
          body: JSON.stringify({
            candidate_id: 'cand-failed',
            eval_run_id: 'run-non-existent',
            verification_summary: 'Evaluation completed',
            passing_tests_count: 5,
            counterexamples_reviewed: true,
          }),
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.message).toContain('Evaluation run does not exist');
    });

    it('rejects candidate promotion if it contradicts active owner instruction (409) (RSI-GAP-003)', async () => {
      mockDbData.memory_items.push({
        id: 'mem-rule-1',
        memory_type: 'user_instruction',
        scope: 'global',
        content: 'Always prefer free and open-source tools',
        status: 'active',
        priority: 5,
      });

      mockDbData.candidate_lessons.push({
        id: 'cand-conflict',
        lesson: 'Use paid tools for marketing',
        status: 'pending',
      });

      mockDbData.eval_runs.push({
        id: 'run-passed-1',
        suite_id: 'suite-1',
        candidate_version: 'v1',
        status: 'passed',
      });

      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/verify',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'evaluator',
          },
          body: JSON.stringify({
            candidate_id: 'cand-conflict',
            eval_run_id: 'run-passed-1',
            verification_summary: 'Evaluation passed',
            passing_tests_count: 5,
            counterexamples_reviewed: true,
          }),
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(409);
      const json = await res.json();
      expect(json.error.message).toContain(
        'conflicts with active owner instruction'
      );
    });

    it('promotes candidate to verified lesson when backed by passed eval run and authorized evaluator (RSI-GAP-003)', async () => {
      mockDbData.candidate_lessons.push({
        id: 'cand-valid',
        lesson: 'Cache catalog listings for 60 seconds to reduce latency',
        status: 'pending',
      });

      mockDbData.eval_runs.push({
        id: 'run-passed-2',
        suite_id: 'suite-1',
        candidate_version: 'v2',
        status: 'passed',
      });

      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/memory/verify',
        {
          method: 'POST',
          headers: {
            ...authedHeaders,
            'X-Caller-Role': 'evaluator',
          },
          body: JSON.stringify({
            candidate_id: 'cand-valid',
            eval_run_id: 'run-passed-2',
            verification_summary: '100% pass on synthetic latency suite',
            passing_tests_count: 10,
            counterexamples_reviewed: true,
          }),
        }
      );
      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.status).toBe('verified');
      expect(mockDbData.verified_lessons.length).toBe(1);
    });
  });

  describe('3. Telemetry & Worker Snapshots (A-09, A-10)', () => {
    it('syncs worker snapshots from registry', async () => {
      const req = new Request(
        'https://cofounder-data.ruhvi.in/v1/workers/snapshot/sync',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            snapshots: [
              {
                worker_id: 'product_catalog_worker',
                version: '1.0.0',
                capabilities: ['catalog_search', 'pricing_compute'],
                allowed_tools: ['db_query', 'gemini_vision'],
              },
            ],
          }),
        }
      );

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.data.synced_count).toBe(1);
      expect(mockDbData.worker_snapshots.length).toBe(1);
    });

    it('records worker run lifecycle and tool events', async () => {
      const runReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/worker-runs',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            run_id: 'run_123',
            worker_id: 'product_catalog_worker',
            status: 'completed',
            attempt: 1,
          }),
        }
      );
      const runRes = await worker.fetch(runReq, mockEnv);
      expect(runRes.status).toBe(200);

      const toolReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/tool-events',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            run_id: 'run_123',
            worker_id: 'product_catalog_worker',
            tool_name: 'supabase_products_query',
            success: true,
            latency_ms: 45,
          }),
        }
      );
      const toolRes = await worker.fetch(toolReq, mockEnv);
      expect(toolRes.status).toBe(200);
      expect(mockDbData.worker_runs.length).toBe(1);
      expect(mockDbData.tool_events.length).toBe(1);
    });
  });

  describe('4. Research Sources & Capability Gaps (A-06, A-08)', () => {
    it('persists research sources along with findings and allows retrieval', async () => {
      const req = new Request('https://cofounder-data.ruhvi.in/v1/research', {
        method: 'POST',
        headers: authedHeaders,
        body: JSON.stringify({
          question: 'How to optimize Next.js server actions latency?',
          sources: [
            {
              url: 'https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations',
              title: 'Server Actions Documentation',
            },
          ],
          findings: [
            {
              finding: 'Use optimistic updates for instantaneous feedback',
              confidence: 0.95,
            },
          ],
        }),
      });

      const res = await worker.fetch(req, mockEnv);
      expect(res.status).toBe(200);
      const json = await res.json();
      const pId = json.data.project_id;

      expect(mockDbData.research_sources.length).toBe(1);
      expect(mockDbData.research_findings.length).toBe(1);

      // Verify GET /v1/research/:id
      const getReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/research/${pId}`,
        {
          headers: authedHeaders,
        }
      );
      const getRes = await worker.fetch(getReq, mockEnv);
      expect(getRes.status).toBe(200);
      const getJson = await getRes.json();
      expect(getJson.data.sources.length).toBe(1);
      expect(getJson.data.findings.length).toBe(1);
    });

    it('manages capability gap lifecycle and validates status transitions', async () => {
      // 1. Create gap
      const createReq = new Request('https://cofounder-data.ruhvi.in/v1/gaps', {
        method: 'POST',
        headers: authedHeaders,
        body: JSON.stringify({
          title: 'Missing automated load test suite',
          description: 'Need stress tests for checkout peak traffic',
          impact: 'high',
        }),
      });
      const createRes = await worker.fetch(createReq, mockEnv);
      expect(createRes.status).toBe(200);
      const createJson = await createRes.json();
      const gapId = createJson.data.id;

      // 2. Reject invalid status transition
      const badReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/gaps/${gapId}`,
        {
          method: 'PATCH',
          headers: authedHeaders,
          body: JSON.stringify({ status: 'unsupported_status' }),
        }
      );
      const badRes = await worker.fetch(badReq, mockEnv);
      expect(badRes.status).toBe(400);

      // 3. Accept valid transition to under_research
      const patchReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/gaps/${gapId}`,
        {
          method: 'PATCH',
          headers: authedHeaders,
          body: JSON.stringify({ status: 'under_research' }),
        }
      );
      const patchRes = await worker.fetch(patchReq, mockEnv);
      expect(patchRes.status).toBe(200);
      const patchJson = await patchRes.json();
      expect(patchJson.data.status).toBe('under_research');
    });
  });

  describe('5. Evaluation API Completeness (A-07)', () => {
    it('manages evaluation suite, cases, runs, and results', async () => {
      // 1. Create suite
      const suiteReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/evaluations/suites',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            id: 'suite_gold_pricing',
            name: 'Gold Pricing Accuracy Suite',
            purpose: 'Verifies real-time rate calculation',
          }),
        }
      );
      const suiteRes = await worker.fetch(suiteReq, mockEnv);
      expect(suiteRes.status).toBe(200);

      // 2. Add test case
      const caseReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/evaluations/suites/suite_gold_pricing/cases',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            input_ref: 'rate:24k:10g',
            expected_behaviour:
              'Returns accurate price within +/- 0.1% tolerance',
          }),
        }
      );
      const caseRes = await worker.fetch(caseReq, mockEnv);
      expect(caseRes.status).toBe(200);

      // 3. Start evaluation run
      const runReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/evaluations/runs',
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            suite_id: 'suite_gold_pricing',
            candidate_version: 'v2.1.0',
          }),
        }
      );
      const runRes = await worker.fetch(runReq, mockEnv);
      expect(runRes.status).toBe(200);
      const runJson = await runRes.json();
      const runId = runJson.data.id;

      // 4. Record result
      const resReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/evaluations/runs/${runId}/results`,
        {
          method: 'POST',
          headers: authedHeaders,
          body: JSON.stringify({
            results: [{ case_id: 'case_1', score: 1.0, passed: true }],
          }),
        }
      );
      const resRes = await worker.fetch(resReq, mockEnv);
      expect(resRes.status).toBe(200);

      // 5. Close run
      const closeReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/evaluations/runs/${runId}`,
        {
          method: 'PATCH',
          headers: authedHeaders,
          body: JSON.stringify({ status: 'passed' }),
        }
      );
      const closeRes = await worker.fetch(closeReq, mockEnv);
      expect(closeRes.status).toBe(200);
      const closeJson = await closeRes.json();
      expect(closeJson.data.status).toBe('passed');
    });
  });

  describe('6. Real R2 Artifacts Storage & Isolation (A-11, A-12, A-18)', () => {
    it('uploads artifact with environment prefix, checks metadata, and downloads exact bytes', async () => {
      const artifactContent =
        '{"report": "Weekly AI Co-Founder Performance Analysis"}';
      const key = 'reports/2026-11-08/perf-summary.json';

      // 1. Upload artifact
      const uploadReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/artifacts/upload?key=${encodeURIComponent(key)}&content_type=application/json`,
        {
          method: 'POST',
          headers: authedHeaders,
          body: artifactContent,
        }
      );
      const uploadRes = await worker.fetch(uploadReq, mockEnv);
      expect(uploadRes.status).toBe(200);
      const uploadJson = await uploadRes.json();
      expect(uploadJson.success).toBe(true);
      // Environment isolation: Dev environment must prefix with dev/
      expect(uploadJson.data.r2_key).toBe(`dev/${key}`);
      expect(uploadJson.data.checksum_sha256).toBeDefined();

      // 2. Check metadata
      const metaReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/artifacts/metadata?key=${encodeURIComponent(key)}`,
        { headers: authedHeaders }
      );
      const metaRes = await worker.fetch(metaReq, mockEnv);
      expect(metaRes.status).toBe(200);
      const metaJson = await metaRes.json();
      expect(metaJson.data.r2_key).toBe(`dev/${key}`);
      expect(metaJson.data.status).toBe('active');

      // 3. Download artifact
      const downloadReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/artifacts/download?key=${encodeURIComponent(key)}`,
        { headers: authedHeaders }
      );
      const downloadRes = await worker.fetch(downloadReq, mockEnv);
      expect(downloadRes.status).toBe(200);
      const text = await downloadRes.text();
      expect(text).toBe(artifactContent);

      // 4. Delete artifact
      const deleteReq = new Request(
        `https://cofounder-data.ruhvi.in/v1/artifacts?key=${encodeURIComponent(key)}`,
        { method: 'DELETE', headers: authedHeaders }
      );
      const deleteRes = await worker.fetch(deleteReq, mockEnv);
      expect(deleteRes.status).toBe(200);
      const deleteJson = await deleteRes.json();
      expect(deleteJson.data.status).toBe('deleted');
    });

    it('rejects oversized artifact upload > 25MB (413)', async () => {
      // Mock large body length
      const largeBuffer = new Uint8Array(26 * 1024 * 1024);
      const uploadReq = new Request(
        'https://cofounder-data.ruhvi.in/v1/artifacts/upload?key=huge.bin',
        {
          method: 'POST',
          headers: authedHeaders,
          body: largeBuffer,
        }
      );
      const uploadRes = await worker.fetch(uploadReq, mockEnv);
      expect(uploadRes.status).toBe(413);
      const json = await uploadRes.json();
      expect(json.error.code).toBe('PAYLOAD_TOO_LARGE');
    });
  });
});
