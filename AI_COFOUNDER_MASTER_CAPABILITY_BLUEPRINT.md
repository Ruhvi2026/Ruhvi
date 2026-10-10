# AI CO-FOUNDER — MASTER CAPABILITY BLUEPRINT

**Document:** `AI_COFOUNDER_MASTER_CAPABILITY_BLUEPRINT.md`
**Phase:** 0 — Master Capability Audit
**Created:** 2026-10-11
**Status:** VERIFIED BASELINE
**Evidence Source:** Direct source-code inspection of `Ruhvi2026/Ruhvi` on branch `main` @ commit `f734ec5`

> This document is the **authoritative capability registry** for the Ruhvi AI Co-Founder.
> Every entry is grounded in actual source code. Nothing is assumed from prior documentation.

---

## AUDIT METHODOLOGY

All classifications are based on direct inspection of:
- `src/lib/ai/co-founder/` (all modules)
- `src/app/api/admin/co-founder/` (all API routes)
- `src/app/co-founder/` (UI pages)
- `src/components/co-founder/` (UI components)
- `src/lib/ai/co-founder/workers/` (all 12 workers + marketing co-workers)
- `src/lib/ai/` (providers, tools, browser, mcp-auth, knowledge)
- Test files in `__tests__/`

**Classification Legend:**

| Code | Meaning |
|---|---|
| IMPLEMENTED | Code exists, logic is functional, directly verified |
| PARTIAL | Code exists but has gaps, limitations, or missing connections |
| MISSING | No implementation found; only referenced in system prompt or docs |
| BROKEN | Implementation exists but is known-incorrect or unreachable |
| NEEDS_VERIFY | Implementation exists but runtime correctness requires live testing |
| FUTURE | Explicitly reserved for a later phase |
| NOT_REQUIRED | Out of scope for Ruhvi use case |

---

## 1. BRAIN / CONTEXT CONSTRUCTION

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| System prompt construction | IMPLEMENTED | `brain.ts:getCoFounderSystemPrompt()` | Assembles dynamic knowledge + memory + proactive signals |
| Context prioritization model | IMPLEMENTED | `brain.ts` comment: 1-Current prompt 2-Tool results 3-Live DB 4-Memories 5-Brand rules | All 5 priorities defined and injected |
| Live DB snapshot in prompt | IMPLEMENTED | `brain.ts:38` calls `buildKnowledgeContext()` from `knowledge.ts` | |
| Long-term memory injection | IMPLEMENTED | `brain.ts:45` calls `getRelevantMemories()` | Fetches top 5 memories into system prompt |
| Proactive signals in prompt | IMPLEMENTED | `brain.ts:50` calls `getActiveProactiveSignals(3)` | Top 3 signals injected into prompt |
| Voice / text mode adaptation | IMPLEMENTED | `brain.ts:82-89` conditional blocks for channel | Different instructions, max-token limits |
| Bengali / Banglish / Hindi language | IMPLEMENTED | `brain.ts:102-130` | Detailed multilingual phonics instructions in system prompt |
| Business knowledge constants | IMPLEMENTED | `knowledge.ts` + `RUHVI_BUSINESS_KNOWLEDGE` | Brand tagline, shipping, craft details |
| User role awareness | IMPLEMENTED | `brain.ts:74` userId/userRole passed into prompt | |
| Session goal injection | IMPLEMENTED | `brain.ts:38` uses `sessionGoal` as knowledge context query | |
| Reasoning self-correction | MISSING | Not implemented in any source module | LLM relies on prompt instructions only |
| Structured context budget management | PARTIAL | Max 5 memories, max 3 signals - hardcoded limits | No dynamic token budget |

---

## 2. TOOL DECLARATIONS

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Tool declarations array | IMPLEMENTED | `brain.ts:182-623` - `CO_FOUNDER_TOOL_DECLARATIONS` (24 tools) | All tools have name, description, parameters |
| Tool schemas (typed parameters) | IMPLEMENTED | All 24 tools have `type: 'OBJECT'` with typed properties | |
| Required field marking | IMPLEMENTED | Several tools mark `required: [...]` fields | |

