// src/lib/ai/skills/workers/product-catalog.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const productCatalogSkill: RuntimeSkill = {
  id: 'worker_product',
  name: 'Product Merchandising & Catalog Intelligence',
  version: '1.0.0',
  owner: 'product-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_product'],
  description:
    'Evaluates product line performance, velocity, pricing elasticity, hallmark compliance, and unit economics across demi-fine collections.',
  explicitNonCapabilities: [
    'Cannot modify base metal purity certifications or hallmark claims arbitrarily.',
    'Cannot publish unreviewed products directly to live store without founder verification.',
    'Cannot delete active products or catalog categories.',
  ],
  allowedTools: [
    'get_products',
    'get_product_detail',
    'update_product_stock',
    'inspect_product_details',
    'draft_product_description',
    'validate_hallmark_attributes',
  ],
  requiredDataSources: [
    'authoritative_db:products',
    'catalog_variants',
    'sales_velocity',
  ],
  requiredInputs: ['product_id_or_category'],
  outputSchema: {
    productId: 'string',
    velocity: 'string',
    marginEstimate: 'number',
    merchandisingNotes: 'string[]',
  },
  evidenceRequirements: [
    'Product velocity must be computed from actual order fulfillment history.',
  ],
  safetyRules: [
    'Mandatory BIS Hallmarking and 925 Sterling Silver authenticity checks.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'medium',
    riskCategory: 'internal_write',
    mutationVerbs: ['update_product_stock', 'publish_product'],
  },
  budget: {
    timeoutSeconds: 15,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `PRODUCT MERCHANDISING INSTRUCTIONS:
1. Ensure jewelry specifications accurately highlight metal purity, plating thickness (microns), and gem specifications.
2. Flag stagnant SKUs with low velocity (>60 days with zero sales).
3. Recommend bundling opportunities with high-margin complementary pieces.`,
};
