# Ruhvi Inventory — Mobile Scan & Add + Website Bulk Sync

## Master Requirement, Architecture Audit, and Phase-by-Phase Implementation Prompt for Antigravity

**Project repository:** `https://github.com/ruhvi2026/ruhvi`  
**Feature name (working title):** `Mobile Scan & Add Products`  
**Website location (proposed):** Existing **Operations** area → **Inventory Scan & Add**  
**Primary outcome:** Staff scan and enter product details on a phone, save multiple items without a mobile Sync button, and then use the website to review and sync only their own pending records into Ruhvi's real product/inventory database.

> **Important:** This document describes the desired behavior, not verified facts about the current codebase. First inspect the real repository, schema, authentication, APIs, policies, and existing product-entry workflow. Do not assume table names or invent schema fields. Convert every assumption into a verified fact or a clearly labelled open question before implementation.

---

# 1. What You Must Do First

Before opening files for implementation or changing anything, reply to the user with a concise **Requirements Baseline & Prerequisites Report**. The report must include:

1. What you understand the feature must do, using the checklist in Section 2.
2. What access and project information you need to audit it accurately (repository/workspace, existing schema/migrations/types, authentication and RLS/policies, product APIs, available test commands, and device/browser access if available).
3. Which requirements are explicit, which details can be verified by repository inspection, and which decisions may still require the user's answer.
4. A clear statement that no code, database, policy, deployment, or unrelated UI changes will be made during this initial report.
5. Ask permission to begin **Phase 0 — Read-only Architecture Audit** and then stop. Do not begin Phase 0 until the user approves it.

Do not ask the user to provide secrets, passwords, service-role keys, private tokens, or customer data. Check existing secure configuration locally where available; report variable names only, never secret values.

## Operating sequence

**Requirements Baseline → user permission → Phase 0 architecture audit → user permission → Phase 1 gap analysis and final requirements confirmation → if any critical requirements are missing, ask only the necessary questions and stop; when resolved, show the finalized requirements and ask permission for Phase 2 → implementation phases, one at a time.**

Never interpret silence, a vague response, or the mere existence of this prompt as permission to continue.

---

# 2. Current Requirements Baseline

Use this as the starting checklist. During Phase 0, verify the current project's capabilities. During Phase 1, reconcile this desired behavior with the actual codebase and ask about unresolved business decisions. Do not silently change requirements to fit an easy implementation.

## 2.1 Core workflow

- [ ] The feature is integrated into the existing Ruhvi project and uses current project conventions wherever practical.
- [ ] The website has a simple entry point in the existing **Operations** area, with a clear name such as **Inventory Scan & Add** or **Bulk Product Add**. Choose the final label with the user if the project's terminology suggests a better one.
- [ ] Staff use a mobile app/mobile-friendly experience to scan barcodes and enter product information.
- [ ] Each scan can become a separate saved record/draft. Staff can keep scanning many items in one working session—e.g. 15, 27, 35, or 80 records—without syncing each item one by one.
- [ ] There is **no Sync Now button in the mobile app**. Final product sync is initiated from the website only.
- [ ] The phone saves each item promptly and safely. A save must not wait for the user to finish an entire stock intake.
- [ ] The website displays the current authenticated staff member's own pending records. When that staff member presses **Sync Now** on the website, the system processes all of that member's eligible pending records together.
- [ ] After successful website sync, each affected record shows a clear **Synced** status and green tick on the website. The mobile screen should reflect the confirmed status when it next has a connection or refreshes.
- [ ] After the first set is synced, the staff member can scan more items. A later website sync processes only the newly pending/unprocessed records; it must not recreate or reprocess prior successful rows.
- [ ] There is no additional administrator-approval step or mandatory manager review in this requested workflow. Do not introduce one unless the user explicitly changes this requirement or an existing legally/security-critical constraint must be explained.

## 2.2 Multi-user and concurrent scanning

- [ ] Multiple staff members can scan at the same time, using separate devices or a shared device where the authentication design safely supports it.
- [ ] Staff member A's scanned records remain associated with A; staff member B's records remain associated with B. They must never get mixed up merely because both are scanning or syncing simultaneously.
- [ ] The website's default Inventory Scan & Add view shows only records owned by the currently authenticated user. Do not build an admin-only approval or sync process as a requirement.
- [ ] Website **Sync Now** processes only the current user's eligible records—not everyone else's records.
- [ ] Staff cannot read, edit, delete, or sync another staff member's staging records by changing a URL, request body, record ID, or client-side filter.
- [ ] Ownership must be enforced on the server/database side, not merely by hiding other people's rows in the UI.
- [ ] Use the authenticated identity supplied/verified by the existing auth system on the server. Never trust a `user_id` supplied only by the client as proof of ownership.
- [ ] If a shared phone is allowed, records must be assigned to the account authenticated when they were captured, not just to the physical device. Review account switching, queued records from a previous user, sign-out behavior, and offline records before approving this mode. If safe isolation cannot be guaranteed, document that separate sign-ins/devices are required.
- [ ] Each record needs a stable unique client record/scan ID, owner ID, creation time, and relevant server-side status/metadata. A device identifier may be used for diagnostics, but it must not replace user identity.
- [ ] Cross-user collisions on the same barcode/SKU must be detected and handled according to the agreed product identity and stock rules. They must not silently overwrite or merge records.

