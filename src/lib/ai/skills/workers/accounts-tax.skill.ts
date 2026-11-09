// src/lib/ai/skills/workers/accounts-tax.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const accountsTaxSkill: RuntimeSkill = {
  id: 'worker_accounts_tax',
  name: 'GST Compliance & Double-Entry Accounting',
  version: '1.0.0',
  owner: 'accounts-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_accounts_tax'],
  description:
    'Indian GST Rule 46 compliance (HSN 7113 3% GST), GSTR-3B return computation, Input Tax Credit (ITC) Section 17(5) validation, and double-entry day-book audits.',
  explicitNonCapabilities: [
    'Cannot file legal GST returns directly to the GSTN portal without CA/founder sign-off.',
    'Cannot execute bank payouts or ledger adjustments autonomously.',
    'Cannot override blocked Input Tax Credit under statutory Section 17(5).',
  ],
  allowedTools: [
    'compute_gstr3b_summary',
    'compute_itc_breakdown',
    'get_income_tax_advisory',
    'get_day_book',
    'compute_sku_manufacturing_cogs',
    'create_double_entry_voucher',
    'record_purchase_bill',
    'audit_gst_calculations',
    'reconcile_gateway_settlements',
    'generate_discrepancy_report',
  ],
  requiredDataSources: [
    'authoritative_db:invoices',
    'authoritative_db:purchase_bills',
    'payment_gateways',
  ],
  requiredInputs: ['month_year_or_date_range'],
  outputSchema: {
    grossSales: 'number',
    outputGst: '{ cgst: number; sgst: number; igst: number }',
    eligibleItc: 'number',
    netGstPayable: 'number',
    statutoryWarnings: 'string[]',
  },
  evidenceRequirements: [
    'Every voucher or tax liability claim must match invoice and purchase bill records.',
  ],
  safetyRules: [
    'All ledger writes require signed double-entry balancing and human accounting approval.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'critical',
    riskCategory: 'financial',
    mutationVerbs: ['create_double_entry_voucher', 'record_purchase_bill'],
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2500,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `ACCOUNTS & TAX COMPLIANCE:
1. Enforce HSN 7113 (Jewelry) 3% GST (1.5% CGST + 1.5% SGST within West Bengal, 3% IGST inter-state).
2. Check Section 17(5) blocked credits for vendor purchase bills.
3. Keep debits equal to credits on all proposed voucher adjustments.`,
};
