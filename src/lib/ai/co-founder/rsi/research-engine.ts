/**
 * Ruhvi AI Co-Founder — Research & Discovery Engine
 * Phase 6: Sourced external research with prompt-injection filtering,
 * SSRF validation, and free-first technology comparisons.
 */

import { getCofounderDataClient } from '../data-client';
import { ResearchReport, ResearchSource } from './types';
import { assertRsiOperationAllowed } from './governance';

export class RsiResearchEngine {
  private client = getCofounderDataClient();

  /**
   * SSRF Protection: Validates that a target research URL is safe and public.
   * Blocks localhost, private network ranges, AWS/Cloud metadata endpoints.
   */
  isSafePublicUrl(urlString: string): boolean {
    try {
      const url = new URL(urlString);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return false;
      }

      const hostname = url.hostname.toLowerCase();

      // Block localhost, link-local, private IP addresses
      if (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '::1' ||
        hostname.startsWith('10.') ||
        hostname.startsWith('192.168.') ||
        hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
        hostname === '169.254.169.254' // Cloud metadata IP
      ) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Sanitizes external text to neutralize prompt-injection attempts.
   * Strips out system instruction tokens and hidden control tags.
   */
  sanitizeExternalContent(rawContent: string): string {
    if (!rawContent || typeof rawContent !== 'string') return '';
    return rawContent
      .replace(/<system>[\s\S]*?<\/system>/gi, '')
      .replace(/\[INST\][\s\S]*?\[\/INST\]/gi, '')
      .replace(
        /ignore\s+previous\s+instructions/gi,
        '[IGNORED_PROMPT_INJECTION]'
      )
      .trim();
  }

  /**
   * Creates and records a research project report with source provenance
   */
  async recordResearchReport(report: ResearchReport): Promise<{
    success: boolean;
    projectId?: string;
    error?: string;
  }> {
    assertRsiOperationAllowed('research_write');

    // 1. Validate all source URLs for SSRF
    for (const src of report.sources) {
      if (!this.isSafePublicUrl(src.url)) {
        return {
          success: false,
          error: `Security exception: Source URL ${src.url} is a blocked private or invalid address`,
        };
      }
    }

    // 2. Persist to Cloudflare D1
    const res = await this.client.createResearchProject({
      question: report.question,
      scope: report.scope,
      findings: report.findings.map((f) => ({
        finding: f.finding,
        evidence_source_ids: f.evidence_source_urls,
        confidence: f.confidence,
      })),
      sources: report.sources,
    });

    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, projectId: res.data?.project_id };
  }
}