## 2.3 Mobile scan and product-entry form

After a barcode is scanned, the app must show a mobile-friendly form so the person can review the scan and enter product details before saving.

### Explicit mandatory fields

Only these three product fields are explicitly required by the user's current request:

1. **SKU** — mandatory.
2. **Weight** — mandatory; use the existing Ruhvi schema's supported unit/precision where possible and make the unit visible to the user.
3. **Purchase price / cost price** — mandatory; use the project's INR/currency and decimal precision conventions.

Do not silently add more mandatory fields. In particular, confirm during Phase 1 how a record without a captured barcode should be handled if the current schema permits manual product entry. A scanned barcode should be prefilled where available, and manual barcode entry should be available if camera scanning is unavailable or fails. Do not label barcode as an additional mandatory field without resolving the requirement against the existing product model with the user.

### Optional fields

- [ ] **Sale price** is optional and may be added later.
- [ ] The user also mentioned **“trial price”**; do not assume whether this means retail price or a separate existing field. During Phase 1, inspect the website's product form and ask the user to confirm the intended label/meaning if it remains ambiguous. Do not invent a new `trial_price`/`retail_price` column.
- [ ] Other useful product fields that already exist in the website's product-entry workflow may be exposed as optional fields on the phone, after mapping them to the actual schema and obtaining approval for any genuinely new field.
- [ ] Do not make product name, category, stock quantity, sale price, or another optional field mandatory just because the current website form does so. Report any conflict between this requirement and existing server validation in Phase 1; propose a safe reconciliation instead of weakening validation silently.
- [ ] Product-form fields must match the existing model's field meanings, accepted ranges, enum values, numeric precision, units, and validation rules wherever compatible with the explicitly stated required-field policy.
- [ ] Preserve entered values during recoverable camera, network, validation, or submission errors. Warn before discarding unsaved form changes.

### Barcode scan UX

- [ ] Camera barcode scan is available on supported phones/browsers after an explicit user action and permission grant.
- [ ] Provide manual barcode entry as a fallback for denied camera permission, unsupported camera/browser, damaged labels, or external scanners where applicable.
- [ ] Handle a repeated scanner read safely; do not create multiple local records accidentally because a camera library fires the same barcode several times.
- [ ] Provide clear **Scan**, **Stop**, **Save**, and **Cancel/Back** actions as appropriate. There is no mobile **Sync Now** action.
- [ ] After saving, give a clear confirmation and offer a quick route to scan the next item.
- [ ] Display each item’s status in plain language, for example `Saved on this device`, `Waiting to appear on website`, `Pending website sync`, `Synced`, `Failed`, or `Conflict`. Use statuses that accurately reflect the chosen architecture; do not mark a record synced just because it was saved locally or uploaded to staging.

## 2.4 Website pending table and sync

- [ ] Add a clear website page/section under the existing Operations navigation, subject to Phase 0 findings.
- [ ] The current user's page should show their records in a table, with appropriate columns derived from the confirmed schema, including as available: scan time, barcode, SKU, product name, weight, purchase price, optional sale price, status, and a safe error/conflict explanation.
- [ ] Show useful counts, such as pending items and successful items; counts must match actual records and statuses.
- [ ] Provide one website **Sync Now** button to process that user's eligible pending records as a group. Do not require a separate click for each scanned item.
- [ ] The website may allow the user to inspect/edit a pending record if approved and supported, but any edit must have clear ownership and status rules. Avoid duplicate sources of truth.
- [ ] A successful sync must show a green tick and `Synced` status per item. The green tick must only be shown after authoritative server/database success is confirmed.
- [ ] Keep failed/conflicting items visible and retryable. Do not mark the whole group as successful just because some items succeed.
- [ ] A mixed outcome should show accurate summary counts, for example `15 attempted, 12 synced, 2 failed, 1 conflict`—only using real returned results.
- [ ] The next website sync must process only eligible unsynced records. Previously successful records remain in history/status view but must not be inserted or applied twice.
- [ ] A page refresh or second tap must not start unsafe duplicate writes. Use an idempotent server-side sync contract and disable/deduplicate in-progress requests as appropriate.
- [ ] Keep useful per-user history if it fits current project conventions, but do not expose another user's record history to a staff member without explicit authorization.

## 2.5 Local-first capture versus website visibility — a crucial architecture requirement

The website cannot display a record that exists only inside the phone's local storage. Phase 0 must explicitly account for this.

The intended user experience is:

1. Saving a scan on the phone stores it durably on the device immediately.
2. When the phone has a connection, the app can securely send/mirror the record to a **staging/pending-capture area** without touching the real product catalogue. This is an internal technical upload, not a user-facing mobile Sync action, and must not require the staff member to sync each item manually.
3. If the phone is offline, the record remains in its local queue and is safely staged once connectivity returns, according to the approved architecture. Until the staging upload succeeds, the website cannot truthfully show that record; the phone must indicate that it is still device-only.
4. The website's **Sync Now** performs the final, intentional operation: validate eligible staged records and create/update the real Ruhvi product/inventory data via the approved server-side pathway.
5. Only after the final operation succeeds does the record become `Synced`.

