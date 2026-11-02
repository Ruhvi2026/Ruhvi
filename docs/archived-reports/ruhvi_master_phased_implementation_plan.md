# RUHVI — Master Phased Implementation Plan

**Project:** Ruhvi e-commerce  
**Repository:** `Ruhvi2026/Ruhvi`  
**Primary working environment:** Antigravity IDE  
**Plan type:** Evidence-led, approval-gated, one-task-per-phase implementation  
**Status:** Proposed plan — not an authorization to change code or production systems  
**Plan version:** 1.0  
**Prepared:** 26 October 2026

---

## 1. Mission

Improve Ruhvi from a collection of connected e-commerce and internal business systems into a reliable, data-aware, proactive operating system. The target capabilities include:

1. Shared Intelligence Layer and trustworthy business metrics
2. Business Radar and anomaly detection
3. A proactive, evidence-based AI Co-Founder
4. A unified Action Center
5. Customer 360 and privacy-safe personalization
6. Inventory intelligence and demand signals
7. Automated QA Guardian
8. AI Decision Simulator
9. Self-auditing architecture and integration health
10. Cross-system validation and controlled release

The purpose is **not** to rebuild existing features. First verify the current implementation. Reuse working modules and providers wherever appropriate. Implement only verified gaps that have an agreed business and technical justification.

## 2. Mandatory phase-by-phase approval protocol

These rules override any default assumption to continue working.

### 2.1 Exactly one task per phase

- Every numbered phase below has exactly **one primary task and one main deliverable**.
- Substeps and tests are permitted only when they are necessary to complete or verify that single task. They must not become extra features or unrelated refactors.
- Do not combine multiple phases because they appear easy, related, or small.
- There is no maximum number of phases. If the audit discovers a new prerequisite, security blocker, migration, test gap, or necessary decision, propose a new numbered phase and wait for approval before doing it.
- Do not silently expand the scope of a phase. Report newly discovered work separately.

### 2.2 Complete → report → stop → ask

After every phase:

1. Stop implementation immediately.
2. Provide the complete phase report in the Antigravity conversation.
3. State whether the phase is **PASS**, **PARTIAL**, **BLOCKED**, or **NOT NEEDED (verified existing capability)**.
4. Ask the user explicitly: **“Do you approve proceeding to Phase NN — [exact next-phase title]?”**
5. Do not start the next phase until the user gives clear, explicit approval for that next phase.
6. Approval applies to the next single phase only. It does not authorize later phases, deployment, production data changes, paid API usage, external communications, or any scope not stated in that phase.
7. If the user asks a question, requests changes to the report, or does not approve, remain stopped at the current gate.
8. Never claim a phase passed unless the checks were actually run and their results were observed.

If a phase proves unnecessary because the capability already exists and is verified, report the evidence, make no duplicate implementation, mark it **NOT NEEDED**, and still ask approval before moving to the next phase.

### 2.3 Protect the existing project

- Treat actual source code and observed test results as stronger evidence than documentation claims.
- Preserve current routes, APIs, authentication, RBAC, checkout, payments, inventory, customer experiences, staff portals, and working functionality.
- Do not perform broad refactors while implementing a narrow phase.
- Before editing, inspect Git status and relevant diffs. If unexpected/uncommitted work may be overwritten, stop and report it. Never reset, stash, discard, or overwrite user changes without explicit approval.
- Prefer the smallest reversible change. Add regression coverage for affected behaviour.
- Do not add a new vendor, service, database, event bus, queue, package, or recurring paid workload unless the current stack cannot reasonably satisfy the requirement and the user approves the proposal.
- Prefer the existing Next.js, Supabase/Postgres, Firebase Auth/custom JWT/RBAC, Cloudinary, PostHog, GA4, Meta CAPI, Sentry, AI routing, MCP, and Playwright capabilities where suitable. Verify they are still present and working before relying on them.
- Do not treat a service as active merely because it appears in a document.

### 2.4 Security and production safeguards

- Never print or copy secret values, API keys, access tokens, customer PII, full addresses, payment data, staff credentials, or private message content into a report.
- Read-only audit phases must remain read-only.
- Never run destructive SQL, unreviewed migrations, bulk customer/order changes, payment/refund actions, shipping actions, email/SMS broadcasts, live marketing campaigns, or external write actions as part of a normal implementation phase.
- A migration may be authored and tested in a safe environment, but do not apply it to production without a separate, explicit approval.
- Do not deploy to production, change DNS, rotate keys, alter auth providers, change payment configuration, or modify production environment variables unless an explicitly approved phase says so.
- AI recommendations must show their evidence, source, time window, assumptions, and uncertainty. Never invent business metrics or present a simulation as an actual result.
- Customer-level data must be minimized, access-controlled, and excluded from external LLM calls unless the privacy, security, and provider data-handling review explicitly authorizes a safe design.
- No self-audit, AI Co-Founder, or QA agent may silently execute a consequential action. Use allowlisted tools, role authorization, user approval, action logs, and post-action verification.

