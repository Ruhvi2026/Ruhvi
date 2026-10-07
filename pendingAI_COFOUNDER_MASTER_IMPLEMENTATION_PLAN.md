# AI CO-FOUNDER — MASTER IMPLEMENTATION CONTROL PLAN

**Document:** `AI_COFOUNDER_MASTER_IMPLEMENTATION_PLAN.md`  
**Purpose:** Strict, phase-by-phase implementation control plan for the Ruhvi AI Co-Founder  
**Primary Builder:** Antigravity  
**Repository:** `Ruhvi2026/Ruhvi`

---

## 0. DOCUMENT PURPOSE

This document is the **master execution contract** for implementing and upgrading the Ruhvi AI Co-Founder.

The AI Co-Founder must be implemented **one phase at a time** and **one step at a time**.

The most important rule is:

> **DO NOT SKIP STEPS. DO NOT ENTER THE NEXT PHASE WITHOUT EXPLICIT USER PERMISSION. DO NOT MODIFY EXISTING WORKING FUNCTIONALITY WITHOUT EXPLICIT USER APPROVAL.**

This document is not permission to immediately implement everything.

It is a controlled implementation roadmap.

Antigravity must use this document as the operational source of truth for the implementation process while treating the actual repository code, database schema, configuration, tests, and runtime behavior as the technical source of truth.

---

# 1. ABSOLUTE NON-NEGOTIABLE RULES

These rules apply to **every phase and every step**.

## Rule 1 — One Phase at a Time

Never implement multiple phases together.

Required sequence:

`Phase 0 → User Approval → Phase 1 → User Approval → Phase 2 → ...`

Before starting a phase:

1. Explain the phase.
2. Explain why it is needed.
3. List its exact steps.
4. List expected files/systems affected.
5. List risks/dependencies.
6. Explain verification.
7. Ask for explicit permission.

Do not start implementation until permission is received.

---

## Rule 2 — One Step at a Time

Inside a phase, execute exactly one implementation step at a time.

Required sequence:

`Step → Implement → Test → Verify → Report → STOP → Ask Permission → Next Step`

Never silently combine Step 1 + Step 2 + Step 3.

Even if several changes appear small or related, treat them as separate steps unless the user explicitly approves combining them.

---

## Rule 3 — Permission Gate After Every Step

After completing each step:

1. Run verification.
2. Record evidence.
3. Update `AI_COFOUNDER_IMPLEMENTATION_REPORT.md`.
4. Clearly explain what changed.
5. Clearly explain what was tested.
6. Clearly explain whether existing functionality remains intact.
7. Stop.
8. Ask the user for permission to continue.

Required question:

> **PERMISSION REQUIRED: Approve the next step?**

If the user says no, stop.

If the user says pause, stop.

If the user asks for changes, remain on the current step/phase.

---

# 2. EXISTING FUNCTIONALITY PROTECTION — EXTREMELY STRICT

The existing Ruhvi project contains working functionality that must be protected.

### NEVER remove, disable, replace, or silently change:

- Existing routes
- Existing API endpoints
- Existing API contracts
- Existing buttons
- Existing UI controls
- Existing pages
- Existing navigation
- Existing authentication
- Existing authorization/RBAC
- Existing Firebase integration
- Existing Supabase integration
- Existing customer functionality
- Existing admin functionality
- Existing staff functionality
- Existing Messenger functionality
- Existing Task Manager functionality
- Existing workers
- Existing AI tools
- Existing tool permissions
- Existing database behavior
- Existing order functionality
- Existing product functionality
- Existing wallet/reward functionality
- Existing notification functionality
- Existing Cloudinary integrations
- Existing payment integrations
- Existing shipping integrations
- Existing analytics
- Existing monitoring
- Existing environment configuration
- Existing mobile/responsive behavior

unless the user explicitly approves the change.

---

## 2.1 No Breaking Changes

Every implementation must prefer:

- additive changes
- adapters
- wrappers
- feature flags
- backward-compatible APIs
- new modules
- isolated services
- migration-safe changes

over directly rewriting stable systems.

If a new AI capability conflicts with existing behavior:

> **STOP AND ASK THE USER.**

Do not decide independently that the existing behavior should be replaced.

---

## 2.2 Before Modifying Existing Code

Before touching an existing system, inspect:

- current implementation
- imports/dependencies
- callers
- API consumers
- database dependencies
- authentication requirements
- authorization requirements
- environment variables
- tests
- UI dependencies
- worker/tool dependencies
- related routes