Use distinct internal statuses for the two boundaries, for example:

- `local_pending_upload` — saved on the phone, not yet acknowledged by the staging service;
- `staged_pending_sync` — securely stored in the server-side staging area and visible in the user's website table;
- `sync_in_progress` — the website started final sync;
- `synced` — authoritative product/inventory write confirmed;
- `failed_retryable` — a recoverable failure occurred;
- `conflict` — identity/data conflict requires a decision;
- `failed_permanent` — invalid or prohibited record requiring correction.

These are conceptual names, not a mandate to create exact status strings. Map them to existing conventions and document the final state machine. Never call a staging upload “product synced.”

**Do not implement this architecture blindly.** During Phase 0, determine the safest supported way to make phone records visible on the website while keeping final catalogue writes controlled by the website. Compare existing app/PWA capabilities, Supabase and API architecture, offline storage, realtime/polling support, and deployment/security constraints. Explain trade-offs and ask before any material architectural change.

## 2.6 Data integrity and product updates

- [ ] The actual canonical product/inventory table and its trusted create/update pathway must be identified from the repo, migrations, types, and APIs. Do not assume its name is `products` or create a parallel catalogue.
- [ ] The staging table/queue must remain separate from the canonical product data until the website's final sync action. Use additive, reversible changes and a migration plan if a new table is required.
- [ ] Identify how Ruhvi defines a product, variant, SKU, barcode, stock item, and inventory quantity. Do not assume barcode, SKU, or a physical unit are interchangeable concepts.
- [ ] Determine if each barcode represents an individual physical item, a product design/variant, or a stock-keeping unit. This affects repeated barcode scans and concurrent staff intake.
- [ ] Determine whether duplicate barcode or SKU means: existing product to update; count/stock quantity to increase; same item already captured; or a conflict requiring correction. Ask the user if code/schema inspection cannot settle this. Never silently invent stock behavior.
- [ ] For an existing product, only update the fields allowed by the approved mapping. Do not overwrite valid server values with blank, absent, stale, or default values from the phone.
- [ ] For a new product, use existing server validation/business logic. Do not bypass existing product services to write directly from the phone into production tables.
- [ ] If barcode identifies product A while SKU matches product B, stop and show a conflict. Do not silently merge or pick one.
- [ ] Define whether the stock quantity is an absolute number or a delta/increment. Until clarified, do not change stock quantities as a hidden side effect of sync.
- [ ] If multiple staff members scan concurrently, final sync must use server-side uniqueness/transaction/idempotency protections where supported. Client-side “check before insert” alone is not sufficient to prevent simultaneous duplicates.
- [ ] Preserve server-generated IDs, created/updated timestamps, audit fields, and established validation rules.

## 2.7 Security and access control

- [ ] Audit the real Ruhvi authentication system first. The known intended context is Firebase Auth with Supabase as the database, but verify what this repo currently uses rather than assuming it.
- [ ] Each staff member must be authenticated through the existing supported flow.
- [ ] Establish a trusted mapping from the authenticated identity to the staff/user record and existing permissions.
- [ ] Enforce owner isolation in server handlers/RLS/database policies as applicable.
- [ ] A user must not be able to submit someone else's owner ID and thereby take control of another user's scan queue.
- [ ] Staging upload and final product sync must use authenticated, authorized server-side operations.
- [ ] Never put Supabase service-role keys or other secrets in browser/mobile bundles.
- [ ] Do not loosen RLS or broadly open a table just to make staging or sync work.
- [ ] Avoid leaking private product-cost data to users whose existing permissions do not allow it. Purchase price is required in this workflow, so explicitly confirm which staff roles are authorized to see and enter it.
- [ ] Record who created and finally synced each record using trusted identity data. Device IDs alone are not enough.
- [ ] Avoid logging credentials or unnecessary personal/customer information.

---

# 3. Global Non-Negotiable Instructions

