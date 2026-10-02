// task-scheduler.mjs
// Ruhvi Task Scheduler — VM-side cron script
// Runs every 15 minutes on the VM, calls the Ruhvi API to:
//   1. Generate daily/weekly/monthly recurring task instances at their configured trigger_time
//   2. Send overdue/deadline reminder notifications to assigned staff

import https from 'https';

const CRON_SECRET = process.env.CRON_SECRET;
const BASE_URL    = process.env.RUHVI_ADMIN_URL || 'https://admin.ruhvi.in';
const ENDPOINT    = '/api/cron/task-scheduler';
const TIMEOUT_MS  = 30000;

if (!CRON_SECRET) {
  console.error(`[${new Date().toISOString()}] ERROR: CRON_SECRET is not set in .env — aborting.`);
  process.exit(1);
}

const url = new URL(ENDPOINT, BASE_URL);

const options = {
  hostname: url.hostname,
  port:     443,
  path:     url.pathname,
  method:   'GET',
  headers: {
    'Authorization': `Bearer ${CRON_SECRET}`,
    'Content-Type':  'application/json',
    'User-Agent':    'ruhvi-vm-cron/1.0',
  },
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => (body += chunk));
  res.on('end', () => {
    const ts = new Date().toISOString();

    if (res.statusCode === 401) {
      console.error(`[${ts}] ERROR: Unauthorized — check CRON_SECRET in .env`);
      return;
    }

    if (res.statusCode !== 200) {
      console.error(`[${ts}] ERROR: HTTP ${res.statusCode} — ${body.substring(0, 300)}`);
      return;
    }

    try {
      const json      = JSON.parse(body);
      const generated = json.tasksGenerated ?? 0;
      const reminders = json.remindersSent  ?? 0;
      const errors    = json.errors         ?? [];
      console.log(`[${ts}] OK  tasks_generated=${generated}  reminders_sent=${reminders}`);
      if (errors.length > 0) {
        console.warn(`[${ts}] WARN  errors (${errors.length}): ${errors.join(' | ')}`);
      }
    } catch {
      console.log(`[${ts}] OK  HTTP ${res.statusCode} (no JSON body)`);
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
