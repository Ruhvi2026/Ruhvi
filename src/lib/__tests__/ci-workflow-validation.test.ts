import fs from 'fs';
import path from 'path';

describe('CI Quality Gate Workflow Validation (Phase 61)', () => {
  const ciWorkflowPath = path.resolve(
    process.cwd(),
    '.github',
    'workflows',
    'ci.yml'
  );

  it('ensures .github/workflows/ci.yml exists and defines correct trigger events', () => {
    expect(fs.existsSync(ciWorkflowPath)).toBe(true);

    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Triggered on PRs and push to main
    expect(ciContent).toMatch(/pull_request:\s*branches:\s*\[main\]/);
    expect(ciContent).toMatch(/push:\s*branches:\s*\[main\]/);

    // Concurrency group to avoid wasted runner capacity
    expect(ciContent).toContain('cancel-in-progress: true');
  });

  it('reuses approved package.json scripts for verification steps', () => {
    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Verification steps
    expect(ciContent).toContain('run: npm ci');
    expect(ciContent).toContain('run: npm run lint');
    expect(ciContent).toContain('run: npm run typecheck');
    expect(ciContent).toContain('run: npm run test:ci');
    expect(ciContent).toContain('run: npm run build');
  });

  it('safely manages secrets and environment variables without printing real credentials', () => {
    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Uses safe CI dummy variables for Next.js build compilation
    expect(ciContent).toContain('NEXT_TELEMETRY_DISABLED: 1');
    expect(ciContent).toContain('dummy_anon_key_for_ci');
    expect(ciContent).toContain('dummy_service_role_key_for_ci');

    // Real production secret patterns must never appear in the workflow definition
    expect(ciContent).not.toMatch(/sbp_[a-zA-Z0-9]+/);
    expect(ciContent).not.toMatch(/sk_live_[a-zA-Z0-9]+/);
    expect(ciContent).not.toMatch(/ghp_[a-zA-Z0-9]+/);
  });

  it('strictly prohibits automated production deployment within the CI quality gate', () => {
    const ciContent = fs.readFileSync(ciWorkflowPath, 'utf-8');

    // Prohibit deployment commands
    expect(ciContent).not.toContain('vercel --prod');
    expect(ciContent).not.toContain('vercel deploy');
    expect(ciContent).not.toContain('ssh ');
    expect(ciContent).not.toContain('docker push');
    expect(ciContent).not.toContain('aws s3 sync');
  });
});
