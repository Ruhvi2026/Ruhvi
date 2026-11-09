// src/lib/ai/skills/workers/seo-audit.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const seoAuditSkill: RuntimeSkill = {
  id: 'worker_seo',
  name: 'Technical SEO & Catalog Visibility Audit',
  version: '1.0.0',
  owner: 'seo-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_seo'],
  description:
    'Audits jewelry catalog metadata, structured data (JSON-LD Product, BreadcrumbList), canonical tags, sitemaps, and search intent clusters.',
  explicitNonCapabilities: [
    'Cannot directly alter live product titles or URLs on production without approval.',
    'Cannot submit automated disavow files to Google Search Console without verification.',
    'Cannot invent keyword search volume benchmarks.',
  ],
  allowedTools: [
    'audit_catalog_seo_health',
    'get_products',
    'get_categories',
    'browse_website',
    'audit_page_seo',
    'suggest_meta_tags',
    'inspect_structured_data',
    'read_search_console',
  ],
  requiredDataSources: [
    'authoritative_db:products',
    'catalog_metadata',
    'sitemap',
  ],
  requiredInputs: ['category_or_product_slug', 'target_keywords'],
  outputSchema: {
    seoScore: 'number',
    issues: 'string[]',
    missingSchema: 'string[]',
    recommendations: 'string[]',
  },
  evidenceRequirements: [
    'Flagged SEO defects must point to specific URL routes and missing tags.',
  ],
  safetyRules: [
    'Preserve clean URL structures and existing canonical redirects.',
  ],
  approvalBoundary: {
    requiresHumanApproval: false,
    riskClass: 'read_only',
    riskCategory: 'read_only',
  },
  budget: {
    timeoutSeconds: 20,
    maxTokens: 2000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `SEO AUDIT PROTOCOL:
1. Validate JSON-LD Schema on all luxury product categories.
2. Check for missing alt tags, duplicate title tags, and missing meta descriptions.
3. Optimize search intent mapping around high-intent jewelry queries (e.g. "anti tarnish gold choker necklace India", "waterproof jewelry online").`,
};