1. **Protect existing functionality.** Do not break or casually refactor the storefront, admin dashboard, authentication, authorization, Operations, inventory/product flows, APIs, orders, payments, or deployment setup.
2. **Audit before implementation.** Read actual code, migrations, generated types, route handlers, API/services, policies and docs. Search broadly before adding a second implementation of an existing feature.
3. **No guesses presented as facts.** Mark items `Verified`, `Assumption`, `Open Question`, or `Not Verifiable` in plans and reports.
4. **One phase at a time.** Before every phase, tell the user its goal, scope, expected files/risks, and ask for explicit permission. After the phase, run its checks, update the report, summarize the actual results, propose the next phase, and STOP for approval.
5. **Do not skip phases.** A missed test, unresolved requirement, failed acceptance criterion, or missing approval is a hard stop. Never continue automatically.
6. **Phase 0 is read-only.** No feature code, dependencies, schema changes, policies, production writes, or deployment changes in Phase 0. Produce findings/documentation only after inspection.
7. **No destructive changes without explicit, specific approval.** Do not delete/rename tables or columns, rewrite product data, reset databases, change production policies, rotate credentials, or perform irreversible migrations.
8. **Schema changes require a separate explanation and approval.** First show the proposed migration, purpose, impact, rollback plan, and environment. Never run a production migration without explicit approval.
9. **No unrelated UI changes.** Preserve buttons, routes, APIs, labels, and workflows outside this feature. Explain and request approval for any out-of-scope change.
10. **Use Ruhvi's existing design language.** Keep the current light ivory/cream and champagne-gold direction and established components. Do not replace it with a plain-white or dark redesign.
11. **Real verification only.** Do not claim tests/builds/device scenarios passed unless actually run. Separate `Passed`, `Failed`, `Not Run`, and `Needs Manual Verification`.
12. **No unapproved Git/deployment actions.** Do not commit, push, merge, release, or deploy unless the user explicitly authorizes it.
13. **No secrets in reports.** Include environment-variable names and missing configuration status, never actual credentials or secret values.
14. **No unnecessary dependencies.** Assess installed packages first. Justify any new camera, offline-storage, queue, or testing dependency, including compatibility, maintenance, licence, size, and alternatives.
15. **No invisible product writes.** Mobile capture can stage records, but it must not bypass the website's final Sync Now gate to write to the canonical product catalogue.
16. **Use truthful UI status.** Local save, successful staging upload, and final product sync are different states. Do not show green `Synced` on mobile or website until final server-side product update has been verified.
17. **Respect user scope.** The requested workflow has no admin approval gate; each authenticated staff member syncs their own records through the website. Preserve existing roles and security, but do not invent a manager approval step.
18. **Resolve requirements before coding.** If there are blocking ambiguities—especially duplicate barcode/SKU behavior, stock quantity semantics, optional fields, or the meaning of “trial price”—explain them and ask the minimum necessary questions in Phase 1.

---

# 4. Required Repository Documentation

After inspecting existing docs conventions, create or update suitable files. Do not overwrite existing reports without reading them first. If an equivalent file already exists, update it instead of creating duplicate reports.

Suggested location: `docs/inventory-scan-add/`

- `REQUIREMENTS_BASELINE.md` — user-requested behavior, requirement IDs, mandatory/optional fields, status definitions, assumptions, confirmed decisions, and open questions.
- `IMPLEMENTATION_PLAN.md` — current architecture, approved design, phase order, dependencies, acceptance criteria, risks, and rollback plan.
- `DATA_SYNC_CONTRACT.md` — actual verified schema mapping, local-to-staging payload, staging-to-canonical mapping, identity resolution, ownership, idempotency, status state machine, conflicts, and per-record response contract.
- `IMPLEMENTATION_REPORT.md` — dated evidence-based report appended after every completed phase.
- `MIGRATION_PLAN.md` — only if a schema/policy migration is genuinely required; include additive migration, backfill (if any), validation, rollback, and approval status.

During the initial Requirements Baseline, do not create or edit project files yet; only tell the user what the requirements are and what needs to be inspected. After Phase 0, document the verified audit. Keep all reports free of secret values.

---

# 5. Phase Plan and Permission Gates

## Initial step — Requirements Baseline (no code changes)

**Purpose:** Align on the user-visible requirements before inspecting or implementing the system.

**Actions:**

1. Restate the requirements in Section 2 in a concise checklist.
2. List the information/access needed for the audit and what can be inspected directly in the repository.
3. Highlight any obvious high-impact questions without forcing the user to answer details that can be verified from code.
4. Ask permission to begin Phase 0.

**Must not:** edit code/docs, install packages, execute migrations, query or modify production data, alter environment configuration, or deploy.

**Stop:** Wait for explicit permission to start Phase 0.

---

## Phase 0 — Read-only architecture and repository audit

**Purpose:** Understand the entire existing Ruhvi architecture relevant to the feature before proposing implementation details.

### Inspect

- Repository layout, framework, runtime and package manager; package scripts; routing/app boundaries; relevant versions.
- Existing Operations navigation, product create/edit pages, inventory tools, staff-management/auth flows, and current UI components.
- Real product, SKU, barcode, variant, weight, purchase/cost price, sale/retail price, stock and inventory schemas from migrations, SQL, ORM models, generated types and existing services.
- Existing product create/update/import pathways and their server-side validation/business logic.
- Current authentication, verified session/user identity, role checks, Supabase access patterns, RLS/policies, server API authorization and audit logging.
- Current mobile web/PWA/native app boundaries, manifest/service worker, offline persistence, camera/barcode library, and support for Android devices/browsers.
- Test framework, unit/integration/e2e tests, lint/type-check/build scripts, fixtures, mocks and CI checks.
- Existing realtime subscriptions or polling patterns that can update status after the website sync.
- Deployment architecture and environment-variable *names* needed to run the feature, without exposing values.
- Current design-system tokens/components and responsive layout patterns.

### Architecture options to compare

Compare, based on evidence:

1. Reusing an existing mobile web app/PWA with durable local storage, if supported; versus
2. Adding a separate cross-platform mobile app, only if the existing project cannot meet reliable camera, offline queue, and authentication requirements.

Recommend the least risky maintainable option that meets the requirements. Do not add a new app or framework simply because it is familiar. Explain any limits around local-only data, shared devices, camera support, background delivery, staging visibility, and deployment.

### Required Phase 0 deliverables

