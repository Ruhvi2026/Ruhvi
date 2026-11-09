import 'server-only';

import { spawn } from 'child_process';
import { assertSafeOutboundUrl } from '@/lib/security/ssrf';

export type AgentReachChannelStatus =
  'available' | 'disabled' | 'not_configured' | 'error';

export interface AgentReachChannelInfo {
  name: string;
  type: 'web' | 'rss' | 'github' | 'youtube' | 'reddit' | 'x' | 'other';
  status: AgentReachChannelStatus;
  description: string;
  readOnly: boolean;
}

export interface AgentReachInspectionResult {
  installed: boolean;
  version?: string;
  enabled: boolean;
  channels: AgentReachChannelInfo[];
  error?: string;
}

export interface AgentReachReadRequest {
  channel: 'web' | 'rss' | 'github' | 'youtube' | string;
  target: string;
  maxCharacters?: number;
}

export interface AgentReachReadResponse {
  success: boolean;
  channel: string;
  target: string;
  content?: string;
  sourceMode: 'live' | 'cached' | 'unavailable';
  error?: string;
  retrievedAt: string;
}

// Bounded allowlist of permitted CLI subcommands (Strictly Read-Only)
const ALLOWED_SUBCOMMANDS = new Set(['version', 'channels', 'read', 'update']);

// Forbidden mutation operations: strictly blocked to prevent external side-effects
const FORBIDDEN_VERBS = [
  'post',
  'write',
  'send',
  'comment',
  'message',
  'dm',
  'publish',
  'delete',
  'modify',
  'follow',
  'like',
];

/**
 * Redacts any accidental tokens, session cookies, or secrets from CLI output.
 */
