#!/usr/bin/env node
/**
 * CodeRabbit Pre-Commit Review & Security Audit Hook
 * Enforces automated code quality inspections, OWASP checks, and secret exposure guards
 */

import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

const ROOT_DIR = process.cwd();

console.log('\n\x1b[35m[CodeRabbit Pre-Commit Guard]\x1b[0m Inspecting staged changes for security and quality issues...');

function isCliAvailable() {
  try {
    execSync('coderabbit --version', { stdio: ['ignore', 'pipe', 'pipe'] });
    return true;
  } catch {
    try {
      execSync('cr --version', { stdio: ['ignore', 'pipe', 'pipe'] });
      return true;
    } catch {
      return false;
    }
  }
}

function isAuthenticated() {
  if (process.env.CODERABBIT_API_KEY) {
    return true;
  }
  try {
    const output = execSync('coderabbit auth status', {
      stdio: ['ignore', 'pipe', 'pipe'],
      encoding: 'utf-8'
    });
    return !output.includes('signed out') && output.includes('User info');
  } catch {
    return false;
  }
}

function runLocalSecurityAudit() {
  console.log('  \x1b[34m[Local Security Audit]\x1b[0m Scanning for accidental secret exposures...');
  const secretScannerPath = path.join(ROOT_DIR, 'scripts', 'scan-secrets.mjs');
  if (fs.existsSync(secretScannerPath)) {
    try {
      execSync('node scripts/scan-secrets.mjs', {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe']
      });
      console.log('  \x1b[32m✓\x1b[0m No secrets or credential exposures detected.');
    } catch (err) {
      console.error('\n\x1b[31m[CRITICAL SECURITY BLOCK]\x1b[0m Secret scanner detected exposed credentials!');
      console.error(err.stdout?.toString() || err.stderr?.toString() || err.message);
      process.exit(1);
    }
  }
}

function runStaticCodeAudit(stagedFiles) {
  console.log('  \x1b[34m[Code Quality & Vulnerability Scan]\x1b[0m Inspecting staged source code...');
  const suspiciousPatterns = [
    { name: 'Dangerous dynamic evaluation (eval)', regex: /(?<![\.\w$])eval\s*\(/g },
    { name: 'Hardcoded debugger breakpoint', regex: /\bdebugger\s*;/g },
    { name: 'Deliberate test/dummy bug marker', regex: /\bCODERABBIT_BUG\b/g },
  ];

  let violationsFound = false;

  for (const file of stagedFiles) {
    if (!fs.existsSync(file)) continue;
    const normalized = file.replace(/\\/g, '/');
    if (
      normalized.includes('/vendor/') ||
      normalized.includes('vendor/') ||
      normalized.startsWith('.cursor/') ||
      normalized.startsWith('.agents/') ||
      normalized.startsWith('.ralph/')
    ) {
      continue;
    }
    const ext = path.extname(file).toLowerCase();
    if (!['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'].includes(ext)) continue;

    const content = fs.readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((lineText, idx) => {
      for (const pattern of suspiciousPatterns) {
        pattern.regex.lastIndex = 0;
        if (pattern.regex.test(lineText)) {
          console.error(`  \x1b[31m✗ [CRITICAL/MAJOR FINDING]\x1b[0m ${file}:${idx + 1} - ${pattern.name}`);
          console.error(`    > ${lineText.trim()}`);
          violationsFound = true;
        }
      }
    });
  }

  if (violationsFound) {
    console.error('\n\x1b[31m[CODERABBIT PRE-COMMIT BLOCK]\x1b[0m Code quality/security check failed on staged files.');
    console.error('Resolve the flagged issues above before committing.\n');
    process.exit(1);
  }

  console.log('  \x1b[32m✓\x1b[0m No critical code smells or anti-patterns detected in staged files.');
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only --diff-filter=ACM', {
      cwd: ROOT_DIR,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return output.split('\n').map(s => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

async function main() {
  const stagedFiles = getStagedFiles();
  if (stagedFiles.length === 0) {
    console.log('  \x1b[33m[!]\x1b[0m No staged changes detected to audit.');
    return;
  }
  console.log(`  Auditing ${stagedFiles.length} staged file(s)...`);

  if (!isCliAvailable()) {
    console.warn('  \x1b[33m[!]\x1b[0m CodeRabbit CLI not detected in PATH. Falling back to local security audit.');
    runLocalSecurityAudit();
    runStaticCodeAudit(stagedFiles);
    console.log('\x1b[32m✓\x1b[0m Pre-commit audit passed.\n');
    return;
  }

  const authenticated = isAuthenticated();

  if (authenticated) {
    console.log('  \x1b[34m[CodeRabbit Review]\x1b[0m Running automated AI inspection (--gate major)...');
    try {
      const output = execSync('coderabbit review --uncommitted --gate major', {
        cwd: ROOT_DIR,
        stdio: ['ignore', 'pipe', 'pipe'],
        encoding: 'utf-8'
      });
      console.log(output);
      console.log('  \x1b[32m✓\x1b[0m CodeRabbit review passed. No critical or major findings.');
    } catch (err) {
      if (err.status === 2) {
        console.error('\n\x1b[31m[CODERABBIT GATE VIOLATION]\x1b[0m Code review blocked commit due to major/critical findings:');
        console.error(err.stdout?.toString() || err.stderr?.toString() || '');
        console.error('\nResolve the flagged issues above before committing.\n');
        process.exit(1);
      } else {
        console.warn('  \x1b[33m[!]\x1b[0m CodeRabbit review returned non-blocking code:', err.status);
      }
    }
  } else {
    console.log('  \x1b[33m[Notice]\x1b[0m CodeRabbit CLI is installed, but no active cloud session was detected.');
    console.log('  To enable real-time cloud AI code reviews: run `coderabbit auth login` or set `CODERABBIT_API_KEY`.');
    runLocalSecurityAudit();
    runStaticCodeAudit(stagedFiles);
  }

  console.log('\x1b[32m✓\x1b[0m CodeRabbit pre-commit inspection completed successfully.\n');
}

main().catch((err) => {
  console.error('\x1b[31mError in pre-commit hook:\x1b[0m', err);
  process.exit(1);
});