### 2.5 How to handle failures or blockers

- If a test fails, preserve the failure evidence and investigate only what is necessary for the current task.
- If fixing the failure expands beyond the current task, stop, report it, and propose a separate phase.
- If access, credentials, environment, data, or service availability is missing, mark the result as **BLOCKED/UNVERIFIED**, not PASS.
- If a recommended implementation would duplicate an existing working capability, do not build the duplicate.
- If two documents or code paths disagree, record the contradiction and use evidence to resolve it before implementation.

---

## 3. Standard execution procedure for every phase

For each phase, perform only the following phase-specific task:

1. Read its prerequisites and relevant project instructions.
2. Inspect the relevant code, configuration names, data schema, and tests before editing.
3. Verify that current work is safe to touch; report unexpected working-tree changes.
4. Define the exact in-scope paths/modules and the out-of-scope areas.
5. Make the smallest necessary implementation for the phase's one task, if implementation is required and approved.
6. Run the relevant available checks. Include exact commands and observed results; do not invent test results.
7. Review the diff for scope creep, accidental secrets, unrelated changes, and regressions.
8. Deliver the report described in Section 4.
9. Stop and ask for approval for the next single phase.

For Phase 0, which is read-only, do not create or edit project files. The task is to audit and report.

## 4. Required report after every phase

Every phase report in the Antigravity conversation must contain:

1. **Phase number and exact title**
2. **Status:** PASS / PARTIAL / BLOCKED / NOT NEEDED
3. **Single task and intended deliverable**
4. **What was inspected or changed** — exact paths/modules; never expose secret values
5. **Evidence** — source references, migrations, logs, screenshots, test names, or command outputs where useful
6. **Checks run** — exact command/check and PASS/FAIL/BLOCKED; explicitly identify checks not run
7. **Acceptance criteria** — each criterion marked PASS / FAIL / NOT VERIFIED
8. **Regression and security review**
9. **Database/integration/deployment effects** — state explicitly if none; state whether any migration was only authored, locally tested, or applied
10. **Known limitations and remaining risks**
11. **Cost/provider impact** — estimated only when evidence supports it; unknown means unknown
12. **Changed files summary** and a concise explanation of every change
13. **Recommendation** — next phase, a blocker, or a proposal for a newly needed phase
14. **Approval gate**, with this exact kind of question: “Do you approve proceeding to Phase NN — [title]? I will not start it until you approve.”

A report is required even when no code changed, when the phase is blocked, or when the result is NOT NEEDED.

---

# 5. Phased implementation sequence

## Track A — Discovery, scope, and safety foundations

### Phase 00 — Read-only capability and gap audit
**Single task:** Produce an evidence-based current-state capability and gap report for all proposed improvements.

**Scope:** Inspect project instructions and relevant documentation, then verify the actual source, routes, modules, database migrations, AI tool permissions, analytics instrumentation, and existing tests. Cover the Intelligence Layer, Business Radar, anomalies, Co-Founder, Action Center, Customer 360, inventory intelligence, QA Guardian, decision simulation, and self-audit.

**Required output:** A report that classifies each capability as implemented and verified, partially implemented, documentation-only/unverified, missing, broken/risky, or unknown. Cite exact paths and evidence. Note contradictory documentation, possible duplicated services, missing data, missing tests, and access limitations.

**Out of scope:** Any file edits, package installation, database changes, live API writes, deployments, or feature implementation.

**Done when:** All ten capability areas have evidence-based status; unknowns are clearly labelled; no claim depends only on a README statement; no project state was changed.

**Next gate:** Ask approval to begin Phase 01.

### Phase 01 — Establish the system-of-record and data-ownership map
**Single task:** Create one authoritative map of which existing system/table/API is the source of truth for each important business entity.

**Scope:** Map products/SKUs, stock, customers, carts, orders, payment status, shipment/RTO/returns, support cases, marketing events, AI health, and staff/action logs using verified code and schema. Identify read replicas, caches, analytics-only copies, and owner of each field where evidence exists.

**Required output:** A reviewable data ownership document or equivalent approved documentation change. Do not change runtime behaviour or schemas in this phase.

**Done when:** Each mapped entity has a source-of-truth designation or an explicit unresolved question; duplicated or conflicting ownership is flagged rather than guessed.

### Phase 02 — Define the business KPI dictionary
**Single task:** Define the canonical business metrics and their exact calculation rules.

**Scope:** Define metrics such as gross/net sales, paid orders, cancellation/refund/RTO rates, average order value, checkout conversion, cart abandonment, repeat customer rate, inventory turnover, stock-out rate, campaign CAC/ROAS (only where required data exists), and payment failure rate. Specify time zone, currency, status filters, exclusions, numerator/denominator, attribution window, and source of truth for each metric.

