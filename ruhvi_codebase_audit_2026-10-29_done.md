# Ruhvi — Codebase Implementation & Gap Audit

**Review date:** 29 October 2026  
**Repository:** https://github.com/Ruhvi2026/Ruhvi  
**Branch reviewed:** `main`  
**Latest inspected commit:** `7e67c4b60b6fb86f7a65c5c414a40cf5b98a849f` — portal liquid-glass styling  
**Review type:** Read-only static source audit. No code, database, environment, or production changes were made.

## 1. Executive assessment

Ruhvi has a substantial implementation: Next.js/React/TypeScript storefront and staff portals, Firebase-backed authentication with server-issued sessions, Supabase data access, checkout/payment services, AI Co-Founder modules, Business Radar, Customer 360, inventory intelligence libraries, decision simulation, QA/self-audit components, tests, and numerous SQL migrations.

However, source presence is not the same as a complete production feature. Several major capabilities are implemented as isolated libraries or UI/API shells but do not appear connected to the operational path; some state is held in per-process memory instead of durable storage; and some code paths can report simulated outcomes as though they were real. The implementation report in the repository claims all phases are complete, but the code inspection below finds material gaps that contradict treating the entire programme as fully end-to-end verified.

### Main conclusion

**Ruhvi is feature-rich, but the most important next step is hardening and integration—not adding more features.** Fix the credential and cron issues first, then make business events, anomaly/action state, self-audit findings, and QA results genuinely durable and end-to-end. Run the build and tests only after secrets and the runtime environment are safely handled.

## 2. Scope and evidence

Inspected the repository tree, latest commits, `README.md`, `package.json`, `jest.config.js`, middleware/auth/security modules, core order/payment paths, canonical intelligence modules, Business Radar/anomaly/Action Center APIs, Customer 360 service/API/UI, inventory intelligence services and operations pages, decision simulator, QA probes/synthetic transaction runner, self-audit registry/runner/store/routes/migration, cron routes/configuration, and relevant SQL migrations.

Repository tree counts observed during this review:

- 3,188 tree entries including directories; 2,493 file/blob entries.
- 126 SQL files under `supabase/migrations/`.
- 166 `.test.ts` files and 47 `.test.js` files; there are no `.test.tsx` files in the inspected tree.
- No `.github/workflows/*` files were found in the repository tree.
- One open pull request was observed: [PR #1 — wallet top-up secret/RBAC fix](https://github.com/Ruhvi2026/Ruhvi/pull/1).

**Not performed:** `npm test`, `npm run build`, lint, browser automation, live production URL tests, direct Supabase schema/history inspection, Vercel environment inspection, payment gateway testing, or Cloudinary usage-log inspection. Therefore this is a source-based audit, not a claim of runtime verification. Findings are labelled as confirmed source facts, likely risks, or verification-required items as applicable.

## 3. P0 — Immediate security and operational findings

### P0.1 — Credential-looking values in a public repo template

**Evidence:** [`.env.example`](https://github.com/Ruhvi2026/Ruhvi/blob/main/.env.example) contains literal-looking Cloudinary credentials in the chat/secondary Cloudinary section instead of placeholders. I am intentionally not reproducing those values here. Whether they are still active or have been abused is unknown from source alone.

**Risk:** anyone can inspect a public repository and try the values. If still active, the account may be exposed to unauthorized uploads/API use or other capability allowed by the keys.

**Required action:** identify the exact credentials privately, check whether they are active, rotate/revoke any real active secret, inspect relevant provider usage/activity, and review Git history for exposed values. Keep only placeholders in `.env.example`; ensure server-only credentials never use `NEXT_PUBLIC_` variables. Do not rely only on deleting values from the latest commit.

### P0.2 — Wallet RPC secret is hardcoded on `main`; proposed fix is not yet merged

**Evidence:** [`src/lib/wallet/topup.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/wallet/topup.ts) contains a hardcoded internal secret, and [`supabase/migrations/0017_wallet_program_and_rpc.sql`](https://github.com/Ruhvi2026/Ruhvi/blob/main/supabase/migrations/0017_wallet_program_and_rpc.sql) contains the matching literal in the `SECURITY DEFINER` function. [PR #1](https://github.com/Ruhvi2026/Ruhvi/pull/1) attempts to replace this with environment configuration/database role checks, but it was still open at the time of inspection.

**Risk:** this is a sensitive wallet-crediting control. A shared string in public source should not be the sole security boundary for a privileged database function.

**Required action:** rotate the exposed value if real; review the PR's database role detection and grants/revokes; test `anon`, `authenticated`, and backend `service_role` behavior in a safe environment; validate idempotency and amount/type constraints. Do not blindly merge or deploy its migration because it also collides with the current migration version numbering (see P1.1).

### P0.3 — Cron authorization fails open if `CRON_SECRET` is missing

**Evidence:** the following routes use a conditional check of the form `if (process.env.CRON_SECRET && header !== expected) reject`:

- [`/api/cron/automations`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/automations/route.ts)
- [`/api/cron/publish-blog`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/publish-blog/route.ts)
- [`/api/cron/self-audit`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/self-audit/route.ts)
- [`/api/cron/co-founder/proactive`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/co-founder/proactive/route.ts)
- [`/api/cron/co-founder/morning-briefing`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/co-founder/morning-briefing/route.ts)

If the secret is unset, the source check itself does not reject an anonymous request. Whether the production variable is set was not inspected.

**Impact:** especially important for `/api/cron/automations`, which sends abandoned-cart/win-back/birthday/anniversary emails and invokes task, blog publishing, proactive Co-Founder and briefing workflows. Repeated unauthorized calls could duplicate work or communications if the surrounding idempotency/cooldowns do not stop them.

**Required action:** fail closed when the secret is missing; reject invalid/missing authorization in production; add route-level tests for unset secret, wrong secret and correct secret; inspect duplicate-send/idempotency guards. Keep admin-trigger paths separate from cron-trigger paths.

### P0.4 — QA probe endpoint is public and probes a request-derived host

**Evidence:** [`src/app/api/qa/probes/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/qa/probes/route.ts) has no auth/RBAC/rate-limit check and derives the `baseUrl` from the incoming request URL/host. [`src/lib/qa/health-probes.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/qa/health-probes.ts) runs six GET probes against that base URL.

**Risk:** an unauthenticated caller can trigger repeated server-to-server requests. Host/header handling and deployment behavior determine whether it can be steered to an unintended host; SSRF impact is not proven, but the request-derived target is unsafe design for a public network probe.

**Required action:** authenticate this endpoint (or protect it with a dedicated cron secret), rate-limit it, take the target from an explicit allowlisted configuration, validate the host, and add network timeouts/abort handling. Avoid allowing user input to select arbitrary destinations.

### P0.5 — Co-Founder microphone can be blocked by global browser policy

**Evidence:** [`src/lib/middleware/security-headers.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/middleware/security-headers.ts) sets `Permissions-Policy: camera=(), microphone=(), ...`; [`src/app/co-founder/page.tsx`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/co-founder/page.tsx) and [`src/lib/ai/co-founder/livekit-agent.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/ai/co-founder/livekit-agent.ts) include microphone/real-time voice paths.

**Impact:** the policy conflicts with a first-party voice feature, and may stop browser microphone capture even if the UI and LiveKit code are present.

**Required action:** scope microphone permission deliberately to the site/origin that needs it (rather than globally denying it), then test mic permission, recording, interruption, playback, and fallback on real browsers. Do not open camera permission unless required.

## 4. P1 — Core integration and durability gaps

### P1.1 — Duplicate SQL migration version prefixes

Current `main` contains duplicate numeric prefixes:

- `0009`: `0009_phase9_ai_seo.sql`, `0009_seed_admin_account.sql`
- `0010`: `0010_dynamic_taxonomy.sql`, `0010_phase10_global_settings.sql`
- `0011`: `0011_phase11_ai_logs.sql`, `0011_seed_taxonomy.sql`
- `0019`: `0019_admin_firebase_uid.sql`, `0019_admin_users_rpc.sql`
- `0020`: `0020_admin_firebase_uid_fix.sql`, `0020_audit_logs.sql`
- `0031`: `0031_ai_logs_latency.sql`, `0031_fix_firebase_uid_rpcs.sql`
- `0041`: `0041_coupons_is_public.sql`, `0041_inventory_adjustments.sql`
- `0042`: `0042_homepage_cms.sql`, `0042_promotions_table.sql`
- `0043`: `0043_expand_ticket_statuses.sql`, `0043_order_event_timeline.sql`

Current `main` also contains `0114_order_call_remarks.sql`. The open wallet-fix PR adds a separate `0114_secure_wallet_topup.sql`, creating another collision if merged unchanged.

**Risk:** Supabase migration files are expected to have unique, ordered version identifiers. Duplicate prefixes can make migration history/order ambiguous or cause migration tooling failures. Production's actual migration history was not checked.

**Required action:** in a safe clone/staging project, compare migration files with `supabase_migrations.schema_migrations`, run migration list/reset/push checks, and plan a reconciled unique numbering strategy. Do not rename/replay migrations blindly against production.

### P1.2 — Self-audit findings/history are not durable in the current execution path

**Evidence:**

- [`src/lib/audit/self-audit-runner.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/audit/self-audit-runner.ts) stores the last audit runs in `runHistoryBuffer`, an in-memory array.
- [`src/lib/audit/self-audit-store.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/audit/self-audit-store.ts) stores findings in `inMemoryFindings`, a `Map`. It does not call Supabase.
- [`supabase/migrations/0117_self_audit_findings.sql`](https://github.com/Ruhvi2026/Ruhvi/blob/main/supabase/migrations/0117_self_audit_findings.sql) defines a real `self_audit_findings` table, but the inspected runtime store does not use it.
- [`src/app/api/admin/self-audit/run/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/admin/self-audit/run/route.ts) and [`src/app/api/cron/self-audit/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/cron/self-audit/route.ts) call `runSelfAuditSuite`; the inspected route/runner chain does not invoke `processAuditReportFindings` to persist report findings.

**Risk:** after a cold start/new serverless instance, run history/findings can be absent or inconsistent. The findings UI may not reflect the latest run unless another path calls the store.

**Required action:** persist run summaries and finding lifecycle in the existing database table; wire `runSelfAuditSuite` output to finding processing in a clearly tested service; use durable upsert/fingerprint deduplication; test cold starts and concurrent runs. The table migration alone is not proof of application persistence.

### P1.3 — Anomaly lifecycle state also uses a per-process Map

**Evidence:** [`src/lib/intelligence/anomaly-lifecycle.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/anomaly-lifecycle.ts) keeps `records` in an `AnomalyLifecycleRegistry` Map; `/api/anomalies` uses that singleton. Acknowledgements and resolutions update the in-memory record, not a database table in the inspected path.

**Risk:** anomaly state (open/acknowledged/resolved, occurrence count, actor attribution) can disappear between serverless instances or cold starts. In addition, the resolve path records the reason but not the resolving actor in the current registry function.

**Required action:** persist anomaly incidents/state in Postgres with unique fingerprints and validated transitions; audit who acknowledges/resolves; make concurrent reconciliations atomic.

### P1.4 — Shared Intelligence event libraries are present but key business paths do not appear wired to them

**Implemented library code:**

- [`event-contract.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/event-contract.ts)
- [`order-lifecycle.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/order-lifecycle.ts)
- [`payment-events.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/payment-events.ts)
- [`inventory-events.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/inventory-events.ts)
- [`storefront-events.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/storefront-events.ts)
- [`support-events.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/support-events.ts)
- [`idempotent-processor.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/idempotent-processor.ts)

**Integration gap observed:** the inspected critical handlers (`src/lib/orders/create-order.ts`, `src/lib/orders/finalize-phonepe-order.ts`, `src/lib/orders/finalize-paytm-order.ts`, `src/app/api/webhooks/phonepe/route.ts`, `src/app/api/webhooks/shiprocket/route.ts`, and support ticket create/update routes) do not import/call the corresponding canonical event observer/processor. `src/lib/orders/status-engine.ts` writes `order_events` directly. This is a finding about the paths inspected, not a guarantee that no caller exists anywhere else in the repository.

**Reliability issues in observer code:** order/payment observers deduplicate by `(order_id, event_type)` rather than a database-enforced unique idempotency key. That can suppress legitimate repeated event types (for example, a second payment attempt) and is vulnerable to concurrent check-then-insert races. `idempotent-processor.ts` has an in-memory fast-path; for non-order/payment event types, the generic persistence path is not a durable universal event store. Some DB writes are explicitly best-effort.

**Required action:** build a call-site map and wire each event to authoritative transitions/webhooks; enforce unique idempotency keys transactionally in the database; distinguish retries from genuinely repeated events; make failures visible rather than silently ignoring storage failure.

### P1.5 — Core financial metrics can misstate business performance

**Evidence:** [`src/lib/intelligence/metrics-service.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/metrics-service.ts) calculates metrics by fetching order rows and filtering them in TypeScript.

- `gross_sales` filters only `status !== 'pending'`, so cancelled/returned/RTO/refunded states may still be counted.
- `net_sales` excludes pending/cancelled/returned/rto_received, but can still include statuses such as `delivery_failed`, `rto_initiated`, `return_requested`/`return_approved`, or `refunded` where those status values are used.
- `paid_orders_count` counts COD orders as paid whenever the order status is not pending/cancelled; that does not necessarily mean cash was actually collected.
- Order queries are not paginated/aggregated in SQL. If results exceed the project's configured PostgREST row limit, metrics can silently undercount. Actual deployed row-limit configuration was not inspected.

**Risk:** Business Radar trends, alerts, AOV and management decisions may rely on incorrect totals.

**Required action:** define finance KPIs unambiguously against actual payment/settlement/refund/return data; use SQL aggregate queries or paginated reads; explicitly exclude synthetic/test orders; add fixtures for each status transition and partial-COD state; reconcile metrics against manually computed known datasets.

### P1.6 — Action Center simulation uses a hardcoded proposal, not the selected real action

**Evidence:** [`src/app/api/action-center/simulate/[id]/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/action-center/simulate/%5Bid%5D/route.ts) builds a stub proposal with a fixed product identifier and fixed threshold change, then runs `generateSimulationForProposal(stubProposal)`. The requested route ID is used to label the stub, not to load the actual proposed action or authoritative product data.

**Risk:** UI can show the same hypothetical result for unrelated action items. It creates misleading decision evidence. Separately, `action-executor.ts` expects `parameters.lowStockThreshold`, while the stub parameters use `newThreshold`, so the payload shapes do not align.

**Required action:** load the selected persisted action proposal by ID; validate current product/stock and scenario inputs; ensure simulator and executor share a typed canonical schema; state clearly when figures are assumptions. Keep the executor allowlist narrow.

### P1.7 — Decision simulator uses assumed sample values and has a NaN default bug

**Evidence:** [`src/app/api/intelligence/simulator/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/intelligence/simulator/route.ts) uses fixed defaults for monthly revenue, AOV, order counts, stockout losses and margin. It calls deterministic counterfactual models, not actual sales/catalog aggregation. Another engine, [`src/lib/intelligence/decision-simulator.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/decision-simulator.ts), exists separately and is not the one imported by the inspected API route.

Some optional number handling uses `Number(value) ?? default`. For `undefined`, `Number(undefined)` is `NaN`, and `NaN ?? default` remains `NaN`; numeric clamps can therefore propagate NaN for missing parameters.

**Required action:** add Zod input schemas and `Number.isFinite` parsing; connect simulations to a versioned snapshot of actual metrics when appropriate; label assumptions and confidence; merge/reconcile duplicate simulator engines only after comparing behavior and tests.

### P1.8 — Synthetic transaction runner does not execute a real transaction or rollback

**Evidence:** [`src/lib/qa/synthetic-transaction-service.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/qa/synthetic-transaction-service.ts) imports a service client but the inspected implementation has no DB insert/update/delete/RPC calls or real checkout invocation. It builds an `orderPayload` object locally, creates a fabricated synthetic order ID, and then sets `inventoryRestored = true`, `cartCleanedUp = true`, and `cleanRollback = true` in local variables. The error path also marks cleanup flags true without performing cleanup.

**Risk:** tests can report `SUCCESS` and “rollback clean” without any real data path or cleanup having been exercised. This is false confidence, not a functioning E2E checkout test.

**Required action:** either rename/document this as a pure simulation (never an E2E/rollback assertion), or implement true staging-only synthetic checkout using dedicated test identities and non-production gateways; verify persisted test marker, inventory restoration and cart cleanup through readback. Do not run it against production until its side effects and safety isolation are reviewed.

### P1.9 — Inventory intelligence services are present but not clearly connected to operations screens

**Implemented library files:** `inventory-demand-service.ts`, `stockout-risk-service.ts`, `dead-stock-service.ts`, `restock-recommendation-service.ts` and associated tests.

**Integration gap observed:** no dedicated APIs for these service outputs were found in the inspected route tree; the existing `src/app/operations/inventory/aging/page.tsx` and `src/app/operations/inventory/page.tsx` query/read inventory data directly and do not import the four intelligence services. This suggests the algorithms are library-level/partially integrated rather than a complete operational workflow.

**Required action:** verify current UX and routes first; then wire service outputs into an authenticated inventory API/UI with confidence/sample-size explanations, manager review, and no automatic stock or purchase-order writes. Avoid duplicating already-working legacy aging reports.

### P1.10 — Customer 360 privileged reads are not audit-logged in the inspected service

**Evidence:** [`src/lib/intelligence/customer-360-service.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/intelligence/customer-360-service.ts) applies role permissions and PII masking, but the inspected service does not import/call the audit logger, despite the route comment describing administrator access as audit-logged.

**Risk:** privileged access to full customer contact/order/support context may not leave the audit record expected by policy.

**Required action:** log minimum necessary access metadata for sensitive profile reads (actor, target ID, role, timestamp, reason if applicable), never copy full profile/PII into audit logs, and test the staff/manager/admin masking matrix.

## 5. P2 — Configuration, quality and maintainability

### P2.1 — Environment template does not match code variable names

- `.env.example` uses `NEXT_PUBLIC_FIREBASE_MESSSENDER_ID`; [`src/lib/firebase.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/lib/firebase.ts) reads `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`.
- `.env.example` documents `JWT_SECRET`; [`src/app/api/auth/session/route.ts`](https://github.com/Ruhvi2026/Ruhvi/blob/main/src/app/api/auth/session/route.ts) requires `SUPABASE_JWT_SECRET` to mint the application session token.

This may cause fresh setup failures or confusing login/session bugs even if deployed environments happen to have the right values. Maintain one canonical env variable inventory and add a startup configuration validation check. Do not expose actual secret values in that inventory.

### P2.2 — Test files exist, but the configured Jest pattern excludes JavaScript tests

Observed tree has 166 `*.test.ts` and 47 `*.test.js` files. `jest.config.js` `testMatch` includes only `*.test.ts` patterns, so those 47 JavaScript tests appear excluded from `npm test` unless run by another separate runner. There are no GitHub Actions workflow files in the repository, so no in-repo CI build/test gate was found.

**Required action:** decide whether JS tests are still relevant; migrate to TS or explicitly include them; run and record `npm test`, lint, build and critical Playwright smoke journeys in CI. Confirm the Jest collection count rather than treating total test files as passing coverage.

### P2.3 — Security headers need a compatibility/hardening review

CSP in `src/lib/middleware/security-headers.ts` contains `unsafe-inline` and `unsafe-eval`, with a TODO for nonce-based CSP. This is not proof of an exploitable XSS vulnerability by itself, but it weakens the policy. Plan nonce-based CSP after compatibility testing with Next.js, Firebase, analytics and current UI; do not abruptly tighten CSP and break the site.

### P2.4 — Hardcoded production Supabase URL fallbacks

`src/lib/auth/require-admin.ts` and inspected order creation code include fallback Supabase project URLs when environment configuration is absent. Missing configuration should generally fail closed rather than silently target a fixed production project. Audit all hardcoded backend URL fallbacks and replace only after verifying current deployments and test requirements.

### P2.5 — Self-audit sanitizer misses secrets embedded in primitive strings

`sanitizeFindingPayload()` in `src/lib/audit/self-audit-store.ts` returns primitive string values unchanged and primarily redacts properties whose *keys* look sensitive. A string field such as an error message may itself contain a token/secret/email/phone and bypass key-based redaction. Add conservative content-level redaction and tests using nested strings, stack traces and common credential patterns.

### P2.6 — Two proactive-analysis paths can diverge

- The legacy cron route `/api/cron/automations` calls `runProactiveCronScan()` from `src/lib/ai/co-founder/proactive.ts` and `generateDailyMorningBriefing()`.
- The newer `/api/intelligence/proactive-analysis` uses `ScheduledAnalysisController` from `src/lib/intelligence/scheduled-proactive-analysis.ts`, and `proactive-analysis-scheduler.mjs` calls that endpoint.
- The newer controller uses in-process cooldown, lock and run history.

This can lead to two different recommendation/telemetry pipelines or separate cooldown state. Determine which flow is authoritative, compare outputs, then unify or clearly assign schedules. Use a durable/distributed lock if duplicates across serverless instances matter.

## 6. Implementation-status matrix

| Capability | Source implementation found | End-to-end status from this review | Main gap |
|---|---|---|---|
| Core storefront/auth/order/payment | Yes: routes, services, auth and gateways | **Not fully runtime-verified** | Environment and checkout smoke tests not run in this audit; secure wallet path needs urgent review |
| Shared Intelligence event contract/producers | Yes | **Partial integration** | Critical checkout/payment/webhook/support paths inspected do not call canonical producers/processor; durable idempotency needs work |
| Business Radar & KPIs | Yes: library, API, admin UI, tests | **Partial** | Metric status semantics and row caps; anomaly state is in memory |
| Anomaly triage | Yes: API and lifecycle code | **Partial** | State not durable; resolve actor audit gap |
| Unified Action Center | Yes: UI and aggregation API | **Partial/read-oriented** | Simulation is stubbed; action status/proposals need durable canonical workflow |
| Approval policy/action executor | Yes: policy FSM and one allowlisted executor | **Partial** | No verified end-to-end persisted proposal→approval→execution workflow; ensure schema matches executor |
| Customer 360 | Yes: service, route, admin UI, tests | **Partial** | Privileged reads not audit-logged in inspected service; reconcile TS vs SQL identity rules |
| Inventory demand/stockout/dead-stock/restock | Yes: algorithms and tests | **Library-level / integration unproven** | Operations API/UI not wired to those service modules in inspected paths |
| QA probes | Yes: six synthetic GET probes and API | **Unsafe/incomplete** | Public endpoint; host-derived target; no visible timeout/rate limit |
| Synthetic checkout E2E | A runner module exists | **Not implemented as real E2E in current code** | No DB/checkout side effects; rollback flags are assigned, not verified |
| Decision Simulator | Yes: UI/API/pure models | **Partial/assumption-driven** | Hardcoded illustrative defaults; NaN bug; duplicate engine |
| Self-audit | Yes: registry, runner, UI, routes and SQL migration | **Partial** | Runtime store/history are process memory; runner path not wired to findings persistence |
| Co-Founder proactive/voice/tools | Substantial source implementation and tests | **Feature-rich, runtime-unverified** | Microphone policy conflict; parallel proactive flows; tool/approval chain needs E2E test |
| Deployment/test automation | Scripts/test files present | **Unverified** | No `.github/workflows` found; no build/test commands executed during this review |

## 7. Recommended fix order

### Phase 0 — Freeze scope and produce a reproducible baseline (read-only)
1. Record clean/current Git state in the working environment before anyone edits.
2. Run `npm test`, `npm run lint`, `npm run build` in a safe checked-out environment; save exact outputs. Avoid test scripts with real external side effects until reviewed.
3. Check Supabase migration list/history in a non-production or read-only manner; do not apply or rename migrations yet.
4. Verify env *presence and variable names*, not secret values.
5. Perform a controlled route smoke test against staging, not production mutations.

### Phase 1 — Remove immediate security exposure
1. Rotate/revoke any real active values exposed in `.env.example` and history.
2. Resolve wallet secret using reviewed DB role-based authorization; add amount/type/input guards and test all roles.
3. Fail-close all cron routes when secret missing.
4. Lock down `/api/qa/probes` with authorization/rate limits and a fixed target allowlist.
5. Correct the microphone policy only after confirming required origins/features.

### Phase 2 — Durable state for intelligence systems
1. Persist anomaly lifecycle state.
2. Persist self-audit run summaries and findings using the existing `self_audit_findings` table; wire the runner to findings processor.
3. Add database uniqueness/atomic upsert for canonical event idempotency keys.
4. Use shared/distributed cooldown locks for scheduled proactive execution.

### Phase 3 — Correctness and integration
1. Wire event producers into order, payment, inventory, storefront and support source-of-truth transitions.
2. Define finance metric rules and test cancellations, refunds, returns, RTO, partial COD and synthetic orders.
3. Replace hardcoded Action Center simulation with the actual action payload and a data-backed simulation snapshot.
4. Fix the NaN input handling and reconcile the duplicate simulator engines.
5. Integrate demand/stockout/dead-stock/restock services into authenticated operations endpoints only after verifying current inventory UX and data contracts.
6. Add audit logging for privileged Customer 360 views and test PII role matrix.

### Phase 4 — Real QA and controlled release
1. Clearly separate “pure calculation simulation” from “end-to-end test”.
2. Build staging-only synthetic order journeys with verified persisted artifacts and genuine cleanup checks.
3. Add browser E2E journeys for login/MFA, cart, checkout (test gateway), inventory sync, support tickets, Co-Founder mic, action approval and admin RBAC.
4. Fix migration version collisions only after reconciling migration history.
5. Add CI for test collection, unit tests, lint, build and key E2E checks; deploy with a documented rollback plan.

## 8. Safety notes

- Do not apply migrations, rotate credentials, run real checkout, send customer emails, publish blogs, change DNS, or deploy to production without an explicit approved task and a verified rollback approach.
- For exposed credentials, secret values should only be handled in the provider console/secret manager; do not paste them into an AI prompt or audit report.
- Use the current production behavior and existing feature contracts as the baseline. The goal is to close verified gaps without rebuilding working modules or breaking existing routes/buttons/APIs.

## 9. Bottom line

Ruhvi has a broad and meaningful codebase. The critical problem is uneven implementation maturity: some systems have full-looking UI and contracts but only process-local state or stubbed execution underneath. The fastest path to reliability is **security first, then durable persistence and actual call-site integration, then metrics/QA correctness, then controlled release**. Treat the repo's “100% complete” report as a claim that needs runtime evidence, not as a substitute for it.