**Declared Tools (24):**
1. `get_store_metrics` / `get_sales_analytics`
2. `get_orders`
3. `get_inventory_levels`
4. `get_support_tickets`
5. `get_proactive_signals`
6. `get_pending_approvals`
7. `submit_approval_decision`
8. `execute_approved_action`
9. `get_repository_architecture`
10. `inspect_recent_errors`
11. `review_code_snippet`
12. `record_outcome_feedback`
13. `get_outcome_analytics`
14. `browse_website`
15. `get_business_context`
16. `run_business_intelligence_scan`
17. `investigate_root_cause`
18. `formulate_strategy`
19. `generate_action_plan`
20. `execute_action_plan`
21. `dispatch_worker_task`
22. `get_worker_statuses`

**Extended tools in tool-bridge only (NOT in LLM schema):**
`acknowledge_proactive_signal`, `audit_seo_health`, `get_competitors`, `add_competitor`, `dispatch_marketing_coworker`, `get_marketing_coworker_statuses`, `toggle_marketing_coworker`, `trigger_media_processing_job`, `get_media_job_status`, `publish_ad_campaign`

> **GAP:** These extended tools are reachable via `/tools/execute` but not declared in the LLM schema. The LLM cannot autonomously call them.

---

## 3. TOOL EXECUTOR (TOOL BRIDGE)

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Central tool execution function | IMPLEMENTED | `tool-bridge.ts:executeCoFounderTool()` - 700-line switch dispatch | |
| Permission validation before execution | IMPLEMENTED | `tool-bridge.ts:65` - `assertToolPermission()` called first | |
| Supabase service client | IMPLEMENTED | `tool-bridge.ts:75` - `getServiceClient()` | |
| Error handling per-tool | IMPLEMENTED | All branches wrapped in try/catch | |
| Voice-ready summaries | IMPLEMENTED | Every tool branch returns `summaryForVoice` string | |
| Tool result normalization | IMPLEMENTED | `ToolExecutionResult`: `{toolName, success, data, error, summaryForVoice}` | |
| Approval-required tools gated | IMPLEMENTED | `execute_approved_action` requires prior approval record | |
| Timeout handling | MISSING | No `Promise.race()` or timeout wrappers on individual tool calls | DB calls can hang indefinitely |
| Retry logic per tool | MISSING | No retry on tool failure | Single attempt only |
| Tool cancellation | MISSING | No AbortController or cancellation signal support | |

---

## 4. ITERATIVE REASONING LOOP (AUTONOMOUS TOOL-CALLING)

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| LLM -> Tool -> Result -> LLM loop | **MISSING** | Chat route sends ONE message, receives ONE response. No loop. | **Most critical gap.** |
| Tool call detection from LLM output | MISSING | Chat route does NOT parse LLM output for tool calls | |
| Multi-turn tool execution | MISSING | Chat route: single call, single response | |
| Maximum iteration guard | MISSING | No loop, so no guard exists yet | |
| Loop safety (infinite loop prevention) | MISSING | N/A - no loop exists | |
| Auto-browse pre-injection (URL detection) | IMPLEMENTED | `chat/route.ts:63-99` - regex URL + intent detection | Partial loop simulation: browser result injected into system prompt |
| Manual tool execution via `/tools/execute` | IMPLEMENTED | `api/admin/co-founder/tools/execute/route.ts` | User-driven, not LLM-autonomous |

> **CRITICAL FINDING:** The chat route does NOT implement an agentic loop. The `CO_FOUNDER_TOOL_DECLARATIONS` in `brain.ts` are never passed to the Gemini/Anthropic/OpenAI SDK calls as actual function schemas. The tool declarations exist as documentation/context but are not wired for autonomous LLM function-calling. All tool execution is either: (1) Pre-injected (URL browsing), or (2) Manually triggered via `/tools/execute`.