**Required output:** A KPI dictionary with verified sources, formulae, caveats, and data owners. Do not build dashboards or claim values in this phase.

**Done when:** The metrics needed for proposed recommendations are unambiguous and can be calculated from identified data, or each missing input is documented.

### Phase 03 — Map current tracking and event coverage
**Single task:** Produce a traceable event-coverage map for the existing analytics and business events.

**Scope:** Inspect PostHog, GA4, Meta Pixel/CAPI and server-side business flows. Map product view, search, wishlist, cart, checkout, order creation, payment attempt/result, dispatch, delivery, cancellation/return, support activity, inventory changes, and AI/system failures where applicable. Identify duplicate firing, client-only unreliable events, missing events, consent/privacy implications, and source mismatches.

**Required output:** Event inventory with event name, trigger, source, destination, identifiers, payload fields, current status, and test coverage. Do not add tracking in this phase.

**Done when:** Existing coverage and gaps are documented with code evidence, including events that should remain analytics-only rather than being copied into another store.

### Phase 04 — Approve the minimum-change Intelligence Layer architecture
**Single task:** Produce a technical Architecture Decision Record (ADR) for the smallest architecture that can support the agreed intelligence requirements.

**Scope:** Decide how transactional facts, behavioural analytics, aggregated metrics, anomaly findings, recommendations, and action records should interact using existing tools first. Evaluate whether a new event table, queue, read model, or scheduler is genuinely necessary. Include data flow, ownership, failure handling, cost, retention, latency needs, and alternatives rejected.

**Required output:** One architecture decision document, clearly marked proposed until the user approves it.

**Done when:** The architecture avoids unnecessary service duplication and each proposed new component has a concrete requirement, owner, and reason.

### Phase 05 — Define the privacy, authorization, and action-safety model
**Single task:** Create a permission and data-minimization contract for the proposed intelligence features.

**Scope:** Map current Firebase authentication/custom JWT/RBAC and Supabase RLS to allowed actions and data classes. Define which roles can read aggregate metrics, inspect customer-level records, view staff activity, approve AI suggestions, and execute permitted actions. Define what must never be sent to an external LLM and what needs redaction or aggregation.

**Required output:** Permission matrix, sensitive-data handling rules, and explicit prohibited actions. No authorization code change in this phase.

**Done when:** Every planned capability has a least-privilege access rule and a clear human-approval boundary.

### Phase 06 — Establish the verification and rollback baseline
**Single task:** Define a test-and-rollback matrix for the proposed work against actual existing project commands and test coverage.

**Scope:** Inspect available build, lint, type-check, unit, integration, and Playwright scripts; identify the most critical storefront, authentication, checkout, payment, order, inventory, support, and portal journeys. Record which checks can actually run in the current workspace. Define backups/rollback expectations for any later database or configuration change.

**Required output:** A baseline verification matrix with confirmed commands, known environment prerequisites, and critical regression journeys.

**Done when:** Later phases can distinguish a new regression from a pre-existing failure, and no non-existent test command is represented as available.

---

## Track B — Shared Intelligence Layer

### Phase 07 — Define the canonical business-event contract
**Single task:** Create or refine the shared typed event contract required by the approved architecture.

**Scope:** Define event identity, event type, timestamp/time zone, source, schema version, correlation/idempotency key, actor type, entity reference, minimal payload, and trace/correlation context. Use strict types and validation. Do not implement multiple event producers in this phase.

**Conditional rule:** If the audit and ADR prove an existing contract is sufficient, verify it and report NOT NEEDED rather than adding a duplicate abstraction.

**Done when:** The single contract is documented, typed, validated, privacy-reviewed, and covered by focused tests where code was changed.

### Phase 08 — Implement order-lifecycle event coverage
**Single task:** Ensure the approved internal intelligence pipeline can reliably observe the agreed order-lifecycle business events.

**Scope:** Only order events such as order created, confirmed, cancelled, fulfilled, delivered, returned, or RTO, as relevant to the real schema. Use the authoritative transactional source and avoid double-counting retries/webhooks.

**Out of scope:** Payment-specific producer changes, marketing event changes, dashboards, or production migration application.

**Done when:** Relevant order transitions create the agreed event/read signal once logically, with safe retries and tests; absent transitions are not fabricated.

### Phase 09 — Implement payment-outcome event coverage
**Single task:** Ensure payment attempts and their verified outcomes can be measured consistently for intelligence purposes.

**Scope:** Cover the existing payment gateway flow(s), including success, failure, pending, retry, and applicable partial-COD states only where supported. Reconcile webhook and browser return paths to avoid counting one transaction twice. Never perform live payments during tests.

**Done when:** Payment outcomes derive from trusted server-side state, duplicate callbacks are handled safely, and tests use mocks/sandbox fixtures where available.

