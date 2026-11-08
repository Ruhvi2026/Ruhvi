import 'server-only';

import { createHash } from 'crypto';
import { AutonomousWorkerManifest, WorkerId } from './types';

function computeManifestHash(
  manifest: Omit<AutonomousWorkerManifest, 'manifestHash'>
): string {
  const serialized = JSON.stringify({
    workerId: manifest.workerId,
    version: manifest.manifestVersion,
    domain: manifest.domain,
    tier: manifest.autonomyTier,
    allowedTools: manifest.allowedTools.sort(),
    allowedDelegates: manifest.allowedDelegates.sort(),
    scopes: manifest.readScopes.sort(),
  });
  return createHash('sha256').update(serialized).digest('hex');
}

const RAW_MANIFESTS: Record<
  WorkerId,
  Omit<AutonomousWorkerManifest, 'manifestHash'>
> = {
  worker_analytics_performance: {
    workerId: 'worker_analytics_performance',
    displayName: 'Analytics & Performance Specialist',
    domain:
      'Analytics, KPI monitoring, conversion funnel and revenue attribution',
    description:
      'Autonomous observation of sales velocity, customer cohorts, and traffic trends.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Monitor daily revenue, AOV, and gross order volume',
      'Identify anomalous funnel conversion drops across checkout stages',
      'Track customer repeat purchase rates and LTV metrics',
    ],
    ownedKpis: [
      { metricId: 'revenue_daily', sourceId: 'orders_authoritative' },
      { metricId: 'checkout_conversion_rate', sourceId: 'analytics_engine' },
      { metricId: 'aov', sourceId: 'orders_authoritative' },
    ],
    allowedDataSources: [
      'authoritative_db:orders',
      'analytics_engine:funnel',
      'cache:kpi_summary',
    ],
    triggers: ['manual', 'schedule', 'verified_event', 'health_signal'],
    allowedTools: [
      'get_kpi_summary',
      'get_conversion_funnel',
      'query_sales_trends',
      'read_analytics',
      'draft_metric_alert',
      'get_store_metrics',
      'get_sales_analytics',
      'run_business_intelligence_scan',
      'read_metrics',
    ],
    readScopes: ['orders:read', 'analytics:read', 'products:read'],
    internalWriteScopes: ['tasks:internal_draft', 'reports:analytics_summary'],
    approvalRequiredScopes: [],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_marketing', 'worker_sales_conversion'],
    limits: {
      maxSteps: 8,
      maxToolCalls: 6,
      maxModelCalls: 6,
      maxChildren: 2,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 300,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'exponential_jitter' },
    successCriteria: [
      'Accurate statistical anomalies with baseline references and source timestamps',
    ],
    evaluationSuiteId: 'eval_suite_workforce_analytics_v1',
  },

  worker_marketing: {
    workerId: 'worker_marketing',
    displayName: 'Marketing & Campaign Specialist',
    domain:
      'Customer acquisition, ad performance, campaigns, and audience segmentation',
    description:
      'Generates campaign hypotheses, audience segments, and ad creative recommendations.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Evaluate campaign ROAS, CPA, and CTR across channels',
      'Draft promotional briefs and festive jewellery collection campaigns',
      'Identify underperforming ad sets for founder review',
    ],
    ownedKpis: [
      { metricId: 'blended_roas', sourceId: 'meta_capi_ads' },
      {
        metricId: 'customer_acquisition_cost',
        sourceId: 'marketing_attribution',
      },
    ],
    allowedDataSources: [
      'meta_capi:ad_performance',
      'orders:first_time_buyers',
    ],
    triggers: ['manual', 'schedule', 'verified_event'],
    allowedTools: [
      'get_ad_metrics',
      'draft_campaign_brief',
      'analyze_audience_segments',
      'read_analytics',
      'create_task_draft',
    ],
    readScopes: ['campaigns:read', 'orders:read', 'products:read'],
    internalWriteScopes: ['tasks:campaign_brief', 'reports:roas_audit'],
    approvalRequiredScopes: ['ads:spend_update', 'campaigns:publish'],
    autonomyTier: 'T1',
    allowedDelegates: [
      'worker_seo',
      'worker_content_blog',
      'worker_sales_conversion',
      'worker_competitor_research',
      'worker_analytics_performance',
    ],
    limits: {
      maxSteps: 8,
      maxToolCalls: 8,
      maxModelCalls: 6,
      maxChildren: 2,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 400,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'exponential_jitter' },
    successCriteria: [
      'Actionable briefs with verifiable audience criteria and budget constraints',
    ],
    evaluationSuiteId: 'eval_suite_workforce_marketing_v1',
  },

  worker_seo: {
    workerId: 'worker_seo',
    displayName: 'SEO & Organic Growth Specialist',
    domain:
      'Search engine optimization, structured data, schema markup, and internal linking',
    description:
      'Monitors catalog search indexability, title tags, and structured data.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Audit product pages for missing schema or meta descriptions',
      'Identify high-intent organic jewellery keyword opportunities',
      'Detect crawl errors and canonical URL conflicts',
    ],
    ownedKpis: [
      { metricId: 'organic_search_clicks', sourceId: 'search_console_kpi' },
      { metricId: 'indexed_products_ratio', sourceId: 'seo_health_audit' },
    ],
    allowedDataSources: ['seo_engine:sitemap', 'products:metadata'],
    triggers: ['manual', 'schedule'],
    allowedTools: [
      'audit_page_seo',
      'suggest_meta_tags',
      'inspect_structured_data',
      'read_search_console',
      'read_analytics',
    ],
    readScopes: ['products:read', 'seo:read'],
    internalWriteScopes: ['tasks:seo_checklist', 'drafts:meta_suggestions'],
    approvalRequiredScopes: ['sitemap:update', 'redirects:mutate'],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_content_blog'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Clean JSON-LD schema compliant with Schema.org Jewellery specification',
    ],
    evaluationSuiteId: 'eval_suite_workforce_seo_v1',
  },

  worker_product: {
    workerId: 'worker_product',
    displayName: 'Product Catalog & Merchandising Specialist',
    domain:
      'Product listings, descriptions, specifications, luxury attributes, and catalog quality',
    description:
      'Ensures catalog completeness, gemstone hallmarks, and styling recommendations.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Audit product listings for complete gold purity, weight, and gemstone dimensions',
      'Generate luxury product descriptions and styling pairing advice',
      'Detect uncatalogued variants or missing imagery',
    ],
    ownedKpis: [
      {
        metricId: 'catalog_completeness_score',
        sourceId: 'product_intelligence',
      },
      { metricId: 'product_page_bounce_rate', sourceId: 'analytics_engine' },
    ],
    allowedDataSources: [
      'authoritative_db:products',
      'catalog_intelligence:attributes',
    ],
    triggers: ['manual', 'verified_event'],
    allowedTools: [
      'inspect_product_details',
      'draft_product_description',
      'validate_hallmark_attributes',
    ],
    readScopes: ['products:read', 'inventory:read'],
    internalWriteScopes: ['drafts:product_copy', 'tasks:catalog_audit'],
    approvalRequiredScopes: [
      'products:price_update',
      'products:visibility_mutate',
    ],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_seo', 'worker_inventory'],
    limits: {
      maxSteps: 8,
      maxToolCalls: 6,
      maxModelCalls: 6,
      maxChildren: 2,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 350,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Strict compliance with Ruhvi luxury voice and BIS hallmark clarity',
    ],
    evaluationSuiteId: 'eval_suite_workforce_product_v1',
  },

  worker_competitor_research: {
    workerId: 'worker_competitor_research',
    displayName: 'Market & Competitor Intelligence Specialist',
    domain:
      'Public pricing analysis, market trends, gemstone benchmarking, and industry research',
    description:
      'Conducts bounded research on external market pricing and luxury jewellery trends.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Track benchmark gold and silver rate trends',
      'Analyze competitor promotional discounting structures',
      'Assess design trend shifts in contemporary Indian bridal jewellery',
    ],
    ownedKpis: [
      { metricId: 'market_price_index', sourceId: 'competitor_benchmark' },
    ],
    allowedDataSources: [
      'public_web:research_sources',
      'rsi_research:findings',
    ],
    triggers: ['manual', 'schedule'],
    allowedTools: [
      'search_market_rates',
      'compare_product_pricing',
      'retrieve_public_citations',
    ],
    readScopes: ['competitors:read', 'products:read'],
    internalWriteScopes: ['reports:competitor_brief', 'tasks:market_analysis'],
    approvalRequiredScopes: [],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_marketing'],
    limits: {
      maxSteps: 8,
      maxToolCalls: 8,
      maxModelCalls: 6,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 450,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'exponential_jitter' },
    successCriteria: [
      'Every competitor claim has a dated public source citation with SSRF validation',
    ],
    evaluationSuiteId: 'eval_suite_workforce_competitor_v1',
  },

  worker_sales_conversion: {
    workerId: 'worker_sales_conversion',
    displayName: 'Sales & Conversion Specialist',
    domain:
      'Checkout optimization, cart abandonment, partial-COD conversions, and sales recovery',
    description:
      'Diagnoses drop-offs in the purchase flow and proposes conversion lift experiments.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Monitor abandoned cart velocity and partial-COD drop-off rates',
      'Propose personalized WhatsApp or email recovery templates',
      'Optimize checkout payment provider routing suggestions',
    ],
    ownedKpis: [
      { metricId: 'abandoned_cart_rate', sourceId: 'orders_authoritative' },
      { metricId: 'recovery_conversion_rate', sourceId: 'conversion_engine' },
    ],
    allowedDataSources: [
      'authoritative_db:orders',
      'analytics_engine:checkout',
    ],
    triggers: ['manual', 'schedule', 'verified_event'],
    allowedTools: [
      'get_abandonment_metrics',
      'draft_recovery_template',
      'simulate_checkout_flow',
    ],
    readScopes: ['orders:read', 'customers:read_aggregate', 'products:read'],
    internalWriteScopes: [
      'tasks:recovery_experiment',
      'drafts:recovery_template',
    ],
    approvalRequiredScopes: ['coupons:create', 'messages:send_recovery'],
    autonomyTier: 'T1',
    allowedDelegates: [
      'worker_customer_support',
      'worker_analytics_performance',
    ],
    limits: {
      maxSteps: 8,
      maxToolCalls: 6,
      maxModelCalls: 6,
      maxChildren: 2,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 350,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'exponential_jitter' },
    successCriteria: [
      'Clean evidence of drop-off reasons with zero customer spamming',
    ],
    evaluationSuiteId: 'eval_suite_workforce_sales_v1',
  },

  worker_customer_support: {
    workerId: 'worker_customer_support',
    displayName: 'Customer Experience & Support Specialist',
    domain:
      'Customer inquiries, ticket resolution, order tracking questions, and support SLA',
    description:
      'Triages customer inquiries, checks courier status, and drafts empathetic responses.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Triage incoming support tickets by urgency and sentiment',
      'Draft accurate answers for delivery, resizing, and return policy queries',
      'Monitor support ticket resolution SLA breaches',
    ],
    ownedKpis: [
      { metricId: 'first_response_time_minutes', sourceId: 'support_tickets' },
      { metricId: 'open_ticket_count', sourceId: 'support_tickets' },
    ],
    allowedDataSources: [
      'authoritative_db:support_tickets',
      'shiprocket:tracking_status',
    ],
    triggers: ['manual', 'verified_event'],
    allowedTools: [
      'read_ticket_details',
      'check_courier_tracking',
      'draft_support_reply',
    ],
    readScopes: ['support:read', 'orders:read_scoped', 'shipping:read'],
    internalWriteScopes: ['drafts:ticket_reply', 'tasks:support_triage'],
    approvalRequiredScopes: [
      'messages:send_customer_email',
      'orders:initiate_refund',
    ],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_orders_logistics'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Accurate policy citations and empathetic executive voice',
    ],
    evaluationSuiteId: 'eval_suite_workforce_support_v1',
  },

  worker_content_blog: {
    workerId: 'worker_content_blog',
    displayName: 'Content & Editorial Specialist',
    domain:
      'Editorial planning, jewellery education, styling blogs, and brand storytelling',
    description:
      'Plans content calendars and drafts high-quality educational jewellery articles.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Develop weekly editorial calendars matching bridal and festive calendars',
      'Draft educational jewellery articles (diamond carats, gold hallmark, styling guides)',
      'Align articles with target SEO search clusters',
    ],
    ownedKpis: [
      { metricId: 'blog_views_monthly', sourceId: 'analytics_engine' },
      { metricId: 'content_published_count', sourceId: 'editorial_db' },
    ],
    allowedDataSources: ['seo_engine:clusters', 'products:featured_collection'],
    triggers: ['manual', 'schedule'],
    allowedTools: [
      'plan_editorial_calendar',
      'draft_blog_post',
      'cluster_search_intent',
    ],
    readScopes: ['content:read', 'seo:read', 'products:read'],
    internalWriteScopes: ['drafts:blog_article', 'tasks:editorial_plan'],
    approvalRequiredScopes: ['blog:publish_live'],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_seo'],
    limits: {
      maxSteps: 8,
      maxToolCalls: 6,
      maxModelCalls: 8,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 60,
      maxCostMinorUnits: 400,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Accurate gemological facts without sensationalized claims',
    ],
    evaluationSuiteId: 'eval_suite_workforce_content_v1',
  },

  worker_inventory: {
    workerId: 'worker_inventory',
    displayName: 'Inventory & Stock Intelligence Specialist',
    domain:
      'Stock velocity, safety buffer monitoring, reorder forecasts, and raw material tracking',
    description: 'Monitors inventory depletion rates and flags stockout risks.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Monitor SKU depletion velocity and days-of-inventory remaining',
      'Calculate reorder recommendations before festive peak demand',
      'Identify slow-moving stock requiring merchandising attention',
    ],
    ownedKpis: [
      { metricId: 'stockout_risk_count', sourceId: 'products_authoritative' },
      { metricId: 'inventory_turnover_ratio', sourceId: 'inventory_engine' },
    ],
    allowedDataSources: ['authoritative_db:products', 'orders:sales_velocity'],
    triggers: ['manual', 'schedule', 'verified_event'],
    allowedTools: [
      'calculate_stock_velocity',
      'get_low_stock_items',
      'recommend_reorder_qty',
      'audit_stock_levels',
      'detect_low_stock_risks',
      'draft_reorder_sheet',
      'adjust_stock_level',
    ],
    readScopes: ['inventory:read', 'products:read', 'orders:read_aggregates'],
    internalWriteScopes: ['reports:stockout_warning', 'tasks:reorder_draft'],
    approvalRequiredScopes: [
      'inventory:adjust_stock',
      'po:create_purchase_order',
    ],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_orders_logistics', 'worker_product'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Zero false-positive stockout alarms; accurate historical velocity math',
    ],
    evaluationSuiteId: 'eval_suite_workforce_inventory_v1',
  },

  worker_review_feedback: {
    workerId: 'worker_review_feedback',
    displayName: 'Customer Feedback & Review Specialist',
    domain:
      'Product reviews, sentiment analysis, unboxing feedback, and product quality signals',
    description:
      'Aggregates customer review sentiment and identifies recurring quality signals.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Extract sentiment themes from verified customer reviews',
      'Highlight recurring clasp, chain, or packaging defects for craftspeople',
      'Draft empathetic replies to negative reviews for founder approval',
    ],
    ownedKpis: [
      { metricId: 'average_customer_rating', sourceId: 'product_reviews' },
      {
        metricId: 'negative_sentiment_defect_ratio',
        sourceId: 'feedback_engine',
      },
    ],
    allowedDataSources: [
      'authoritative_db:product_reviews',
      'support:feedback_tickets',
    ],
    triggers: ['manual', 'verified_event'],
    allowedTools: [
      'analyze_review_sentiment',
      'get_recent_reviews',
      'draft_review_response',
    ],
    readScopes: ['reviews:read', 'products:read'],
    internalWriteScopes: ['reports:quality_feedback', 'drafts:review_reply'],
    approvalRequiredScopes: ['reviews:post_public_reply'],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_product'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'True sentiment extraction without hallucinated complaints',
    ],
    evaluationSuiteId: 'eval_suite_workforce_reviews_v1',
  },

  worker_execution: {
    workerId: 'worker_execution',
    displayName: 'Approved Action Executor',
    domain:
      'Executing strictly approved business actions with cryptographic proof of approval',
    description:
      'Enforces human governance: executes only actions that carry verified owner approval.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Execute approved business actions with one-time authorization tokens',
      'Produce immutable execution receipts with before/after state hashes',
      'Fail closed if approval signature or payload hash does not match',
    ],
    ownedKpis: [
      {
        metricId: 'approved_actions_executed_count',
        sourceId: 'execution_receipts',
      },
      {
        metricId: 'unauthorized_execution_rejections',
        sourceId: 'audit_events',
      },
    ],
    allowedDataSources: [
      'approvals:verified_records',
      'authoritative_db:audit',
    ],
    triggers: ['manual', 'verified_event'],
    allowedTools: [
      'execute_approved_payload',
      'verify_approval_nonce',
      'record_execution_receipt',
    ],
    readScopes: ['approvals:read', 'audit:read'],
    internalWriteScopes: ['receipts:write', 'audit:write'],
    approvalRequiredScopes: ['business:execute_mutation'],
    autonomyTier: 'T0', // T0: Only executes upon explicit authorized owner approval
    allowedDelegates: ['worker_monitoring_verification'],
    limits: {
      maxSteps: 4,
      maxToolCalls: 4,
      maxModelCalls: 2,
      maxChildren: 1,
      maxDepth: 1,
      timeoutSeconds: 30,
      maxCostMinorUnits: 150,
    },
    retryPolicy: { maxAttempts: 1, backoff: 'fixed' },
    successCriteria: [
      '100% cryptographic validation of approval binding; zero unauthorized execution',
    ],
    evaluationSuiteId: 'eval_suite_workforce_execution_v1',
  },

  worker_monitoring_verification: {
    workerId: 'worker_monitoring_verification',
    displayName: 'Operational Monitoring & Outcome Verifier',
    domain:
      'Post-action outcome verification, metric tracking, and regression alerts',
    description:
      'Validates business results after action execution and feeds learnings to RSI.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Measure authoritative business metrics following elapsed measurement windows',
      'Detect regression or shortfall against expected targets',
      'Commit verified learnings to long-term memory via RSI',
    ],
    ownedKpis: [
      { metricId: 'verified_outcomes_count', sourceId: 'closed_loop_outcomes' },
      {
        metricId: 'conflict_shortfall_count',
        sourceId: 'closed_loop_outcomes',
      },
    ],
    allowedDataSources: ['authoritative_db:orders', 'closed_loop:outcomes'],
    triggers: ['manual', 'schedule', 'dependency'],
    allowedTools: [
      'verify_action_outcome',
      'measure_ground_truth_metric',
      'record_outcome_learning',
    ],
    readScopes: ['orders:read', 'outcomes:read', 'audit:read'],
    internalWriteScopes: [
      'outcomes:verify_status',
      'rsi_memory:verified_lesson',
    ],
    approvalRequiredScopes: [],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_analytics_performance'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Strict ground-truth verification; inconclusive states never marked success',
    ],
    evaluationSuiteId: 'eval_suite_workforce_monitoring_v1',
  },

  worker_orders_logistics: {
    workerId: 'worker_orders_logistics',
    displayName: 'Orders & Logistics Specialist',
    domain:
      'Courier delivery performance, Shiprocket tracking, delay alerts, and RTO prevention',
    description:
      'Monitors order transit velocity, shipping exceptions, and delivery SLA.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Monitor courier transit delay exceptions and proactive NDR alerts',
      'Identify pincodes with elevated Return-to-Origin (RTO) rates',
      'Ensure high-value jewellery orders receive priority transit insurance',
    ],
    ownedKpis: [
      { metricId: 'average_delivery_days', sourceId: 'shiprocket_tracking' },
      { metricId: 'rto_percentage', sourceId: 'orders_authoritative' },
    ],
    allowedDataSources: [
      'authoritative_db:orders',
      'shiprocket:shipment_status',
    ],
    triggers: ['manual', 'schedule', 'verified_event'],
    allowedTools: [
      'get_transit_exceptions',
      'calculate_rto_risk',
      'check_courier_slas',
    ],
    readScopes: ['orders:read', 'shipping:read'],
    internalWriteScopes: ['reports:logistics_summary', 'tasks:rto_watchdog'],
    approvalRequiredScopes: ['shipping:rebook_courier', 'orders:cancel_order'],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_customer_support'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Accurate tracking state reconciliation with official Shiprocket webhooks',
    ],
    evaluationSuiteId: 'eval_suite_workforce_logistics_v1',
  },

  worker_accounts_tax: {
    workerId: 'worker_accounts_tax',
    displayName: 'Accounts, Ledger & Tax Specialist',
    domain:
      'GST reconciliation, invoice anomaly checks, payment gateway settlement audit',
    description:
      'Read-only financial discrepancy audits and accountant-ready tax summaries.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Reconcile order receipts with PhonePe settlement reports',
      'Audit 3% Jewellery GST calculation consistency across all state invoices',
      'Highlight pending invoice discrepancies before monthly filing deadlines',
    ],
    ownedKpis: [
      {
        metricId: 'settlement_discrepancy_amount',
        sourceId: 'payment_settlements',
      },
      { metricId: 'tax_reconciliation_accuracy', sourceId: 'invoices_db' },
    ],
    allowedDataSources: [
      'authoritative_db:orders',
      'payment_gateway:settlements',
    ],
    triggers: ['manual', 'schedule'],
    allowedTools: [
      'audit_gst_calculations',
      'reconcile_gateway_settlements',
      'generate_discrepancy_report',
    ],
    readScopes: ['orders:read_financial', 'invoices:read', 'settlements:read'],
    internalWriteScopes: [
      'reports:tax_reconciliation',
      'tasks:accountant_checklist',
    ],
    approvalRequiredScopes: ['financial:ledger_adjustment'],
    autonomyTier: 'T1',
    allowedDelegates: ['worker_analytics_performance'],
    limits: {
      maxSteps: 6,
      maxToolCalls: 5,
      maxModelCalls: 4,
      maxChildren: 1,
      maxDepth: 2,
      timeoutSeconds: 45,
      maxCostMinorUnits: 250,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Precise arithmetic to 2 decimal places with rupee settlement citations',
    ],
    evaluationSuiteId: 'eval_suite_workforce_accounts_v1',
  },
  worker_performance_intelligence: {
    workerId: 'worker_performance_intelligence',
    displayName: 'Performance Intelligence Specialist',
    domain:
      'Workforce evaluation, deterministic KPI scoring, and audit intelligence',
    description:
      'Continuous audit and evidence-backed performance intelligence for AI workers and human staff.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Continuously audit AI worker and human staff task deliverables',
      'Compute deterministic role-specific KPI scores and achievement points',
      'Detect operational anomalies, high retry rates, and root causes',
      'Produce structured performance briefings for the AI Co-Founder',
    ],
    ownedKpis: [
      {
        metricId: 'workforce_verified_success_rate',
        sourceId: 'performance_ledger',
      },
      { metricId: 'workforce_quality_score', sourceId: 'performance_ledger' },
      { metricId: 'workforce_on_time_sla', sourceId: 'performance_ledger' },
    ],
    allowedDataSources: [
      'authoritative_db:workforce_task_events',
      'authoritative_db:tasks',
      'dispatcher:telemetry',
    ],
    triggers: ['manual', 'schedule', 'verified_event', 'health_signal'],
    allowedTools: [
      'get_workforce_events',
      'calculate_member_scorecard',
      'audit_workforce_quality',
      'generate_cofounder_report',
    ],
    readScopes: ['admin:workforce_performance:read', 'tasks:read'],
    internalWriteScopes: ['admin:workforce_performance:write'],
    approvalRequiredScopes: [],
    allowedDelegates: [],
    autonomyTier: 'T1',
    limits: {
      maxSteps: 6,
      maxToolCalls: 4,
      maxModelCalls: 0, // Zero paid model calls by default
      maxChildren: 0,
      maxDepth: 1,
      timeoutSeconds: 30,
      maxCostMinorUnits: 0,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      'Deterministic KPI calculations with reproducible evidence citations',
    ],
    evaluationSuiteId: 'eval_suite_workforce_performance_v1',
  },

  worker_security_intelligence: {
    workerId: 'worker_security_intelligence',
    displayName: 'Security Intelligence Worker',
    domain:
      'Autonomous threat detection, vulnerability analysis, CI/CD scan synthesis, file upload quarantine, and defensive governance',
    description:
      'Enforces zero-trust defense-in-depth across edge, repository, database, and customer uploads with reversible autonomous containment.',
    manifestVersion: '1.0.0',
    supervisorId: 'co_founder_brain',
    objectives: [
      'Synthesize CI/CD scanner findings (Trivy, Semgrep, OSV, Gitleaks, ZAP) into deduplicated D1 findings',
      'Inspect uploaded customer files with zero-cost magic-byte and polyglot script detection',
      'Execute pre-approved reversible containment (quarantine, rate-limit, temporary IP block)',
      'Gate destructive/high-risk actions behind explicit human owner approval',
      'Maintain an append-only cryptographic audit log in Cloudflare D1',
    ],
    ownedKpis: [
      {
        metricId: 'unresolved_critical_vulnerabilities',
        sourceId: 'security_findings',
      },
      {
        metricId: 'active_containment_actions',
        sourceId: 'security_blocked_entities',
      },
      {
        metricId: 'quarantined_malicious_uploads',
        sourceId: 'security_quarantine_records',
      },
    ],
    allowedDataSources: [
      'cloudflare:d1:security',
      'cloudflare:r2:artifacts',
      'github_actions:scans',
      'authoritative_db:audit',
    ],
    triggers: ['manual', 'schedule', 'verified_event', 'health_signal'],
    allowedTools: [
      'get_security_posture',
      'analyze_vulnerabilities',
      'propose_containment',
      'inspect_file_security',
      'get_incident_report',
    ],
    readScopes: ['security:read', 'scans:read', 'audit:read'],
    internalWriteScopes: [
      'security:quarantine',
      'security:rate_limit',
      'security:proposals',
    ],
    approvalRequiredScopes: [
      'security:permanent_block',
      'security:rotate_credentials',
      'security:disable_account',
    ],
    allowedDelegates: ['worker_monitoring_verification', 'worker_execution'],
    autonomyTier: 'T1',
    limits: {
      maxSteps: 6,
      maxToolCalls: 6,
      maxModelCalls: 0,
      maxChildren: 1,
      maxDepth: 1,
      timeoutSeconds: 30,
      maxCostMinorUnits: 0,
    },
    retryPolicy: { maxAttempts: 2, backoff: 'fixed' },
    successCriteria: [
      '100% deterministic findings deduplication with zero false-positive disruption',
    ],
    evaluationSuiteId: 'eval_suite_security_intelligence_v1',
  },
};

export const WORKER_MANIFESTS: Record<WorkerId, AutonomousWorkerManifest> = (
  Object.keys(RAW_MANIFESTS) as WorkerId[]
).reduce(
  (acc, workerId) => {
    const raw = RAW_MANIFESTS[workerId];
    acc[workerId] = {
      ...raw,
      manifestHash: computeManifestHash(raw),
    };
    return acc;
  },
  {} as Record<WorkerId, AutonomousWorkerManifest>
);

export function getWorkerManifest(
  workerId: WorkerId
): AutonomousWorkerManifest | undefined {
  return WORKER_MANIFESTS[workerId];
}

export function getAllWorkerManifests(): AutonomousWorkerManifest[] {
  return Object.values(WORKER_MANIFESTS);
}