---

## 5. PROVIDER ARCHITECTURE

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Multi-provider fallback chain | IMPLEMENTED | `chat/route.ts:186-537` | |
| Gemini (primary) | IMPLEMENTED | `chat/route.ts:212-286` - tries 5 Gemini models | |
| DeepSeek | IMPLEMENTED | `chat/route.ts:291-339` | |
| Custom Gateway (OpenAI-compatible) | IMPLEMENTED | `chat/route.ts:344-419` - includes SSRF protection | |
| OpenAI | IMPLEMENTED | `chat/route.ts:424-475` | |
| Anthropic Claude | IMPLEMENTED | `chat/route.ts:480-528` | |
| OpenRouter | PARTIAL | `src/lib/ai/providers/openrouter.ts` exists but NOT in chat fallback chain | Unreachable from co-founder chat |
| DB-configured provider priority | IMPLEMENTED | `settings` table `ai_providers` key drives sort order | |
| Model selection from DB | IMPLEMENTED | `coFounderConfig.model` from `ai_features.co_founder` settings | |
| Provider failover reporting | IMPLEMENTED | Returns `fallbackUsed: true` when not primary provider | |
| Streaming responses | MISSING | All providers use blocking `await` calls | No SSE/streaming to UI |
| Rate limit handling | MISSING | No rate-limit detection or exponential backoff | |

---

## 6. WORKER SYSTEM

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Worker registry | IMPLEMENTED | `workers/registry.ts` - `WorkerRegistry` class, all 12 workers registered | |
| Worker dispatcher | IMPLEMENTED | `workers/dispatcher.ts:dispatchWorkerTask()` | |
| Keyword-based routing | IMPLEMENTED | `registry.ts:59-186` - `findWorkerForTask()` uses keyword matching | |
| Human-in-the-loop gating | IMPLEMENTED | `dispatcher.ts:53-74` - if `requiredApproval=true`, creates approval request | |
| Worker 1: Analytics and Performance | IMPLEMENTED | `worker-1-analytics.ts` | |
| Worker 2: Marketing | IMPLEMENTED | `worker-2-marketing.ts` + `workers/marketing/` sub-system | |
| Worker 3: SEO | IMPLEMENTED | `worker-3-seo.ts` | |
| Worker 4: Product | IMPLEMENTED | `worker-4-product.ts` | |
| Worker 5: Competitor Research | IMPLEMENTED | `worker-5-competitor.ts` | |
| Worker 6: Sales and Conversion | IMPLEMENTED | `worker-6-sales.ts` | |
| Worker 7: Customer Support | IMPLEMENTED | `worker-7-support.ts` | |
| Worker 8: Content/Blog | IMPLEMENTED | `worker-8-content.ts` | |
| Worker 9: Inventory | IMPLEMENTED | `worker-9-inventory.ts` | |
| Worker 10: Review and Feedback | IMPLEMENTED | `worker-10-review.ts` | |
| Worker 11: Execution | IMPLEMENTED | `worker-11-execution.ts` | Strict approval required |
| Worker 12: Monitoring and Verification | IMPLEMENTED | `worker-12-monitoring.ts` | |
| Worker state truthfulness | NEEDS_VERIFY | `dispatcher.ts:131` hardcodes `status: 'ACTIVE_AND_VERIFIED'` for all workers | Status is never dynamically computed |
| Worker execution monitoring | PARTIAL | `worker-12-monitoring.ts` exists but no real-time tracking | Workers are fire-and-forget |
| Worker dependency ordering | MISSING | No dependency graph between workers | |
| Parallel worker execution | MISSING | Workers run sequentially, one at a time | |
| Marketing Co-workers (6) | IMPLEMENTED | `workers/marketing/` - strategy, ads-execution, creative-media, email, influencer, social-media | 3 enabled, 3 production-only disabled |

