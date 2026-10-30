# RUHVI — Total Master Implementation Plan

**Repository:** `https://github.com/Ruhvi2026/Ruhvi`  
**Working environment:** Antigravity IDE  
**Plan type:** Evidence-led, approval-gated, one-task-per-phase implementation  
**Plan status:** Proposed roadmap only — **not** permission to modify code, database, credentials, integrations, or production  
**Prepared:** 29 October 2026  
**Source basis:** `ruhvi_codebase_audit_2026-10-29.md`, the existing `ruhvi_master_phased_implementation_plan.md`, and previously recorded storefront audit findings.  
**Explicit scope exclusions:** Payment-gateway integration, shipping/courier integration, WhatsApp/Meta integration, and adding/importing new products are outside this plan. Existing implementations may be inspected only where required to protect or regression-test adjacent functionality.

---

## 1. Mission

Improve the reliability, security, correctness, integration, observability, performance, and maintainability of the current Ruhvi project **without rebuilding it or breaking existing functionality**.

This plan is based on source-level findings, not a claim that every issue is currently present in production. Phase 01 must re-check the current repository and available runtime evidence before deciding which later tasks are genuinely required.

### Core principles

1. **Audit first.** Phase 01 is a detailed, read-only audit of the current branch and available environment evidence. It must identify what is required, already implemented and verified, unnecessary, unsafe, blocked, or needs the user's decision.
2. **Exactly one primary task per phase.** Every phase has one objective and one main deliverable. Substeps and tests are allowed only when necessary to complete or verify that one objective.
3. **No phase-count limit.** Split work into additional numbered phases whenever a separate task, dependency, migration, decision, or risk warrants it. Do not combine tasks merely to reduce phase count.
4. **Approval before every phase.** After each phase, report evidence and stop. Ask for explicit approval for the exact next phase. Approval of the plan is not implementation approval.
5. **Preserve existing behaviour.** Do not remove or silently alter working pages, buttons, routes, APIs, authentication, roles, order flows, inventory operations, customer journeys, admin/staff portals, AI tools, or visual identity.
6. **Small and reversible changes.** Prefer the smallest scoped patch; add regression tests; inspect the diff; document rollback.
7. **Source evidence beats old reports.** A file, migration, UI, test, or documentation statement does not prove end-to-end runtime behaviour. Only claim what was actually checked.
8. **No unapproved production actions.** No production DB writes/migrations, credential rotation, deployment, external messages, paid usage, or account/security setting changes without separate explicit approval for that exact action.
9. **No secret leakage.** Never print secrets into reports, logs, prompts, screenshots, commits, or generated artifacts. Use redacted names/fingerprints and approved secure channels.
10. **Do not build duplicates.** If an existing capability is working and evidence proves it, mark the phase `NOT NEEDED` and ask before proceeding.

---

## 2. Mandatory execution and approval protocol

### Before any phase

- Confirm repository, branch, latest commit, working-tree status, and any user changes.
- Read `AGENTS.md`, project instructions, package scripts, and relevant existing reports.
- Identify the single task, exact files/services likely affected, dependencies, risk, tests, acceptance criteria, and rollback.
- If uncommitted work or an unexpected diff could be overwritten, stop. Never reset, stash, discard, or overwrite user work without permission.
- If the scope depends on unavailable production/provider information, state the limitation and ask for access or an alternative. Never guess.

### After explicit approval

- Execute **only the approved phase**.
- Do not implement follow-on fixes discovered incidentally. Record them as future candidates.
- Do not broaden scope or silently change schema/API contracts.
- Run the agreed tests, inspect the full diff, and check for accidental secret/data exposure.
- Update the implementation report and phase status.
- Stop and report. Do not begin another phase automatically.

### Required end-of-phase approval gate

Use this structure in the Antigravity conversation:

> **Phase status:** PASS / PARTIAL / BLOCKED / NOT NEEDED  
> **Completed:** Phase NN — [title]  
> **Evidence:** [commands, tests, files/diff, observed results]  
> **Risks / unresolved items:** [list or “none observed within this scope”]  
> **Next proposed phase:** Phase NN+1 — [title]  
> **Approval required:** Do you explicitly approve proceeding with only Phase NN+1?  
> No work on the next phase begins until the user explicitly approves it.

A message such as “make the plan”, silence, general encouragement, or approval of a previous phase does **not** authorize the next phase.

### Phase status definitions

- **PASS:** all acceptance criteria were run and passed with evidence.
- **PARTIAL:** some criteria passed but others remain unverified or failed.
- **BLOCKED:** safe execution requires missing access, a decision, a prerequisite, or risk resolution.
- **NOT NEEDED:** the current implementation was verified to satisfy the objective, so duplicate work would be harmful. Show evidence and still ask permission before the next phase.
- **FAIL** may describe a failed test; the overall phase status should be PARTIAL or BLOCKED, with the issue documented.

---

## 3. Non-negotiable regression protection

Before and after every code-changing phase, preserve and validate the relevant existing behaviours. Phase 01 must confirm the actual critical test set.

### Critical existing journeys to protect

