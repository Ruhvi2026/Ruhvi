# GSD Tasks Directory

This directory stores atomic task manifests tracking their strict state progression:
`PLAN` -> `EXECUTE` -> `VERIFY` -> `COMPLETED`.

## Automation
- Tasks are managed via `scripts/gsd-engine.mjs` or `.\gsd_runner.ps1`.
- To plan a task: `.\gsd_runner.ps1 plan <task-id> "<title>"`
- To start execution: `.\gsd_runner.ps1 execute <task-id>`
- To verify and close: `.\gsd_runner.ps1 verify <task-id>`