---

## 7. PLANNING SYSTEM

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Action plan generation | IMPLEMENTED | `action-planner.ts:generateActionPlanFromStrategy()` | |
| Action plan storage | IMPLEMENTED | `action-planner.ts:saveActionPlan()` -> `co_founder_action_plans` table | |
| Action plan execution to Task Manager | IMPLEMENTED | `action-planner.ts:executeActionPlanToTaskManager()` -> `tasks` table | |
| Strategy formulation | IMPLEMENTED | `strategy-engine.ts:formulateStrategicSolution()` | |
| Root cause analysis | IMPLEMENTED | `root-cause.ts:performRootCauseAnalysis()` | 6 issue types |
| Task dependencies | MISSING | Action plans have tasks but no dependency ordering | |
| Task assignment to specific staff | PARTIAL | Takes `staffUserId` but fallback is null UUID | |

---

## 8. EXECUTION ENGINE

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Approved action executor | IMPLEMENTED | `action-engine.ts:executeApprovedBusinessAction()` | |
| Permission validation before execution | IMPLEMENTED | `action-engine.ts` calls `assertToolPermission()` | |
| Audit logging on execution | IMPLEMENTED | `action-engine.ts` calls `logAuditEvent()` | |
| Target entity validation | IMPLEMENTED | `action-engine.ts:validateTargetEntity()` | Checks DB before mutating |
| Execution status tracking | PARTIAL | `ActionStatus` type exists but not persisted after response | |
| Action type coverage | NEEDS_VERIFY | Supported action types need verification | |

---

## 9. APPROVAL SYSTEM

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Approval request creation | IMPLEMENTED | `approvals.ts:createApprovalRequest()` -> `co_founder_approvals` table | |
| Idempotency key (duplicate prevention) | IMPLEMENTED | `approvals.ts:133` - hash of `actionType + payload` | |
| Approval review (approve/reject/revoke) | IMPLEMENTED | `approvals.ts:reviewApproval()` | |
| Approval expiration | IMPLEMENTED | `approvals.ts:208` - expired approvals auto-blocked | |
| Audit logging on decision | IMPLEMENTED | `approvals.ts:243` calls `logAuditEvent()` | |
| Pending approvals listing | IMPLEMENTED | `approvals.ts:getPendingApprovals()` | |
| Voice-formatted approval | IMPLEMENTED | `approvals.ts:formatApprovalForVoice()` | |
| Chat-formatted approval | IMPLEMENTED | `approvals.ts:formatApprovalForChat()` | |
| Recommendation creation | IMPLEMENTED | `approvals.ts:createRecommendation()` -> `co_founder_recommendations` | |
| UI approval interface | NEEDS_VERIFY | API exists; UI rendering needs inspection | |

---

## 10. MEMORY SYSTEM

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Memory read | IMPLEMENTED | `memory.ts:getRelevantMemories()` -> `co_founder_memories` table | |
| Memory write | IMPLEMENTED | `memory.ts:writeCoFounderMemory()` - upsert with superseding | |
| Memory correction | IMPLEMENTED | `memory.ts:correctCoFounderMemory()` | |
| Memory categories | IMPLEMENTED | 6 categories: strategic_goal, business_preference, operational_rule, correction, decision, general | |
| Memory confidence scoring | IMPLEMENTED | `confidence` field stored (0.0-1.0) | |
| Memory source tracking | IMPLEMENTED | user_explicit, session_inference, system, correction | |
| Memory superseding | IMPLEMENTED | `memory.ts:119` - old memory marked is_active=false | |
| Memory expiration | MISSING | No TTL or automatic expiration mechanism | |
| Semantic/vector retrieval | MISSING | Only recency + active filter - no embedding similarity | |
| Contradiction detection | MISSING | No logic to detect conflicting memories | |
| Automatic memory extraction | MISSING | No session -> memory extraction pipeline | Must be written explicitly |
| Memory relevance scoring | PARTIAL | Only ordered by `created_at DESC` - no relevance ranking | |

