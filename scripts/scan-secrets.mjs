#!/usr/bin/env node

/**
 * ============================================================================
 * ACCIDENTAL SECRET EXPOSURE SCANNER (PHASE 62)
 * ============================================================================
 * Low-noise, deterministic scanner for accidental credential exposure.
 *
 * SAFETY INVARIANTS:
 * 1. NEVER prints detected secret values (always outputs [REDACTED_SECRET]).
 * 2. Never executes automatic revocation — triggers report/rotation protocol.
 * 3. Safe ignore lists for test files, mock configs, and build artifacts.
 */

import fs from 'fs';
import path from 'path';

const ROOT_DIR = process.cwd();

// Directories to skip
const IGNORE_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  '.kilo',
  'coverage',
  'dist',
  'build',
  'reports',
  '.agents',
  '.gemini',
]);

// File extensions to skip (binaries, media, lockfiles)
const IGNORE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ico',
  '.svg',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.mp3',
  '.mp4',
  '.pdf',
  '.lock',
]);

// Ignored files (safe dummy fixtures, examples, docs, etc.)
const IGNORE_FILES = new Set([
  'package-lock.json',
  '.env.example',
  '.env.local.example',
  'ci.yml', // CI mock build variables
]);

// Regex patterns for secret detection
const SECRET_RULES = [
  {
    name: 'Private Encryption / RSA Key',
    // Matches actual PEM key containing base64 encoded cryptographic payload
    regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----(?:[\r\n\s]+(?:Proc-Type:.*|DEK-Info:.*)?)*[\r\n\s]+[A-Za-z0-9+/]{30,}/g,
  },
  {
    name: 'GitHub Personal Access Token',
    regex: /(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{36,255}/g,
  },
  {
    name: 'Stripe Live Secret Key',
    regex: /sk_live_[0-9a-zA-Z]{24,}/g,
  },
  {
    name: 'Razorpay Live Key / Secret',
    regex: /rzp_live_[0-9a-zA-Z]{14,}/g,
  },
  {
    name: 'Supabase Project Service Token',
    regex: /sbp_[a-zA-Z0-9]{40}/g,
  },
  {
    name: 'LiveKit Secret Key',
    regex: /API[a-zA-Z0-9]{16}:[a-zA-Z0-9]{32}/g,
  },
  {
    name: 'Slack Webhook URL',
    regex: /https:\/\/hooks\.slack\.com\/services\/T[a-zA-Z0-9_]{8,}\/B[a-zA-Z0-9_]{8,}\/[a-zA-Z0-9_]{24}/g,
  },
];

// Helper to determine if a file is a test or mock file
function isTestOrMockFile(filePath) {
  const norm = filePath.replace(/\\/g, '/');
  return (
    norm.includes('/__tests__/') ||
    norm.includes('/tests/') ||
    norm.endsWith('.test.ts') ||
    norm.endsWith('.test.tsx') ||
    norm.endsWith('.test.js') ||
    norm.endsWith('.spec.ts') ||
    norm.endsWith('.spec.tsx') ||
    norm.endsWith('.mock.ts') ||
    norm.endsWith('.stub.ts')
  );
}

function scanFile(filePath) {
  const findings = [];
  const content = fs.readFileSync(filePath, 'utf-8');

  // Skip files containing obvious safe test/mock tokens throughout
  if (
    content.includes('MOCK_TEST_FIXTURE') ||
    content.includes('DUMMY_CREDENTIAL_FOR_TESTS')
  ) {
    return findings;
  }

  for (const rule of SECRET_RULES) {
    rule.regex.lastIndex = 0;
    let match;
    while ((match = rule.regex.exec(content)) !== null) {
      const matchIndex = match.index;
      const matchedString = match[0];

      // Ignore if match contains dummy or mock prefix
      if (
        matchedString.includes('dummy_') ||
        matchedString.includes('mock_') ||
        matchedString.includes('example_') ||
        matchedString.includes('0123456789abcdef')
      ) {
        continue;
      }

      // Compute line number
      const lineNumber = content.slice(0, matchIndex).split('\n').length;
      findings.push({
        rule: rule.name,
        file: path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'),
        line: lineNumber,
      });
    }
  }

  return findings;
}

function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);

  for (const item of list) {
    if (IGNORE_DIRS.has(item)) continue;

    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(walkDir(fullPath));
    } else {
      const ext = path.extname(item).toLowerCase();
      if (IGNORE_EXTENSIONS.has(ext)) continue;
      if (IGNORE_FILES.has(item)) continue;
      if (isTestOrMockFile(fullPath)) continue;

      results.push(fullPath);
    }
  }

  return results;
}

export function runSecretScan() {
  const allFiles = walkDir(ROOT_DIR);
  const allFindings = [];

  for (const file of allFiles) {
    const findings = scanFile(file);
    if (findings.length > 0) {
      allFindings.push(...findings);
    }
  }

  return {
    scannedFilesCount: allFiles.length,
    findings: allFindings,
  };
}

// CLI Execution entry
if (process.argv[1] && process.argv[1].endsWith('scan-secrets.mjs')) {
  console.log('🔍 Executing Ruhvi Secret Exposure Scanner (Phase 62)...');
  const result = runSecretScan();

  console.log(`📁 Scanned ${result.scannedFilesCount} files.`);

  if (result.findings.length === 0) {
    console.log('✅ PASS: No exposed credentials or secret patterns detected.');
    process.exit(0);
  } else {
    console.error(`❌ FAILED: Detected ${result.findings.length} potential secret pattern(s):`);
    for (const f of result.findings) {
      // INVARIANT: NEVER print detected secret value
      console.error(`  - [${f.rule}] in ${f.file}:${f.line} -> [VALUE_REDACTED]`);
    }
    console.error('\n⚠️ Remediation protocol: Check file, rotate exposed credential in provider dashboard, and purge git history if committed.');
    process.exit(1);
  }
}
