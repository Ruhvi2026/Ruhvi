// src/lib/ai/skills/manifest.ts
//
// Canonical Worker Capability Manifests for all 16 Ruhvi AI Specialists.
// Enforces versioning, autonomy tiers, skill attachments, budgets, and non-capabilities.

import 'server-only';
import { createHash } from 'crypto';
import { WorkerId } from '../co-founder/workers/types';
import { WorkerCapabilityManifest } from './types';

export function computeCapabilityManifestHash(
  manifest: Omit<WorkerCapabilityManifest, 'manifestHash'>
): string {
  const payload = JSON.stringify({
    workerId: manifest.workerId,
    version: manifest.version,
    autonomyTier: manifest.autonomyTier,
    riskCategory: manifest.riskCategory,
    requiresHumanApproval: manifest.requiresHumanApproval,
    skillIds: [...manifest.skillIds].sort(),
    allowedTools: [...manifest.allowedTools].sort(),
    explicitNonCapabilities: [...manifest.explicitNonCapabilities].sort(),
  });
  return createHash('sha256').update(payload).digest('hex');
}

const RAW_CAPABILITY_MANIFESTS: Record<
  WorkerId,
  Omit<WorkerCapabilityManifest, 'manifestHash'>
> = {
  worker_analytics_performance: {
    workerId: 'worker_analytics_performance',
    displayName: 'Analytics & Performance Specialist',
    domain: 'Analytics, KPI Monitoring & Statistical Intelligence',
    description:
      'Statistical observation of sales velocity, traffic, and conversion funnels.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_analytics_performance',
    ],
    allowedTools: [
      'get_store_metrics',
      'get_sales_analytics',
      'run_business_intelligence_scan',
      'get_kpi_summary',
      'get_conversion_funnel',
      'query_sales_trends',
      'read_analytics',
      'draft_metric_alert',
      'read_metrics',
    ],
    requiredDataSources: [
      'authoritative_db:orders',
      'analytics_engine',
      'cache:kpi_summary',
    ],
    permissionScope: ['mcp_tools:read', 'admin:analytics'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot fabricate visitor, order, or revenue totals.',
      'Cannot modify analytics tracking or live database records.',
      'Cannot execute financial writes or change catalog prices.',
    ],
    budget: {
      timeoutSeconds: 15,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Every metric claim cites timeframe and database source.',
      'Traffic or event telemetry gaps explicitly report INSUFFICIENT_DATA.',
    ],
  },

  worker_marketing: {
    workerId: 'worker_marketing',
    displayName: 'Marketing & Campaign Orchestrator',
    domain: 'Brand Marketing, Festive Campaigns & Copywriting',
    description:
      'Designs luxury campaigns, drafts promotional strategies, and plans festive offers.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'external_side_effect',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_marketing',
      'research_general_web_research',
    ],
    allowedTools: [
      'get_store_metrics',
      'get_coupons',
      'browse_website',
      'get_competitors',
      'get_ad_metrics',
      'draft_campaign_brief',
      'analyze_audience_segments',
      'create_task_draft',
    ],
    requiredDataSources: [
      'authoritative_db:coupons',
      'marketing_campaigns',
      'competitor_intel',
    ],
    permissionScope: ['mcp_tools:read', 'admin:marketing'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot spend live ad budget without founder approval.',
      'Cannot send mass marketing emails/push without prior approval.',
      'Cannot report simulated marketing results as live confirmed conversions.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2500,
      maxToolCalls: 6,
    },
    successCriteria: [
      'Proposed discounts calculate gross margin impact.',
      'Campaign actions require exact founder approval.',
    ],
  },

  worker_seo: {
    workerId: 'worker_seo',
    displayName: 'SEO & Search Visibility Specialist',
    domain: 'Technical SEO, Schema Markup & Search Intent',
    description:
      'Audits jewelry catalog metadata, structured data, canonical tags, and search intent.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_seo',
      'research_general_web_research',
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
    permissionScope: ['mcp_tools:read', 'admin:seo'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot alter live product URLs on production directly.',
      'Cannot submit automated disavow files to Search Console.',
      'Cannot invent keyword search volume benchmarks.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2000,
      maxToolCalls: 6,
    },
    successCriteria: [
      'All flagged SEO defects point to specific URLs and missing tags.',
      'JSON-LD recommendations follow schema.org standards.',
    ],
  },

  worker_product: {
    workerId: 'worker_product',
    displayName: 'Product Merchandising & Catalog Specialist',
    domain: 'Catalog Merchandising, Pricing & Hallmark Compliance',
    description:
      'Evaluates product line performance, velocity, and hallmark compliance.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'internal_write',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_product',
      'research_competitor_intelligence',
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
    permissionScope: ['mcp_tools:read', 'admin:products'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot alter base metal purity certifications arbitrarily.',
      'Cannot publish unreviewed products directly to live store without approval.',
      'Cannot delete active products or catalog categories.',
    ],
    budget: {
      timeoutSeconds: 15,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Jewelry specifications accurately highlight metal purity and micron plating.',
      'Velocity computed from actual fulfillment history.',
    ],
  },

  worker_competitor_research: {
    workerId: 'worker_competitor_research',
    displayName: 'Competitor Intelligence Specialist',
    domain: 'Competitor Benchmarking, Pricing & Social Listening',
    description:
      'Extracts competitor jewelry prices, promotions, shipping terms, and social sentiment.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'research_competitor_intelligence',
      'research_general_web_research',
      'research_social_listening',
    ],
    allowedTools: [
      'browse_website',
      'get_competitors',
      'analyze_competitor',
      'reddit_social_sentiment',
      'web_search',
      'read_webpage',
      'research_topic',
      'search_public_discussions',
      'search_market_rates',
      'compare_product_pricing',
      'retrieve_public_citations',
    ],
    requiredDataSources: [
      'competitor_registry',
      'public_web',
      'evidence_ledger',
    ],
    permissionScope: ['mcp_tools:read', 'admin:competitors'],
    failureStates: ['unavailable', 'partial', 'stale', 'verified'],
    explicitNonCapabilities: [
      'Cannot execute purchases or cart checkout on competitor websites.',
      'Cannot post comments, replies, or DMs on external platforms.',
      'Cannot access internal corporate networks (SSRF fail-closed).',
    ],
    budget: {
      timeoutSeconds: 30,
      maxTokens: 2500,
      maxToolCalls: 8,
    },
    successCriteria: [
      'Price snapshots preserve retrieved timestamps and URLs.',
      'No social platform mutations permitted.',
    ],
  },

  worker_sales_conversion: {
    workerId: 'worker_sales_conversion',
    displayName: 'Sales & Conversion Optimization Specialist',
    domain: 'Funnel Conversion, Checkout Friction & Payment Gateway Telemetry',
    description:
      'Diagnoses checkout friction, payment gateway drop-offs, and cart abandonment.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_sales_conversion',
    ],
    allowedTools: [
      'get_store_metrics',
      'get_sales_analytics',
      'get_orders',
      'get_abandonment_metrics',
      'draft_recovery_template',
      'simulate_checkout_flow',
    ],
    requiredDataSources: [
      'authoritative_db:orders',
      'payment_gateways',
      'checkout_telemetry',
    ],
    permissionScope: ['mcp_tools:read', 'admin:sales'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot synthesize fake funnel percentages or visitor counts.',
      'Cannot issue refunds or modify payment gateway settings.',
      'Cannot apply unauthorized blanket store discounts.',
    ],
    budget: {
      timeoutSeconds: 15,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Funnel percentages derived strictly from measured checkout events.',
      'Unmeasured stages explicitly marked UNAVAILABLE.',
    ],
  },

  worker_customer_support: {
    workerId: 'worker_customer_support',
    displayName: 'Customer Support & Care Specialist',
    domain: 'Support Tickets, Returns & Empathetic Communication',
    description:
      'Triages customer support tickets, handles return claims, and drafts empathetic replies.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'external_side_effect',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_customer_support',
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
    permissionScope: ['mcp_tools:read', 'admin:support'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot send automated direct messages to customers without review by default.',
      'Cannot issue financial refunds without explicit founder approval.',
      'Cannot promise delivery dates violating carrier SLAs.',
    ],
    budget: {
      timeoutSeconds: 15,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Delays validated against carrier AWB tracking.',
      'Replies labeled as DRAFT for staff verification.',
    ],
  },

  worker_content_blog: {
    workerId: 'worker_content_blog',
    displayName: 'Content & Editorial Specialist',
    domain: 'Luxury Editorial, Craft Storytelling & Buying Guides',
    description:
      'Writes luxury jewelry editorial articles celebrating craft traditions.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'internal_write',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_content_blog',
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
    permissionScope: ['mcp_tools:read', 'admin:content'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot publish blog articles to the live site without approval.',
      'Cannot invent historical jewelry claims or false purity standards.',
      'Cannot fabricate word counts or reading times.',
    ],
    budget: {
      timeoutSeconds: 30,
      maxTokens: 4000,
      maxToolCalls: 6,
    },
    successCriteria: [
      'Canonical brand policies drawn from authoritative sources.',
      'Articles pass the Ruhvi Humanizer standards.',
    ],
  },

  worker_inventory: {
    workerId: 'worker_inventory',
    displayName: 'Inventory & Supply Chain Specialist',
    domain: 'Inventory Control, Reorder Point Modeling & Run-Rate Forecasting',
    description:
      'Monitors stock levels, forecasts stockout risks, and models reorder points.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T3',
    riskCategory: 'external_side_effect',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_inventory',
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
    permissionScope: ['mcp_tools:read', 'admin:inventory'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot execute supplier purchase orders or transfer money autonomously.',
      'Cannot zero out physical stock without verified count receipts.',
      'Cannot guess supplier lead times without verified procurement history.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2500,
      maxToolCalls: 6,
    },
    successCriteria: [
      'Days of inventory derived from rolling 30-day velocity.',
      'Physical inventory adjustments require signed approval tokens.',
    ],
  },

  worker_review_feedback: {
    workerId: 'worker_review_feedback',
    displayName: 'Review & Customer Feedback Specialist',
    domain: 'Customer Reviews, Defect Themes & Quality Mining',
    description:
      'Mines verified reviews to classify defects, packaging issues, and craft praises.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_review_feedback',
      'research_social_listening',
    ],
    allowedTools: [
      'get_reviews',
      'get_product_detail',
      'record_outcome_feedback',
      'analyze_review_sentiment',
      'get_recent_reviews',
      'draft_review_response',
    ],
    requiredDataSources: [
      'authoritative_db:reviews',
      'authoritative_db:products',
    ],
    permissionScope: ['mcp_tools:read', 'admin:reviews'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot fabricate review counts, ratings, or sentiment percentages.',
      'Cannot delete or suppress negative customer reviews.',
      'Cannot generate fake promotional testimonials.',
    ],
    budget: {
      timeoutSeconds: 15,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Defect themes cite verified purchaser review excerpts.',
      'Zero-review situations explicitly return INSUFFICIENT_DATA.',
    ],
  },

  worker_execution: {
    workerId: 'worker_execution',
    displayName: 'Transactional Execution Specialist',
    domain: 'Approval Token Verification & Atomic State Changes',
    description:
      'Executes founder-approved business mutations with cryptographic token verification.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T3',
    riskCategory: 'external_side_effect',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_execution',
    ],
    allowedTools: [
      'execute_approved_action',
      'execute_action_plan',
      'update_inventory_stock',
      'execute_approved_payload',
      'verify_approval_nonce',
      'record_execution_receipt',
    ],
    requiredDataSources: [
      'authoritative_db:approvals',
      'authoritative_db:action_plans',
      'execution_ledger',
    ],
    permissionScope: ['mcp_tools:read', 'admin:execution'],
    failureStates: ['unavailable', 'partial', 'verified'],
    explicitNonCapabilities: [
      'Cannot execute any mutation without a valid, unexpired founder approval token.',
      'Cannot bypass payload hash matching.',
      'Cannot replay previously executed approval nonces.',
    ],
    budget: {
      timeoutSeconds: 30,
      maxTokens: 2500,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Records tamper-evident execution receipt with admin ID.',
      'Idempotency enforced at the database boundary.',
    ],
  },

  worker_monitoring_verification: {
    workerId: 'worker_monitoring_verification',
    displayName: 'Closed-Loop Verification Specialist',
    domain: 'Outcome Verification, Metric Deltas & Regression Auditing',
    description:
      'Measures real-world metric impact following executed actions.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_monitoring_verification',
    ],
    allowedTools: [
      'get_outcome_analytics',
      'get_sales_analytics',
      'record_outcome_feedback',
      'measure_ground_truth_metric',
      'record_outcome_learning',
    ],
    requiredDataSources: [
      'authoritative_db:outcomes',
      'authoritative_db:metrics',
      'execution_ledger',
    ],
    permissionScope: ['mcp_tools:read', 'admin:monitoring'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot fabricate outcome success percentages.',
      'Cannot mark an action verified without real measurement.',
      'Cannot execute mutations or alter system state.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2000,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Before and after metrics drawn from identical timeframes.',
      'Failed analytics queries report INSUFFICIENT_DATA.',
    ],
  },

  worker_orders_logistics: {
    workerId: 'worker_orders_logistics',
    displayName: 'Orders & Logistics Specialist',
    domain: 'Shiprocket Fulfillment, RTO Reduction & Courier SLA Monitoring',
    description:
      'Monitors order fulfillment pipelines, courier SLAs, and RTO risks.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'internal_write',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_orders_logistics',
    ],
    allowedTools: [
      'get_order_pipeline_status',
      'get_delivery_failed_and_rto_orders',
      'get_courier_sla_delays',
      'get_return_requests_and_reasons',
      'get_order_call_remarks',
      'add_order_call_remark',
      'get_transit_exceptions',
      'calculate_rto_risk',
      'check_courier_slas',
    ],
    requiredDataSources: [
      'authoritative_db:orders',
      'shiprocket_api',
      'customer_call_remarks',
    ],
    permissionScope: ['mcp_tools:read', 'admin:orders'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot cancel or re-route live shipments without manager verification.',
      'Cannot alter courier rates or wallet balances.',
      'Cannot fabricate courier transit milestones.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2000,
      maxToolCalls: 6,
    },
    successCriteria: [
      'Transit exceptions cite valid carrier AWB numbers.',
      'Customer call remarks prevent staff collisions.',
    ],
  },

  worker_accounts_tax: {
    workerId: 'worker_accounts_tax',
    displayName: 'Accounts & Tax Compliance Specialist',
    domain:
      'Indian GST Law (HSN 7113), ITC Reconciliation & Double-Entry Bookkeeping',
    description:
      'GST Rule 46 compliance, GSTR-3B computation, and ITC Section 17(5) validation.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T3',
    riskCategory: 'financial',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_accounts_tax',
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
    permissionScope: ['mcp_tools:read', 'admin:accounts'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot file legal returns directly to GSTN without CA/founder sign-off.',
      'Cannot execute bank payouts or ledger adjustments autonomously.',
      'Cannot override blocked ITC under statutory Section 17(5).',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2500,
      maxToolCalls: 7,
    },
    successCriteria: [
      'Enforces HSN 7113 3% GST rate calculations.',
      'Debits strictly equal credits on all voucher adjustments.',
    ],
  },

  worker_performance_intelligence: {
    workerId: 'worker_performance_intelligence',
    displayName: 'Performance Intelligence Specialist',
    domain: 'Workforce KPI Measurement, Scorecard Evaluation & SLA Auditing',
    description:
      'Deterministic measurement and audit of AI workers and human staff.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T1',
    riskCategory: 'read_only',
    requiresHumanApproval: false,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_performance_intelligence',
    ],
    allowedTools: [
      'get_workforce_events',
      'calculate_member_scorecard',
      'audit_workforce_quality',
      'generate_cofounder_report',
    ],
    requiredDataSources: [
      'authoritative_db:workforce_events',
      'workforce_manifests',
    ],
    permissionScope: ['mcp_tools:read', 'admin:performance'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot modify performance logs or backdate evaluation scores.',
      'Cannot terminate or downgrade human staff permissions.',
      'Cannot fabricate SLA adherence metrics.',
    ],
    budget: {
      timeoutSeconds: 20,
      maxTokens: 2500,
      maxToolCalls: 5,
    },
    successCriteria: [
      'Calculations follow deterministic formulas over recorded events.',
      'Separates external blockers from worker defects.',
    ],
  },

  worker_security_intelligence: {
    workerId: 'worker_security_intelligence',
    displayName: 'Security Intelligence Specialist',
    domain: 'Zero-Trust Architecture, Posture Auditing & Vulnerability Defense',
    description:
      'Zero-trust posture auditing, secret exposure detection, and SSRF verification.',
    version: '1.0.0',
    supervisorId: 'co_founder_brain',
    autonomyTier: 'T2',
    riskCategory: 'internal_write',
    requiresHumanApproval: true,
    skillIds: [
      'shared_evidence_quality',
      'shared_source_trust_policy',
      'shared_prompt_injection_boundary',
      'worker_security_intelligence',
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
    permissionScope: ['mcp_tools:read', 'admin:security'],
    failureStates: ['insufficient_data', 'unavailable', 'verified'],
    explicitNonCapabilities: [
      'Cannot disable firewalls, WAF rules, or auth checks.',
      'Cannot execute irreversible containment actions without approval.',
      'Cannot log or reveal sensitive API keys or customer secrets.',
    ],
    budget: {
      timeoutSeconds: 25,
      maxTokens: 2500,
      maxToolCalls: 6,
    },
    successCriteria: [
      'Vulnerabilities link to specific file lines or CVEs.',
      'Containment measures remain reversible and founder-gated.',
    ],
  },
};

export const WORKER_CAPABILITY_MANIFESTS: Record<
  WorkerId,
  WorkerCapabilityManifest
> = Object.entries(RAW_CAPABILITY_MANIFESTS).reduce(
  (acc, [id, raw]) => {
    const workerId = id as WorkerId;
    acc[workerId] = {
      ...raw,
      manifestHash: computeCapabilityManifestHash(raw),
    };
    return acc;
  },
  {} as Record<WorkerId, WorkerCapabilityManifest>
);

export function getWorkerCapabilityManifest(
  workerId: WorkerId
): WorkerCapabilityManifest | undefined {
  return WORKER_CAPABILITY_MANIFESTS[workerId];
}

export function getAllWorkerCapabilityManifests(): WorkerCapabilityManifest[] {
  return Object.values(WORKER_CAPABILITY_MANIFESTS);
}
