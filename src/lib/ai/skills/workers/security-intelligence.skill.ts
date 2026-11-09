// src/lib/ai/skills/workers/security-intelligence.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const securityIntelligenceSkill: RuntimeSkill = {
  id: 'worker_security_intelligence',
  name: 'Zero-Trust Security & Threat Defense Intelligence',
  version: '1.0.0',
  owner: 'security-core',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_security_intelligence'],
  description:
    'Continuous zero-trust posture auditing, secret exposure detection, SSRF protection verification, and deterministic vulnerability scanning.',
  explicitNonCapabilities: [
    'Cannot disable security firewalls, WAF rules, or authentication checks.',
    'Cannot execute irreversible containment actions without founder authorization.',
    'Cannot log or reveal sensitive API keys, database credentials, or customer secrets.',
  ],
  allowedTools: [
    'get_security_posture',
    'analyze_vulnerabilities',
    'propose_containment',
    'inspect_file_security',
    'get_incident_report',
  ],
  requiredDataSources: [
    'authoritative_db:audit_logs',
    'security_posture',
    'secret_scanner',
  ],
  requiredInputs: ['subsystem_focus', 'scan_depth'],
  outputSchema: {
    threatScore: 'number',
    activeIncidents: 'string[]',
    vulnerabilitiesDetected: 'string[]',
    containmentProposals: 'string[]',
  },
  evidenceRequirements: [
    'Vulnerability reports must link to specific file lines, endpoint routes, or CVE identifiers.',
  ],
  safetyRules: [
    'Zero-trust edge architecture validation: unknown actions default to DENY.',
    'Containment proposals must be reversible and gated by founder approval.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'high',
    riskCategory: 'internal_write',
    mutationVerbs: ['propose_containment'],
  },
  budget: {
    timeoutSeconds: 25,
    maxTokens: 2500,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `SECURITY INTELLIGENCE PROTOCOL:
1. Scan for leaked secrets, insecure environment fallbacks, and SSRF loopholes.
2. Confirm all mutations are guarded by valid approval tokens and nonce checks.
3. Keep threat containment measures reversible and auditable.`,
};