### Phase 10 — Implement inventory-change event coverage
**Single task:** Ensure authoritative stock changes are observable for intelligence and audit purposes.

**Scope:** Use actual stock adjustment, order allocation, cancellation/restock, barcode/inventory sync, and stock correction flows found in the repository. Preserve SKU/barcode uniqueness rules and existing mobile sync behaviour.

**Done when:** Supported stock-changing operations can be traced to their source and are not double-counted; inventory writes remain in their existing authoritative path.

### Phase 11 — Implement storefront funnel event coverage
**Single task:** Close the agreed gaps in the customer shopping-funnel event flow.

**Scope:** Only the missing/incorrect events confirmed in Phase 03 for product discovery through cart and checkout. Respect consent settings, avoid sensitive payloads, and prevent browser/server duplicate counts.

**Done when:** Event payloads and trigger conditions match Phase 03's approved contract and tests verify the relevant funnel behaviour without changing the user-facing checkout flow.

### Phase 12 — Implement support and CRM activity event coverage
**Single task:** Make the approved support/CRM workflow events measurable without copying unnecessary customer conversation content.

**Scope:** Only lifecycle signals such as ticket opened, assigned, replied, resolved, or reopened that exist in actual flows. Avoid sending message bodies, private attachments, or unnecessary identity attributes to analytics or external LLMs.

**Done when:** Allowed support lifecycle events can be measured and reconciled without leaking the ticket contents or breaking CRM sync.

### Phase 13 — Implement AI and infrastructure health-event coverage
**Single task:** Normalize the approved AI/service health signals needed for reliability and cost monitoring.

**Scope:** Provider/model chosen, latency, failure class, retry/fallback, token/cost metadata where available, and service-level errors. Never log API keys, prompts containing private customer data, or full secrets. Reuse existing AI logs/Sentry/telemetry when sufficient.

**Done when:** The approved operational signals can be inspected consistently with secrets and personal content excluded.

### Phase 14 — Make event processing idempotent and retry-safe
**Single task:** Implement or verify duplicate prevention and recoverable failure handling for the approved intelligence-event pipeline.

**Scope:** Use idempotency keys or equivalent verified mechanisms, bounded retries, clear failure state, and safe replay where needed. A dead-letter store or queue may be added only if the approved architecture requires it.

**Done when:** Replayed callbacks/retries do not inflate business metrics, and failed ingestion can be observed and safely recovered without duplicate business mutations.

### Phase 15 — Build the shared read-only metrics service
**Single task:** Provide a single, permission-checked read interface for the approved canonical KPIs.

**Scope:** Reuse source-of-truth transactional data and existing analytics integrations where appropriate. Apply date ranges, timezone, permissions, bounded queries, and clearly defined caching. Do not build a dashboard in this phase.

**Done when:** Each exposed metric follows Phase 02's formula and authorization rules, and the service returns explicit unavailable/insufficient-data states rather than invented zeroes.

### Phase 16 — Verify metric correctness with automated tests
**Single task:** Create a focused automated test suite proving that the shared metrics calculate correctly for the defined edge cases.

**Scope:** Use synthetic fixtures for refunds, cancellations, retries, pending payments, partial COD, timezone boundaries, repeated callbacks, missing optional data, and different allowed date windows as applicable.

**Done when:** Each canonical metric has calculation tests for its relevant edge cases and failures clearly identify the incorrect formula or source. Do not alter the production data to create test fixtures.

---

## Track C — Business Radar and anomaly detection

### Phase 17 — Build the Business Radar aggregation endpoint
**Single task:** Create a permission-checked read endpoint that returns the agreed Business Radar summary using verified metrics.

**Scope:** Return KPI values, comparison windows, direction of change, freshness, and data-quality/availability flags. Severity calculation must be deterministic or explicitly documented. Do not create the UI or AI recommendations in this phase.

**Done when:** The endpoint uses the canonical metric service, bounds its queries, protects sensitive data, and has tests for unavailable and empty data.

### Phase 18 — Build the Business Radar dashboard view
**Single task:** Implement the read-only Business Radar interface in the appropriate existing portal.

**Scope:** Show critical metrics, trends, freshness, and links to relevant existing screens. Preserve the project's design language and responsive behaviour. Do not add direct data mutations or unapproved actions to cards.

**Done when:** The panel renders verified values and loading, empty, error, and permission-denied states; its cards do not imply false real-time freshness.

### Phase 19 — Define the evidence-backed recommendation format
**Single task:** Create one structured schema for business recommendations and their evidence.

**Scope:** Every recommendation needs a unique ID, category, priority, supporting metric/source, observation window, threshold/rule, explanation, uncertainty/confidence basis, suggested next step, creation/expiry time, and review state. Distinguish measured facts from hypotheses and simulations.

**Done when:** Schema validation rejects recommendations without sufficient evidence or with unsupported numeric claims, and the format is documented and tested.

