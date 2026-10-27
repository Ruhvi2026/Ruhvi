// self-audit-scheduler.mjs
// Ruhvi System Self-Audit — VM-side cron script
// Runs periodically on the VM instance (e.g., every 6 hours), calls the Ruhvi API to:
//   1. Execute 19 read-only checks across architecture, integration, security, and AI health
//   2. Deduplicate findings via SHA-256 in PostgreSQL and alert staff on regressions

import https from 'https';
import fs from 'fs';
import path from 'path';

// Load .env fallback if CRON_SECRET is not directly in process.env
function loadEnvFallback() {
  if (process.env.CRON_SECRET) return;
  for (const envFile of ['.env', '.env.local', '.env.production']) {
    try {
      const fullPath = path.resolve(process.cwd(), envFile);
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const line of content.split('\n')) {
          const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
          if (match) {
            const key = match[1];
            let value = match[2] || '';
            value = value.trim().replace(/^['"](.*)['"]$/, '$1');
            if (!process.env[key]) {
              process.env[key] = value;
            }
          }
        }
      }
    } catch {
      // Ignore file reading errors
    }
  }
}

loadEnvFallback();

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL    = process.env.RUHVI_ADMIN_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://ruhvi.in';
const ENDPOINT    = '/api/cron/self-audit';
const TIMEOUT_MS  = 40000;

if (!CRON_SECRET) {
  console.error(`[${new Date().toISOString()}] ERROR: CRON_SECRET is not set in environment or .env — aborting.`);
  process.exit(1);
}

const url = new URL(ENDPOINT, BASE_URL);

const options = {
  hostname: url.hostname,
  port:     url.port || (url.protocol === 'https:' ? 443 : 80),
  path:     url.pathname,
  method:   'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type':  'application/json',
    'User-Agent':    'ruhvi-vm-self-audit-cron/1.0',
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    const ts = new Date().toISOString();

    if (res.statusCode === 401) {
      console.error(`[${ts}] ERROR: Unauthorized — check CRON_SECRET on VM and server.`);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`[${ts}] ERROR: HTTP ${res.statusCode} — ${body.substring(0, 300)}`);
      return;
    }

    try {
      const json = JSON.parse(body);
      if (!json.success) {
        console.error(`[${ts}] ERROR: Self-audit execution failed — ${json.error || 'Unknown error'}`);
        return;
      }

      const report = json.data;
      console.log(
        `[${ts}] OK  run_id=${report.runId}  status=${report.overallStatus}  ` +
        `checks_total=${report.totalChecks}  passed=${report.passed}  warned=${report.warned}  ` +
        `failed=${report.failed}  duration_ms=${report.durationMs}`
      );
    } catch {
      console.log(`[${ts}] OK  HTTP ${res.statusCode} (non-JSON response)`);
    }
  });
});

req.on('error', (err) => {
  console.error(`[${new Date().toISOString()}] ERROR: Network error — ${err.message}`);
});

req.setTimeout(TIMEOUT_MS, () => {
  console.error(`[${new Date().toISOString()}] ERROR: Request timed out after ${TIMEOUT_MS / 1000}s`);
  req.destroy();
});

req.end();