- Homepage, navigation, collections, product listing/detail, search, filters, wishlist, recently viewed, cart, guest and logged-in flows.
- Firebase authentication/session handling and mapping between Firebase identity and internal/Supabase customer identity.
- Account/profile, My Orders, order details, support tickets, wallet/reward balance, and permissions.
- Existing checkout/order creation and order-status handling. **This plan does not implement or redesign payment gateways.**
- Existing COD eligibility rules and guest restrictions; do not change policy unless a separate approved requirement is documented.
- Existing inventory, barcode/scan staging, manual sync, stock valuation/movement, and Operations/Admin flows.
- Admin, Operations, Orders, Support, staff roles, role-based navigation, and protected APIs.
- Existing AI Co-Founder chat, voice/microphone, memory, approved tools, human approval gates, and provider fallbacks.
- Existing Business Radar, metrics, anomalies, Action Center, Customer 360, simulator, QA probes, and self-audit pages.
- Theme, mobile responsiveness, glassmorphism/neomorphism styling, accessibility, and cross-subdomain navigation.
- SEO metadata, public content, privacy/legal pages, newsletter, and existing non-excluded integrations.

Do not use real customer messages, real payments, real shipments, or destructive production operations in test runs.

---

## 4. Findings to re-verify in Phase 01

These are audit leads, not blanket authorization to make changes. Re-check current `main` and newer commits before implementing anything.

### P0 — Security / operational safety

- `.env.example` contains credential-looking Cloudinary values rather than placeholders; validity and abuse status were not checked.
- A wallet top-up internal secret is hardcoded in source and a privileged SQL function; PR #1 attempts a fix but requires careful review and has a migration-version collision risk.
- Several cron routes use a fail-open pattern if `CRON_SECRET` is unset.
- `/api/qa/probes` appears unauthenticated, without visible rate limiting, and derives its target host from the request.
- Global `Permissions-Policy` denies microphone access while Co-Founder voice code uses microphone/real-time audio.
- Self-audit payload sanitization may redact by key but not redact secrets embedded inside strings, error messages, or stack traces.

### P1 — Database / integration / data correctness

- Duplicate SQL migration version prefixes: 0009, 0010, 0011, 0019, 0020, 0031, 0041, 0042, 0043; wallet-fix PR appears to collide with 0114 already in main. Production migration history has not been inspected.
- Canonical intelligence event observers exist, but inspected order/payment/webhook/support paths do not appear to call all relevant observers.
- Event idempotency is not consistently durable/atomic, and `(order_id, event_type)` dedupe can suppress legitimate repeated attempts.
- Business metrics may misclassify order/payment statuses and may undercount if query row limits are reached.
- Self-audit run history/findings are in process memory in the inspected path, although a database table exists.
- Anomaly lifecycle/acknowledgement/resolution is stored in a process-local Map in the inspected path; resolving-actor attribution needs verification.
- Action Center simulation uses a hardcoded proposal rather than loading the selected action.
- Decision Simulator uses assumed defaults and has a `Number(undefined)`/`NaN` validation risk; two simulator engines exist.
- Synthetic transaction runner appears to assemble local payloads and set cleanup flags without executing/verifying a real database/checkout transaction.
- Customer 360 privileged reads may lack access audit records; TypeScript/SQL identity rules and actual erasure workflow need reconciliation.
- Inventory intelligence libraries may not be wired to their operational APIs/UI.
- Two proactive-analysis/scheduler paths may diverge and use in-memory lock/cooldown/history.
- Inventory staging uses a service-role path and a unique client scan identifier; owner immutability and cross-user collision handling need proof.
- SQL/runtime schema and migration state have not been compared directly against the deployed database.

### P2 — Build, test, UX, performance, content

- The audit observed many test files but did not run tests, lint, TypeScript, build, browser automation, or live smoke tests.
- No `.github/workflows/*` CI workflows were found in the inspected repository tree.
- Co-Founder UI is very large and voice/fallback behaviour needs end-to-end verification.
- Latest liquid-glass changes and rollbacks need responsive/role/theme regression testing.
- Earlier storefront audit leads included possibly broken collection CTA destinations (`new-arrivals`, `best-sellers`, `limited`), Firebase UID/Supabase UUID mismatch affecting account/orders, two test products live, three products without images, wallet/ledger discrepancy, dummy SEO contact details, a public test blog/typo, hardcoded-empty gift-guide/offers, and an oversized `public/ruhchat-icon.png`. Re-check each item; current state may have changed. **This plan does not authorize adding/importing products.**
- Performance measurements from previous reports may be stale or estimated. Re-measure before making claims.

### Scope exclusions

The following activities are expressly outside this plan:

1. Payment-gateway integration work.
2. Shipping/courier integration work.
3. WhatsApp/Meta integration work.
4. Adding/importing new products.

Do not create phases for those activities. Do not quietly expand another phase into them. If a finding touches an excluded area, restrict work to security/regression inspection of existing code and request a new scope decision if a change would amount to integration work.

---

# 5. Master implementation phases

**Start Phase 01 only.** All later phases remain proposed until Phase 01 is complete and the user approves each next phase individually. The list is deliberately extensible; add phases whenever evidence justifies a separate task.

## Track A — Audit and baseline

### Phase 01 — Detailed current-state audit and scope validation
**Single task:** Produce a complete, evidence-backed audit of the current Ruhvi codebase and identify which proposed improvements are required, already solved, not needed, blocked, or require a decision.