### Phase 20 — Implement the initial rule-based anomaly detector
**Single task:** Implement a deterministic detector for the first user-approved, evidence-supported set of business/system anomalies.

**Scope:** Select rules only after real data availability has been confirmed—for example payment failure spikes, sudden conversion changes, unusual stock mismatch, abnormal API latency, or elevated refund/RTO rate. Use minimum sample sizes and comparison windows to reduce false alarms. Do not use an LLM as the source of numeric truth.

**Done when:** Each enabled rule has a rationale, threshold/window, minimum-data guard, tests, and a clear source metric. Unsupported rules remain disabled and documented.

### Phase 21 — Add anomaly deduplication and lifecycle handling
**Single task:** Prevent repeated anomaly detection from flooding staff with duplicate alerts.

**Scope:** Implement a stable anomaly identity and lifecycle (open, updated, acknowledged, resolved, or expired as justified), cooldown, reopen logic, and deduplication. Do not create the triage UI in this phase.

**Done when:** Repeated evaluations of the same underlying issue update the existing finding appropriately, and independent incidents remain distinct.

### Phase 22 — Build the anomaly review interface
**Single task:** Implement a staff-facing read/review interface for anomaly findings.

**Scope:** Show severity, time detected, current status, evidence, affected area, change over time, and suggested investigation. Restrict access by the approved role matrix. Do not expose automatic repair controls.

**Done when:** Staff can review and acknowledge findings under permission checks, and each state change is auditable if the implementation supports state changes.

---

## Track D — Unified Action Center

### Phase 23 — Define the unified action-item contract
**Single task:** Define one schema for alerts, anomaly findings, Co-Founder recommendations, QA failures, and self-audit findings to appear consistently in an Action Center.

**Scope:** Include source type/ID, title, priority, status, evidence link, owner/role, created/expiry timestamps, required approval type, and safe deep link. The contract must not imply all items are executable actions.

**Done when:** All required item types can be represented without losing source-of-truth ownership or bypassing source permissions.

### Phase 24 — Build the unified Action Center read API
**Single task:** Implement a role-aware API that aggregates eligible action items from existing sources.

**Scope:** Reuse their source records; avoid duplicating whole alerts or recommendations into a second database unless Phase 04 approved that design. Apply pagination, filtering, access controls, and source availability handling.

**Done when:** The API combines permitted items, preserves links to authoritative records, avoids duplicates, and degrades safely if one source is unavailable.

### Phase 25 — Build the unified Action Center interface
**Single task:** Implement the consolidated Action Center UI in the appropriate internal portal.

**Scope:** Display priority, status, evidence, and a safe route to the originating workflow. Include filters and accessible mobile/responsive layout only as needed for the single screen.

**Done when:** Staff can identify and open relevant work from one view while existing portals and their controls continue to function unchanged.

---

## Track E — Proactive AI Co-Founder

### Phase 26 — Build a permission-aware Co-Founder context assembler
**Single task:** Provide the Co-Founder with a read-only, role-aware summary of approved business context.

**Scope:** Gather only necessary canonical metrics, recent verified anomalies, inventory signals, funnel summaries, and system-health summaries. Include freshness, sources, and unavailable-data markers. Do not provide raw customer conversation content by default.

**Done when:** Context includes provenance and permission enforcement, has size/time bounds, and works safely when a data source is unavailable.

### Phase 27 — Implement evidence-bound Co-Founder recommendations
**Single task:** Make the Co-Founder generate structured, traceable recommendations from verified context.

**Scope:** Use the Phase 19 schema. Separate observations, likely explanations, suggested investigations, and predictions. Require citations/links to internal source records where possible. Do not enable write tools in this phase.

**Done when:** Recommendations cannot be marked factually supported without evidence, missing data is disclosed, and unsupported numerical claims are rejected or visibly qualified.

### Phase 28 — Add scheduled proactive analysis
**Single task:** Add a controlled scheduler/trigger for periodic read-only Co-Founder analysis.

**Scope:** Reuse an existing scheduler such as the project's established automation path if appropriate; otherwise propose a minimal option with cost and reliability estimates before use. Add rate limits, a bounded time window, failure logging, and a manual trigger if suitable.

**Out of scope:** Automatic execution of recommendations, outbound campaigns, and production writes.

**Done when:** A scheduled run can be triggered and observed safely, duplicate runs are controlled, and provider/service failures do not create endless retries or unbounded costs.

### Phase 29 — Implement the recommendation approval policy
**Single task:** Implement the approval-state and authorization policy for proposed Co-Founder actions.

**Scope:** Define proposed, approved, rejected, expired, executing, completed, and failed states where needed. Approval must be bound to a specific action payload, actor, timestamp, and relevant version so the action cannot be silently changed after approval. High-impact financial, customer-facing, security, or production actions require separate explicit approval.