Create an impact assessment.

---

## 2.3 No Destructive Changes Without Approval

Never perform the following without explicit user permission:

- destructive DB migration
- deleting tables
- deleting columns
- deleting API routes
- deleting components
- deleting workers
- deleting tools
- removing packages
- downgrading important dependencies
- changing authentication architecture
- changing payment architecture
- changing DNS
- changing production environment variables
- changing deployment architecture
- force push
- destructive git reset
- mass file deletion
- replacing a working subsystem with a new implementation

---

# 3. SOURCE-OF-TRUTH RULE

When documentation and actual code disagree:

> **Inspect the repository and runtime behavior first.**

The following are reference documents, not proof that a feature is actually working:

- previous plans
- previous audit documents
- discovery documents
- architecture documents
- performance documents
- TODO files
- comments
- AI-generated reports

Antigravity must verify important claims against:

1. Source code
2. Database schema/migrations
3. API routes
4. Tests
5. Configuration
6. Runtime behavior

Never mark a capability as implemented merely because a document says it exists.

---

# 4. MANDATORY IMPLEMENTATION REPORT

Create and maintain:

`AI_COFOUNDER_IMPLEMENTATION_REPORT.md`

This file is mandatory.

It must be updated **after every single implementation step**.

Do not wait until the end of a phase.

---

## 4.1 Required Report Sections

The report must maintain:

```text
Project Status
Current Phase
Current Step
Overall Progress
Capability Registry
Phase Status
Step History
Files Changed
Tests Executed
Verification Evidence
Existing Functionality Regression Check
Security/RBAC Check
Performance Check
Database/Schema Check
Known Issues
Blocked Items
Risks
Rollback Information
Git Commit
Next Step
User Approval Status
```

---

## 4.2 Status Values

Use these statuses consistently:

- NOT_STARTED
- READY
- IN_PROGRESS
- VERIFIED
- BLOCKED
- FAILED
- ROLLED_BACK
- APPROVAL_REQUIRED
- APPROVED
- COMPLETE

Never mark a step `VERIFIED` without actual verification evidence.

Never mark a phase `COMPLETE` if any required step was skipped.

---

# 5. REQUIRED COMMUNICATION FORMAT

After every completed step, Antigravity must report using this structure:

```text
PHASE X — STEP Y COMPLETE

What changed:
- ...

Files changed:
- ...

Tests executed:
- ...

Verification:
- ...

Existing functionality regression check:
- PASS / FAIL / PARTIAL

Security/RBAC check:
- PASS / FAIL / N/A

Database/config check:
- PASS / FAIL / N/A

Performance impact:
- ...

Known risks/issues:
- ...

Rollback:
- ...

Report updated:
- YES

Git commit:
- ...

Next step:
- ...

PERMISSION REQUIRED:
Approve the next step?
```

Then STOP.

Do not automatically continue.

---

# 6. INITIAL STARTUP PROTOCOL

When Antigravity receives this document for the first time:

### DO NOT immediately implement Phase 1.

First:

1. Read this entire document.
2. Inspect repository state.
3. Inspect current branch.
4. Inspect recent commits.
5. Inspect current working tree.
6. Identify current AI Co-Founder architecture.
7. Identify existing documentation.
8. Identify existing tests.
9. Identify existing AI tools/workers.
10. Identify authentication/authorization boundaries.
11. Identify database dependencies.
12. Identify current integrations.
13. Determine whether the implementation report exists.
14. Determine whether the master capability blueprint exists.

Then provide a short readiness report.

Do not modify application code yet.

Ask:

> **Phase 0 permission required. Approve Phase 0 Master Capability Audit?**

---

# 7. PHASE 0 — MASTER CAPABILITY AUDIT

## Objective

Create the complete blueprint of what the AI Co-Founder:

- already can do
- partially can do
- cannot currently do
- needs to do
- may need in the future

No major application implementation should occur in Phase 0.

---

## Phase 0 Deliverables

Create:

`AI_COFOUNDER_MASTER_CAPABILITY_BLUEPRINT.md`

and:

`AI_COFOUNDER_IMPLEMENTATION_REPORT.md`

---

## Phase 0 Audit Areas

Audit:

### Brain
- system prompt
- context construction
- reasoning
- business knowledge
- current user intent
- memory
- conversation state

### Business Intelligence
- orders
- revenue
- products
- inventory
- customers
- support
- marketing
- conversion
- analytics
- operational metrics

