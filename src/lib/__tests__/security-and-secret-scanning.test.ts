import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

describe('Security & Accidental Secret Exposure Scanning (Phase 62)', () => {
  const rootDir = process.cwd();
  const workflowPath = path.resolve(
    rootDir,
    '.github',
    'workflows',
    'security-scan.yml'
  );
  const packageJsonPath = path.resolve(rootDir, 'package.json');
  const scannerScriptPath = path.resolve(
    rootDir,
    'scripts',
    'scan-secrets.mjs'
  );

  it('ensures .github/workflows/security-scan.yml exists with approved triggers and jobs', () => {
    expect(fs.existsSync(workflowPath)).toBe(true);

    const workflowContent = fs.readFileSync(workflowPath, 'utf-8');

    // Trigger events
    expect(workflowContent).toMatch(/pull_request:\s*branches:\s*\[main\]/);
    expect(workflowContent).toMatch(/push:\s*branches:\s*\[main\]/);
    expect(workflowContent).toContain("cron: '0 4 * * 1'"); // Weekly schedule

    // Jobs
    expect(workflowContent).toContain('secret-scan:');
    expect(workflowContent).toContain('dependency-audit:');
    expect(workflowContent).toContain('node scripts/scan-secrets.mjs');
  });

  it('ensures package.json includes the security:scan script entry', () => {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    expect(pkg.scripts['security:scan']).toBe('node scripts/scan-secrets.mjs');
  });

  it('executes scan-secrets.mjs process against the current codebase with exit code 0', () => {
    expect(fs.existsSync(scannerScriptPath)).toBe(true);

    const output = execSync('node scripts/scan-secrets.mjs', {
      cwd: rootDir,
      encoding: 'utf-8',
    });

    expect(output).toContain('Executing Ruhvi Secret Exposure Scanner');
    expect(output).toContain(
      'PASS: No exposed credentials or secret patterns detected'
    );
  });

  it('guarantees that secret scanner masks values and never prints raw credentials', () => {
    const scannerScriptSource = fs.readFileSync(scannerScriptPath, 'utf-8');

    // Invariant: Outputs [VALUE_REDACTED] on findings, never raw token string
    expect(scannerScriptSource).toContain('[VALUE_REDACTED]');
    expect(scannerScriptSource).not.toContain('console.log(match[0])');
    expect(scannerScriptSource).not.toContain('console.error(match[0])');

    // Invariant: Remediation protocol (report & rotation, NOT automatic revocation)
    expect(scannerScriptSource).toContain(
      'rotate exposed credential in provider dashboard'
    );
    expect(scannerScriptSource).not.toContain('revokeSecret(');
  });
});