**Done when:** An unapproved, expired, modified, or unauthorized proposal cannot be executed through the approved action path; audit evidence is retained without exposing secrets.

### Phase 30 — Implement a narrowly allowlisted action executor
**Single task:** Implement the first approved low-risk action execution path behind the approval policy.

**Scope:** The exact action must be selected from verified opportunities during the preceding phases and approved before this phase starts. No generic arbitrary-code tool, unrestricted MCP write access, unrestricted SQL, production deployment, payment/refund, or campaign-send capability is allowed by default. Enforce role checks, idempotency, timeouts, dry-run where applicable, and explicit allowlists.

**Done when:** Only the chosen action can execute, the authorization is rechecked server-side, execution is logged, duplicate execution is prevented, and success/failure is verified from the authoritative source.

**Important:** If no appropriately low-risk action is available, mark this phase BLOCKED and ask the user to choose or approve a narrower action instead of improvising.

---

## Track F — Customer 360 and personalization

### Phase 31 — Define privacy-safe customer identity resolution
**Single task:** Establish the rules for matching customer interactions to a single customer profile without creating incorrect identity merges.

**Scope:** Evaluate verified Firebase UID, internal customer IDs, order IDs, consented analytics identifiers, and existing schema relationships. Define conflict handling, guest-to-logged-in transitions, retention, deletion/erasure requirements, and which roles can perform lookups.

**Done when:** Identity matching has explicit precedence and uncertainty handling; ambiguous records are not automatically merged.

### Phase 32 — Build the permission-checked Customer 360 read service
**Single task:** Implement a server-side read service that assembles an authorized customer summary from existing authoritative records.

**Scope:** Include only approved fields such as order history summary, preferences explicitly provided or safely inferred, wishlist/cart state, support-ticket status, and relevant consented activity. Never expose payment credentials or unnecessary private content. Do not create the UI in this phase.

**Done when:** Authorization is enforced server-side, only required fields are returned, data-source freshness is clear, and access is covered by tests.

### Phase 33 — Build the Customer 360 timeline interface
**Single task:** Implement a role-aware timeline view for the approved customer summary.

**Scope:** Display timestamps, event type, source link, and permission-filtered summaries. Avoid full payment data, credentials, private attachment previews, and unnecessary message bodies.

**Done when:** Authorized staff can follow a customer's relevant history while unauthorized roles cannot retrieve or infer restricted records through the UI or API.

### Phase 34 — Implement privacy-safe product recommendations
**Single task:** Implement the first recommendation ranking method using approved product/customer signals.

**Scope:** Prefer simple, testable ranking and existing catalogue data before adding a new model. Respect stock availability, product relevance, explicit preferences, consent, and excluded/sensitive data. Do not make unsupported sensitive inferences about customers.

**Done when:** The ranking is explainable and tested against representative catalogue/customer fixtures, and missing data results in reasonable fallbacks rather than fabricated preferences.

---

## Track G — Inventory intelligence

### Phase 35 — Establish inventory demand metrics
**Single task:** Implement or verify a reliable SKU-level demand/sales-velocity calculation.

**Scope:** Define sold-unit treatment, returns/cancellations, date window, stock adjustments, SKU/barcode relationship, and minimum-data rule. Use authoritative order and inventory records rather than raw scan count as demand.

**Done when:** Historical demand metrics reconcile to test fixtures and clearly distinguish zero demand from missing data.

### Phase 36 — Implement stock-out risk estimation
**Single task:** Calculate a transparent stock-out estimate for eligible SKUs.

**Scope:** Use current sellable stock and the approved demand metric, with explicit treatment of low sample size, recent trend changes, lead time if reliably available, and stock reservations. Start with a deterministic baseline; show confidence limitations.

**Done when:** The result includes the assumptions/window and is validated on synthetic edge cases; it never presents a weak estimate as certainty.

### Phase 37 — Implement dead/slow-stock detection
**Single task:** Detect slow-moving or potentially dead stock using approved business rules.

**Scope:** Consider days since last sale, on-hand stock, product age, category/seasonality where reliable, and minimum observation windows. Do not automatically discount, delist, or alter stock.

**Done when:** Findings explain the rule and evidence and can be reviewed without modifying products or prices.

### Phase 38 — Implement restock recommendations
**Single task:** Generate review-only restock quantity suggestions for eligible SKUs.

**Scope:** Use demand, sellable stock, lead time and safety stock only when available and verified. Make the recommendation a draft for human review; do not submit purchase orders or mutate inventory automatically.

**Done when:** Recommendation formula and constraints are documented and tested, missing supplier/lead-time data is clearly handled, and no external purchase action occurs.

---

## Track H — Automated QA Guardian

### Phase 39 — Map critical user and staff journeys
**Single task:** Produce an agreed list of critical regression journeys and their expected outcomes.