### Tools
- declarations
- execution
- permissions
- result schemas
- error handling
- retries
- timeouts

### Workers
- registry
- routing
- execution
- monitoring
- status
- worker capabilities
- worker dependencies

### Planning
- action plans
- task creation
- task assignment
- task dependencies
- approval requirements

### Execution
- human approval
- tool execution
- worker dispatch
- action tracking
- audit logs

### Verification
- expected outcome
- actual outcome
- verification
- delayed verification
- business success

### Memory
- storage
- retrieval
- relevance
- corrections
- decisions
- preferences
- long-term learning

### Proactive Intelligence
- monitoring
- signal detection
- anomaly detection
- recommendations
- escalation
- follow-up

### Voice/Multimodal
- speech input
- speech output
- image understanding
- future live multimodal architecture

### Security
- authentication
- RBAC
- scopes
- admin controls
- approval boundaries
- audit trail

### UI/UX
- chat
- worker visualization
- task integration
- approval UI
- status UI
- mobile behavior

### Testing
- unit
- integration
- API
- E2E
- regression
- security
- performance

### Production
- logging
- monitoring
- error handling
- rate limits
- timeouts
- retries
- provider fallback
- cost control

---

## Phase 0 Capability Classification

Every capability must be classified as:

```text
IMPLEMENTED
PARTIAL
MISSING
BROKEN
NEEDS VERIFICATION
FUTURE RESERVED
NOT REQUIRED
```

For every `IMPLEMENTED` claim, include evidence.

---

## Phase 0 Exit Criteria

Phase 0 is complete only when:

- full capability inventory exists
- dependencies are mapped
- missing capabilities are identified
- architecture gaps are identified
- existing functionality risks are identified
- future expansion points are documented
- master blueprint is created
- implementation report is updated
- no application functionality was unnecessarily modified

Then ask:

> **Phase 0 complete. Approve Phase 1?**

STOP.

---

# 8. PHASE 1 — AUTONOMOUS TOOL-CALLING BRAIN

## Objective

Create a reliable reasoning loop:

```text
User
↓
LLM
↓
Tool Decision
↓
Tool Execution
↓
Tool Result
↓
LLM Reasoning
↓
More Tools if Needed
↓
Final Answer
```

---

## Required Capabilities

Audit and implement where missing:

- tool declarations
- tool schemas
- tool executor
- model tool-call handling
- tool result normalization
- iterative reasoning loop
- maximum iterations
- timeout
- loop safety
- error recovery
- approval interception
- audit logging
- cancellation
- provider fallback

---

## Critical Rule

Do not rewrite the existing chat system blindly.

First understand the current chat route and existing provider architecture.

Prefer a new orchestration layer that can integrate with the existing system without breaking current behavior.

---

## Acceptance Test

Example:

```text
User asks business question
→ AI determines required tool
→ tool executes
→ result returns
→ AI reasons over result
→ final answer
```

Must be verified with real repository functionality.

---

# 9. PHASE 2 — INTELLIGENT ORCHESTRATOR

## Objective

Move from simple keyword-based execution toward context-aware orchestration.

Target:

```text
User Goal
↓
Intent Understanding
↓
Capability Selection
↓
Worker Selection
↓
Tool Selection
↓
Execution Plan
↓
Approval Check
↓
Execution
```

Capabilities:

- intent classification
- worker capability matching
- multi-worker orchestration
- dependency ordering
- parallel work where safe
- sequential work where required
- conflict detection
- task decomposition
- execution planning
- failure recovery

Do not remove existing worker routing until the replacement is proven.

Use fallback compatibility where needed.

---

# 10. PHASE 3 — CLOSED-LOOP EXECUTION

## Objective

Build:

```text
Monitor
↓
Detect
↓
Understand
↓
Investigate
↓
Decide
↓
Plan
↓
Approval
↓
Execute
↓
Verify
↓
Measure
↓
Learn
```

Every meaningful action should have traceability.

The system must distinguish:

- proposed
- approved
- executed
- execution succeeded
- execution failed
- business outcome expected
- business outcome achieved
- business outcome verified

No false success reporting.

---

# 11. PHASE 4 — BUSINESS INTELLIGENCE EXPANSION

Expand the business intelligence layer across:

- sales
- revenue
- products
- inventory
- customers
- support
- marketing
- SEO
- conversion
- order operations
- cancellations
- returns
- profitability
- unit economics
- campaign performance

The AI must distinguish:

```text
Observed
Calculated
Estimated
Unknown
```

Never invent missing business data.

