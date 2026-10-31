import fs from 'fs';
import path from 'path';

describe('Performance Baseline Verification (Phase 57)', () => {
  const reportPath = path.resolve(
    process.cwd(),
    'reports',
    'performance-baseline-raw.json'
  );

  it('verifies that the raw performance baseline report exists and is valid', () => {
    expect(fs.existsSync(reportPath)).toBe(true);
    const content = fs.readFileSync(reportPath, 'utf-8');
    const data = JSON.parse(content);

    expect(data.auditDate).toBeDefined();
    expect(data.tooling).toContain('Playwright');
    expect(data.runCount).toBeGreaterThanOrEqual(3);
    expect(data.profiles).toContain('Desktop (Broadband)');
    expect(data.profiles).toContain('Mobile (Simulated 4G)');
  });

  it('validates Core Web Vitals measurements for Desktop (Broadband)', () => {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const desktopMatrix = data.matrix['Desktop (Broadband)'];
    expect(desktopMatrix).toBeDefined();

    const home = desktopMatrix['https://ruhvi.in'];
    expect(home).toBeDefined();
    expect(home.ttfb.median).toBeGreaterThan(0);
    expect(home.fcp.median).toBeGreaterThan(0);
    expect(home.lcp.median).toBeGreaterThan(0);
    expect(home.cls.median).toBeLessThanOrEqual(0.1); // Good CWV threshold
    expect(home.totalBytes.median).toBeGreaterThan(0);
    expect(home.primaryLcpElement).toBeDefined();
  });

  it('validates Core Web Vitals measurements for Mobile (Simulated 4G)', () => {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    const mobileMatrix = data.matrix['Mobile (Simulated 4G)'];
    expect(mobileMatrix).toBeDefined();

    const home = mobileMatrix['https://ruhvi.in'];
    expect(home).toBeDefined();
    expect(home.ttfb.median).toBeGreaterThan(0);
    expect(home.fcp.median).toBeGreaterThan(0);
    expect(home.lcp.median).toBeGreaterThan(0);
    expect(home.cls.median).toBeLessThanOrEqual(0.1); // Good CWV threshold
    expect(home.totalBytes.median).toBeGreaterThan(0);
  });

  it('verifies network resource payload breakdown is accurately categorized', () => {
    const data = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
    expect(data.individualRuns.length).toBeGreaterThanOrEqual(6);

    const sampleRun = data.individualRuns[0];
    const res = sampleRun.resourcesByType;
    expect(res.document).toBeDefined();
    expect(res.script).toBeDefined();
    expect(res.stylesheet).toBeDefined();
    expect(res.image).toBeDefined();
    expect(res.font).toBeDefined();

    // Verify script payload is the primary transfer component (>1 MB)
    expect(res.script.bytes).toBeGreaterThan(1000 * 1024);
  });
});