---

## 11. PROACTIVE INTELLIGENCE

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Signal detection engine | IMPLEMENTED | `proactive.ts:scanProactiveSignals()` | Detects 5 signal types |
| Revenue anomaly detection | IMPLEMENTED | `proactive.ts:74-105` - triggers on >=25% revenue drop | |
| High cancellation detection | IMPLEMENTED | `proactive.ts:108-131` - triggers on >=20% rate | |
| Low inventory signal | IMPLEMENTED | `proactive.ts:134-153` | |
| Urgent support tickets signal | IMPLEMENTED | `proactive.ts:156-178` | |
| Strategic goal follow-up signal | IMPLEMENTED | `proactive.ts:181-207` | |
| Signal deduplication (fingerprinting) | IMPLEMENTED | `proactive.ts:224-271` - cooldown window check | |
| Signal persistence (DB) | IMPLEMENTED | `co_founder_signals` table | |
| Signal acknowledgement | IMPLEMENTED | `proactive.ts:acknowledgeSignal()` | |
| Admin notification dispatch | IMPLEMENTED | `proactive.ts:477-503` - inserts into `notifications` table | |
| Proactive cron job | IMPLEMENTED | `api/cron/co-founder/proactive/route.ts` | |
| Executive advisor briefing | IMPLEMENTED | `proactive.ts:generateExecutiveAdvisorBriefing()` | |
| Competitor movement detection | MISSING | No automated competitor monitoring | |
| SEO signal detection | MISSING | No automated SEO regression alerting | |
| Conversion drop detection | MISSING | No funnel drop signal | |
| Marketing opportunity detection | MISSING | Not in proactive scan | |

---

## 12. VOICE / MULTIMODAL

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Voice mode adaptation (system prompt) | IMPLEMENTED | `brain.ts` - voice vs text content instructions | |
| LiveKit integration (token/session) | IMPLEMENTED | `api/admin/co-founder/token/route.ts`, `livekit-usage/route.ts` | |
| Voice transcript window | IMPLEMENTED | `components/co-founder/VoiceTranscriptWindow.tsx` | |
| Live voice visualizer | IMPLEMENTED | `components/co-founder/LiveVoiceVisualizer.tsx` | |
| Spoken Bengali phonics | IMPLEMENTED | `brain.ts:112-130` - colloquial Bengali voice instructions | |
| Banglish romanized mode | IMPLEMENTED | `brain.ts:114-118` - via `voiceStyle='banglish'` | |
| Voice-ready summaries from all tools | IMPLEMENTED | All tools return `summaryForVoice` in tool-bridge | |
| Voice-formatted approvals | IMPLEMENTED | `approvals.ts:formatApprovalForVoice()` | |
| Gemini Live real-time voice | NEEDS_VERIFY | Token endpoint exists; full wire-up needs UI inspection | |
| Image understanding | MISSING | No image upload or vision API integration | |
| Screenshot analysis | PARTIAL | Playwright captures screenshots but not passed to vision model | |
| Product image analysis | MISSING | No catalog image intelligence | |

---

## 13. SECURITY / RBAC

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Admin-only access gate | IMPLEMENTED | All routes call `requireAdmin()` | |
| Tool permission matrix | IMPLEMENTED | `mcp-auth.ts:assertToolPermission()` called in tool-bridge | |
| Scope-based tool access | IMPLEMENTED | `getUserScopes()` called in `/tools/execute` route | |
| Approval required for high-impact writes | IMPLEMENTED | Action engine validates approval record | |
| SSRF protection (custom gateway) | IMPLEMENTED | `chat/route.ts:360` calls `assertSafeOutboundUrl()` | |
| Audit logging (approval decisions) | IMPLEMENTED | `logAuditEvent()` in approvals and action engine | |
| Secret handling (API keys) | IMPLEMENTED | Keys resolved via `resolveEffectiveApiKey()` | |
| Tool rate limiting | MISSING | No rate limit on `/tools/execute` | |
| Tool audit logging (all calls) | MISSING | Only approval decisions are logged | |
| Granular feature-level RBAC | NEEDS_VERIFY | `requireAdmin()` everywhere but granular RBAC needs verification | |