**Read-only scope:**
- Check branch, commit, working tree, repo instructions, package scripts, dependency versions, environment-variable *names* (never print values), and current reports.
- Map critical customer/admin/operations/AI journeys and their route/API/service/schema dependencies.
- Inspect authentication, authorization/RBAC, Firebase-to-internal identity mapping, service-role usage, RLS, cron auth, QA endpoints, secret handling, logs and data access.
- Inventory SQL migrations, duplicate prefixes, schema references, and current migration tooling. Do not connect to production or run a migration unless separately authorized.
- Trace order lifecycle, existing payment-state/webhook handling, inventory changes, canonical intelligence events, idempotency, metrics, anomalies, Action Center, Customer 360, simulator, QA, self-audit and Co-Founder voice/tool approval.
- Re-check earlier storefront issues and UI regressions from current source; use browser/live testing only if access is available and separately approved.
- Discover tests and actual CI. Run only safe read-only commands that do not require secret-bearing production access; do not run a production write path.
- Categorize each finding by severity, confidence, evidence, impact, dependencies, effort, regression risk, verification method and rollback.
- For each roadmap candidate, decide: `REQUIRED`, `ALREADY VERIFIED`, `NOT NEEDED`, `BLOCKED`, or `USER DECISION REQUIRED`.

**Deliverable:** `RUHVI_TOTAL_IMPLEMENTATION_AUDIT_REPORT.md` and a dependency-aware backlog.  
**Acceptance criteria:** every later phase links to a verified finding or is marked conditional; duplicates are removed; excluded work is absent; no systems are modified.  
**Stop gate:** report findings and ask approval for Phase 02 only.

### Phase 02 — Establish a verified baseline test record
**Single task:** Run and record safe baseline checks that Phase 01 identifies as available.

**Scope:** Use exact repository scripts; record Node/package manager versions, command, exit code, duration and relevant output. Run type-check, lint, unit tests and build only if safe and feasible. Separate environment/setup failures from code failures. Do not fix errors in this phase.

**Done when:** a baseline report identifies passing, failing, skipped and blocked checks without claiming unrun tests passed. **Deliverable:** baseline section in `RUHVI_TOTAL_IMPLEMENTATION_REPORT.md`.

### Phase 03 — Create a critical-flow regression test map
**Single task:** Define the minimum regression suite for existing high-risk user and staff journeys.

**Scope:** Map prerequisites, test identities, environment, assertions, expected data changes and cleanup for auth, catalogue, cart, account/orders, wallet display, support, inventory, staff RBAC, Co-Founder, and intelligence dashboards. Existing checkout may be covered only through safe sandbox/mocked tests; no gateway integration work. Do not write test code in this phase.

**Done when:** each journey has explicit pass criteria and safe test boundaries.

---

## Track B — Secret and access-control safety

### Phase 04 — Replace exposed credential-looking values in the example template
**Single task:** Make `.env.example` contain placeholders only, after the audit confirms the current issue.

**Scope:** Identify variable names and references; replace credential-looking values with clearly named placeholders; preserve documentation of required variables. Do not print secrets in the report. Template cleanup does not rotate a credential.

**Done when:** a scan confirms no credential-like values remain in the template and referenced variable names remain documented.

### Phase 05 — Verify and remediate possible exposed provider credentials
**Single task:** Determine whether the credentials flagged by Phase 01 are real/active and, if confirmed, execute an approved rotation plan.

**Scope:** Requires authorized provider access and explicit approval for any revoke/rotation. Inspect activity where available; coordinate replacement and smoke tests without printing secrets. If status cannot be verified, mark BLOCKED.

**Done when:** each affected credential has a redacted status, owner, rotation/revocation evidence if approved, dependent environment list and verification result. Never rotate automatically.

### Phase 06 — Secure the wallet top-up privileged path
**Single task:** Remove reliance on a hardcoded shared secret as the wallet top-up security boundary.

**Scope:** Re-review PR #1 and current code; confirm server-only secret handling, DB function ownership, `EXECUTE` grants/revokes, role checks, amount/type constraints, wallet ledger consistency, and idempotency. Reconcile migration collision before choosing a safe migration path. Test `anon`, `authenticated`, and backend service-role behaviour in a safe environment. Do not alter payment-gateway integration.

**Done when:** unauthorized roles cannot credit wallets; authorized credits are constrained and idempotent; ledger/balance invariants and rollback are tested. Uncertain DB-role behaviour blocks the phase.

### Phase 07 — Make cron authentication fail closed
**Single task:** Ensure each protected cron route rejects requests when its required secret is missing or invalid.

**Scope:** Only routes confirmed by Phase 01; include automations, publish-blog, self-audit and Co-Founder scheduled routes where applicable. Keep admin-triggered authorization distinct from cron authorization. Test missing secret, wrong secret, correct secret and duplicate-trigger handling.

**Done when:** production-mode requests cannot run a protected job without valid auth and existing authorized schedules still work.

### Phase 08 — Secure the QA probes endpoint
**Single task:** Restrict synthetic QA probes to an authenticated and explicitly configured target.

**Scope:** Add appropriate auth/RBAC or dedicated secret, rate limits, a fixed trusted target/allowlist, timeout/abort behaviour and safe errors. Preserve existing probe meanings unless the audit proves one unsafe. Test malformed Host headers and untrusted target rejection.

**Done when:** unauthenticated callers cannot trigger probes, arbitrary targets are impossible, and authorized probes are bounded and observable.

### Phase 09 — Reconcile browser microphone policy with Co-Founder voice
**Single task:** Correct the microphone Permissions-Policy only for the first-party origin/route that requires it.

**Scope:** Keep camera denied unless the product truly requires it. Do not enable microphone globally for unrelated routes. Test permission prompt, recording, interruption, playback, denial handling and fallback on supported browsers.

**Done when:** intended voice use works without unnecessarily widening permissions elsewhere.

