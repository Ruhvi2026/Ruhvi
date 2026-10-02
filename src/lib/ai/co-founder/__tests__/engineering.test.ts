jest.mock('server-only', () => ({}));

import {
  getRepositoryArchitecture,
  inspectRecentErrors,
  analyzeCodeSnippet,
} from '../engineering';
import { executeCoFounderTool } from '../tool-bridge';

const mockDiagnostics: any[] = [];

// Mock Supabase
jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: jest.fn((table: string) => {
      if (table === 'ai_failure_diagnostics') {
        return {
          select: jest.fn().mockReturnThis(),
          order: jest.fn().mockReturnThis(),
          limit: jest.fn((count: number) => {
            return Promise.resolve({
              data: mockDiagnostics.slice(0, count),
              error: null,
            });
          }),
        };
      }
      return {
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      };
    }),
  })),
}));

describe('Stage 8: Engineering Co-Founder Engine', () => {
  beforeEach(() => {
    mockDiagnostics.length = 0;
  });

  describe('getRepositoryArchitecture', () => {
    it('returns core codebase metadata, modules, and integrations', async () => {
      const arch = await getRepositoryArchitecture();
      expect(arch.framework).toContain('Next.js 15');
      expect(arch.packageManager).toBe('npm');
      expect(Array.isArray(arch.coreDirectories)).toBe(true);
      expect(arch.coreDirectories.length).toBeGreaterThan(0);
      expect(Array.isArray(arch.keyModules)).toBe(true);
      expect(
        arch.keyModules.some((m) => m.name.includes('LiveKit Voice Engine'))
      ).toBe(true);
      expect(
        arch.keyModules.some((m) => m.name.includes('Business Action Layer'))
      ).toBe(true);
      expect(arch.activeIntegrations).toContain('Supabase');
      expect(arch.activeIntegrations).toContain('Firebase Auth');
      expect(arch.totalMigrations).toBeGreaterThanOrEqual(0);
    });
  });

  describe('inspectRecentErrors', () => {
    it('returns empty diagnostics when no recent failure telemetry exists', async () => {
      const res = await inspectRecentErrors(5);
      expect(res.errors).toEqual([]);
      expect(res.voiceSummary).toContain('Zero runtime diagnostic failures');
    });

    it('returns formatted errors and spoken voice summary when failures exist', async () => {
      mockDiagnostics.push({
        id: 'diag-101',
        provider: 'gemini-live',
        failure_reason: 'RATE_LIMIT_EXCEEDED',
        error_message: '429 Quota exhausted for model gemini-2.0-flash',
        latency_ms: 320,
        created_at: new Date().toISOString(),
      });

      const res = await inspectRecentErrors(5);
      expect(res.errors.length).toBe(1);
      expect(res.errors[0].id).toBe('diag-101');
      expect(res.errors[0].source).toBe('gemini-live');
      expect(res.voiceSummary).toContain('Found 1 recent system diagnostic');
      expect(res.voiceSummary).toContain('gemini-live');
    });
  });

  describe('analyzeCodeSnippet', () => {
    it('approves clean safe TypeScript snippet', () => {
      const safeCode = `
        export async function getUser(id: string) {
          const supabase = getServiceClient();
          return await supabase.from('users').select('*').eq('id', id).single();
        }
      `;
      const result = analyzeCodeSnippet(safeCode, 'src/lib/user.ts');
      expect(result.severity).toBe('clean');
      expect(result.issues.length).toBe(0);
      expect(result.passedChecks).toContain(
        'Zero hardcoded credentials detected'
      );
      expect(result.voiceSummary).toContain(
        'passed all security and architecture checks'
      );
    });

    it('detects exposed Google AI API keys as critical', () => {
      const actualLeaked = `const key = "AIzaSyAbcdefghijklmnopqrstuvwxyz012345";`;
      const result = analyzeCodeSnippet(actualLeaked);
      expect(result.severity).toBe('critical');
      expect(result.issues.some((i) => i.rule === 'SECRET_EXPOSURE')).toBe(
        true
      );
      expect(result.voiceSummary).toContain('secret exposure');
    });

    it('detects dangerous dynamic eval as critical', () => {
      const dangerousCode = `function runDynamic(codeStr) { eval(codeStr); }`;
      const result = analyzeCodeSnippet(dangerousCode);
      expect(result.severity).toBe('critical');
      expect(result.issues.some((i) => i.rule === 'COMMAND_INJECTION')).toBe(
        true
      );
    });

    it('flags unsanitized string concatenated SQL queries as warning', () => {
      const sqlInjectionCode = `const q = query(\`SELECT * FROM users WHERE email = '\${userInput}'\`);`;
      const result = analyzeCodeSnippet(sqlInjectionCode);
      expect(result.severity).toBe('warning');
      expect(result.issues.some((i) => i.rule === 'SQL_INJECTION')).toBe(true);
      expect(result.voiceSummary).toContain('sql injection');
    });
  });

  describe('tool-bridge execution for Stage 8 engineering tools', () => {
    it('executes get_repository_architecture via executeCoFounderTool', async () => {
      const response = await executeCoFounderTool(
        'get_repository_architecture',
        {},
        ['mcp_tools:read']
      );
      expect(response.toolName).toBe('get_repository_architecture');
      expect(response.success).toBe(true);
      expect(response.data.framework).toContain('Next.js');
      expect(response.summaryForVoice).toContain('Next.js 15');
      expect(response.summaryForVoice).toContain('migrations');
    });

    it('executes inspect_recent_errors via executeCoFounderTool', async () => {
      mockDiagnostics.push({
        id: 'diag-202',
        provider: 'supabase-db',
        failure_reason: 'CONNECTION_TIMEOUT',
        error_message: 'Connection pool exhausted',
        latency_ms: 5000,
        created_at: new Date().toISOString(),
      });

      const response = await executeCoFounderTool(
        'inspect_recent_errors',
        { limit: 3 },
        ['mcp_tools:read']
      );
      expect(response.toolName).toBe('inspect_recent_errors');
      expect(response.success).toBe(true);
      expect(response.data.length).toBe(1);
      expect(response.summaryForVoice).toContain(
        'Found 1 recent system diagnostic'
      );
    });

    it('executes review_code_snippet via executeCoFounderTool', async () => {
      const response = await executeCoFounderTool(
        'review_code_snippet',
        { snippet: 'const x = 10; console.log(x);', language: 'typescript' },
        ['mcp_tools:read']
      );
      expect(response.toolName).toBe('review_code_snippet');
      expect(response.success).toBe(true);
      expect(response.data.severity).toBe('clean');
      expect(response.summaryForVoice).toContain(
        'passed all security and architecture checks'
      );
    });
  });
});
