import https from 'node:https';
import { execSync } from 'node:child_process';

function extractToken() {
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;
  if (envToken) return envToken;
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    const match = remoteUrl.match(/https:\/\/[^:]+:([^@]+)@github\.com/);
    if (match && match[1]) return match[1];
  } catch {}
  return null;
}

const token = extractToken();
if (!token) {
  console.error('No GitHub token found');
  process.exit(1);
}

function githubGet(apiPath) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.github.com',
      path: apiPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Node-Actions-Monitor',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const commitSha = process.argv[2] || '5563262488f44fedb04a0973e7828a1eda561b3e';
  console.log(`Checking GitHub Actions runs for commit: ${commitSha}`);

  const res = await githubGet(`/repos/Ruhvi2026/Ruhvi/actions/runs?head_sha=${commitSha}`);
  if (res.status !== 200) {
    console.error(`Failed to fetch runs: HTTP ${res.status}`, res.body);
    return;
  }

  const runs = res.body.workflow_runs || [];
  if (runs.length === 0) {
    console.log('No workflow runs triggered yet for this commit.');
    return;
  }

  console.log(`Found ${runs.length} workflow run(s):`);
  for (const run of runs) {
    console.log(`\n• Run #${run.run_number} (${run.name}): ${run.status} | conclusion: ${run.conclusion}`);
    console.log(`  HTML URL: ${run.html_url}`);

    // Fetch jobs
    const jobsRes = await githubGet(`/repos/Ruhvi2026/Ruhvi/actions/runs/${run.id}/jobs`);
    if (jobsRes.status === 200 && jobsRes.body.jobs) {
      for (const job of jobsRes.body.jobs) {
        console.log(`    - Job "${job.name}": ${job.status} | conclusion: ${job.conclusion}`);
        for (const step of job.steps || []) {
          console.log(`        * Step: "${step.name}" (${step.status}${step.conclusion ? ' / ' + step.conclusion : ''})`);
        }
      }
    }
  }
}

main().catch(console.error);

