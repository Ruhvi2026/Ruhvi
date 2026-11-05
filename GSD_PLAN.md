# GSD Active Plan: Phase 01 — Workflow Setup & Initial Task Execution

**Phase ID:** `phase-01`  
**Phase Title:** GSD Workflow Engine & Baseline Verification  
**Status:** `ACTIVE`  
**Current Active Task:** `TASK-001`  
**Last Updated:** `2026-11-06`  
**State Model:** `PLAN` -> `EXECUTE` -> `VERIFY` (Strict Transition Enforced)

---

## 1. Phase Objective & Architectural Scope
- **Objective:** Fully operationalize the Get Shit Done (GSD) workflow engine in this workspace, wire automated verification gates, prevent context-rot via rolling memory, and verify Task 1 readiness.
- **Success Criteria:**
  1. Complete `.gsd/`, `plans/`, and `tasks/` directory architecture initialized.
  2. Strict 3-state task tracking operational (`PLAN` -> `EXECUTE` -> `VERIFY`).
  3. `GSD_CONTEXT.md` active as single source of rolling context memory.
  4. Agent instructions and lifecycle hooks established (`.cursorrules`, `AGENT_RULES.md`, `.agents/rules/gsd-workflow.md`).
  5. Cross-platform automated verification runner (`gsd_runner.sh` and `gsd_runner.ps1`) verified against workspace typecheck and state engine.

---

## 2. Invariants & Guardrails
- **Protected Documentation:** `PROJECT_ARCHITECTURE_DOCS.md` and `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` must NEVER be deleted or overwritten without explicit instruction.
- **Zero Functional Breakage:** No existing authentication, business logic, or third-party integrations may be altered.
- **Context Rot Mitigation:** The agent must ALWAYS read `GSD_CONTEXT.md` before executing new tasks or subagent commands.

---

## 3. Atomic Task Matrix

| Task ID | Task Title | State | Inputs | Primary Targets | Verification Criteria |
| :--- | :--- | :---: | :--- | :--- | :--- |
| **TASK-001** | Bootstrap GSD Core & Infrastructure Setup | `VERIFY` | Repository configuration, @opengsd/gsd-core | `.gsd/`, `plans/`, `tasks/`, `GSD_PLAN.md`, `GSD_CONTEXT.md` | Directories exist, config/state JSON valid, templates created |
| **TASK-002** | Implement GSD CLI Engine & Automated Runners | `EXECUTE` | Node.js runtime, PowerShell, Bash | `scripts/gsd-engine.mjs`, `gsd_runner.ps1`, `gsd_runner.sh` | Engine executes `plan`, `execute`, `verify`, and `status` with 0 exit code |
| **TASK-003** | Configure Agent System Rules & Context Hooks | `PLAN` | Agent system guidelines, `.cursorrules` | `.cursorrules`, `AGENT_RULES.md`, `.agents/rules/gsd-workflow.md` | Agent rules instruct strict `GSD_CONTEXT.md` consultation and 3-state adherence |
| **TASK-004** | End-to-End Workflow Verification & Task 1 Signoff | `PENDING` | Complete GSD suite | State machine validation & typecheck | Runner passes all gates, workspace clean, ready for next task |

---

## 4. Execution State Details

### TASK-001: Bootstrap GSD Core & Infrastructure Setup
- **State:** `VERIFY`
- **Inputs:** Workspace directory structure, `@opengsd/gsd-core` v1.20.1.
- **Targets:** `.gsd/config.json`, `.gsd/state.json`, `.gsd/templates/`, `plans/`, `tasks/`.
- **Verification Gate:** State validation via GSD CLI engine.

### TASK-002: Implement GSD CLI Engine & Automated Runners
- **State:** `EXECUTE`
- **Inputs:** `scripts/gsd-engine.mjs`, PowerShell 7 / Windows PowerShell, POSIX shell.
- **Targets:** `scripts/gsd-engine.mjs`, `gsd_runner.ps1`, `gsd_runner.sh`, `package.json`.
- **Verification Gate:** Automated test run of runner commands (`status`, `verify`).

### TASK-003: Configure Agent System Rules & Context Hooks
- **State:** `PLAN`
- **Inputs:** User request instructions, workspace architecture rules.
- **Targets:** `.cursorrules`, `AGENT_RULES.md`, `.agents/rules/gsd-workflow.md`.
- **Verification Gate:** Rule files verified against Antigravity and Cursor conventions.

### TASK-004: End-to-End Workflow Verification & Task 1 Signoff
- **State:** `PENDING`
- **Inputs:** Complete workflow setup.
- **Targets:** `GSD_CONTEXT.md`, `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
- **Verification Gate:** Full typecheck (`npx tsc --noEmit`) and verification report.

