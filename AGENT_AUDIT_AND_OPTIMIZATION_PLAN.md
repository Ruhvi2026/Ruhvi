# Ruhvi Project — Deep Performance Audit & Optimization Execution Plan

## Objective
Perform a complete, root-cause-level audit of the entire project to identify what is causing slow performance, what is redundant, and what is truly required — then implement fixes phase by phase, fully autonomously, until done.

## Ground Rules (apply to every phase)
- Full permission is granted to use external tools during audit and implementation — including Chrome DevTools (Network, Performance, Lighthouse, Coverage tabs), and any other profiling/testing/build tools needed for accurate measurement. Do not guess — measure.
- Do NOT break any existing functionality, feature, or security measure that currently works. Every change must be verified safe before moving to the next phase.
- I will only be available to grant permissions/approvals at the end of Phase 0. After that, I will NOT be available to approve anything manually.
- Because of this: at the end of Phase 0, you must request every single permission, credential, access, or approval needed to complete the ENTIRE plan (all phases) — not just the next one. Nothing should be left to ask for later.
- Once I grant that one-time full approval, proceed through all remaining phases automatically, one after another, without waiting for further manual permission, until the whole plan is complete.
- If something unexpected comes up mid-execution that needs a genuinely NEW permission not already covered, log it clearly, skip only that specific item, and continue executing everything else that doesn't depend on it.

---

## Phase 0 — Deep Audit & Root Cause Analysis (NO code changes in this phase)

Analyze the entire project end-to-end. For each area below, go to the actual root cause — not just the visible symptom.

1. **Tech Stack Inventory** — List every tool, service, library, SDK, and dependency currently in use (frontend, backend, hosting, database, auth, analytics, monitoring, third-party integrations, everything).
2. **Functionality Mapping** — For each tool/service/library found, identify exactly what feature(s) it is responsible for.
3. **Redundancy Check** — Identify every case where more than one tool, library, or approach is being used to accomplish the same or overlapping job. Flag each one explicitly.
4. **Performance Impact (measured, not guessed)** — Using Chrome DevTools and equivalent tools, profile actual page loads and interactions: render-blocking resources, unused/unnecessary JS or CSS, oversized bundles, slow database/API queries, unnecessary re-renders, excessive or misapplied middleware/auth checks, unoptimized images/assets, missing caching, etc.
5. **Security Review** — Flag any security concerns discovered during the audit (do not fix yet, just report).
6. **Cost Analysis** — For each paid or free-tier-limited tool, note current usage level and what happens if usage grows.
7. **Maintenance Overhead** — Flag anything that is fragile, overly complex, or hard to maintain.
8. **Dependency Analysis** — Map how tools/services/modules depend on each other, so removing/changing one doesn't silently break another.
9. **Root Cause Analysis** — For every slowdown or issue found, dig down to what is actually causing it underneath the surface symptom.
10. **Criticality Rating** — For every tool, library, or feature reviewed, rate it as one of: **Must-Have / Nice-to-Have / Removable-Redundant**, with a short reason and how critical it is (e.g. what breaks or degrades if it's removed).

**Output of this part of Phase 0:** one consolidated audit report covering all 10 points above. No code should be changed yet.

### Then, still within Phase 0:
1. Based on the audit findings, create a detailed, **step-by-step implementation plan**, broken into clearly numbered phases (Phase 1, Phase 2, Phase 3, …), ordered by priority/impact and by dependency (what must happen before what).
2. For each phase in that plan, specify: exactly what will change, which files/services/areas are affected, and the expected performance benefit.
3. List **every** permission, access, credential, or approval required to execute the entire plan across every phase — all at once, since no further manual approval will be available after this point.
4. Present the audit report + implementation plan + full permission list together, and wait for explicit approval before touching any code.

---

## Phase 1 → N — Autonomous Execution
- Once full approval is granted, execute each phase of the implementation plan automatically, one after another, without asking again.
- After each phase, verify nothing existing has broken (functionality + security) before moving to the next phase.
- Keep a running change log: what was changed, in which phase, and why.
- Do not introduce new redundant tools while fixing old ones — consolidate genuinely overlapping tools, but don't remove anything that wasn't already flagged and approved in the plan.

---

## Final Phase — Commit & Push
- Once every phase is complete and verified, commit the changes to git with clear, descriptive commit messages (per phase or per logical group of changes).
- Push everything to the remote repository.
- Provide a final summary: what was audited, what was changed, and the measured/expected performance improvement.