---

# 12. PHASE 5 — MEMORY 2.0

## Objective

Build reliable long-term organizational memory.

Potential memory layers:

```text
Conversation Memory
↓
Decision Memory
↓
Preference Memory
↓
Operational Rules
↓
Strategic Goals
↓
Corrections
↓
Outcome Learning
↓
Semantic Retrieval
```

Potential capabilities:

- embeddings/vector retrieval
- semantic similarity
- recency
- importance
- user relevance
- business relevance
- memory confidence
- contradiction detection
- correction
- superseding
- memory expiration
- audit trail

Never let stale memory override fresh live business data.

Required priority:

```text
Current user instruction
>
Live verified data
>
Approved business rules
>
Relevant memory
>
Old historical memory
```

---

# 13. PHASE 6 — AI WORKFORCE 2.0

Build a truthful and intelligent workforce layer.

Existing workers must remain functional.

Potential workforce:

1. Analytics & Performance
2. Marketing
3. SEO
4. Product
5. Competitor Research
6. Sales & Conversion
7. Customer Support
8. Content/Blog
9. Inventory
10. Review & Feedback
11. Execution
12. Monitoring & Verification

Future workers may be added only through the capability registry.

---

## Worker Truthfulness Rule

The UI must never imply that a worker is executing when it is not.

Worker state must distinguish:

- LIVE
- WORKING
- WAITING
- SCHEDULED
- BLOCKED
- FAILED
- COMPLETED
- OFFLINE
- SIMULATED

Never use fake/random telemetry as real execution status.

---

# 14. PHASE 7 — PROACTIVE AUTONOMOUS CO-FOUNDER

The AI should evolve from:

> “Ask me and I answer.”

to:

> “I continuously monitor the business and bring important issues to you.”

Target:

```text
Monitor
→ Detect Signal
→ Determine Severity
→ Investigate
→ Recommend
→ Request Approval if Needed
→ Execute
→ Verify
→ Report
```

Examples:

- revenue anomaly
- inventory risk
- cancellation spike
- support backlog
- conversion drop
- marketing opportunity
- product opportunity
- SEO issue
- competitor movement
- operational bottleneck

No autonomous high-impact write without the defined approval boundary.

---

# 15. PHASE 8 — VOICE + MULTIMODAL

Improve:

- voice input
- voice output
- conversational voice interaction
- image understanding
- screenshot analysis
- product image analysis
- future live multimodal interaction

Do not break existing text chat.

Voice must be an additional interface, not a forced replacement.

---

# 16. PHASE 9 — VERIFICATION + GOLDEN E2E

Create the golden end-to-end test:

```text
Login
↓
Open Co-Founder
↓
Ask Business Question
↓
LLM Selects Tool
↓
Tool Executes
↓
Result Returns
↓
AI Reasons
↓
Recommendation
↓
Approval
↓
Task Creation
↓
Worker Execution
↓
Verification
↓
Outcome
↓
Memory Update
```

Required testing layers:

- unit
- integration
- API
- auth
- RBAC
- database
- worker
- tool
- approval
- UI
- E2E
- regression

The golden flow must be repeatable.

---

# 17. PHASE 10 — PERFORMANCE + PRODUCTION HARDENING

Audit and optimize:

- bundle size
- initial load
- client rendering
- unnecessary rerenders
- polling
- API latency
- database queries
- caching
- WebGL/3D performance
- mobile performance
- memory usage
- provider latency
- token usage
- rate limits
- timeout handling
- retries
- logging
- observability

Do not optimize based only on assumptions.

Measure before and after where practical.

---

# 18. MANDATORY VERIFICATION CHECKLIST

For every relevant implementation step, verify:

### Code
- TypeScript/typecheck
- lint
- formatting if configured
- build when appropriate

### Tests
- relevant unit tests
- integration tests
- API tests
- E2E/smoke tests where applicable

### Security
- authentication
- authorization
- RBAC
- scope checks
- approval boundaries
- secret handling

### Database
- schema compatibility
- migration safety
- query behavior
- indexes where needed

### Existing Functionality
- affected existing routes
- affected buttons
- affected APIs
- affected workers
- affected UI
- affected auth
- affected task/messenger integration

### UI
- desktop
- mobile
- responsive layout
- loading state
- error state
- empty state
- accessibility where applicable

### Runtime
- console errors
- API errors
- network failures
- timeout behavior

---

# 19. VERIFICATION EVIDENCE RULE

Never say:

> “It should work.”

