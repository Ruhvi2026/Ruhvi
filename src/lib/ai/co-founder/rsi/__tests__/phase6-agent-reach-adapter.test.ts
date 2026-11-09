jest.mock('server-only', () => ({}));

import { spawn } from 'child_process';
import { AgentReachAdapter } from '../adapters/agent-reach';
import { researchProviderRouter } from '../provider-router';
import { executeCoFounderTool } from '../../tool-bridge';
import { assertToolPermission } from '@/lib/ai/mcp-auth';
import { CO_FOUNDER_TOOL_DECLARATIONS } from '../../brain';

// Mock child_process spawn
jest.mock('child_process', () => {
  const original = jest.requireActual('child_process');
  return {
    ...original,
    spawn: jest.fn(),
  };
});

// Mock Supabase service
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
  })),
}));

describe('Phase 6: Controlled Agent Reach Adapter & Public Discussion Search', () => {
  const originalEnv = process.env;
  let mockSpawn: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = {
      ...originalEnv,
      RSI_ENABLED: 'true',
      AGENT_REACH_ENABLED: 'true',
      RESEARCH_ALLOW_PAID_PROVIDERS: 'false',
      RESEARCH_AUTORECHARGE: 'false',
    };
    mockSpawn = spawn as unknown as jest.Mock;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Subcommand Allowlist & Strict Read-Only Guard', () => {
    it('allows read-only subcommands: version, channels, read, update', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });

      // Mock successful version command
      mockSpawn.mockImplementation(() => {
        const stdout = {
          on: jest.fn((event, cb) => {
            if (event === 'data') cb(Buffer.from('agent-reach 1.6.2\n'));
          }),
        };
        const stderr = { on: jest.fn() };
        return {
          stdout,
          stderr,
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
          kill: jest.fn(),
        };
      });

      const result = await adapter.inspect();
      expect(result.installed).toBe(true);
      expect(result.version).toBe('agent-reach 1.6.2');
    });

    it('rejects forbidden subcommands (post, send, publish, delete) with security exception', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });

      // Execute private executeCommand using invalid subcommand
      await expect(
        (adapter as any).executeCommand('post', ['status update'])
      ).rejects.toThrow(/Security Exception.*allowlist/i);

      await expect(
        (adapter as any).executeCommand('delete', ['post_123'])
      ).rejects.toThrow(/Security Exception.*allowlist/i);
    });

    it('rejects arguments containing mutation verbs (dm, follow, like, comment)', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });

      await expect(
        (adapter as any).executeCommand('read', [
          'x',
          'user/status',
          'comment=hello',
        ])
      ).rejects.toThrow(/Security Exception.*mutation verb/i);

      await expect(
        (adapter as any).executeCommand('read', [
          'web',
          'https://example.com',
          '--post-data',
        ])
      ).rejects.toThrow(/Security Exception.*mutation verb/i);
    });
  });

  describe('2. SSRF Protection on Target URLs', () => {
    it('blocks SSRF attempt to internal cloud metadata IP', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });
      const res = await adapter.read({
        channel: 'web',
        target: 'http://169.254.169.254/latest/meta-data',
      });

      expect(res.success).toBe(false);
      expect(res.sourceMode).toBe('unavailable');
      expect(res.error).toMatch(/SSRF validation failed/i);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('blocks SSRF attempt to localhost', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });
      const res = await adapter.read({
        channel: 'web',
        target: 'http://localhost:3000/internal-secrets',
      });

      expect(res.success).toBe(false);
      expect(res.sourceMode).toBe('unavailable');
      expect(res.error).toMatch(/SSRF validation failed/i);
      expect(mockSpawn).not.toHaveBeenCalled();
    });
  });

  describe('3. Token & Cookie Redaction from Output', () => {
    it('redacts bearer tokens, cookies, and api keys from command stdout', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });

      mockSpawn.mockImplementation(() => {
        const stdout = {
          on: jest.fn((event, cb) => {
            if (event === 'data') {
              cb(
                Buffer.from(
                  'HTTP Response:\nBearer eyJhbGciOiJIUzI1NiJ9.secret\nCookie: session_id=abc123xyz;\napi_key="sk-live-99999"\nPublic page content here.'
                )
              );
            }
          }),
        };
        const stderr = { on: jest.fn() };
        return {
          stdout,
          stderr,
          on: jest.fn((event, cb) => {
            if (event === 'close') cb(0);
          }),
          kill: jest.fn(),
        };
      });

      const res = await adapter.read({
        channel: 'web',
        target: 'https://example.com/api-test',
      });

      expect(res.success).toBe(true);
      expect(res.content).toContain('Public page content here');
      expect(res.content).not.toContain('eyJhbGciOiJIUzI1NiJ9');
      expect(res.content).toContain('Bearer [REDACTED_TOKEN]');
      expect(res.content).toContain('cookie: [REDACTED_COOKIE]');
      expect(res.content).toContain('api_key=[REDACTED_KEY]');
    });
  });

  describe('4. Graceful Degradation & Channel Status', () => {
    it('returns clean not_configured status when AGENT_REACH_ENABLED is false', async () => {
      const adapter = new AgentReachAdapter({ enabled: false });
      const inspection = await adapter.inspect();

      expect(inspection.installed).toBe(false);
      expect(inspection.enabled).toBe(false);
      expect(inspection.channels.length).toBeGreaterThan(0);
      expect(inspection.channels.every((c) => c.readOnly === true)).toBe(true);
      expect(inspection.error).toContain('disabled');
    });

    it('handles binary missing (ENOENT) gracefully without crashing process', async () => {
      const adapter = new AgentReachAdapter({ enabled: true });

      mockSpawn.mockImplementation(() => {
        const stdout = { on: jest.fn() };
        const stderr = { on: jest.fn() };
        return {
          stdout,
          stderr,
          on: jest.fn((event, cb) => {
            if (event === 'error') {
              const err: any = new Error('spawn ENOENT');
              err.code = 'ENOENT';
              cb(err);
            }
          }),
          kill: jest.fn(),
        };
      });

      const inspection = await adapter.inspect();
      expect(inspection.installed).toBe(false);
      expect(inspection.error).toMatch(/not found|not available/i);
    });

    it('marks high-risk social channels (reddit, x) as disabled by default', async () => {
      const adapter = new AgentReachAdapter({ enabled: false });
      const inspection = await adapter.inspect();

      const reddit = inspection.channels.find((c) => c.name === 'reddit');
      const x = inspection.channels.find((c) => c.name === 'x');

      expect(reddit?.status).toBe('disabled');
      expect(x?.status).toBe('disabled');
    });
  });

  describe('5. Provider Health Integration', () => {
    it('reports agent_reach health status in researchProviderRouter', () => {
      process.env.AGENT_REACH_ENABLED = 'false';
      const health = researchProviderRouter.getProviderHealth();

      expect(health.agent_reach).toBeDefined();
      expect(health.agent_reach.provider).toBe('agent_reach');
      expect(health.agent_reach.status).toBe('not_configured');
    });
  });

  describe('6. Tool Bridge: search_public_discussions', () => {
    it('declares search_public_discussions in CO_FOUNDER_TOOL_DECLARATIONS', () => {
      const decl = CO_FOUNDER_TOOL_DECLARATIONS.find(
        (t) => t.name === 'search_public_discussions'
      );
      expect(decl).toBeDefined();
      expect(decl?.parameters.required).toContain('platform');
      expect(decl?.parameters.required).toContain('keywords');
    });

    it('permits execution for callers with mcp_tools:read scope', () => {
      const err = assertToolPermission(
        ['mcp_tools:read'],
        'search_public_discussions'
      );
      expect(err).toBeNull();
    });

    it('blocks execution when caller lacks mcp_tools:read', async () => {
      const res = await executeCoFounderTool(
        'search_public_discussions',
        { platform: 'reddit', keywords: 'jewellery' },
        ['orders:read']
      );
      expect(res.success).toBe(false);
      expect(res.error).toContain('Forbidden');
    });

    it('requires keywords parameter and fails if missing', async () => {
      const res = await executeCoFounderTool('search_public_discussions', {
        platform: 'reddit',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('keywords are required');
    });

    it('returns structured read-only discussion results with voice summary', async () => {
      const mockPayload = {
        data: {
          children: [
            {
              data: {
                title: 'Best anti tarnish jewellery in India',
                selftext:
                  'Looking for 22K gold plated pieces that do not tarnish.',
                permalink: '/r/IndianFashionAddicts/comments/123',
                author: 'fashion_enthusiast',
                created_utc: 1707000000,
              },
            },
          ],
        },
      };

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => JSON.stringify(mockPayload),
        json: async () => mockPayload,
      });

      const res = await executeCoFounderTool('search_public_discussions', {
        platform: 'reddit',
        keywords: 'anti tarnish jewellery',
        max_results: 2,
      });

      expect(res.data).toBeDefined();
      expect(res.data.platform).toBe('reddit');
      expect(res.data.readOnly).toBe(true);
      expect(res.summaryForVoice).toBeTruthy();
    });
  });
});
