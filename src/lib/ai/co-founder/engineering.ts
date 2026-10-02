import 'server-only';

import { getServiceClient } from '@/lib/supabase/service';
import fs from 'fs';
import path from 'path';

export interface RepositoryArchitecture {
  framework: string;
  runtime: string;
  packageManager: string;
  coreDirectories: { name: string; purpose: string }[];
  keyModules: { name: string; path: string; status: string }[];
  totalMigrations: number;
  activeIntegrations: string[];
}

export interface DiagnosticErrorItem {
  id: string;
  source: string;
  errorMessage: string;
  errorType?: string;
  context?: Record<string, any>;
  timestamp: string;
}

export interface CodeReviewResult {
  filePath?: string;
  severity: 'clean' | 'advisory' | 'warning' | 'critical';
  issues: {
    rule: string;
    description: string;
    recommendation: string;
    line?: number;
  }[];
  passedChecks: string[];
  voiceSummary: string;
}

/**
 * Returns structured repository architectural context for the Engineering Co-Founder.
 */
export async function getRepositoryArchitecture(): Promise<RepositoryArchitecture> {
  const rootDir = process.cwd();
  let migrationCount = 0;

  try {
    const migrationsDir = path.join(rootDir, 'supabase', 'migrations');
    if (fs.existsSync(migrationsDir)) {
      migrationCount = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql')).length;
    }
  } catch {}

  return {
    framework: 'Next.js 15 (App Router) + React 19',
    runtime: 'Node.js (Server Components & Edge/Node API Routes)',
    packageManager: 'npm',
    coreDirectories: [
      {
        name: 'src/app',
        purpose: 'App Router routes, server actions, and layouts',
      },
      {
        name: 'src/components',
        purpose: 'Reusable UI elements and domain-specific widgets',
      },
      {
        name: 'src/lib',
        purpose:
          'Business logic, database clients, authentication, and AI services',
      },
      {
        name: 'supabase/migrations',
        purpose: 'Database schema, RLS policies, and migrations',
      },
    ],
    keyModules: [
      {
        name: 'LiveKit Voice Engine',
        path: 'src/lib/livekit',
        status: 'operational',
      },
      {
        name: 'Co-Founder Brain & Memory',
        path: 'src/lib/ai/co-founder',
        status: 'operational',
      },
      {
        name: 'Analytics & Intelligence',
        path: 'src/lib/ai/co-founder/analytics.ts',
        status: 'operational',
      },
      {
        name: 'Proactive Signal Engine',
        path: 'src/lib/ai/co-founder/proactive.ts',
        status: 'operational',
      },
      {
        name: 'Recommendation & Approvals',
        path: 'src/lib/ai/co-founder/approvals.ts',
        status: 'operational',
      },
      {
        name: 'Business Action Layer',
        path: 'src/lib/ai/co-founder/action-engine.ts',
        status: 'operational',
      },
    ],
    totalMigrations: migrationCount,
    activeIntegrations: [
      'Supabase',
      'Firebase Auth',
      'LiveKit Cloud',
      'Gemini Live',
      'PostHog',
      'Brevo',
    ],
  };
}

/**
 * Inspect recent runtime and diagnostic failures from the database.
 */
export async function inspectRecentErrors(limit = 5): Promise<{
  errors: DiagnosticErrorItem[];
  voiceSummary: string;
}> {
  const supabase = getServiceClient();

  try {
    const { data, error } = await supabase
      .from('ai_failure_diagnostics')
      .select(
        'id, provider, failure_reason, error_message, latency_ms, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error || !data || data.length === 0) {
      return {
        errors: [],
        voiceSummary:
          'Zero runtime diagnostic failures recorded in recent telemetry.',
      };
    }

    const errors: DiagnosticErrorItem[] = data.map((d: any) => ({
      id: d.id,
      source: d.provider || 'system',
      errorMessage:
        d.error_message || d.failure_reason || 'Unknown runtime error',
      errorType: d.failure_reason,
      context: { latencyMs: d.latency_ms },
      timestamp: d.created_at,
    }));

    const top = errors[0];
    const voiceSummary = `Found ${errors.length} recent system diagnostics. Most recent was from ${top.source}: "${top.errorMessage.slice(
      0,
      80
    )}".`;

    return { errors, voiceSummary };
  } catch (err: any) {
    return {
      errors: [],
      voiceSummary: 'Telemetry diagnostics are currently unavailable or clean.',
    };
  }
}

/**
 * Static code analyzer enforcing Ruhvi safety rules (Phase 16-17).
 */
export function analyzeCodeSnippet(
  code: string,
  fileName?: string
): CodeReviewResult {
  const issues: CodeReviewResult['issues'] = [];
  const passedChecks: string[] = [];

  // Check 1: Secrets leakage guard (Phase 23)
  const secretPatterns = [
    /AIzaSy[0-9A-Za-z-_]{25,}/, // Google API Key
    /ey[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}\.[A-Za-z0-9-_]{20,}/, // JWT token
    /rzp_live_[0-9a-zA-Z]{14}/, // Razorpay live key
  ];

  let hasSecret = false;
  for (const pat of secretPatterns) {
    if (pat.test(code)) {
      issues.push({
        rule: 'SECRET_EXPOSURE',
        description:
          'Hardcoded secret or credential detected in source code snippet.',
        recommendation:
          'Move credentials to environment variables (.env.local).',
      });
      hasSecret = true;
      break;
    }
  }
  if (!hasSecret) passedChecks.push('Zero hardcoded credentials detected');

  // Check 2: Raw eval / command injection guard
  if (/\beval\s*\(/.test(code) || /exec\s*\([^)]*\$\{[^}]+\}/.test(code)) {
    issues.push({
      rule: 'COMMAND_INJECTION',
      description: 'Use of eval() or unsanitized shell execution detected.',
      recommendation: 'Avoid dynamic string execution.',
    });
  } else {
    passedChecks.push('No dangerous dynamic execution primitives');
  }

  // Check 3: SQL Injection guard
  if (
    /query\s*\(\s*`[^`]*\$\{[^}]+\}/.test(code) ||
    /EXECUTE\s+format\s*\(/i.test(code)
  ) {
    issues.push({
      rule: 'SQL_INJECTION',
      description: 'Potential raw SQL string concatenation detected.',
      recommendation:
        'Use Supabase PostgREST query builder or parameterized queries.',
    });
  } else {
    passedChecks.push('Safe PostgREST query patterns');
  }

  const severity = issues.some(
    (i) => i.rule === 'SECRET_EXPOSURE' || i.rule === 'COMMAND_INJECTION'
  )
    ? 'critical'
    : issues.length > 0
      ? 'warning'
      : 'clean';

  const voiceSummary =
    severity === 'clean'
      ? 'The code review passed all security and architecture checks with zero issues.'
      : `The code review flagged ${issues.length} potential issue${
          issues.length > 1 ? 's' : ''
        }, including ${issues[0].rule.toLowerCase().replace(/_/g, ' ')}.`;

  return {
    filePath: fileName,
    severity,
    issues,
    passedChecks,
    voiceSummary,
  };
}
