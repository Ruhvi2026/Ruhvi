import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

/**
 * ============================================================================
 * REPRODUCIBLE PERFORMANCE BASELINE MEASUREMENT TOOL (PHASE 57)
 * ============================================================================
 * Executes multi-run performance audits capturing W3C Navigation & Core Web
 * Vitals (TTFB, FCP, LCP, CLS) alongside comprehensive network payload stats.
 */

const TARGET_URLS = [
  'https://ruhvi.in',
  'https://ruhvi.in/products',
  'https://ruhvi.in/contact',
];

const RUN_COUNT = 3;

const PROFILES = [
  {
    name: 'Desktop (Broadband)',
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
  },
  {
    name: 'Mobile (Simulated 4G)',
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    throttling: {
      latency: 120, // 120ms round-trip latency
      downloadRate: (4 * 1024 * 1024) / 8, // 4 Mbps
      uploadRate: (1.5 * 1024 * 1024) / 8, // 1.5 Mbps
    },
  },
];

async function measureSingleRun(browser, url, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    userAgent: profile.userAgent,
  });

  const page = await context.newPage();

  // If throttling is configured, route via CDP session
  if (profile.throttling) {
    try {
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: profile.throttling.latency,
        downloadThroughput: profile.throttling.downloadRate,
        uploadThroughput: profile.throttling.uploadRate,
      });
    } catch (e) {
      console.warn('CDP throttling not available, continuing with standard conditions');
    }
  }

  // Network tracking
  const networkRequests = [];
  const resourcesByType = {
    document: { count: 0, bytes: 0 },
    script: { count: 0, bytes: 0 },
    stylesheet: { count: 0, bytes: 0 },
    image: { count: 0, bytes: 0 },
    font: { count: 0, bytes: 0 },
    fetch_xhr: { count: 0, bytes: 0 },
    other: { count: 0, bytes: 0 },
  };

  page.on('response', async (res) => {
    try {
      const type = res.request().resourceType();
      const headers = res.headers();
      const contentLength = parseInt(headers['content-length'] || '0', 10);
      let size = contentLength;

      if (!size) {
        try {
          const body = await res.body();
          size = body.length;
        } catch {
          size = 0;
        }
      }

      networkRequests.push({
        url: res.url(),
        type,
        status: res.status(),
        size,
      });

      if (type === 'document') {
        resourcesByType.document.count++;
        resourcesByType.document.bytes += size;
      } else if (type === 'script') {
        resourcesByType.script.count++;
        resourcesByType.script.bytes += size;
      } else if (type === 'stylesheet') {
        resourcesByType.stylesheet.count++;
        resourcesByType.stylesheet.bytes += size;
      } else if (type === 'image') {
        resourcesByType.image.count++;
        resourcesByType.image.bytes += size;
      } else if (type === 'font') {
        resourcesByType.font.count++;
        resourcesByType.font.bytes += size;
      } else if (type === 'fetch' || type === 'xhr') {
        resourcesByType.fetch_xhr.count++;
        resourcesByType.fetch_xhr.bytes += size;
      } else {
        resourcesByType.other.count++;
        resourcesByType.other.bytes += size;
      }
    } catch {}
  });

  // Inject performance observer before navigation to catch early paint & LCP
  await page.addInitScript(() => {
    window.__cwv = {
      fcp: null,
      lcp: null,
      cls: 0,
      lcpElement: null,
      lcpSize: 0,
    };

    try {
      const paintObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (entry.name === 'first-contentful-paint') {
            window.__cwv.fcp = entry.startTime;
          }
        }
      });
      paintObserver.observe({ type: 'paint', buffered: true });

      const lcpObserver = new PerformanceObserver((entryList) => {
        const entries = entryList.getEntries();
        if (entries.length > 0) {
          const latest = entries[entries.length - 1];
          window.__cwv.lcp = latest.renderTime || latest.loadTime || latest.startTime;
          window.__cwv.lcpSize = latest.size;
          if (latest.element) {
            window.__cwv.lcpElement = latest.element.tagName + (latest.element.className ? '.' + latest.element.className.slice(0, 50) : '');
          }
        }
      });
      lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });

      const clsObserver = new PerformanceObserver((entryList) => {
        for (const entry of entryList.getEntries()) {
          if (!entry.hadRecentInput) {
            window.__cwv.cls += entry.value;
          }
        }
      });
      clsObserver.observe({ type: 'layout-shift', buffered: true });
    } catch (e) {
      console.error('PerformanceObserver setup error:', e);
    }
  });

  const startTime = Date.now();
  await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  // Extra wait to allow full settlement of layout shift and LCP
  await page.waitForTimeout(3000);

  const metrics = await page.evaluate(() => {
    const navEntries = performance.getEntriesByType('navigation');
    const nav = navEntries.length > 0 ? navEntries[0] : null;

    return {
      ttfb: nav ? nav.responseStart - nav.requestStart : 0,
      domInteractive: nav ? nav.domInteractive : 0,
      domContentLoaded: nav ? nav.domContentLoadedEventEnd : 0,
      loadEventEnd: nav ? nav.loadEventEnd : 0,
      cwv: window.__cwv || {},
    };
  });

  await context.close();

  const totalBytes = Object.values(resourcesByType).reduce((acc, r) => acc + r.bytes, 0);

  return {
    url,
    profile: profile.name,
    timestamp: new Date().toISOString(),
    ttfb: Math.round(metrics.ttfb),
    fcp: Math.round(metrics.cwv.fcp || 0),
    lcp: Math.round(metrics.cwv.lcp || 0),
    cls: parseFloat((metrics.cwv.cls || 0).toFixed(4)),
    lcpElement: metrics.cwv.lcpElement || 'Unknown',
    lcpSize: metrics.cwv.lcpSize || 0,
    domContentLoaded: Math.round(metrics.domContentLoaded),
    loadEventEnd: Math.round(metrics.loadEventEnd),
    totalRequests: networkRequests.length,
    totalBytes,
    resourcesByType,
  };
}

