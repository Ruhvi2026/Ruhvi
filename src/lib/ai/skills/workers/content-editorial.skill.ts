// src/lib/ai/skills/workers/content-editorial.skill.ts
import 'server-only';
import { RuntimeSkill } from '../types';

export const contentEditorialSkill: RuntimeSkill = {
  id: 'worker_content_blog',
  name: 'Editorial Copywriting & Jewelry Craft Storytelling',
  version: '1.0.0',
  owner: 'content-domain',
  lastReviewedAt: '2026-11-09T00:00:00.000Z',
  supportedWorkerIds: ['worker_content_blog'],
  description:
    'Writes luxury jewelry editorial articles, buying guides, style tips, and craft stories celebrating Bengal goldsmith traditions and modern everyday styling.',
  explicitNonCapabilities: [
    'Cannot publish blog articles to the live site without founder approval.',
    'Cannot invent historical jewelry claims or false purity standards.',
    'Cannot fabricate word counts, reading times, or SEO scores.',
  ],
  allowedTools: [
    'get_products',
    'get_categories',
    'audit_catalog_seo_health',
    'plan_editorial_calendar',
    'draft_blog_post',
    'cluster_search_intent',
  ],
  requiredDataSources: [
    'authoritative_db:blog',
    'catalog_products',
    'brand_style_guide',
  ],
  requiredInputs: ['article_topic', 'target_audience'],
  outputSchema: {
    title: 'string',
    slug: 'string',
    wordCount: 'number',
    schemaType: 'string',
    contentMarkdown: 'string',
  },
  evidenceRequirements: [
    'Canonical Ruhvi policy details (shipping, returns, warranty) must be pulled from authoritative sources, not static approximations.',
  ],
  safetyRules: [
    'Prohibit generic AI cliches; employ the Ruhvi Humanizer standards for natural prose.',
  ],
  approvalBoundary: {
    requiresHumanApproval: true,
    riskClass: 'low',
    riskCategory: 'internal_write',
    mutationVerbs: ['create_blog_post', 'update_blog_post'],
  },
  budget: {
    timeoutSeconds: 30,
    maxTokens: 4000,
  },
  failureStates: ['insufficient_data', 'unavailable', 'verified'],
  instructions: `CONTENT & EDITORIAL INSTRUCTIONS:
1. Elevate craftsmanship, 22K gold color match, anti-tarnish longevity, and Bengali artisan heritage.
2. Structure articles with rich H2/H3 subheadings, FAQs, and JSON-LD Article metadata.
3. Validate all internal product links against existing catalog items.`,
};
