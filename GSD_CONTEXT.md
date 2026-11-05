# GSD_CONTEXT.md — Active Rolling Workspace Memory

> **Context-Rot Mitigation Engine:** This document is the authoritative high-signal memory for AI agents in this workspace. Fresh sessions or subagents MUST read this file first before executing tasks to avoid context window degradation, hallucinations, or regressions.

---

## 1. System Invariants & Non-Negotiable Rules
1. **Protected Documentation Rule:**
   `PROJECT_ARCHITECTURE_DOCS.md` and `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` are critical project documents. Under no circumstances should any automated process, optimization, refactoring, or AI agent delete, relocate, or overwrite these files without explicit user instruction.
2. **Integration Audit Rule:**
   Any modification to third-party services, SDKs, APIs, packages, auth providers, or payment gateways MUST be recorded in `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
3. **Strict 3-State Task Execution:**
   Every task MUST cycle through `PLAN` -> `EXECUTE` -> `VERIFY`. Code modifications are only executed after inputs, targets, and criteria are documented. Tasks are never closed without running automated verification.
4. **Zero Functional Breakage:**
   Preserve existing application flow, business logic, authentication (Firebase Auth), and integrations.
5. **Pre-Merge / Task Gate:**
   `npx tsc --noEmit` must pass with 0 errors.

---

## 2. Core Project Architecture Summary
- **App:** Ruhvi Jewellery E-Commerce (`ruhvi-ecommerce`, Next.js 15 App Router, React 19, TypeScript, Tailwind CSS).
- **Database:** Supabase (PostgreSQL) is the sole database truth with RLS.
- **Auth:** Firebase Auth is the sole auth provider (Phone OTP, Email, Google OAuth, Facebook). Minted custom HS256 JWT for Supabase RLS. Supabase Auth is NOT used.
- **AI Engine:** Multi-provider failover routing (Gemini 3.5 Flash / Flash-Lite / Transcribe -> DeepSeek Reasoner/Chat).
- **Subdomains:** Host-based routing in `src/middleware.ts` (`ruhvi.in`, `admin.ruhvi.in`, `orders.ruhvi.in`, `accounts.ruhvi.in`, `support.ruhvi.in`, etc.).
- **Workflow Engine:** Get Shit Done (GSD) v1.20.1 (`@opengsd/gsd-core` + local runner engine).

---

## 3. Active Working Memory (Current State)
- **Active Phase:** `phase-01` — GSD Workflow Setup & Baseline Task 1 Verification
- **Current Task:** `TASK-002` (COMPLETED: `factorial` math utility in `src/lib/math_utils.ts` and Jest unit test in `src/lib/__tests__/math_utils.test.ts`)
- **Active Plan File:** [`GSD_PLAN.md`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/GSD_PLAN.md)
- **State File:** [`.gsd/state.json`](file:///c:/Users/INDIA/Desktop/Project%20Ruhvi/.gsd/state.json)

---

## 4. Completed Phases & Milestones Summary
| Phase / Milestone | Completion Date | Key Deliverables | Status |
| :--- | :---: | :--- | :---: |
| **Foundation & Core Setup** | Prior | Next.js 15, Supabase migrations, Firebase Auth, AI Co-Founder | Production |
| **Phase 01: GSD Setup** | In Progress | GSD Engine, directory architecture, 3-state tracking, verification runner | Active |
| **TASK-001** | 2026-11-06 | Bootstrapped GSD engine, configs, scripts, verification runner | COMPLETED |
| **TASK-002** | 2026-11-06 | Implemented `factorial(n)` utility + unit tests; verified via TypeScript & Jest | COMPLETED |

---

## 5. Critical Decisions Log (Immutable Decisions)
- **DEC-001 (2026-11-06):** Adopted `@opengsd/gsd-core` (v1.20.1) as the standardized AI context and spec-driven workflow framework with dual integration for Antigravity (`.agents`) and Cursor (`.cursor`).
- **DEC-002 (2026-11-06):** Implemented strict 3-state task lifecycle (`PLAN` -> `EXECUTE` -> `VERIFY`) backed by a dedicated CLI runner (`scripts/gsd-engine.mjs`) and dual shell wrappers (`gsd_runner.sh` and `gsd_runner.ps1`) to ensure seamless execution across Windows PowerShell and Unix/WSL environments.
- **DEC-003 (2026-11-06):** Context rot mitigation strategy: `GSD_CONTEXT.md` maintains a rolling summary of recent tasks (max 5 active), while historical phases are archived to `.gsd/history/`.
- **DEC-004 (2026-11-06):** Configured Ralph Loop autonomous execution & recovery engine (`ralph_loop.sh`, `ralph_loop.ps1`, `scripts/ralph-engine.mjs`, `RALPH_GOAL.md`, `RALPH_STATUS.json`) with stateless fresh context per iteration, 15-retry limit, automated failure recovery logging (`.ralph/run.log`), and emergency stop guards.
- **DEC-005 (2026-11-06):** Integrated CodeRabbit CLI (v0.9.2) and `.coderabbit.yaml` for real-time automated code quality & security reviews. Wired into `.husky/pre-commit` and `scripts/coderabbit-precommit.mjs` with `--gate major` blocking checks.
- **DEC-006 (2026-11-06):** Validated End-to-End Workflow Integration across GSD, Ralph Loop, and CodeRabbit on GitHub repo `Ruhvi2026/Ruhvi`. Verified token permissions (`repo`, `workflow`, admin), simulated transient failure recovery in Ralph Loop, verified GSD task lifecycle, and confirmed pre-commit gating.



---

## 6. Maintenance & Context Compaction Protocol
- When a task reaches `VERIFIED`, run `node scripts/gsd-engine.mjs summarize` (or `.\gsd_runner.ps1 summarize`).
- The engine appends the task resolution summary to `.gsd/history/`, purges transient scratch notes, and refreshes this document.
- Never let this file exceed 250 lines. Keep entries terse, factual, and high-signal.