Instead provide evidence such as:

- command executed
- test result
- build result
- API response
- runtime observation
- screenshot/manual verification
- exact file/route inspected
- commit SHA

If verification could not be performed:

> Mark the step `NEEDS VERIFICATION` or `BLOCKED`.

Do not claim success.

---

# 20. FAILURE PROTOCOL

If any step fails:

1. Stop immediately.
2. Do not continue to the next step.
3. Record the failure.
4. Identify affected files.
5. Identify likely cause.
6. Determine whether existing functionality is affected.
7. Attempt rollback only if safe and within approved scope.
8. Update the report.
9. Tell the user what happened.
10. Ask for permission before continuing.

---

# 21. REGRESSION PROTOCOL

If an existing feature breaks:

```text
STOP
↓
Do not continue implementation
↓
Identify regression
↓
Capture evidence
↓
Rollback/fix current step if safe
↓
Verify existing feature
↓
Update report
↓
Ask user permission
```

Do not “temporarily” leave an existing feature broken to finish the phase.

---

# 22. GIT SAFETY

Preferred discipline:

- inspect `git status` before work
- inspect recent commits
- make one logical change per step
- use meaningful commit messages
- inspect diff
- test before marking complete
- record commit SHA in report

Suggested commit format:

```text
feat(co-founder): phase-X step-Y <description>
fix(co-founder): phase-X step-Y <description>
test(co-founder): phase-X step-Y <description>
docs(co-founder): phase-X step-Y <description>
```

Never force push or perform destructive git operations without explicit approval.

---

# 23. DEPENDENCY RULE

Before implementing a step, determine:

```text
What does this step depend on?
What depends on this step?
Does the dependency already exist?
Is it verified?
Will this change affect another subsystem?
```

If a dependency is missing:

> Stop and report the dependency instead of silently improvising.

---

# 24. FUTURE CAPABILITY REGISTRY

Maintain a capability registry inside:

`AI_COFOUNDER_MASTER_CAPABILITY_BLUEPRINT.md`

Every new capability must have:

```text
Capability
Purpose
Current Status
Required Data
Required Tools
Required Worker
Required API
Required Permission
Required UI
Required Memory
Required Verification
Dependencies
Risks
Future Expansion
```

This prevents future AI Co-Founder capabilities from being forgotten.

---

# 25. ARCHITECTURAL COMPATIBILITY RULE

Every new subsystem must answer:

1. Can it coexist with the current system?
2. Can it be rolled back?
3. Can existing callers continue working?
4. Can it be feature-flagged?
5. Can failure be isolated?
6. Can permissions be enforced?
7. Can it be tested independently?
8. Can it be observed?
9. Can it be verified?
10. Can it be disabled without breaking unrelated features?

If several answers are no, stop and request architectural approval.

---

# 26. APPROVAL MATRIX

The AI Co-Founder may eventually classify actions as:

### Low Risk / Read
Examples:
- reading business data
- analytics
- reports
- investigation

Can potentially execute automatically if current security policy allows.

### Medium Risk
Examples:
- creating a draft
- creating a task
- preparing content
- planning a campaign

Follow the configured approval policy.

### High Risk / Write
Examples:
- changing production data
- sending external communications
- changing pricing
- changing important business configuration
- destructive operations
- financial actions

Require explicit approval unless a future user-approved policy explicitly changes this.

Never infer permission from the user's general desire for an autonomous AI.

---

# 27. NO SILENT AUTONOMY

The following are prohibited:

- silent production writes
- silent external messages
- silent destructive changes
- silent permission changes
- silent database migrations
- silent architecture replacement
- silent removal of existing features

Autonomy must always operate inside explicit permission boundaries.

---

# 28. USER LANGUAGE / COMMUNICATION

The AI Co-Founder must understand and preserve support for:

- Bengali
- Banglish
- Hindi/Hinglish
- English
- code-switching

Implementation planning may use technical English internally, but user-facing explanations should follow the user's language naturally.

Do not force English-only interaction.

---

# 29. STOP CONDITIONS

Antigravity MUST stop and ask the user if:

- an existing feature may break
- a destructive migration is required
- an API contract must change
- an auth architecture must change
- a production environment variable must change
- a third-party service must be replaced
- a new paid service is required
- a new recurring cost is introduced
- a security boundary must change
- a worker/tool permission must change
- verification cannot be completed
- test failures remain unexplained
- requirements conflict
- documentation conflicts with code
- implementation requires skipping a step
- implementation requires combining unapproved steps