- Verified architecture summary with exact file paths and current technology choices.
- Inventory/product data-model map, real canonical tables, known keys/constraints and unresolved identity semantics.
- Existing create/update APIs/services and all relevant authorization/RLS boundaries.
- Assessment of whether the website can show each user's pending scan records and refresh statuses with current architecture.
- A proposed two-boundary flow: phone-local save → secure per-user staging → website Sync Now → canonical product/inventory write; adapt if actual architecture suggests a safer supported design.
- Proposed user/device isolation and simultaneous-user handling.
- Initial list of requirements that are feasible, conflicting, missing or not verifiable.
- Risks, dependency recommendations, tests needed, and questions reserved for Phase 1.
- Create/update the required audit documentation only after the actual inspection is complete.
- Add a Phase 0 evidence-based report entry.

### Phase 0 restrictions

- Read-only audit only; no feature code, package installs, database mutations, RLS changes, production writes, commits, pushes or deployment.
- Do not claim a table/policy works unless its definition or behavior was actually inspected.
- If the database itself is inaccessible, distinguish repository evidence from live database facts.

**Stop condition:** Present the audit findings, important unknowns, recommended architecture and report files. Ask: **“Phase 0 is complete. May I proceed with Phase 1 — Requirements Gap Analysis?”** Then stop.

---

## Phase 1 — Requirements gap analysis and final contract review

**Purpose:** Compare the user's requested behavior against the real architecture and identify anything that must be decided before implementation.

### Required analysis

1. Build a requirements traceability table. Each item from Section 2 must be marked `Verified in current project`, `Can implement`, `Conflicts with existing behavior`, `Needs user decision`, or `Not currently verifiable`.
2. Show the exact mandatory fields: SKU, weight, purchase price. List other proposed mobile form fields as optional, mapped only to fields that really exist or have approved changes.
3. Resolve/ask about the meaning of “trial price” if the website schema/product UI does not make its meaning clear.
4. Work through whether a barcode identifies an individual physical piece, product, or variant; explain the impact on repeated scans and duplicate handling. Use repo evidence first, then ask the user only if still unknown.
5. Work through stock semantics: whether a scan adds a new product, associates with an existing product, sets stock quantity, or increments stock. Do not invent a stock delta.
6. Determine how to handle missing barcodes, duplicate scan reads, same barcode/SKU across different staff, mismatched barcode-versus-SKU identity, already-existing products, and edits to records that have changed since capture.
7. Confirm the per-user web view and isolation model. Default: each signed-in staff member sees and syncs only their own staged records; there is no separate admin approval flow.
8. Confirm the staging/upload behavior: staging must be visible on the website without the mobile app having a user-facing Sync button; offline-only rows are not yet visible on the website until safely staged.
9. Confirm final-sync behavior and per-record statuses, retries, partial success, idempotency, conflict handling and green-tick semantics.
10. List any schema/API/RLS/dependency changes proposed and their risks; do not execute them in this phase.
11. Create/update the requirements baseline and data sync contract as drafts, marking anything not yet approved.

### When requirements are missing

- Ask only the smallest set of questions needed to unblock safe design. Explain each question in plain language and why it affects behavior or data integrity.
- Provide practical options and a recommendation where appropriate, but do not choose a business rule on the user's behalf if it could change product identity, stock, or prices.
- Stop and wait for answers. Do not start Phase 2 while a blocking requirement remains unresolved.
- After the user answers, update the requirements baseline/contract, show the final decisions and ask permission for Phase 2.

### When no blocking requirements are missing

Summarize the finalized requirements, the intended data flow, relevant schema/API changes, test/rollback plan, and any residual non-blocking risks. Then ask: **“Phase 1 is complete and there are no blocking requirements left. May I proceed with Phase 2?”** Stop and wait.

**No feature implementation, schema migration, policy change, deployment or production write in Phase 1.**

---

## Phase 2 — Approved design lock and implementation preparation

**Purpose:** Turn the approved requirement set into an implementation-ready contract, without expanding scope.

- Finalize `IMPLEMENTATION_PLAN.md` and `DATA_SYNC_CONTRACT.md` against the inspected codebase.
- Map every form field to the existing column/API field, data type, unit, nullability, validation and permission.
- Specify local queue model, per-user staging record model, ownership validation, idempotency key, status transitions and server response shape.
- Define transaction/partial-failure behavior and concurrency protection for two people syncing at once.
- Finalize how the website's `Sync Now` invokes the trusted server path and how the phone learns of final sync status.
- Provide any migration SQL/code proposal, API contract, dependency list, test plan, and rollback plan for user review.
- List exactly which files will be changed in Phase 3 onward and why.

**Checks:** Contract/schema consistency review; threat-model review; duplicate/concurrency scenarios; no implementation tests claimed unless executed.

**Stop condition:** Update report and ask permission before Phase 3. Any database schema/RLS migration still requires separate explicit approval before it is run.

---

## Phase 3 — Additive server-side staging model and secure APIs

**Purpose:** Create the safe shared pending-record mechanism needed for the website to see phone captures, if Phase 0 proves one is needed.

