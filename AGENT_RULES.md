# AGENT_RULES.md — Universal Agent Operational Guidelines

> **Authority:** Standing instructions for all AI agents, subagents, and automated workers operating in `Project Ruhvi`.

---

## 1. Context Orientation & Startup Sequence
Whenever a session begins or a new subagent is spawned:
1. **Read `GSD_CONTEXT.md` immediately.** Do not make assumptions about project state from memory.
2. Check `GSD_PLAN.md` to identify the active phase and current task.
3. Verify that the task is in `PLAN` or `EXECUTE` before modifying files.

---

## 2. GSD (Get Shit Done) Operational Lifecycle
Work is strictly chunked into atomic tasks transitioning through three states:
```
[PLAN]  ──(Define inputs, targets, criteria)──>
[EXECUTE]  ──(Implement minimal atomic changes)──>
[VERIFY]  ──(Run gsd_runner verification gates)──>  [COMPLETED]
```

### State Contract:
- **State 1: PLAN**
  - Command: `.\gsd_runner.ps1 plan <TASK-ID> "<TITLE>"` (or `./gsd_runner.sh`)
  - Requirement: Define explicit inputs, target files, and falsifiable verification criteria.
  - Prohibition: No application code edits allowed in PLAN state.
- **State 2: EXECUTE**
  - Command: `.\gsd_runner.ps1 execute <TASK-ID>`
  - Requirement: Implement atomic changes adhering to TypeScript types.
- **State 3: VERIFY**
  - Command: `.\gsd_runner.ps1 verify <TASK-ID>`
  - Requirement: Automated gates run (`npx tsc --noEmit` + tests). Exit code must be 0.
  - Prohibition: Never commit or mark a task verified if the runner exits with code 1.

---

## 3. Context-Rot Mitigation & Compaction
- After completing a task or phase, execute: `.\gsd_runner.ps1 summarize`.
- This archives task logs into `.gsd/history/` and preserves only high-signal architectural decisions in `GSD_CONTEXT.md`.
- Never dump massive raw transcripts or long stack traces into `GSD_CONTEXT.md`.

---

## 4. Protected Assets & Architectural Rules
1. **Critical Documents:**
   - Under NO circumstances should any AI agent delete, relocate, or overwrite:
     - `PROJECT_ARCHITECTURE_DOCS.md`
     - `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`
2. **Integration Audit:**
   - If a package or third-party service is installed, removed, or configured, record it in `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
3. **Core Architecture Invariants:**
   - **Auth:** Firebase Auth is the sole provider. Supabase RLS is verified via custom minted HS256 JWTs.
   - **Database:** Supabase PostgreSQL is the primary source of truth.
   - **Runtime:** Next.js 15 App Router, React 19, TypeScript.

---

## 5. Ralph Loop Autonomous Execution & Recovery Protocol
When operating in a Ralph Loop session:
1. **Fresh Context Principle:** Each loop iteration starts with a clean context window. The agent relies exclusively on filesystem state: `RALPH_GOAL.md` (active objective), `RALPH_STATUS.json` (progress markers & error metrics), and `.ralph/run.log` (execution traces).
2. **Mandatory Status Persistence:**
   - At every checkpoint, the agent MUST update `RALPH_STATUS.json` with the current subtask, last exit code, and execution progress.
   - Never leave uncheckpointed state across loop boundaries.
3. **Completion Marker:**
   - Once all acceptance criteria in `RALPH_GOAL.md` pass verification (exit code 0), the agent must set `"status": "COMPLETED"` and append a completion marker `ralph-done-<timestamp>` in `RALPH_STATUS.json`.
4. **Safety & Emergency Stop:**
   - If an unfixable syntax or logic roadblock occurs, log the exact diagnostic trace to `.ralph/run.log` and avoid infinite retry spin.
   - Operators can halt the loop at any time by creating `.ralph/STOP` or executing `./ralph_loop.sh stop` (`.\ralph_loop.ps1 stop`).

---

## 6. CodeRabbit Real-Time Reviews & Security Audits
- **Autonomous Review Mandate:** After modifying code and prior to finalizing any task or commit, the agent MUST run the CodeRabbit review command:
  ```bash
  coderabbit review --uncommitted --gate major
  # or via npm shortcut:
  npm run review
  ```
- **Review Scope:** CodeRabbit inspects for code smells, potential race conditions, OWASP Top 10 vulnerabilities, command/SQL injection risks, and accidental secret exposures.
- **Blocking Violations:** Findings flagged at `major` or `critical` severity MUST be remediated in place before advancing state. The pre-commit hook automatically blocks git commits if critical security or syntax issues are detected.