### Phase 10 — Harden sensitive-value redaction in audit findings
**Single task:** Prevent secret/PII values embedded inside strings from leaking into stored/displayed self-audit findings.

**Scope:** Redact content in error strings, nested values and stack traces as well as sensitive property names. Preserve diagnostic usefulness with stable redaction markers. Add tests for common token/API-key/phone/email patterns using fake values only.

**Done when:** representative nested payloads are safely redacted and useful non-sensitive diagnostic context remains.

### Phase 11 — Verify inventory scan ownership and collision safety
**Single task:** Ensure a duplicate or attacker-chosen `client_scan_id` cannot reassign or overwrite another user's staged inventory record.

**Scope:** Inspect service-role route, authenticated owner, RLS and unique constraints. Enforce immutable owner and explicit ownership checks for updates; reject conflicting identifiers. Add concurrent/cross-user tests. Preserve manual sync.

**Done when:** cross-user collisions cannot read or mutate another user's scan and normal retries remain idempotent.

---

## Track C — Database migration integrity

### Phase 12 — Produce a migration history reconciliation map
**Single task:** Determine a safe, unique migration order for current migration files and compare it with available deployed history.

**Scope:** Identify duplicate prefixes and migration dependencies, including the wallet-fix collision. Inspect deployed `supabase_migrations.schema_migrations` only with explicit access/approval; otherwise document it as unknown. Do not rename, apply, reset or replay migrations in this phase.

**Done when:** the proposed mapping distinguishes already-applied migrations, new migrations, dependency order and unknowns.

### Phase 13 — Apply the approved migration-numbering reconciliation
**Single task:** Implement the approved migration reconciliation in a safe development/staging workflow.

**Scope:** Follow Phase 12 evidence. Preserve already-applied migration identity; do not rewrite historical production migrations without a documented safe strategy. Test list/dry-run/push or equivalent against a disposable/staging database. Production migration needs separate explicit approval.

**Done when:** migration tooling recognises a unique and deterministic sequence in the approved environment, with documented rollback/forward-repair strategy.

### Phase 14 — Compare runtime TypeScript schema assumptions with SQL schema
**Single task:** Build a verified schema contract for tables and columns used by critical services.

**Scope:** Compare auth/customer IDs, orders/order events, wallet/ledger, inventory scans, intelligence events, audit findings, anomalies and action proposals. Use migrations and, if authorized, staging schema introspection. Do not modify schema in this phase.

**Done when:** mismatches, missing constraints and unresolved production-schema differences are listed with evidence.

---

## Track D — Canonical business events and idempotency

### Phase 15 — Define the canonical event contract and producer map
**Single task:** Decide authoritative event types and producer call sites for existing business transitions.

**Scope:** Map order creation/status changes, payment state changes, inventory movement, storefront actions and support-ticket lifecycle. Existing gateway/webhook code may be inspected, but do not implement or redesign payment/shipping integrations. Define payload schemas, actor/source, stable event IDs, timestamps and privacy rules.

**Done when:** every event type has a documented authoritative source and consumer; ambiguous event ownership is resolved.

### Phase 16 — Implement database-enforced idempotency for canonical events
**Single task:** Make duplicate event delivery safe under concurrent requests using durable database constraints/transactions.

**Scope:** Design an idempotency key that distinguishes retries from legitimate repeated attempts, including multiple payment attempts. Review tables/indexes before migration. Preserve legitimate repeated status events and avoid relying only on `(order_id, event_type)` checks or process-local memory. Do not silently swallow persistence errors.

**Done when:** concurrent duplicates produce one logical event, legitimate distinct events are retained, and failure handling is observable.

### Phase 17 — Wire order lifecycle producers to the canonical event processor
**Single task:** Integrate canonical event publication with existing order lifecycle at authoritative transition points.

**Scope:** Order producer integration only, not payment gateway changes. Avoid duplicate legacy `order_events` rows; define transaction boundaries and retry behaviour. Keep current order API contracts unchanged.

**Done when:** order creation and status transitions emit intended events, retries are safe, and order/customer/admin flows pass regression tests.

### Phase 18 — Wire payment-state observers to the canonical event processor
**Single task:** Connect existing payment-state transitions to canonical payment events without changing gateway integration.

**Scope:** Use existing confirmed payment status data from current services/webhooks. Do not add providers, change checkout, initiate charges/refunds, or modify gateway configuration. Preserve multiple legitimate attempts and reconcile event IDs with existing records.

**Done when:** current payment-state updates emit correctly deduplicated internal events and sandbox/mocked regression tests pass.

### Phase 19 — Wire inventory and support lifecycle producers
**Single task:** Connect existing inventory and support transitions to the canonical event system.

**Scope:** Only current internal services/routes; do not add WhatsApp/Meta or shipping integration. Verify actor attribution, safe payload fields and retry behaviour.

**Done when:** supported transitions produce traceable events without duplicate side effects and Operations/Support flows remain intact.

### Phase 20 — Make event processing failures visible and recoverable
**Single task:** Add bounded observability/retry handling for failed canonical event persistence/processing.

**Scope:** Avoid infinite retries, duplicate side effects and sensitive payload logging. Add a failed/dead-letter state only if the architecture requires it and after schema approval.

**Done when:** a failed event is visible, safely retryable and cannot falsely appear completed.

---

## Track E — Financial metrics and Business Radar

### Phase 21 — Define authoritative finance KPI semantics
**Single task:** Document and approve exact definitions for gross sales, net sales, paid orders, AOV, returns, refunds, cancellations, RTO and COD collection.