- Add only approved, additive staging structures/API handlers; reuse existing patterns if they already exist.
- Store a stable scan/client-record ID, trusted owner ID, timestamps, source/device metadata where justified, captured fields, state, last error (safe), and canonical product ID/result when known.
- Ensure the staging records remain separate from canonical products until website final sync.
- Validate payloads server-side; derive owner identity from the verified session/token; reject unauthorized cross-user read/write attempts.
- Add/adjust RLS/policies only according to the approved design and only after the relevant migration/policy change is explicitly approved.
- Keep writes idempotent; repeated staging requests with the same stable scan ID must not produce duplicate staged records.
- Do not let phone/browser clients write directly to canonical product tables using privileged keys.
- Provide accurate record status/results with no sensitive stack traces.

**Tests:** unauthorized access; forged owner IDs; malformed payload; duplicate stage retry; two users; existing policies; safe error handling; migration rollback in a non-production test environment where available.

**Stop condition:** Report actual schema/API changes and tests. Ask permission before Phase 4.

---

## Phase 4 — Durable local capture queue

**Purpose:** Make each scan/save safe on the phone, including during temporary offline periods.

- Implement only the approved local persistence layer (e.g. IndexedDB for a supported PWA or a suitable native local database if approved by the audit).
- Persist a record immediately on the device before attempting remote staging.
- Preserve fields and status across page/app reloads, network interruptions and recoverable errors.
- Keep local records isolated by authenticated user. On a shared device, do not show one user's queued product costs/details to another user unless specifically authorized. Define safe sign-out/account-switch behavior and do not orphan/delete pending records silently.
- Use stable IDs so staging retries are idempotent.
- When online, perform the approved background/automatic **staging upload** without a mobile Sync button; do not write into canonical products from that step.
- When offline, leave records marked as device-only/pending upload until the staging server confirms receipt.
- Define how to handle local deletion, editing after staging, app/browser data clearing, reinstalling, and storage quota failures. Do not promise backup for local-only records.

**Tests:** offline save; reload/reopen; multiple queued records; network returns; repeated staging retry; local storage unavailable/quota exceeded; sign-out/account switch; no canonical product changes from local save/staging upload.

**Stop condition:** Report results and ask permission before Phase 5.

---

## Phase 5 — Mobile barcode scanning and product-entry form

**Purpose:** Deliver the scan-and-enter experience based on the approved field mapping.

- Integrate scanning with existing routing/components and approved architecture.
- Request camera permission only after the user taps a scan control.
- Provide manual barcode entry fallback.
- Prefill captured barcode; let staff correct it only according to the approved identity rules.
- Show SKU, weight and purchase price as the only explicitly mandatory inputs. Apply field-level validation with accessible errors.
- Show sale price, confirmed retail/trial price meaning, and other supported existing product fields as optional.
- Keep input values safe during intermittent network or camera failures.
- On Save, persist locally immediately and then stage automatically when connection permits; do not show a user-facing mobile Sync Now button.
- Make repeated scans quick: clear confirmation, a way to start the next scan, and a list of current user's captured items with accurate statuses.
- Keep the existing Ruhvi ivory/cream and champagne-gold design language, tap targets, readability and accessible focus states.

**Tests:** scanner success, camera denied/unavailable, manual entry, repeated-read suppression, required/optional field validation, numeric precision, weight unit, fast repeated items, save offline, small-screen usability, Android/browser/device coverage available to the project.

**Stop condition:** Report results and ask permission before Phase 6.

---

## Phase 6 — Website per-user pending table and Sync Now

**Purpose:** Let a staff member review their own staged records and initiate final product/inventory sync from the website.

- Add the agreed page under the existing Operations navigation without removing existing options.
- The list defaults to the current authenticated user's records only.
- Show useful columns, accurate pending counts and current statuses. Use pagination/search/filter if appropriate; do not load unbounded tables into the browser.
- Show records that are staged and awaiting website sync; clearly distinguish device-only records that have not yet reached the staging server (these cannot be displayed by the website yet).
- The website **Sync Now** action processes the current user's eligible staged records in a safe group. It must not sync records belonging to another user just because the client submits their IDs.
- No admin approval or manager approval stage is added.
- Disable or safely deduplicate repeated in-progress requests; still enforce idempotency server-side.
- Provide progress/final summary, per-record outcome, meaningful validation/conflict errors, retry affordances and green tick for confirmed successes only.
- Synced rows stay identifiable as synced/history; a later Sync Now should select only eligible pending records.
- Refresh/poll/realtime updates must follow existing architecture and not leak another user's row status.

**Tests:** user A sees A only; user B sees B only; A cannot sync B by manipulating requests; zero pending records; all-success; mixed success/failure; retry; double-click; refresh; 15/80 item scenarios; no accidental changes outside the feature.

**Stop condition:** Report results and ask permission before Phase 7.

---

## Phase 7 — Final product sync, conflict resolution and concurrency hardening

**Purpose:** Connect the website's Sync Now to the existing trusted product/inventory write path.

- Use the confirmed canonical product API/service and validations rather than bypassing business logic.
- Process records one at a time or in safe bounded chunks based on evidence; define transaction/partial-success behavior explicitly.
- Resolve barcode/SKU collisions according to the Phase 1 approved rule.
- Ensure each record has a stable idempotency key and gets a definitive outcome.
- If a server write succeeds but the client times out, retry must discover the prior result rather than write the product or stock effect a second time.
- Protect against two staff members simultaneously adding the same identity using server/database constraints or transaction-safe resolution where available.
- Do not overwrite valid server values with missing optional fields. Do not update sale price unless supplied and authorized. Do not infer/increment stock without an approved rule.
- Mark staging records as `synced` only after the canonical operation is confirmed. Store server product ID/result as appropriate.
- Preserve failed and conflicting records for correction/retry; do not silently drop them.
- Provide exact per-record server outcomes and summary counts.

