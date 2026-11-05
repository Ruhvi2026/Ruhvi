# GSD Master Plan: [Feature / Milestone Title]

**Phase:** `[Phase Number / Identifier]`  
**Status:** `[DRAFT | ACTIVE | COMPLETED | BLOCKED]`  
**Last Synchronized:** `[YYYY-MM-DD HH:MM]`  
**Workflow Engine:** GSD Strict State Model (`PLAN` -> `EXECUTE` -> `VERIFY`)

---

## 1. Objective & Scope (লক্ষ্য ও পরিধি)
- **High-Level Purpose:** Terse, unambiguous description of what this feature accomplishes.
- **Success Criteria:** Falsifiable conditions that determine when this phase is done.
- **Non-Goals / Out of Scope:** Boundaries preventing scope creep.

---

## 2. Context & Invariants (প্রাসঙ্গিক তথ্য ও অপরিবর্তনীয় নিয়ম)
- **Architectural Constraints:** (e.g. Firebase Auth sole provider, Supabase RLS with custom JWT, Vercel Serverless runtime restrictions)
- **Protected Documentation:** Do not delete or overwrite `PROJECT_ARCHITECTURE_DOCS.md` or `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
- **Pre-execution Context Check:** Read `GSD_CONTEXT.md` before initiating any task.

---

## 3. Atomic Task Breakdown (পর্যায়ক্রমিক কাজের তালিকা)

All tasks must strictly cycle through:
`[PLAN]` -> `[EXECUTE]` -> `[VERIFY]` -> `[DONE]`

| Task ID | Task Title | State | Inputs | Primary Targets | Verification Gate |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **TASK-001** | [Task Title] | `PLAN` | Files, specs, data | Specific files/functions to change | `npx tsc --noEmit` + targeted test |
| **TASK-002** | [Task Title] | `PENDING` | Output of TASK-001 | Specific files/functions to change | `npx tsc --noEmit` + targeted test |
| **TASK-003** | [Task Title] | `PENDING` | Output of TASK-002 | Specific files/functions to change | `npx tsc --noEmit` + targeted test |

---

## 4. Execution Protocol & Verification Gates
1. **PLAN State:**
   - Define exact inputs, source files, and expected output types/signatures.
   - Specify target files and explicit falsifiable verification criteria.
2. **EXECUTE State:**
   - Implement the minimal atomic diff.
   - Maintain documentation integrity and avoid breaking changes.
3. **VERIFY State:**
   - Execute verification gate using `./gsd_runner.sh verify <task-id>` or `.\gsd_runner.ps1 verify <task-id>`.
   - Gate MUST pass with exit code 0 before advancing to the next task.
   - On failure: do NOT skip ahead; debug root cause in place.

---

## 5. Post-Task Context Rolling Strategy
Upon completing and verifying all subtasks in this plan:
1. Run `./gsd_runner.sh summarize` or `.\gsd_runner.ps1 summarize`.
2. Consolidate key architectural decisions and completed artifacts into `GSD_CONTEXT.md`.
3. Archive this plan into `.gsd/history/` or `plans/` to prevent context window pollution.

