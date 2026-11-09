// src/lib/ai/skills/__tests__/phase7-runtime-skills.test.ts
//
// Comprehensive Phase 7 Test Suite:
// Validates versioned runtime skills, 16-worker capability manifests,
// strict allowlists, tool-permission consistency, and fail-closed security.

jest.mock('server-only', () => ({}));

import {
  WORKER_CAPABILITY_MANIFESTS,
  getWorkerCapabilityManifest,
  getAllWorkerCapabilityManifests,
  loadRuntimeSkill,
  loadSkillsForWorker,
  createSkillRunTrace,
  computeSkillHash,
  validateToolAndRiskConsistency,
  SKILL_ALLOWLIST,
  WorkerId,
} from '../index';
import { TOOL_PERMISSION_MAP, assertToolPermission } from '../../mcp-auth';
import { WorkerRegistry } from '../../co-founder/workers/registry';

describe('Phase 7: Runtime Skills & Worker Capability Contracts', () => {
  const CANONICAL_16_WORKER_IDS: WorkerId[] = [
    'worker_analytics_performance',
    'worker_marketing',
    'worker_seo',
    'worker_product',
    'worker_competitor_research',
    'worker_sales_conversion',
    'worker_customer_support',
    'worker_content_blog',
    'worker_inventory',
    'worker_review_feedback',
    'worker_execution',
    'worker_monitoring_verification',
    'worker_orders_logistics',
    'worker_accounts_tax',
    'worker_performance_intelligence',
    'worker_security_intelligence',
  ];

  describe('1. Worker Capability Manifest Registry', () => {
    test('contains all 16 canonical specialist workers', () => {
      const manifests = getAllWorkerCapabilityManifests();
      expect(manifests).toHaveLength(16);

      CANONICAL_16_WORKER_IDS.forEach((id) => {
        const manifest = getWorkerCapabilityManifest(id);
        expect(manifest).toBeDefined();
        expect(manifest?.workerId).toBe(id);
      });
    });

    test('every worker manifest has required contract properties and non-empty non-capabilities', () => {
      CANONICAL_16_WORKER_IDS.forEach((id) => {
        const manifest = getWorkerCapabilityManifest(id)!;

        expect(manifest.displayName).toBeTruthy();
        expect(manifest.domain).toBeTruthy();
        expect(manifest.description).toBeTruthy();
        expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(['T0', 'T1', 'T2', 'T3']).toContain(manifest.autonomyTier);
        expect([
          'read_only',
          'internal_write',
          'external_side_effect',
          'financial',
          'destructive',
        ]).toContain(manifest.riskCategory);
        expect(Array.isArray(manifest.skillIds)).toBe(true);
        expect(manifest.skillIds.length).toBeGreaterThan(0);
        expect(Array.isArray(manifest.allowedTools)).toBe(true);
        expect(manifest.allowedTools.length).toBeGreaterThan(0);
        expect(Array.isArray(manifest.explicitNonCapabilities)).toBe(true);
        expect(manifest.explicitNonCapabilities.length).toBeGreaterThan(0);
        expect(manifest.budget.timeoutSeconds).toBeGreaterThan(0);
        expect(manifest.budget.maxTokens).toBeGreaterThan(0);
        expect(manifest.budget.maxToolCalls).toBeGreaterThan(0);
        expect(manifest.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    test('high-impact and mutating workers strictly require human approval', () => {
      const highImpactWorkers: WorkerId[] = [
        'worker_execution',
        'worker_inventory',
        'worker_accounts_tax',
        'worker_marketing',
      ];

      highImpactWorkers.forEach((id) => {
        const manifest = getWorkerCapabilityManifest(id)!;
        expect(manifest.requiresHumanApproval).toBe(true);
        expect(manifest.riskCategory).not.toBe('read_only');
      });
    });

    test('read-only analytical workers are classified appropriately', () => {
      const readOnlyWorkers: WorkerId[] = [
        'worker_analytics_performance',
        'worker_sales_conversion',
        'worker_monitoring_verification',
        'worker_performance_intelligence',
        'worker_competitor_research',
      ];

      readOnlyWorkers.forEach((id) => {
        const manifest = getWorkerCapabilityManifest(id)!;
        expect(manifest.autonomyTier).toBe('T1');
        expect(manifest.riskCategory).toBe('read_only');
        expect(manifest.requiresHumanApproval).toBe(false);
      });
    });
  });

  describe('2. Runtime Skills Catalog & Integrity', () => {
    test('contains at least 21 registered skills across shared, research, and workers', () => {
      expect(SKILL_ALLOWLIST.length).toBeGreaterThanOrEqual(21);
      expect(SKILL_ALLOWLIST).toContain('shared_evidence_quality');
      expect(SKILL_ALLOWLIST).toContain('shared_source_trust_policy');
      expect(SKILL_ALLOWLIST).toContain('shared_prompt_injection_boundary');
      expect(SKILL_ALLOWLIST).toContain('research_general_web_research');
      expect(SKILL_ALLOWLIST).toContain('research_competitor_intelligence');
      expect(SKILL_ALLOWLIST).toContain('research_social_listening');
    });

    test('every skill loads cleanly with valid metadata and non-empty safety rules', () => {
      SKILL_ALLOWLIST.forEach((skillId) => {
        const skill = loadRuntimeSkill(skillId);
        expect(skill.id).toBe(skillId);
        expect(skill.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(skill.owner).toBeTruthy();
        expect(skill.description).toBeTruthy();
        expect(skill.explicitNonCapabilities.length).toBeGreaterThan(0);
        expect(skill.safetyRules.length).toBeGreaterThan(0);
        expect(skill.instructions.length).toBeGreaterThan(0);
        expect(skill.budget.timeoutSeconds).toBeGreaterThan(0);
        expect(skill.budget.maxTokens).toBeGreaterThan(0);

        const validRiskClasses = [
          'read_only',
          'low',
          'medium',
          'high',
          'critical',
        ];
        expect(validRiskClasses).toContain(skill.approvalBoundary.riskClass);
      });
    });

    test('computeSkillHash produces deterministic 64-character SHA-256 hashes', () => {
      const skill = loadRuntimeSkill('shared_evidence_quality');
      const hash1 = computeSkillHash(skill);
      const hash2 = computeSkillHash(skill);

      expect(hash1).toMatch(/^[a-f0-9]{64}$/);
      expect(hash1).toBe(hash2);
    });

    test('loadSkillsForWorker loads all assigned skills for each of the 16 workers', () => {
      CANONICAL_16_WORKER_IDS.forEach((id) => {
        const skills = loadSkillsForWorker(id);
        expect(skills.length).toBeGreaterThan(0);
        // Every worker must inherit the core shared skills
        const skillIds = skills.map((s) => s.id);
        expect(skillIds).toContain('shared_evidence_quality');
        expect(skillIds).toContain('shared_source_trust_policy');
        expect(skillIds).toContain('shared_prompt_injection_boundary');
      });
    });
  });

  describe('3. Allowlist Security & Fail-Closed Enforcement', () => {
    test('rejects unauthorized or unknown skill IDs', () => {
      expect(() => loadRuntimeSkill('unauthorized_skill_hack')).toThrow(
        /Access Denied: Skill 'unauthorized_skill_hack' is not in the authorized RUNTIME_SKILLS allowlist/
      );
    });

    test('rejects path traversal attempts in skill ID', () => {
      expect(() => loadRuntimeSkill('../../../etc/passwd')).toThrow(
        /Security Violation: Unsafe skill ID traversal attempt/
      );
      expect(() => loadRuntimeSkill('workers/analytics')).toThrow(
        /Security Violation: Unsafe skill ID traversal attempt/
      );
      expect(() => loadRuntimeSkill('..\\secret.key')).toThrow(
        /Security Violation: Unsafe skill ID traversal attempt/
      );
    });

    test('rejects empty or non-string skill IDs', () => {
      expect(() => loadRuntimeSkill('')).toThrow(
        /Skill ID must be a non-empty string/
      );
      expect(() => loadRuntimeSkill(null as any)).toThrow(
        /Skill ID must be a non-empty string/
      );
    });
  });

  describe('4. Tool & Permission Consistency Validation', () => {
    test('validateToolAndRiskConsistency reports zero errors across the catalog', () => {
      const result = validateToolAndRiskConsistency();
      expect(result.errors).toEqual([]);
      expect(result.valid).toBe(true);
    });

    test('all 16 workers in WorkerRegistry have 100% of their declared requiredTools mapped in TOOL_PERMISSION_MAP', () => {
      const registry = new WorkerRegistry();
      const allWorkers = registry.getAllWorkers();
      expect(allWorkers).toHaveLength(16);

      allWorkers.forEach((worker) => {
        const def = worker.getDefinition();
        def.requiredTools.forEach((toolName) => {
          const mapping = TOOL_PERMISSION_MAP[toolName];
          expect(mapping).toBeDefined();
          expect(['read', 'write']).toContain(mapping.action);
          expect(typeof mapping.module).toBe('string');
        });
      });
    });

    test('all allowedTools in WorkerCapabilityManifests are mapped in TOOL_PERMISSION_MAP', () => {
      getAllWorkerCapabilityManifests().forEach((manifest) => {
        manifest.allowedTools.forEach((toolName) => {
          const mapping = TOOL_PERMISSION_MAP[toolName];
          expect(mapping).toBeDefined();
          expect(['read', 'write']).toContain(mapping.action);
        });
      });
    });

    test('assertToolPermission fails closed on unknown or unmapped tool names', () => {
      const scopes = [
        'mcp_tools:read',
        'mcp_tools:write',
        'analytics:read',
        'orders:read',
      ];
      const denied = assertToolPermission(
        scopes,
        'malicious_unmapped_tool_operation'
      );
      expect(denied).not.toBeNull();
      expect(denied?.error).toContain('is not mapped in the permission matrix');
    });
  });

  describe('5. Audit Trace Generation', () => {
    test('createSkillRunTrace generates complete tamper-evident run records', () => {
      const trace = createSkillRunTrace('worker_analytics_performance', 'live');

      expect(trace.workerId).toBe('worker_analytics_performance');
      expect(trace.manifestVersion).toBe('1.0.0');
      expect(trace.manifestHash).toMatch(/^[a-f0-9]{64}$/);
      expect(trace.executionStatus).toBe('live');
      expect(new Date(trace.timestamp).getTime()).not.toBeNaN();
      expect(trace.appliedSkills.length).toBeGreaterThan(0);

      trace.appliedSkills.forEach((entry) => {
        expect(entry.skillId).toBeTruthy();
        expect(entry.version).toMatch(/^\d+\.\d+\.\d+$/);
        expect(entry.hash).toMatch(/^[a-f0-9]{64}$/);
      });
    });

    test('createSkillRunTrace throws for unknown worker IDs', () => {
      expect(() => createSkillRunTrace('unknown_worker' as any)).toThrow(
        /Worker manifest not found/
      );
    });
  });
});