**Tests:** new product; existing product; duplicate barcode; duplicate SKU; barcode-to-product-A plus SKU-to-product-B; simultaneous requests; timeout after server write; repeated sync; partial failure; stale data; prohibited field; no duplicate stock effect; rollback/error cases where practical.

**Stop condition:** Report actual behavior and ask permission before Phase 8.

---

## Phase 8 — End-to-end, security, and regression verification

**Purpose:** Verify the whole workflow and protect existing Ruhvi features.

Run all applicable checks actually available in the repository:

- Lint, type checks, unit tests, integration tests, e2e tests and production build.
- Migration validation and RLS/policy checks in a safe non-production environment, if available.
- Mobile camera and manual-entry checks on real devices/browsers where possible; otherwise mark as not manually verified.
- Offline, reconnect, staging, website sync and status propagation.
- Cross-user privacy, two-user concurrency, shared-device sign-out/account switching, and forged IDs.
- Duplicate/idempotency and failure recovery.
- Existing login/logout, Operations navigation, product add/edit, inventory, order, payment and customer flows that could be affected.
- Responsive layout, keyboard/focus/accessibility and bundle/dependency impact.

Produce a checklist showing `Passed`, `Failed`, `Not Run`, or `Needs Manual Verification` with evidence. Fix only in-scope defects approved for this phase. Ask for approval before scope expansion.

**Stop condition:** Update report and ask permission before Phase 9.

---

## Phase 9 — Handover and controlled release proposal

Provide:

- The final architecture and data flow in plain language.
- Final user instructions for scanning and entering data, viewing the website queue and using Sync Now.
- Exact rules for required/optional fields, duplicates, stock quantity and conflicts.
- Supported devices/browsers and any limitations.
- Any environment-variable names/configuration steps (never secret values).
- Any database migrations/policies required, what has/has not been run, and approval status.
- Test matrix and known issues.
- Offline-data and shared-device caveats.
- Rollback/recovery instructions and suggested backup/checkpoint before production rollout.
- Any deployment step still requiring approval.

Update all documentation/report files and stop. Do not commit, push, merge, or deploy without the user's specific approval.

---

# 6. Suggested Status Model

Use existing project naming if one exists; otherwise document a clean state machine. Do not collapse staging into final sync.

| Conceptual status | Meaning | Where it can be seen |
|---|---|---|
| `local_pending_upload` | Saved on phone, but staging server has not confirmed receipt | Mobile only |
| `staged_pending_sync` | Staging server confirmed receipt; canonical product has not been changed | Mobile and owner's website table |
| `sync_in_progress` | Website Sync Now is processing this record | Website; mobile when status refreshes |
| `synced` | Canonical product/inventory write confirmed by the server | Website and mobile after status refresh |
| `failed_retryable` | Temporary/network/server failure; retry may be safe | Website and mobile when available |
| `conflict` | A business identity/data conflict needs correction | Website and mobile when available |
| `failed_permanent` | Invalid data or rule violation; correction is required before retry | Website and mobile when available |

The implementation may use other exact status values if required by existing conventions, but it must preserve these semantic differences.

---

# 7. Data and API Contract Checklist

Finalize this during Phase 1/2 using real schema information. This is a checklist, not a predefined database schema.

For every staged record, identify how the system stores or derives:

- Stable client/scan record ID (UUID or equivalent).
- Authenticated owner/staff ID derived and verified server-side.
- Creation/capture timestamp and server received timestamp.
- Device/app metadata only where justified; never use device identity as the ownership authority.
- Barcode, SKU, weight and purchase price fields.
- Optional sale/retail/trial price and other approved fields.
- Local state and staging/final-sync state.
- Optional canonical product ID after successful final sync.
- Attempt count/last attempt and a safe error code/message where necessary.
- Idempotency key or equivalent stable retry mechanism.
- Version/concurrency information where needed to prevent stale overwrites.

### Server behavior requirements

- Authenticate every read/write action.
- Derive owner identity from verified auth; enforce owner scope on every read, update and delete.
- Validate mandatory fields and all optional fields server-side.
- Prevent one record ID from being replayed to create duplicate staging or product records.
- Resolve canonical product identity using the approved business rule and real unique constraints.
- Return one result per input record, including successful and unsuccessful records.
- Never report success before the canonical write has actually succeeded.
- Keep partial failure safe and retryable; do not lose an item because a sibling item failed.
- Do not disclose internal stack traces, SQL statements, secrets or other users' data in errors.

### Result outcomes to support conceptually

`created`, `updated`, `unchanged`, `conflict`, `failed_retryable`, `failed_permanent`.

Map these to existing application conventions where possible. Define whether an update is allowed for each field before implementing it.

---

# 8. Required Test Scenarios

At minimum, plan and verify the following where the environment supports it. Do not mark a scenario passed just because the app compiles.