**Scope:** Use actual Ruhvi order/payment/settlement/refund fields; do not assume order status alone proves collection. Exclude synthetic/test orders explicitly. No gateway integration work.

**Done when:** each KPI has a formula, status inclusion/exclusion table, source columns, timezone rule and fixture examples.

### Phase 22 — Correct KPI calculations against approved definitions
**Single task:** Implement approved metric formulas using reliable aggregation/pagination.

**Scope:** Prefer database aggregates or bounded pagination; avoid silent row-cap undercount. Add fixtures for relevant statuses and partial/failed/returned cases. Keep dashboard response shapes compatible.

**Done when:** calculations match hand-computed fixtures and large datasets are not silently truncated.

### Phase 23 — Persist anomaly lifecycle state
**Single task:** Replace process-local anomaly lifecycle state with durable state transitions.

**Scope:** Reuse an appropriate table if possible; otherwise propose a migration separately. Persist open/acknowledged/resolved state, fingerprint, occurrence count, timestamps and actor. Use atomic transitions and concurrency-safe deduplication.

**Done when:** state survives cold starts and different instances; actor/reason audit exists; authorized anomaly UI/API behaviour is unchanged.

### Phase 24 — Connect verified anomaly signals to Business Radar
**Single task:** Wire approved, evidence-backed signals into the existing Business Radar view.

**Scope:** Only signals whose source data and KPI definitions passed prior phases. Display data freshness, severity, evidence and uncertainty. No automatic business action.

**Done when:** each displayed signal is traceable to source data and unavailable/stale inputs are shown honestly.

---

## Track F — Action Center and decision simulation

### Phase 25 — Define the canonical persisted action proposal schema
**Single task:** Establish one typed schema for Action Center proposals, simulation inputs, approvals and execution parameters.

**Scope:** Compare current UI, API, SQL and `action-executor.ts`. Include proposal ID, action type, parameters, evidence, author, status/version and approval binding. Keep the executor allowlist narrow.

**Done when:** API, UI, simulator and executor agree on one validated contract.

### Phase 26 — Make Action Center simulation load the selected real proposal
**Single task:** Replace the hardcoded simulation stub with the selected persisted proposal and verified source data.

**Scope:** Validate route ID, authorization, current product/stock values and input schema. Do not execute or apply the proposed action. Mark assumptions clearly; missing proposal/source data must return a safe result.

**Done when:** different proposals simulate their own inputs and invalid/unauthorized IDs cannot reveal or mutate data.

### Phase 27 — Fix and validate decision-simulator numeric inputs
**Single task:** Ensure all simulator inputs are validated finite numbers with safe defaults and bounds.

**Scope:** Add schema validation and `Number.isFinite` handling for missing, NaN, infinite, zero and out-of-range values. Do not alter business formulas unless required for the same input-safety task.

**Done when:** invalid/missing inputs cannot propagate NaN/Infinity into UI or reports and validation errors are understandable.

### Phase 28 — Reconcile duplicate simulator engines
**Single task:** Select one authoritative simulation engine after comparing both implementations and tests.

**Scope:** Document formula differences, callers, output contracts and compatibility requirements. Keep existing API/UI behaviour; avoid broad refactoring. Do not delete the old engine until usage and migration plan are proven.

**Done when:** one authoritative engine is chosen and duplicate paths are safely deprecated or documented without breaking imports.

### Phase 29 — Connect simulator inputs to verified business snapshots
**Single task:** Allow one approved simulator scenario to use traceable actual business metrics instead of silently relying on sample defaults.

**Scope:** Separate observed values, user-entered assumptions and model estimates. Record snapshot timestamp/source. If reliable inputs are unavailable, show “insufficient data” rather than inventing values.

**Done when:** each output is reproducible from named inputs and no assumed value is presented as actual business data.

### Phase 30 — Implement the first approved deterministic scenario model
**Single task:** Implement one scenario model selected after audit and user approval.

**Scope:** The chosen scenario may be shipping-policy economics, discount economics or inventory purchasing only if it does not perform excluded integration work or change a live policy. One scenario per phase; further scenarios require separate phases. Document formulas, assumptions and sensitivity.

**Done when:** known fixtures reproduce expected calculations and no live setting, price, stock, purchase or customer communication changes.

---

## Track G — Durable self-audit and QA

### Phase 31 — Connect self-audit runner output to finding lifecycle
**Single task:** Ensure the output of the actual self-audit run is passed through the finding-processing service.

**Scope:** Trace runner, API/cron route, report processing and store. Avoid a second competing pipeline. Keep checks read-only.

**Done when:** a run produces expected finding updates from a fixture and errors are visible; no remediation is executed.

### Phase 32 — Persist self-audit runs and findings
**Single task:** Make self-audit run history and findings durable in the approved database store.

**Scope:** Reuse `self_audit_findings` if schema and permissions are correct; design run-history storage only if needed. Add stable fingerprints, status transitions, access controls, retention and redaction. No migration without separate approval.

**Done when:** results survive process restarts, concurrent runs do not corrupt status, and authorized roles see consistent history.

### Phase 33 — Implement a real staging-only synthetic transaction test
**Single task:** Replace false rollback claims with a verifiable synthetic transaction test, or explicitly relabel the current module as simulation if real E2E is not safe/needed.

**Scope:** Choose one approach after audit and obtain approval. If implementing E2E, use staging-only identities, marked test records, no real payment or courier, explicit cleanup, and DB assertions for every side effect. A cleanup flag is true only after cleanup is verified.