**Scope:** Based on actual application behaviour, cover priority flows such as customer login, product browse, cart, online checkout sandbox, COD eligibility, order status, wishlist, and critical staff actions in admin/operations/orders/support. Do not create test code in this phase.

**Done when:** Each journey has prerequisites, test environment, expected outcome, risk level, and a clear rule for avoiding live payments or customer communication.

### Phase 40 — Implement the critical Playwright regression suite
**Single task:** Implement automated tests for the approved critical journeys.

**Scope:** Use existing Playwright setup and test patterns. Reuse mocks/fixtures or a safe test environment. Do not add unrelated UI redesign, architecture refactors, or tests for unapproved extra features.

**Done when:** Tests run using documented commands, important assertions verify outcomes rather than only page loading, and failure output is actionable.

### Phase 41 — Implement a post-deployment smoke-check runner
**Single task:** Add a bounded smoke-check mechanism for an approved preview/staging deployment or existing test URL.

**Scope:** Run the Phase 40 suite or a clearly defined small smoke subset after deployment. Confirm how deployment identity and environment are selected. Never target production by default without explicit approval.

**Done when:** The runner reports which build/environment it tested, handles timeout/unavailability, and does not perform destructive customer-facing operations.

### Phase 42 — Produce the QA Guardian result report and release signal
**Single task:** Convert test/smoke results into a clear, traceable QA Guardian report.

**Scope:** Summarize run time, tested build, tests passed/failed/skipped, evidence references, severity, and known blind spots. Any release-blocking rules must be explicit and based on critical-test outcomes. Do not automatically roll back or deploy in this phase.

**Done when:** The report accurately mirrors test results and does not claim coverage for untested flows; critical failures are clearly highlighted to the authorized staff.

---

## Track I — AI Decision Simulator

### Phase 43 — Implement shipping-policy scenario calculations
**Single task:** Build a deterministic simulator for one shipping-policy question using verified historical inputs.

**Scope:** Start with the chosen policy comparison, such as free-shipping threshold changes. Account for known shipping charges, order value distribution, prepaid/COD mix, cancellations/RTO treatment, and time window only where reliable data exists. Use explicit assumptions for unknown costs.

**Done when:** The simulator labels the result as an estimate, shows formula/inputs/range and missing data, has calculation tests, and does not alter the live shipping policy.

### Phase 44 — Implement discount/campaign scenario calculations
**Single task:** Build a deterministic simulator for a selected discount or campaign scenario.

**Scope:** Use verified margins, conversion/baseline sales and campaign costs only when available. Do not predict unsupported uplift as a fact. If uplift assumptions are required, present adjustable scenarios/ranges and identify them as assumptions.

**Done when:** Net impact is calculated transparently with sensitivity cases, assumptions are visible, and no campaign or price is applied or sent.

### Phase 45 — Implement inventory-purchase scenario calculations
**Single task:** Build a simulator comparing one proposed inventory restock scenario against the current position.

**Scope:** Use the approved demand and stock calculations, actual known purchase costs and lead time where available. Surface uncertainty and inventory holding/overstock risk when those costs are known; otherwise flag what is excluded.

**Done when:** The simulator calculates scenarios from traceable inputs and never creates a purchase order or changes stock.

### Phase 46 — Build the Decision Simulator interface
**Single task:** Build one interface that presents the approved scenario calculations for comparison.

**Scope:** Display current baseline, scenario inputs, outputs, assumptions, uncertainty, and date/source information. Use a distinct presentation for actual measured values versus simulated outcomes. No Apply button may mutate production settings unless a future separate approved phase implements that precise action.

**Done when:** Users can compare and understand scenarios without confusing simulated output with actual historical results; validation handles empty, invalid, or missing inputs safely.

---

## Track J — Self-auditing architecture

### Phase 47 — Define the self-audit checks registry
**Single task:** Create an explicit registry of read-only architecture, integration, configuration, security, performance, and AI-health checks.

**Scope:** Every check must specify what it inspects, its evidence source, severity, safe execution conditions, expected result, data sensitivity, and limitations. Reuse existing Sentry, telemetry, dependency and configuration tooling where appropriate. Never run arbitrary source code or expose secrets as part of a check.

**Done when:** All enabled checks are documented and allowlisted; destructive or unsupported checks are excluded.

### Phase 48 — Implement the scheduled read-only audit runner
**Single task:** Implement controlled execution of the approved self-audit checks on a schedule or approved manual trigger.

**Scope:** Use the existing automation/scheduler path if suitable. Add run bounds, timeout, rate/cost limit, permission controls, and safe failure behaviour. This runner must be read-only.

**Done when:** Only registered checks can run; execution identity, time, duration and outcome are recorded; missed or failed runs are visible.

### Phase 49 — Persist and deduplicate self-audit findings
**Single task:** Implement reliable finding storage and deduplication for the self-audit runner.