---

## 14. BUSINESS INTELLIGENCE

| Capability | Status | Evidence | Gap / Note |
|---|---|---|---|
| Store analytics (7d/30d KPIs) | IMPLEMENTED | `analytics.ts:getStoreAnalytics()` | Revenue, orders, AOV, cancellations, support, inventory |
| Anomaly detection (revenue) | IMPLEMENTED | `analytics.ts` comparisons with baseline | |
| Business intelligence scan | IMPLEMENTED | `business-intelligence.ts:runBusinessIntelligenceScan()` | Problems, risks, opportunities, metric trends |
| 360-degree business context | IMPLEMENTED | `business-context.ts:getHolisticBusinessContext()` | |
| Root cause analysis | IMPLEMENTED | `root-cause.ts` - 6 issue types | |
| Strategy formulation | IMPLEMENTED | `strategy-engine.ts:formulateStrategicSolution()` | |
| SEO health audit | IMPLEMENTED | `seo-health.ts:auditCatalogSeoHealth()` | |
| Competitor tracking | IMPLEMENTED | `competitors.ts` - add/analyze/list | |
| Outcome analytics | IMPLEMENTED | `outcomes.ts:getOutcomeAnalytics()` | |
| Outcome feedback recording | IMPLEMENTED | `outcomes.ts:recordUserFeedback()` | |
| Engineering/error diagnostics | IMPLEMENTED | `engineering.ts` - architecture, recent errors, code review | |
| Real-time product/catalog BI | PARTIAL | Basic stock queries only; no velocity or trend analysis per product | |
| Marketing ROI analytics | MISSING | No campaign ROI data integration | |
| Customer LTV / cohort analytics | MISSING | No LTV or cohort analysis modules | |
| Profitability / unit economics | MISSING | No cost-side data integration | |

---

## 15. ARCHITECTURE GAPS SUMMARY

### CRITICAL - Phase 1 Target
1. **No agentic tool-calling loop** - Chat route never passes tool declarations to LLM and never executes tool calls from LLM output. System is a sophisticated chatbot, not an autonomous agent.
2. **Tool declarations not wired to SDK** - `CO_FOUNDER_TOOL_DECLARATIONS` is defined but never passed to any provider as actual function/tool schemas.
3. **No streaming** - All LLM calls are blocking non-streaming; long responses block the UI.

### HIGH - Phase 2-3 Target
4. **Worker status truthfulness** - All workers permanently return `ACTIVE_AND_VERIFIED`. Real execution states are never tracked.
5. **No automatic memory extraction** - System cannot learn from conversations automatically.
6. **No semantic memory retrieval** - Memory is only sorted by recency; no embedding-based relevance.
7. **Tool rate limiting absent** - No rate limits on any co-founder API route.

### MEDIUM - Phase 4-6 Target
8. **Incomplete proactive signal coverage** - Only 5 signal types; competitor, SEO, conversion signals missing.
9. **No real-time worker status** - Worker execution is fire-and-forget; no real execution state machine.
10. **OpenRouter provider unreachable** - `openrouter.ts` exists but not in the fallback chain.

---

## 16. DATABASE TABLES CONFIRMED IN USE

- `co_founder_memories`
- `co_founder_signals`
- `co_founder_approvals`
- `co_founder_recommendations`
- `co_founder_action_plans`
- `orders`, `products`, `support_tickets`, `users`, `notifications`, `tasks`, `settings`

---

*Blueprint Version: 1.0 | Phase 0 | Baseline established 2026-10-11*
*Next update: After Phase 1 completion*
