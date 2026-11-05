# CodeRabbit Review & Pre-Commit Security Rule

## Instructions for Antigravity Agents:
1. **Automated Review Execution:**
   - After implementing or modifying application code, run `coderabbit review --uncommitted --gate major` (or `npm run review`).
2. **Review Scope & Severity Gates:**
   - CodeRabbit scans for OWASP Top 10 vulnerabilities, command/SQL injections, data race conditions, memory leaks, and secret exposures.
   - Any finding at `critical` or `major` severity must be fixed in the code before task completion.
3. **Pre-Commit Enforcement:**
   - Pre-commit hooks via Husky (`.husky/pre-commit`) execute `node scripts/coderabbit-precommit.mjs` to block commits containing high-severity issues.