**Done when:** the report distinguishes simulation from E2E; if E2E is enabled, persisted test records and cleanup are independently verified.

### Phase 34 — Make QA probe reports reflect observed evidence
**Single task:** Standardize existing QA probe output so every result reflects an observed request, timeout or failure.

**Scope:** Coordinate with Phase 08 but do not repeat endpoint security work. Include build/environment identity, timings, safe error details and explicit skipped/unavailable states. Do not claim coverage for untested flows.

**Done when:** probe status maps to observed outcomes and no fabricated success/rollback status is emitted.

### Phase 35 — Add a reproducible critical-flow browser regression suite
**Single task:** Implement the browser tests approved in Phase 03 for the highest-priority existing user journeys.

**Scope:** Use existing test infrastructure if available. Use mocks or staging; never real customer communication/payment. Assert actual outcomes rather than page load alone. Additional journey expansion gets a separate phase if distinct.

**Done when:** documented tests run reproducibly and failures identify the broken assertion.

---

## Track H — Customer 360 privacy and identity

### Phase 36 — Reconcile customer identity rules across TypeScript and SQL
**Single task:** Define one verified identity mapping contract for Firebase UID, internal customer UUID and related records.

**Scope:** Compare auth helpers, RPCs, orders, support, Customer 360 and SQL constraints. Preserve login/session contracts. Do not merge ambiguous identities automatically.

**Done when:** identity precedence, conflict handling, guest-to-account linking and authorization rules are documented with tests.

### Phase 37 — Add audited access to privileged Customer 360 reads
**Single task:** Record a privacy-safe audit event when authorized staff access a privileged Customer 360 profile.

**Scope:** Log actor, purpose/context where supported, customer reference, timestamp and result; never log full sensitive payload. Respect RBAC and retention. Limit UI changes to auditability.

**Done when:** permitted access is traceable and unauthorized reads remain denied.

### Phase 38 — Verify and plan the customer data-erasure workflow
**Single task:** Determine whether the existing data-erasure helper is connected to a complete, authorized and auditable erasure workflow.

**Scope:** Map records, retention/legal constraints, order/ledger audit obligations, files, analytics and backups. Do not irreversibly delete production data in this phase. If implementation is needed, present exact scope for a separate approved phase.

**Done when:** documented workflow distinguishes erasable data, retained records, deletion evidence and blocked/unknown systems.

---

## Track I — Inventory intelligence integration

### Phase 39 — Map inventory intelligence service-to-operations wiring
**Single task:** Identify which demand, stock-out, dead-stock and restock services are actually used by current Operations APIs/UI.

**Scope:** Trace imports, API calls, UI, data source, stock-adjustment rules and tests. Do not change inventory or add products.

**Done when:** each capability is classified as end-to-end verified, library-only, partially wired, duplicate or not needed.

### Phase 40 — Integrate SKU-level demand calculation
**Single task:** Wire or correct one verified SKU demand calculation using authoritative sales/inventory records.

**Scope:** Define sold units, returns/cancellations, date window, SKU/barcode relationship, adjustments and minimum data. Raw scan count must not be treated as demand.

**Done when:** output reconciles to test fixtures and distinguishes zero demand from missing data.

### Phase 41 — Integrate stock-out risk calculation
**Single task:** Wire or correct the existing stock-out estimate using verified sellable stock and demand.

**Scope:** Include lead time/reservations only when reliably available; show data window and confidence limits. No automatic stock updates.

**Done when:** test cases cover sparse data and edge cases; results are explainable and review-only.

### Phase 42 — Integrate slow/dead-stock detection
**Single task:** Wire or correct approved slow-stock rules in the existing Operations view.

**Scope:** Use last sale, on-hand stock, product age and reliable seasonality only. Do not auto-discount, delist or mutate inventory.

**Done when:** each finding displays its rule/evidence and has no side effects.

### Phase 43 — Integrate draft restock recommendations
**Single task:** Provide a review-only restock quantity suggestion from verified demand, stock and available lead-time data.

**Scope:** No purchase orders, supplier messages, product additions or stock changes. Missing data must be called out.

**Done when:** formulas and constraints are documented, tested and clearly presented as suggestions.

---

## Track J — AI Co-Founder reliability and human approval

### Phase 44 — Verify the real Co-Founder voice path end to end
**Single task:** Test and fix the existing microphone → session → model response → audio playback path, including browser permissions and fallback.

**Scope:** Use Phase 09 permission behaviour; inspect LiveKit/session configuration and actual failure states. Do not add a provider or change paid-provider routing in this phase. Distinguish real audio from simulated fallback markers.

**Done when:** supported browsers demonstrate actual capture and playback; fallback is visibly labelled and never represented as real live audio.

### Phase 45 — Reconcile proactive-analysis and scheduler paths
**Single task:** Select and document one authoritative proactive-analysis schedule/path, or assign non-overlapping responsibilities to existing paths.

**Scope:** Compare legacy automation/briefing and newer scheduled-analysis controller; review duplicate sends, cooldowns, in-memory locks, rate limits and provider costs. Do not send customer-facing campaigns or modify excluded integrations.

**Done when:** chosen schedule is explicit, duplicate execution is controlled and failures are observable.

### Phase 46 — Persist proactive-analysis lock, cooldown and run history
**Single task:** Make scheduling coordination durable across serverless instances if Phase 45 proves it is required.

**Scope:** Use existing DB/lock infrastructure only after audit. Use atomic locking, expiry and safe recovery; bound retries. No new scheduler service without cost/approval review.

