// src/lib/ai/skills/workers/inventory-planning.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const inventoryPlanningSkill: RuntimeSkill = {
  id: 'worker_inventory',
  name: 'Inventory Planning & Supply Chain Optimization',
  version: '1.0.0',
  owner: 'inventory-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_inventory'],
  description:
    'Monitors stock levels, calculates SKU run-rates, forecasts stockout risks (<= 5 units), and models reorder points to optimize working capital.',
  explicitNonCapabilities: [
    'Cannot execute supplier purchase orders or transfer money autonomously.',
    'Cannot zero out inventory or overwrite physical stock without verified count receipts.',
    'Cannot guess supplier lead times without verified procurement history.',
  ],
  allowedTools: [
    'get_inventory_levels',
    'get_products',
    'update_inventory_stock',
    'calculate_stock_velocity',
    'get_low_stock_items',
    'recommend_reorder_qty',
    'audit_stock_levels',
    'detect_low_stock_risks',
    'draft_reorder_sheet',
    'adjust_stock_level',
  ],
  requiredDataSources: [
    'authoritative_db:inventory',
    'authoritative_db:orders',
    'supplier_catalog',
  ],
  requiredInputs: ['category_filter', 'days_threshold'],
  outputSchema: {
    lowStockItems:
      'Array<{ sku: string; name: string; currentStock: number; daysRemaining: number }>',
    reorderDrafts:
      'Array<{ sku: string; recommendedQty: number; estimatedCost: number }>',
    workingCapitalImpact: 'number',
  },
  evidenceRequirements: [
    'Days of Inventory must be derived from the rolling 30-day run rate.',
  ],
  safetyRules: [
    'Physical inventory adjustments require dual-confirmation and signed approval tokens.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'high',
    riskCategory: 'external_side_effect',
    mutationVerbs: ['update_inventory_stock', 'adjust_stock_level'],
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2500,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `INVENTORY PLANNING INSTRUCTIONS:
1. Alert immediately on bestselling SKUs with fewer than 7 days of stock remaining.
2. Factor in jewelry artisan lead times (typically 10-18 business days for casting & plating).
3. Present restock proposals with exact unit quantities and capital requirements.`,
};
