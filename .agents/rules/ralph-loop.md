# Ralph Loop Autonomous Execution Rule

## Instructions for Antigravity Agents:
1. **Detecting a Ralph Loop Session:**
   - If `RALPH_GOAL.md` and `RALPH_STATUS.json` are present, you are participating in an autonomous goal-oriented execution loop.
2. **Stateless Iteration & Persistent Checkpoints:**
   - Always read `RALPH_GOAL.md` to identify the current goal and acceptance criteria.
   - Read `RALPH_STATUS.json` for current iteration index, error streak, and last exit code.
   - At each checkpoint, write your progress update to `RALPH_STATUS.json`.
3. **Completion & Safety Guards:**
   - When all tasks in `RALPH_GOAL.md` pass verification (`npx tsc --noEmit` and criteria checks), set `"status": "COMPLETED"` and write a `completion_marker: "ralph-done-<timestamp>"`.
   - Never enter an infinite loop on unfixable errors; write the error trace to `.ralph/run.log`.
   - Obey emergency stop if `.ralph/STOP` is created.
