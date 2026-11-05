# GSD Workflow Execution Rule

## Core Instructions:
1. **Always read `GSD_CONTEXT.md` first:** Prior to executing code edits or planning next steps, read `GSD_CONTEXT.md` to retrieve current architectural invariants and active task context.
2. **Follow Strict 3-State Lifecycle:**
   - Every task must strictly transition: `PLAN` -> `EXECUTE` -> `VERIFY`.
   - Never skip the `VERIFY` step.
   - Run verification checks with `./gsd_runner.sh verify <task-id>` or `.\gsd_runner.ps1 verify <task-id>`.
3. **Protected Files:**
   - Never delete or modify `PROJECT_ARCHITECTURE_DOCS.md` or `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md` without explicit user permission.
   - Any dependency addition or change must be reflected in `PROJECT_SYSTEM_TOOLS_AND_SERVICES.md`.
4. **Context Compaction:**
   - After completing tasks, invoke `summarize` to roll completed items into `.gsd/history/` and keep `GSD_CONTEXT.md` concise.

