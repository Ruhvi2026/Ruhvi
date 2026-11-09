// src/lib/ai/skills/loader.ts
//
// Governed Runtime Skill Loader with strict allowlisting, integrity hashing,
// and audit trace emission. Section 6 & Phase 7 of the Upgrade Guide.

import 'server-only';
import { createHash } from 'crypto';
import { WorkerId } from '../co-founder/workers/types';
import {
  RuntimeSkill,
  SkillFailureState,
  SkillRunTrace,
  WorkerCapabilityManifest,
} from './types';
import { getWorkerCapabilityManifest } from './manifest';
import { TOOL_PERMISSION_MAP } from '../mcp-auth';

// Shared skills
import { evidenceQualitySkill } from './shared/evidence-quality.skill';
import { sourceTrustPolicySkill } from './shared/source-trust-policy.skill';
import { promptInjectionBoundarySkill } from './shared/prompt-injection-boundary.skill';

// Research skills
import { generalWebResearchSkill } from './research/general-web-research.skill';
import { competitorIntelligenceSkill } from './research/competitor-intelligence.skill';
import { socialListeningSkill } from './research/social-listening.skill';

// Worker skills
import { analyticsPerformanceSkill } from './workers/analytics-performance.skill';
import { marketingOrchestratorSkill } from './workers/marketing-orchestrator.skill';
import { seoAuditSkill } from './workers/seo-audit.skill';
import { productCatalogSkill } from './workers/product-catalog.skill';
import { salesFunnelSkill } from './workers/sales-funnel.skill';
import { customerSupportSkill } from './workers/customer-support.skill';
import { contentEditorialSkill } from './workers/content-editorial.skill';
import { inventoryPlanningSkill } from './workers/inventory-planning.skill';
import { reviewSentimentSkill } from './workers/review-sentiment.skill';
import { executionApprovalSkill } from './workers/execution-approval.skill';
import { monitoringVerificationSkill } from './workers/monitoring-verification.skill';
import { ordersLogisticsSkill } from './workers/orders-logistics.skill';
import { accountsTaxSkill } from './workers/accounts-tax.skill';
import { performanceIntelligenceSkill } from './workers/performance-intelligence.skill';
import { securityIntelligenceSkill } from './workers/security-intelligence.skill';

export function computeSkillHash(skill: RuntimeSkill): string {
  const payload = JSON.stringify({
    id: skill.id,
    version: skill.version,
    owner: skill.owner,
    description: skill.description,
    nonCapabilities: [...skill.explicitNonCapabilities].sort(),
    tools: [...skill.allowedTools].sort(),
    riskClass: skill.approvalBoundary.riskClass,
    requiresApproval: skill.approvalBoundary.requiresHumanApproval,
  });
  return createHash('sha256').update(payload).digest('hex');
}

const RUNTIME_SKILLS_CATALOG: Record<string, RuntimeSkill> = {
  // Shared
  shared_evidence_quality: evidenceQualitySkill,
  shared_source_trust_policy: sourceTrustPolicySkill,
  shared_prompt_injection_boundary: promptInjectionBoundarySkill,

  // Research
  research_general_web_research: generalWebResearchSkill,
  research_competitor_intelligence: competitorIntelligenceSkill,
  research_social_listening: socialListeningSkill,

  // Workers
  worker_analytics_performance: analyticsPerformanceSkill,
  worker_marketing: marketingOrchestratorSkill,
  worker_seo: seoAuditSkill,
  worker_product: productCatalogSkill,
  worker_sales_conversion: salesFunnelSkill,
  worker_customer_support: customerSupportSkill,
  worker_content_blog: contentEditorialSkill,
  worker_inventory: inventoryPlanningSkill,
  worker_review_feedback: reviewSentimentSkill,
  worker_execution: executionApprovalSkill,
  worker_monitoring_verification: monitoringVerificationSkill,
  worker_orders_logistics: ordersLogisticsSkill,
  worker_accounts_tax: accountsTaxSkill,
  worker_performance_intelligence: performanceIntelligenceSkill,
  worker_security_intelligence: securityIntelligenceSkill,
};

export const SKILL_ALLOWLIST: readonly string[] = Object.freeze(
  Object.keys(RUNTIME_SKILLS_CATALOG)
);

/**
 * Loads a runtime skill by explicit allowlisted ID.
 * Throws a fail-closed error if the skill ID is unrecognized or attempts traversal.
 */
export function loadRuntimeSkill(skillId: string): RuntimeSkill {
  if (!skillId || typeof skillId !== 'string') {
    throw new Error('Skill ID must be a non-empty string.');
  }

  // Reject path traversal, delimiters, or unsafe characters
  if (
    skillId.includes('/') ||
    skillId.includes('\\') ||
    skillId.includes('..')
  ) {
    throw new Error(
      `Security Violation: Unsafe skill ID traversal attempt: '${skillId}'`
    );
  }

  const skill = RUNTIME_SKILLS_CATALOG[skillId];
  if (!skill) {
    throw new Error(
      `Access Denied: Skill '${skillId}' is not in the authorized RUNTIME_SKILLS allowlist.`
    );
  }

  return skill;
}

/**
 * Loads all skills assigned to a worker via its capability manifest.
 */
export function loadSkillsForWorker(workerId: WorkerId): RuntimeSkill[] {
  const manifest = getWorkerCapabilityManifest(workerId);
  if (!manifest) {
    throw new Error(`Worker capability manifest not found for '${workerId}'.`);
  }

  return manifest.skillIds.map((id) => loadRuntimeSkill(id));
}

/**
 * Creates an immutable audit trace of applied skills and versions for this run.
 */
export function createSkillRunTrace(
  workerId: WorkerId,
  status: SkillFailureState | 'live' | 'cached' | 'simulated' = 'verified'
): SkillRunTrace {
  const manifest = getWorkerCapabilityManifest(workerId);
  if (!manifest) {
    throw new Error(`Worker manifest not found for '${workerId}'.`);
  }

  const appliedSkills = manifest.skillIds.map((id) => {
    const skill = loadRuntimeSkill(id);
    return {
      skillId: skill.id,
      version: skill.version,
      hash: computeSkillHash(skill),
    };
  });

  return {
    workerId,
    manifestVersion: manifest.version,
    manifestHash: manifest.manifestHash,
    appliedSkills,
    timestamp: new Date().toISOString(),
    executionStatus: status,
  };
}

/**
 * Validates consistency between declared worker tools, manifest tools,
 * and the authoritative TOOL_PERMISSION_MAP in mcp-auth.ts.
 */
export function validateToolAndRiskConsistency(): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const [id, skill] of Object.entries(RUNTIME_SKILLS_CATALOG)) {
    // 1. Verify ID match
    if (skill.id !== id) {
      errors.push(
        `Skill ID mismatch: key '${id}' does not match skill.id '${skill.id}'`
      );
    }

    // 2. Verify allowed tools are mapped in TOOL_PERMISSION_MAP
    for (const tool of skill.allowedTools) {
      if (!TOOL_PERMISSION_MAP[tool]) {
        errors.push(
          `Skill '${id}' declares tool '${tool}' which is missing from TOOL_PERMISSION_MAP.`
        );
      }
    }

    // 3. Verify risk class is recognized
    const validRiskClasses = ['read_only', 'low', 'medium', 'high', 'critical'];
    if (!validRiskClasses.includes(skill.approvalBoundary.riskClass)) {
      errors.push(
        `Skill '${id}' has unknown riskClass '${skill.approvalBoundary.riskClass}'.`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