function sanitizeCliOutput(output: string): string {
  if (!output || typeof output !== 'string') return '';
  return output
    .replace(/(?:bearer\s+[a-zA-Z0-9_\-.]+)/gi, 'Bearer [REDACTED_TOKEN]')
    .replace(/(?:token=[a-zA-Z0-9_\-.]+)/gi, 'token=[REDACTED_TOKEN]')
    .replace(/(?:cookie:\s*[^;\r\n]+)/gi, 'cookie: [REDACTED_COOKIE]')
    .replace(
      /(?:api[_-]?key[:=]\s*["']?[a-zA-Z0-9_\-.]+["']?)/gi,
      'api_key=[REDACTED_KEY]'
    )
    .trim();
}

/**
 * Controlled Adapter for Agent Reach CLI (Phase 6)
 *
 * Implements:
 * 1. Isolated child_process spawn execution (shell: false, no string interpolation).
 * 2. Strict subcommand allowlist (version, channels, read, update only).
 * 3. SSRF pre-flight validation for any target URL.
 * 4. Token and cookie redaction from all command outputs.
 * 5. Bounded public channel policy (read-only web, rss, github, youtube).
 * 6. Graceful degradation when CLI is not installed or enabled.
 */
export class AgentReachAdapter {
  private enabled: boolean;
  private binaryPath: string;

  constructor(options?: { enabled?: boolean; binaryPath?: string }) {
    this.enabled =
      options?.enabled !== undefined
        ? options.enabled
        : process.env.AGENT_REACH_ENABLED === 'true';
    this.binaryPath =
      options?.binaryPath ||
      process.env.AGENT_REACH_BINARY_PATH ||
      'agent-reach';
  }

  /**
   * Safe execution wrapper using child_process.spawn with shell: false.
   */
  private async executeCommand(
    subcommand: string,
    args: string[] = [],
    timeoutMs: number = 10000
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    // 1. Verify subcommand allowlist
    const normalizedCmd = subcommand.toLowerCase().trim();
    if (!ALLOWED_SUBCOMMANDS.has(normalizedCmd)) {
      throw new Error(
        `Agent Reach Security Exception: Subcommand '${subcommand}' is not in the approved read-only allowlist.`
      );
    }

    // 2. Scan arguments for mutation attempts
    for (const arg of args) {
      const lower = arg.toLowerCase();
      if (FORBIDDEN_VERBS.some((verb) => lower.includes(verb))) {
        throw new Error(
          `Agent Reach Security Exception: Argument '${arg}' contains a forbidden mutation verb.`
        );
      }
    }

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(this.binaryPath, [normalizedCmd, ...args], {
        shell: false,
        timeout: timeoutMs,
        env: {
          ...process.env,
          // Scrub sensitive app keys from child process environment
          SUPABASE_SERVICE_ROLE_KEY: '',
          CLOUDINARY_API_SECRET: '',
          MEDIA_PROCESSOR_SECRET: '',
        },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
      }, timeoutMs);

      proc.stdout.on('data', (chunk) => {
        if (stdout.length < 1024 * 1024) {
          stdout += chunk.toString();
        }
      });

      proc.stderr.on('data', (chunk) => {
        if (stderr.length < 1024 * 512) {
          stderr += chunk.toString();
        }
      });

      proc.on('error', (err: any) => {
        clearTimeout(timer);
        if (err.code === 'ENOENT') {
          resolve({
            stdout: '',
            stderr: 'Command not found: agent-reach',
            exitCode: 127,
          });
        } else {
          reject(err);
        }
      });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (timedOut) {
          resolve({
            stdout: sanitizeCliOutput(stdout),
            stderr: 'Execution timed out',
            exitCode: -1,
          });
        } else {
          resolve({
            stdout: sanitizeCliOutput(stdout),
            stderr: sanitizeCliOutput(stderr),
            exitCode: code,
          });
        }
      });
    });
  }

  /**
   * Inspects Agent Reach CLI installation and channel availability.
   */
  async inspect(): Promise<AgentReachInspectionResult> {
    if (!this.enabled) {
      return {
        installed: false,
        enabled: false,
        channels: this.getDefaultChannels('disabled'),
        error: 'Agent Reach adapter is disabled (AGENT_REACH_ENABLED=false).',
      };
    }

    try {
      const versionRes = await this.executeCommand('version', [], 5000);
      if (versionRes.exitCode !== 0) {
        return {
          installed: false,
          enabled: true,
          channels: this.getDefaultChannels('not_configured'),
          error:
            versionRes.stderr || 'Agent Reach CLI is not available on PATH.',
        };
      }

      const version = versionRes.stdout.split('\n')[0].trim() || 'unknown';

      // Inspect configured channels
      const channelsRes = await this.executeCommand('channels', [], 5000);
      const parsedChannels = this.parseChannelsOutput(channelsRes.stdout);

      return {
        installed: true,
        version,
        enabled: true,
        channels: parsedChannels,
      };
    } catch (err: any) {
      return {
        installed: false,
        enabled: true,
        channels: this.getDefaultChannels('error'),
        error: err.message,
      };
    }
  }

  /**
   * Read-only retrieval from an approved public channel.
   */
  async read(request: AgentReachReadRequest): Promise<AgentReachReadResponse> {
    const timestamp = new Date().toISOString();

    if (!this.enabled) {
      return {
        success: false,
        channel: request.channel,
        target: request.target,
        sourceMode: 'unavailable',
        error:
          'Agent Reach adapter is disabled in environment (AGENT_REACH_ENABLED=false).',
        retrievedAt: timestamp,
      };
    }

    // SSRF validation for URL targets
    if (
      request.target.startsWith('http://') ||
      request.target.startsWith('https://')
    ) {
      try {
        await assertSafeOutboundUrl(request.target);
      } catch (ssrfErr: any) {
        return {
          success: false,
          channel: request.channel,
          target: request.target,
          sourceMode: 'unavailable',
          error: `SSRF validation failed: ${ssrfErr.message}`,
          retrievedAt: timestamp,
        };
      }
    }

    try {
      const res = await this.executeCommand(
        'read',
        [request.channel, request.target],
        12000
      );

      if (res.exitCode !== 0 || !res.stdout) {
        return {
          success: false,
          channel: request.channel,
          target: request.target,
          sourceMode: 'unavailable',
          error: res.stderr || 'Channel read operation returned no content.',
          retrievedAt: timestamp,
        };
      }

      const content = request.maxCharacters
        ? res.stdout.slice(0, request.maxCharacters)
        : res.stdout;

      return {
        success: true,
        channel: request.channel,
        target: request.target,
        content,
        sourceMode: 'live',
        retrievedAt: timestamp,
      };
    } catch (err: any) {
      return {
        success: false,
        channel: request.channel,
        target: request.target,
        sourceMode: 'unavailable',
        error: err.message,
        retrievedAt: timestamp,
      };
    }
  }

  /**
   * Returns default catalog of channel definitions.
   */
  private getDefaultChannels(
    status: AgentReachChannelStatus
  ): AgentReachChannelInfo[] {
    return [
      {
        name: 'web',
        type: 'web',
        status,
        description: 'Public Web Reader (read-only)',
        readOnly: true,
      },
      {
        name: 'rss',
        type: 'rss',
        status,
        description: 'RSS/Atom Feed Parser (read-only)',
        readOnly: true,
      },
      {
        name: 'github',
        type: 'github',
        status,
        description: 'Public GitHub Repositories & Releases (read-only)',
        readOnly: true,
      },
      {
        name: 'youtube',
        type: 'youtube',
        status,
        description: 'Public Video Captions & Transcripts (read-only)',
        readOnly: true,
      },
      {
        name: 'reddit',
        type: 'reddit',
        status: 'disabled',
        description:
          'Reddit Community Discussions (disabled: requires account consent)',
        readOnly: true,
      },
      {
        name: 'x',
        type: 'x',
        status: 'disabled',
        description:
          'X / Twitter Public Posts (disabled: requires account consent)',
        readOnly: true,
      },
    ];
  }

  /**
   * Parses CLI channel output lines into structured channel information.
   */
  private parseChannelsOutput(output: string): AgentReachChannelInfo[] {
    const defaults = this.getDefaultChannels('not_configured');
    if (!output) return defaults;

    const lines = output.split('\n');
    return defaults.map((ch) => {
      const match = lines.find((l) =>
        l.toLowerCase().includes(ch.name.toLowerCase())
      );
      if (match) {
        const isOk =
          match.toLowerCase().includes('ok') ||
          match.toLowerCase().includes('available') ||
          match.toLowerCase().includes('ready');
        return {
          ...ch,
          status: isOk ? 'available' : 'not_configured',
        };
      }
      return ch;
    });
  }
}

export const agentReachAdapter = new AgentReachAdapter();
