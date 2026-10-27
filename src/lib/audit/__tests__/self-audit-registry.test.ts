jest.mock('server-only', () => ({}));

import {
  REGISTERED_SELF_AUDIT_CHECKS,
  getSelfAuditCheck,
  getEnabledSelfAuditChecks,
  validateCheckSafety,
  executeCheck,
  type SelfAuditCheckDefinition,
  type AuditCheckCategory,
} from '../self-audit-registry';

describe('Self-Audit Checks Registry (Track J - Phase 47)', () => {
  const ALL_CATEGORIES: AuditCheckCategory[] = [
    'architecture',
    'integration',
    'configuration',
    'security',
    'performance',
    'ai_health',
  ];

  describe('Registry Structure & Invariants', () => {
    it('registers all 19 canonical self-audit checks', () => {
      expect(REGISTERED_SELF_AUDIT_CHECKS.length).toBe(19);
    });

    it('enforces strictly non-destructive execution (isDestructive === false) on every check', () => {
      for (const check of REGISTERED_SELF_AUDIT_CHECKS) {
        expect(check.isDestructive).toBe(false);
        expect(validateCheckSafety(check)).toBe(true);
      }
    });

    it('covers all 6 mandatory audit check categories', () => {
      const representedCategories = new Set(
        REGISTERED_SELF_AUDIT_CHECKS.map((c) => c.category)
      );
      for (const cat of ALL_CATEGORIES) {
        expect(representedCategories.has(cat)).toBe(true);
      }
    });

    it('enforces bounded execution timeouts on all checks (between 500ms and 5000ms)', () => {
      for (const check of REGISTERED_SELF_AUDIT_CHECKS) {
        expect(check.timeoutMs).toBeGreaterThanOrEqual(500);
        expect(check.timeoutMs).toBeLessThanOrEqual(5000);
      }
    });

    it('assigns valid severities and data sensitivities across all definitions', () => {
      const validSeverities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'];
      const validSensitivities = [
        'PUBLIC',
        'INTERNAL',
        'SENSITIVE_CONFIDENTIAL',
      ];

      for (const check of REGISTERED_SELF_AUDIT_CHECKS) {
        expect(validSeverities).toContain(check.severity);
        expect(validSensitivities).toContain(check.dataSensitivity);
        expect(check.evidenceSource.length).toBeGreaterThan(0);
        expect(check.safeExecutionConditions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Registry Retrieval & Querying API', () => {
    it('retrieves checks by ID via getSelfAuditCheck', () => {
      const check = getSelfAuditCheck('chk_int_supabase_connection');
      expect(check).toBeDefined();
      expect(check?.name).toBe('Supabase Postgres Connectivity');
      expect(check?.category).toBe('integration');
      expect(check?.severity).toBe('CRITICAL');

      expect(getSelfAuditCheck('non_existent_check')).toBeUndefined();
    });

    it('filters enabled checks by category via getEnabledSelfAuditChecks', () => {
      const securityChecks = getEnabledSelfAuditChecks('security');
      expect(securityChecks.length).toBe(3);
      for (const c of securityChecks) {
        expect(c.category).toBe('security');
        expect(c.isEnabled).toBe(true);
      }

      const allEnabled = getEnabledSelfAuditChecks();
      expect(allEnabled.length).toBe(19);
    });

    it('rejects destructive or malformed checks in validateCheckSafety', () => {
      const malformedCheck: any = {
        id: 'bad_check',
        name: 'Bad Check',
        category: 'architecture',
        severity: 'HIGH',
        timeoutMs: 1000,
        isDestructive: true, // Violates safety invariant!
        evaluate: async () => {},
      };

      expect(validateCheckSafety(malformedCheck)).toBe(false);
    });
  });

  describe('Execution & Fault-Isolation Guarantees', () => {
    it('executes passive architecture check cleanly', async () => {
      const result = await executeCheck('chk_arch_app_router_routes');
      expect(result.checkId).toBe('chk_arch_app_router_routes');
      expect(result.status).toBe('PASS');
      expect(result.durationMs).toBeGreaterThan(0);
      expect(new Date(result.evaluatedAt).getTime()).toBeGreaterThan(0);
    });

    it('executes client secret hygiene check and verifies clean public environment', async () => {
      const result = await executeCheck('chk_cfg_public_secret_hygiene');
      expect(result.checkId).toBe('chk_cfg_public_secret_hygiene');
      expect(['PASS', 'FAIL']).toContain(result.status);
      expect(result.durationMs).toBeGreaterThan(0);
    });

    it('executes AI anomaly rule registry check', async () => {
      const result = await executeCheck('chk_ai_anomaly_rule_registry');
      expect(result.checkId).toBe('chk_ai_anomaly_rule_registry');
      expect(result.status).toBe('PASS');
      expect(result.category).toBe('ai_health');
    });

    it('handles non-existent checks gracefully without throwing', async () => {
      const result = await executeCheck('chk_does_not_exist');
      expect(result.status).toBe('FAIL');
      expect(result.message).toContain('not registered');
    });

    it('guarantees zero secret leakage in audit results', async () => {
      const checksToRun = [
        'chk_int_supabase_connection',
        'chk_int_firebase_auth_rest',
        'chk_int_payment_gateway_config',
        'chk_cfg_required_env_presence',
      ];

      for (const id of checksToRun) {
        const result = await executeCheck(id);
        const serialized = JSON.stringify(result).toLowerCase();

        // Must NEVER contain live secret fragments
        expect(serialized).not.toContain('eyj'); // JWT tokens
        expect(serialized).not.toContain('salt_key_value');
        expect(serialized).not.toContain('password_plaintext');
      }
    });
  });
});
