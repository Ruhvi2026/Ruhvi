// src/lib/ai/skills/workers/customer-support.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const customerSupportSkill: RuntimeSkill = {
  id: 'worker_customer_support',
  name: 'Customer Support & Grievance Care',
  version: '1.0.0',
  owner: 'support-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_customer_support'],
  description:
    'Triages customer support tickets, handles return/exchange requests, diagnoses root causes, and drafts empathetic multilingual replies.',
  explicitNonCapabilities: [
    'Cannot send automated direct messages to customers without agent/human review by default.',
    'Cannot grant monetary refunds without explicit founder approval.',
    'Cannot promise shipping times that violate logistics carrier SLAs.',
  ],
  allowedTools: [
    'get_support_tickets',
    'get_customers',
    'send_whatsapp_message',
    'read_ticket_details',
    'check_courier_tracking',
    'draft_support_reply',
  ],
  requiredDataSources: [
    'authoritative_db:tickets',
    'customer_profiles',
    'shiprocket_tracking',
  ],
  requiredInputs: ['ticket_id_or_customer_phone'],
  outputSchema: {
    ticketId: 'string',
    priority: 'low | medium | high | urgent',
    sentiment: 'frustrated | neutral | delighted',
    draftReply: 'string',
    recommendedResolution: 'string',
  },
  evidenceRequirements: [
    'Courier delays must be validated against carrier AWB tracking.',
  ],
  safetyRules: [
    'Protect customer PII; do not log credit card details or unmasked sensitive data.',
    'Outbound WhatsApp messages require write permission and approval.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'medium',
    riskCategory: 'external_side_effect',
    mutationVerbs: ['send_whatsapp_message', 'update_support_ticket_status'],
  },
  budget: {
    timeoutSeconds: 15,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `CUSTOMER SUPPORT GUIDELINES:
1. Always maintain a warm, respectful, and reassuring tone across English, Bengali, and Hindi.
2. Address product concerns (clasp breakage, size fit, packaging damage) with practical replacement options.
3. Prepare response drafts clearly labeled as DRAFT for support staff review before transmission.`,
};