---

# 30. DEFINITION OF DONE — STEP

A step is complete only when ALL are true:

- [ ] Step scope was understood
- [ ] User approved the step
- [ ] Dependencies checked
- [ ] Impact assessed
- [ ] Implementation completed
- [ ] Relevant tests executed
- [ ] Verification completed
- [ ] Existing functionality regression checked
- [ ] Security checked where relevant
- [ ] Database/config checked where relevant
- [ ] Performance checked where relevant
- [ ] Report updated
- [ ] Evidence recorded
- [ ] Git state recorded
- [ ] No unresolved critical issue
- [ ] User is asked for permission for the next step

---

# 31. DEFINITION OF DONE — PHASE

A phase is complete only when:

- [ ] Every phase step was executed
- [ ] No step was skipped
- [ ] Every step was verified
- [ ] Every step is recorded in the report
- [ ] Phase acceptance criteria passed
- [ ] Regression checks passed
- [ ] Known risks documented
- [ ] Rollback information documented
- [ ] Capability registry updated
- [ ] Git state recorded
- [ ] No critical unresolved issue remains

Then:

> STOP and ask for permission to enter the next phase.

---

# 32. MASTER EXECUTION SEQUENCE

The complete sequence is:

```text
START
↓
Repository Audit
↓
Permission for Phase 0
↓
Phase 0 — Master Capability Audit
↓
Step Verification
↓
Report Update
↓
User Approval
↓
Phase 1 — Autonomous Tool-Calling Brain
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 2 — Intelligent Orchestrator
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 3 — Closed-Loop Execution
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 4 — Business Intelligence Expansion
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 5 — Memory 2.0
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 6 — AI Workforce 2.0
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 7 — Proactive Autonomous Co-Founder
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 8 — Voice + Multimodal
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 9 — Verification + Golden E2E
↓
Step-by-Step Verification
↓
Report Update
↓
User Approval
↓
Phase 10 — Performance + Production Hardening
↓
Final Verification
↓
Final Master Report
↓
DONE
```

---

# 33. FINAL MASTER REPORT

After all approved phases are complete, create/update:

`AI_COFOUNDER_MASTER_IMPLEMENTATION_REPORT.md`

It must include:

- original baseline
- all phases
- all steps
- capabilities before/after
- files changed
- architecture changes
- tests
- E2E results
- performance results
- security verification
- regression results
- known limitations
- future roadmap
- technical debt
- unresolved items
- final Git state
- final verification summary

The final report must distinguish:

```text
Implemented
Verified
Partially Implemented
Not Verified
Blocked
Future
```

Never present planned functionality as implemented functionality.

---

# 34. CRITICAL FINAL INSTRUCTION TO ANTIGRAVITY

## DO NOT TRY TO FINISH EVERYTHING AT ONCE.

The purpose of this document is controlled incremental implementation.

The required behavior is:

```text
ASK PERMISSION
↓
DO ONE STEP
↓
VERIFY
↓
UPDATE REPORT
↓
SHOW EVIDENCE
↓
STOP
↓
ASK PERMISSION
↓
NEXT STEP
```

And between phases:

```text
COMPLETE PHASE
↓
VERIFY ALL STEPS
↓
UPDATE REPORT
↓
STOP
↓
ASK USER
↓
NEXT PHASE
```

### MOST IMPORTANT RULE

> **PROTECT EXISTING FUNCTIONALITY ABOVE ALL ELSE.**

If a new AI Co-Founder capability cannot be added without risking an existing working feature:

**STOP. DO NOT FORCE THE CHANGE. EXPLAIN THE CONFLICT AND ASK THE USER FOR APPROVAL.**

---

# 35. FIRST ACTION REQUIRED

After reading this document, Antigravity must NOT start implementation automatically.

It must first provide:

```text
AI CO-FOUNDER IMPLEMENTATION READINESS CHECK

Repository:
Current Branch:
Working Tree:
Current Commit:
Existing Co-Founder Components:
Existing Tools:
Existing Workers:
Existing APIs:
Existing Tests:
Existing Documentation:
Implementation Report:
Master Blueprint:
Major Risks:
Dependencies:

Conclusion:
READY / NOT READY / BLOCKED
```

Then ask exactly:

> **Phase 0 permission required. Approve the Master Capability Audit?**

Until the user explicitly approves Phase 0:

**DO NOT IMPLEMENT APPLICATION CODE.**

---

# END OF MASTER IMPLEMENTATION CONTROL PLAN
