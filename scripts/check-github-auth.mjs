import https from 'node:https';
import { execSync } from 'node:child_process';

function extractToken() {
  // 1. Check environment variables
  const envToken = process.env.GITHUB_TOKEN || process.env.GH_TOKEN || process.env.GITHUB_PAT;
  if (envToken) return { token: envToken, source: 'process.env' };

  // 2. Check git remote origin url
  try {
    const remoteUrl = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
    const match = remoteUrl.match(/https:\/\/[^:]+:([^@]+)@github\.com/);
    if (match && match[1]) {
      return { token: match[1], source: 'git remote origin credentials' };
    }
  } catch {}

  // 3. Check ~/.git-credentials
  try {
    const credsPath = execSync('powershell -NoProfile -Command "Resolve-Path ~/.git-credentials -ErrorAction SilentlyContinue"', { encoding: 'utf-8' }).trim();
    if (credsPath) {
      const content = execSync(`type "${credsPath}"`, { encoding: 'utf-8' });
      const m = content.match(/https:\/\/[^:]+:([^@]+)@github\.com/);
      if (m && m[1]) return { token: m[1], source: '~/.git-credentials' };
    }
  } catch {}

  return null;
}

function githubRequest(path, token) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node-GitHub-Verifier',
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let body = {};
        try { body = JSON.parse(data); } catch {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body
        });
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function verify() {
  console.log('=== GITHUB ACCESS & PERMISSION VERIFIER ===');
  const tokenData = extractToken();

  if (!tokenData) {
    console.error('GitHub Permissions: INVALID');
    console.error('Error: No GitHub token found in environment or git remote credentials.');
    process.exit(1);
  }

  const { token, source } = tokenData;
  const masked = `${token.slice(0, 4)}...${token.slice(-4)}`;
  console.log(`Token Source:     ${source}`);
  console.log(`Masked Token:     ${masked}`);

  // 1. Verify User Profile & Identity
  const userRes = await githubRequest('/user', token);
  if (userRes.statusCode !== 200) {
    console.error(`GitHub Permissions: INVALID`);
    console.error(`Auth Failed (Status ${userRes.statusCode}):`, userRes.body.message || userRes.body);
    process.exit(1);
  }

  const user = userRes.body;
  const scopesHeader = userRes.headers['x-oauth-scopes'] || '';
  const scopes = scopesHeader.split(',').map(s => s.trim()).filter(Boolean);

  console.log(`Identity:         ${user.login} (${user.name || 'Ruhvi Maintainer'})`);
  console.log(`Account ID:       ${user.id}`);
  console.log(`OAuth Scopes:     ${scopes.join(', ') || '(Full Access PAT)'}`);

  // 2. Verify Repository Permissions
  const repoRes = await githubRequest('/repos/Ruhvi2026/Ruhvi', token);
  if (repoRes.statusCode !== 200) {
    console.error(`GitHub Permissions: INVALID`);
    console.error(`Repository Access Failed (Status ${repoRes.statusCode}):`, repoRes.body.message || repoRes.body);
    process.exit(1);
  }

  const repo = repoRes.body;
  const perms = repo.permissions || {};
  const hasPush = perms.push === true;
  const hasPull = perms.pull === true;
  const hasAdmin = perms.admin === true;

  const hasRepoScope = scopes.length === 0 || scopes.includes('repo');
  const hasWorkflowScope = scopes.length === 0 || scopes.includes('workflow') || hasAdmin;

  console.log(`Target Repo:      ${repo.full_name} (${repo.private ? 'Private' : 'Public'})`);
  console.log(`Read Access:      ${hasPull ? 'YES' : 'NO'}`);
  console.log(`Write Access:     ${hasPush ? 'YES' : 'NO'}`);
  console.log(`Admin Access:     ${hasAdmin ? 'YES' : 'NO'}`);
  console.log(`Workflow Scope:   ${hasWorkflowScope ? 'YES' : 'NO'}`);
  console.log(`Pull Requests:    ${hasPush ? 'ACTIVE (Read & Write)' : 'READ ONLY'}`);

  const isValid = hasPull && hasPush && (scopes.length === 0 || scopes.includes('repo'));

  console.log('\n======================================================');
  console.log(`GitHub Permissions: ${isValid ? 'VALID' : 'INVALID'}`);
  console.log('======================================================\n');

  if (!isValid) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Verification failed:', err.message);
  process.exit(1);
});