function computeAggregate(runs) {
  const count = runs.length;
  if (count === 0) return null;

  const medianOf = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };

  const avgOf = (arr) => Math.round(arr.reduce((a, b) => a + b, 0) / count);

  return {
    runsCount: count,
    ttfb: {
      median: medianOf(runs.map((r) => r.ttfb)),
      avg: avgOf(runs.map((r) => r.ttfb)),
      min: Math.min(...runs.map((r) => r.ttfb)),
      max: Math.max(...runs.map((r) => r.ttfb)),
    },
    fcp: {
      median: medianOf(runs.map((r) => r.fcp)),
      avg: avgOf(runs.map((r) => r.fcp)),
      min: Math.min(...runs.map((r) => r.fcp)),
      max: Math.max(...runs.map((r) => r.fcp)),
    },
    lcp: {
      median: medianOf(runs.map((r) => r.lcp)),
      avg: avgOf(runs.map((r) => r.lcp)),
      min: Math.min(...runs.map((r) => r.lcp)),
      max: Math.max(...runs.map((r) => r.lcp)),
    },
    cls: {
      median: parseFloat(medianOf(runs.map((r) => r.cls)).toFixed(4)),
      avg: parseFloat((runs.reduce((a, b) => a + b.cls, 0) / count).toFixed(4)),
    },
    totalBytes: {
      median: medianOf(runs.map((r) => r.totalBytes)),
      avg: avgOf(runs.map((r) => r.totalBytes)),
    },
    totalRequests: {
      median: medianOf(runs.map((r) => r.totalRequests)),
      avg: avgOf(runs.map((r) => r.totalRequests)),
    },
    primaryLcpElement: runs[0]?.lcpElement,
  };
}

async function main() {
  console.log('Starting Phase 57 Performance Baseline Audit...');
  console.log(`Date: ${new Date().toISOString()}`);
  console.log(`Runs per combination: ${RUN_COUNT}`);

  const browser = await chromium.launch({ headless: true });
  const allResults = [];
  const matrix = {};

  for (const profile of PROFILES) {
    matrix[profile.name] = {};
    for (const url of TARGET_URLS) {
      console.log(`\nMeasuring [${profile.name}] on ${url}...`);
      const runs = [];
      for (let i = 1; i <= RUN_COUNT; i++) {
        process.stdout.write(`  Run ${i}/${RUN_COUNT}... `);
        try {
          const runResult = await measureSingleRun(browser, url, profile);
          runs.push(runResult);
          allResults.push(runResult);
          console.log(`TTFB: ${runResult.ttfb}ms | FCP: ${runResult.fcp}ms | LCP: ${runResult.lcp}ms | CLS: ${runResult.cls}`);
        } catch (err) {
          console.log(`Error: ${err.message}`);
        }
      }
      matrix[profile.name][url] = computeAggregate(runs);
    }
  }

  await browser.close();

  const reportDir = path.resolve(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const rawData = {
    auditDate: new Date().toISOString(),
    tooling: 'Playwright Chromium Headless + W3C Navigation & Core Web Vitals PerformanceObserver',
    runCount: RUN_COUNT,
    profiles: PROFILES.map((p) => p.name),
    targetUrls: TARGET_URLS,
    matrix,
    individualRuns: allResults,
  };

  const rawFile = path.join(reportDir, 'performance-baseline-raw.json');
  fs.writeFileSync(rawFile, JSON.stringify(rawData, null, 2));

  console.log(`\n[SUCCESS] Raw baseline evidence written to ${rawFile}`);
  console.log('\n================ BASELINE SUMMARY MATRIX ================');
  for (const [profileName, urls] of Object.entries(matrix)) {
    console.log(`\nPROFILE: ${profileName}`);
    for (const [url, agg] of Object.entries(urls)) {
      if (!agg) continue;
      console.log(`  URL: ${url}`);
      console.log(`    TTFB:    ${agg.ttfb.median}ms (avg: ${agg.ttfb.avg}ms)`);
      console.log(`    FCP:     ${agg.fcp.median}ms (avg: ${agg.fcp.avg}ms)`);
      console.log(`    LCP:     ${agg.lcp.median}ms (avg: ${agg.lcp.avg}ms)`);
      console.log(`    CLS:     ${agg.cls.median}`);
      console.log(`    Payload: ${(agg.totalBytes.median / 1024).toFixed(1)} KB across ${agg.totalRequests.median} requests`);
      console.log(`    LCP Elm: ${agg.primaryLcpElement}`);
    }
  }
}

main().catch((err) => {
  console.error('Fatal benchmark execution error:', err);
  process.exit(1);
});