## Basic scanning and form

- Scan a valid barcode and confirm it is placed in the form.
- Manually enter a barcode when the camera is unavailable.
- Validate blank SKU, blank weight, and blank purchase price independently; each must block save.
- Confirm blank optional sale price and other optional fields do not block save.
- Confirm the ambiguous “trial price” is mapped only after its meaning is confirmed.
- Test numeric boundaries, currency precision, weight units, whitespace and invalid values.
- Rapid repeated camera reads do not create accidental duplicate local entries.
- A legitimate new scan can be captured immediately after saving the previous item.

## Local/offline/staging flow

- Save multiple items offline; verify they persist after reload/reopen.
- Verify device-only records do not falsely appear on the website before staging receipt.
- Restore connectivity; verify staging submission occurs safely without a mobile Sync Now button.
- A lost response followed by retry does not duplicate staging records.
- Local storage quota/error paths preserve or clearly report unsaved data.
- Signing out or switching user never silently reassigns pending records to the next user.

## Two-user simultaneous use

Use representative counts like User A with 15 pending items and User B with 80 pending items:

- Both can scan/stage concurrently without blocking or merging each other's records.
- A's website table shows A's items; B's table shows B's items.
- A's Sync Now processes A only; B's items remain pending until B syncs.
- B's Sync Now processes B only; A's state remains unchanged.
- Altering request IDs/owner IDs cannot read or sync another user's records.
- If both users submit the same barcode/SKU at the same time, the approved duplicate/conflict/stock rule is applied atomically and predictably.
- Same-phone use with account switching is tested if that mode is supported; otherwise document its limitation clearly.

## Final website sync

- All valid new records create through the existing server pathway.
- Existing records behave according to the approved insert/update/stock policy.
- Mixed batch: some created, some updated, some failed, one conflicted; every status/count is correct.
- The user sees a green tick only after confirmed final success.
- A second click, page refresh, retried timeout or network disconnect does not create duplicates or apply stock twice.
- Previously synced records are not processed as new on later Sync Now clicks.
- A product with mismatched barcode and SKU is never silently merged.
- Optional blanks do not erase populated canonical values.

## Security and regression

- Unauthorized requests are rejected.
- Existing authentication and policy boundaries remain effective.
- No service-role key or other privileged secret is in client bundles or logs.
- Product-cost fields remain accessible only to authorized roles.
- Existing product create/edit, Operations navigation, auth, inventory and other affected workflows still work.
- Lint, type check, tests and build report their actual results.

---

# 9. Report Format After Every Phase

Append a dated section to `IMPLEMENTATION_REPORT.md` with:

1. **Phase and approval:** exact phase and the user's permission for it.
2. **Scope completed:** what was done and what was intentionally not done.
3. **Files inspected/changed:** exact paths; explicitly state `No code changes` where applicable.
4. **Architecture/schema/API/security impact:** list migrations, policies, dependencies and data changes; state `None` when applicable.
5. **Commands and checks:** exact commands/test cases executed.
6. **Results:** pass/fail/not-run/needs-manual-verification plus evidence.
7. **Acceptance criteria:** which IDs were met, failed, blocked or not verified.
8. **Risks/open questions:** include who or what is needed to resolve them.
9. **Regression status:** affected existing flows checked and unverified.
10. **Next-phase proposal:** exact scope, expected files, risks and approvals required.
11. **Explicit stop statement:** confirm no next phase started and no unapproved migration/deployment/Git operation occurred.

Never write “everything works” based only on a successful build. A build does not prove camera access, offline persistence, ownership isolation, RLS, simultaneous users, idempotency or production sync.

---

# 10. First-Response Template for Antigravity

Your first response to the user must follow this outline and must not claim you have audited the repository before you actually have:

1. **Requirements I understood** — summarize mobile scanning, mandatory/optional fields, no mobile Sync button, per-user pending queue, website-only Sync Now, and green-tick status after confirmed final sync.
2. **How multi-user isolation should work** — each scan is tied to its authenticated staff account; each staff member sees/syncs their own queue; concurrent workers remain isolated.
3. **Important technical distinction** — local phone storage is not automatically visible to the website. Explain that secure staging upload may happen automatically when online, while final product/catalogue changes remain gated by website Sync Now. Offline records remain device-only until staged.
4. **What I need to inspect** — actual schema/migrations, product create/update path, auth/RLS, Operations routes, scanner/offline options, and tests. Do not ask for secret values.
5. **Known questions to verify later** — duplicate barcode/SKU meaning, stock quantity semantics, optional “trial/retail” field naming, and shared-device behavior.
6. **Safety boundary** — no code/schema/policy/deployment changes before approvals.
7. Ask: **“May I begin Phase 0 — Read-only Architecture Audit?”** Then stop.

---

# 11. Final Instruction

Treat this file as a controlled, permission-gated engineering plan, not permission to implement everything immediately. Begin with the Requirements Baseline only. After explicit user approval, perform Phase 0. After another approval, perform Phase 1. If Phase 1 finds blocking questions, ask and wait. If no blocking requirements remain (or all are answered), show the finalized requirement set and wait for approval before Phase 2. Implement only the approved phase, verify honestly, update the report, and stop after every phase for the next permission.