**Scope:** Preserve finding source, severity, first/last seen, fingerprint, status, evidence reference and expiry/retention. Apply access controls and avoid persisting secrets or full sensitive payloads. Use the existing data store if appropriate; any migration must follow approved safe-environment testing rules.

**Done when:** Repeated findings update the same issue when appropriate, resolved issues can reappear as new incidents under defined rules, and access/retention are tested.

### Phase 50 — Build the self-audit report view
**Single task:** Implement the interface for reviewing self-audit runs and findings.

**Scope:** Show run status, finding severity, evidence, affected module, first/last-seen timestamps, and current status. Link to source evidence safely; do not display secret values or offer automatic repair controls.

**Done when:** Authorized staff can see the system's verified health and audit history, including incomplete checks and their limitations.

### Phase 51 — Generate approval-gated remediation proposals
**Single task:** Let self-audit findings produce a proposed remediation plan without executing it.

**Scope:** Each proposal must cite the finding and source evidence, identify expected impact/risk, affected files/services, test plan, rollback plan, cost impact, and required approver. The model must be able to conclude that evidence is insufficient. No automatic code edits, deployment, key rotation, permission changes, or production writes.

**Done when:** A proposal can be reviewed and approved/rejected by an authorized user, and no remediation occurs during generation.

---

## Track K — Integrated validation and controlled rollout

### Phase 52 — Run cross-system integration and regression validation
**Single task:** Verify that the approved, implemented intelligence capabilities work together without breaking existing critical Ruhvi workflows.

**Scope:** Run the agreed regression suite and focused integration checks across metrics, Business Radar, anomaly findings, Co-Founder context/recommendations, Action Center, Customer 360 permissions, inventory signals, QA reports, decision scenarios, and self-audit as applicable. Test unavailable providers/data sources and permission boundaries. Do not deploy or alter production in this phase.

**Done when:** Results are evidence-backed, critical regressions are resolved or explicitly blocked, and the known limitations/coverage gaps are documented.

### Phase 53 — Perform an explicitly approved controlled production rollout
**Single task:** Roll out only the specific, already-tested and user-approved release scope to production.

**Prerequisites:** Separate, explicit approval for this exact rollout phase; a verified deployment target; production migration/backup plan if relevant; rollback owner/steps; no unresolved critical security or checkout regression; and a known-good release reference.

**Scope:** Deploy only the approved changes, perform the pre-agreed non-destructive smoke checks, inspect actual results, and initiate only the previously approved rollback procedure if its conditions are met. Do not silently include unrelated commits or migrations.

**Done when:** The exact release is identified, deployment and smoke-check results are reported, errors are observed for the agreed window if tooling supports it, and rollback status is truthful. If production access or safe rollback is unavailable, stop and report BLOCKED rather than improvising.

---

# 6. Phase status definitions

- **PASS:** The one task is complete and all required acceptance criteria are verified.
- **PARTIAL:** Some of the single task is complete, but one or more criteria remain unverified or failed. The report must describe the gap and ask what to do next.
- **BLOCKED:** The task cannot safely proceed because of missing access, failed prerequisites, risk, or unavailable evidence. Do not jump ahead if later phases depend on it.
- **NOT NEEDED:** The capability is already implemented and verified, and duplicate work would be harmful. Show evidence and obtain approval before the next phase.
- **FAIL:** Use within the acceptance checklist for an individual failed test/criterion. The overall phase status should still be PARTIAL or BLOCKED as appropriate.

# 7. Approval language and state tracking

At the end of each report, provide a clear gate in this format:

> **Approval required**  
> Completed: Phase NN — [current phase title]  
> Proposed next: Phase NN+1 — [next phase title]  
> **Do you explicitly approve proceeding with only Phase NN+1?**  
> Until you approve, no work on the next phase will begin.

If the user approves, acknowledge the approval and execute only the next phase. Do not interpret approval of a plan, a request to “make the roadmap,” or approval of one phase as blanket implementation approval for all phases. If the user changes the scope, update the plan proposal and request approval for the revised single phase.

# 8. Final project-level completion report

Only after all applicable phases have been individually completed and approved, produce a final master report covering:

- Features implemented versus verified as already existing versus intentionally skipped
- Architecture and data-flow changes
- Files/modules changed and relevant migrations
- Test results, commands, environments, and known untested areas
- Security/privacy/permission review
- AI/provider usage and known operating cost implications
- Performance and reliability observations where actually measured
- Deployment/rollback status
- Remaining risks and recommended future work

Do not claim the whole programme is complete when any applicable phase remains blocked, unapproved, untested, or not deployed. The final report must distinguish code completion from verified staging behaviour and verified production behaviour.

---

## Start instruction for Antigravity

Begin at **Phase 00 only**. Read this plan and the repository instructions. Run the read-only capability and gap audit. Do not edit files or implement anything. Deliver the Phase 00 report using Section 4, then stop and ask for explicit approval to proceed to Phase 01. Do not continue automatically.