**Done when:** concurrent instances cannot duplicate the same run beyond the approved policy and history survives cold starts.

### Phase 47 — Make Co-Founder recommendations evidence-bound
**Single task:** Ensure recommendations distinguish verified facts, hypotheses, suggestions and predictions and cite their evidence.

**Scope:** Read-only recommendation generation. Show source freshness and missing data; do not enable new write tools.

**Done when:** unsupported numbers are qualified/rejected and material factual claims are traceable to source data where available.

### Phase 48 — Verify proposal-to-approval-to-execution state machine
**Single task:** Verify and, only if needed, repair the persisted human-approval chain for one allowlisted low-risk action type.

**Scope:** Bind approval to exact payload/version, actor and timestamp; reject expired, modified or unauthorized proposals; add idempotency and audit logging. No generic shell, arbitrary SQL, unrestricted MCP writes, production deployment, refunds or campaigns. If no safe action is suitable, mark BLOCKED.

**Done when:** an unapproved or changed proposal cannot execute, and an approved action is re-authorized and verified server-side.

### Phase 49 — Verify Co-Founder memory and context accuracy
**Single task:** Validate that the existing Co-Founder uses persisted, permission-filtered context without fabricating facts or exposing unrelated customer data.

**Scope:** Check memory retrieval, stale data, tenant/role boundaries, provenance, deletion/retention and no-data behaviour. Do not redesign the whole Co-Founder UI.

**Done when:** context source/freshness is clear, access boundaries pass tests and unsupported facts are not presented as verified.

---

## Track K — Storefront correctness and content integrity

### Phase 50 — Re-audit storefront routes, CTAs and empty states
**Single task:** Verify current storefront navigation destinations and collection/content empty states against current source/live environment.

**Scope:** Re-check earlier reports for collection CTA routes and hardcoded-empty pages. Do not add products or invent collection content. List exact broken paths and the smallest safe correction before implementation.

**Done when:** every audited link has an expected destination or intentional, useful empty state.

### Phase 51 — Repair confirmed broken collection navigation
**Single task:** Fix only routes/links confirmed broken by Phase 50.

**Scope:** Preserve labels, styling, layout and unrelated navigation. Add route-level tests and ensure unknown/empty collections fail gracefully.

**Done when:** affected CTAs resolve correctly and existing links remain unchanged.

### Phase 52 — Correct customer identity mapping in account and order views
**Single task:** Fix a confirmed Firebase UID/internal UUID mismatch in the existing account/order data-access path.

**Scope:** Use Phase 36 contract. Preserve login/session and order authorization. Never query an order by an unverified identifier or expose another customer's record. No payment changes.

**Done when:** logged-in users see only their own profile/orders and guest behaviour remains as currently intended.

### Phase 53 — Reconcile wallet balance and ledger display
**Single task:** Identify and correct the source-of-truth discrepancy between displayed wallet balance and ledger records.

**Scope:** Depends on Phase 06. Use an auditable ledger-based reconciliation; never silently alter balances. Any actual financial correction requires separate explicit approval and a verified reconciliation report.

**Done when:** a known test ledger produces the expected balance and discrepancies are reported, not hidden.

### Phase 54 — Remove or isolate confirmed test-only public content
**Single task:** Ensure confirmed test products/blog entries cannot appear as public production content.

**Scope:** Verify current status first. Do not add/import products. Prefer correcting publication flags or replacing test content only with user-approved existing content. Production data edits require separate explicit approval.

**Done when:** test-only content is not presented as genuine public catalogue/editorial content and existing real content remains available.

### Phase 55 — Correct confirmed dummy SEO/contact metadata
**Single task:** Replace only verified placeholder contact/SEO details with user-approved canonical business details.

**Scope:** Do not invent phone, address, email, claims or policies. If approved values are unavailable, leave the phase BLOCKED and request them. Preserve SEO route and metadata structure.

**Done when:** published metadata is accurate and no placeholder business-contact details remain in audited scope.

### Phase 56 — Optimise confirmed oversized static image assets
**Single task:** Reduce transfer cost of specifically identified oversized asset(s) while preserving visual appearance and references.

**Scope:** Measure current size, dimensions, format and usage. Keep a fallback and verify all references. Do not replace product imagery or alter product design.

**Done when:** measured bytes improve and visual/functional regression checks pass.

---

## Track L — Performance, accessibility and UI regression

### Phase 57 — Establish a current performance baseline
**Single task:** Measure current live/preview performance with reproducible tooling.

**Scope:** Record URL, device profile, throttling, run count, date, LCP/FCP/CLS/INP/TBT where available, bundle/network findings and test limitations. Do not rely on estimated “after” values from old reports.

**Done when:** baseline measurements and raw evidence are recorded and repeatable.

### Phase 58 — Fix the single highest-impact verified performance bottleneck
**Single task:** Implement one performance fix selected from Phase 57 evidence.

**Scope:** Examples may include image delivery, font loading, code splitting, caching or rendering only if measurements identify the issue. One bottleneck per phase; no speculative broad refactor. Preserve behaviour and URLs.

**Done when:** before/after measurements use the same setup and regression tests pass. Additional bottlenecks receive separate phases.

### Phase 59 — Run responsive and theme regression checks for recent UI changes
**Single task:** Verify responsive layouts, theme tokens, dropdown/modal stacking, role-specific navigation and cross-subdomain appearance.

**Scope:** Cover mobile, tablet and desktop; preserve the Ruhvi light theme and existing glassmorphism/neomorphism design choices. Report defects before changing code.

**Done when:** current UI baseline is documented and confirmed defects have separate scoped phases.

### Phase 60 — Fix one confirmed accessibility issue
**Single task:** Correct the highest-priority accessibility issue confirmed in the audit.

**Scope:** One issue only, such as keyboard focus, accessible name, contrast or modal focus management. Do not redesign the interface.

**Done when:** the affected interaction passes the relevant keyboard/screen-reader/automated check; further issues become separate phases.

---

## Track M — CI, release validation and final verification

### Phase 61 — Add the minimum CI workflow for existing checks
**Single task:** Add a CI workflow that runs approved type-check, lint and test commands on pull requests.

**Scope:** Reuse current scripts, cache safely, avoid printing secrets and make failures actionable. Do not automatically deploy. If another CI provider is already configured outside the repo, audit it before adding GitHub Actions.

**Done when:** a test pull request shows checks running and results are visible; no production deployment is triggered.

### Phase 62 — Add dependency and secret scanning to CI
**Single task:** Add one approved, low-noise security scan workflow for dependencies and accidental secret exposure.

**Scope:** Review licensing, maintenance and false positives; never print detected secret values. A detected secret triggers a report/rotation process, not automatic revocation.

**Done when:** scans run on approved triggers and findings are actionable without exposing credentials.

### Phase 63 — Run cross-system integration and regression validation
**Single task:** Verify completed, approved changes work together across the agreed critical Ruhvi journeys.

**Scope:** Test auth/identity, catalogue/cart, account/orders, wallet read path, inventory, staff RBAC, canonical events, KPIs, anomalies, Action Center, Customer 360, simulator, QA/self-audit and Co-Founder as applicable. Use staging/mocks for risky flows. Do not deploy or change production in this phase.

**Done when:** evidence shows pass/fail/blocked status for every agreed journey, with critical regressions fixed or explicitly blocked.

### Phase 64 — Produce the final verified implementation report
**Single task:** Consolidate all phase reports into a final report distinguishing implemented, verified-existing, not-needed, blocked and outstanding work.

**Scope:** Include changed files, migrations, commands, test results, security checks, performance measurements, known limitations, introduced costs, rollback notes and production/staging status. Do not claim completion of untested or undeployed work.

**Done when:** every roadmap item has an evidence-backed final status and unresolved risks are explicit.

### Phase 65 — Perform an explicitly approved controlled production rollout
**Single task:** Deploy only the specific already-tested changes the user explicitly approves for production.

**Prerequisites:** Separate approval for this exact phase; verified deployment target; known-good release reference; migration/backup plan if applicable; rollback owner and steps; no unresolved critical security or customer/order regression.

**Scope:** Deploy only the approved commit/change set, run agreed non-destructive smoke checks and report observed results. Do not include unrelated commits, migrations, provider changes or excluded integration work. If deployment or rollback access is unavailable, stop and mark BLOCKED.

**Done when:** deployed commit/build is identified, smoke-check evidence is recorded and rollback status is truthful. Production rollout approval is never implied by approving the plan or a prior phase.

---

## 6. How to add phases safely

The phase numbers above are an initial roadmap, not a limit. Phase 01 may reveal tasks already fixed, tasks needing different order/splitting, or tasks that should not be performed.

Create a new phase whenever:
- one phase would modify two independently reviewable behaviours;
- a database migration must be isolated from application-code changes;
- a new dependency/provider/service introduces a separate cost, licensing or security decision;
- a production action requires separate authorization;
- an unexpected prerequisite or regression needs its own controlled fix.

Do not renumber completed phases. Add new phases with a unique number and update the dependency map. Never implement a phase just because it appears in this file; verify it remains needed.

## 7. Mandatory implementation report

Create and maintain `RUHVI_TOTAL_IMPLEMENTATION_REPORT.md`.

After every phase, update the relevant section with:

```text
Phase ID and title:
Date:
Status: PASS / PARTIAL / BLOCKED / NOT NEEDED
Single task:
Finding/evidence that justified the phase:
What changed (or why no change was needed):
Files changed:
Database/migration changes:
Dependencies/configuration changes:
Commands run:
Tests/checks performed:
Observed results:
Regression checks:
Security/privacy checks:
Performance/cost impact (measured or unknown):
Known issues and limitations:
Rollback/recovery notes:
Remaining work:
Next proposed phase:
Approval requested:
```

For a read-only audit phase, explicitly state that no code/database/environment/production changes were made.

## 8. Final Antigravity instruction — start with Phase 01 only

You are working in the existing Ruhvi repository. Treat this file as an approval-gated plan, not blanket permission.

**Start Phase 01 only. Do not code, refactor, apply migrations, rotate keys, deploy, or write to production.**

1. Inspect the current repository and current reports.
2. Re-verify every relevant finding in Section 4 against the latest source.
3. Inspect earlier storefront audit issues and determine their current status.
4. Identify which roadmap phases are required, already verified, unnecessary, blocked or need user decisions.
5. Produce `RUHVI_TOTAL_IMPLEMENTATION_AUDIT_REPORT.md` and a dependency-aware backlog.
6. Report exact evidence and limitations.
7. Stop and ask: **“Phase 01 audit is complete. Do you approve proceeding with only Phase 02 — Establish a verified baseline test record?”**

Do not start Phase 02 unless the user explicitly approves it. After every later phase, follow the same report → stop → ask protocol. Preserve every working existing feature; if a proposed change could break one, stop and explain the risk before proceeding.
