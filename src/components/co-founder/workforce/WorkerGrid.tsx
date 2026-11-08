'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CoWorkerAvatar,
  CO_WORKER_CONFIGS,
  CoWorkerRole,
  CoWorkerStatus,
} from '@/components/co-founder/CoWorkerAvatar';
import {
  ChevronDown,
  ChevronUp,
  Activity,
  Layers,
  Send,
  MessageSquare,
  Eye,
} from 'lucide-react';

export interface SubAgent {
  id: string;
  name: string;
  roleDescription: string;
  status: CoWorkerStatus;
  tool: string;
  lastExecutionMs?: number;
}

export interface WorkerNodeData {
  id: string;
  role: Exclude<CoWorkerRole, 'cofounder'>;
  name: string;
  title: string;
  description: string;
  status: CoWorkerStatus;
  activeTask: string;
  latencyMs: number;
  tokensPerSec: number;
  subAgents: SubAgent[];
  canonicalWorkerId: string;
}

export const INITIAL_WORKFORCE_DATA: WorkerNodeData[] = [
  {
    id: 'worker_analytics_performance',
    role: 'analyst',
    canonicalWorkerId: 'worker_analytics_performance',
    name: 'Analytics & Performance',
    title: 'Financial & E-commerce Intelligence Specialist',
    description:
      'Monitors live unit economics, gross margins, AOV, cohort retention, and checkout conversion.',
    status: 'working',
    activeTask: 'Calculating live AOV ₹3,850 and cohort retention trajectory',
    latencyMs: 76,
    tokensPerSec: 48.0,
    subAgents: [
      {
        id: 'sub_economics',
        name: 'Unit Economics Monitor',
        roleDescription: 'AOV, CAC & Gross Margin tracking',
        status: 'working',
        tool: 'analytics.queryMargins()',
        lastExecutionMs: 180,
      },
      {
        id: 'sub_cohort',
        name: 'Cohort Drop-off Tracker',
        roleDescription: 'Checkout funnel analytics',
        status: 'idle',
        tool: 'analytics.queryFunnels()',
        lastExecutionMs: 240,
      },
    ],
  },
  {
    id: 'worker_marketing',
    role: 'marketer',
    canonicalWorkerId: 'worker_marketing',
    name: 'Growth Marketing',
    title: 'Growth Campaigns & Ads Manager',
    description:
      'Formulates target audiences, ROAS rules, Meta & Google ad spend, and continuous ad flows.',
    status: 'working',
    activeTask: 'Auditing 22K bridal collection ROAS and draft ad sets',
    latencyMs: 120,
    tokensPerSec: 72.1,
    subAgents: [
      {
        id: 'sub_campaigns',
        name: 'Meta Ads Campaign Manager',
        roleDescription: 'Ad spend & ROAS orchestrator',
        status: 'idle',
        tool: 'metaAds.queryDrafts()',
        lastExecutionMs: 310,
      },
      {
        id: 'sub_audience',
        name: 'Audience Segmenter',
        roleDescription: 'Target demographic & lookalike analyzer',
        status: 'idle',
        tool: 'metaAds.segmentAudience()',
        lastExecutionMs: 220,
      },
    ],
  },
  {
    id: 'worker_seo',
    role: 'researcher',
    canonicalWorkerId: 'worker_seo',
    name: 'Technical SEO',
    title: 'Technical SEO & Organic Discovery Specialist',
    description:
      'Optimizes XML sitemaps, structured JSON-LD schemas, product meta tags, and Google search indexing.',
    status: 'idle',
    activeTask: 'Auditing Gold Choker structured schema & sitemap freshness',
    latencyMs: 82,
    tokensPerSec: 50.4,
    subAgents: [
      {
        id: 'sub_seo_sitemap',
        name: 'Sitemap Health Inspector',
        roleDescription: 'XML sitemap & meta tags validator',
        status: 'idle',
        tool: 'seo.auditCatalog()',
        lastExecutionMs: 180,
      },
      {
        id: 'sub_seo_schema',
        name: 'Schema.org Validator',
        roleDescription: 'Product JSON-LD rich snippets generator',
        status: 'idle',
        tool: 'schema.validateMarkup()',
        lastExecutionMs: 140,
      },
    ],
  },
  {
    id: 'worker_product',
    role: 'designer',
    canonicalWorkerId: 'worker_product',
    name: 'Product Merchandising',
    title: 'Product Catalog & SKU Merchandising Specialist',
    description:
      'Oversees luxury jewelry catalog, category hierarchy, SKU tagging, and high-res visual assets.',
    status: 'idle',
    activeTask:
      'Validating 925 Silver & 22K Gold SKU attributes and high-res imagery',
    latencyMs: 88,
    tokensPerSec: 51.5,
    subAgents: [
      {
        id: 'sub_catalog',
        name: 'Catalog Quality Inspector',
        roleDescription: 'SKU specs & description auditor',
        status: 'idle',
        tool: 'catalog.verifySpecs()',
        lastExecutionMs: 110,
      },
      {
        id: 'sub_imagery',
        name: 'Visual Asset Guard',
        roleDescription: 'Cloudinary product imagery optimizer',
        status: 'idle',
        tool: 'image.verifyResolutions()',
        lastExecutionMs: 95,
      },
    ],
  },
  {
    id: 'worker_competitor_research',
    role: 'researcher',
    canonicalWorkerId: 'worker_competitor_research',
    name: 'Competitor Intelligence',
    title: 'Market Intelligence & Headless Web Scraper',
    description:
      'Audits competitor offerings (Giva, Palmonas, CaratLane) using Playwright headless browser.',
    status: 'working',
    activeTask: 'Auditing competitor 22K jewelry pricing & promo banners',
    latencyMs: 95,
    tokensPerSec: 54.2,
    subAgents: [
      {
        id: 'sub_scraper',
        name: 'Headless Web Scraper',
        roleDescription: 'Playwright headless chrome crawler',
        status: 'working',
        tool: 'playwright.auditCompetitor()',
        lastExecutionMs: 420,
      },
      {
        id: 'sub_trend',
        name: 'Insight Synthesizer',
        roleDescription: 'Market positioning & trend analyzer',
        status: 'thinking',
        tool: 'ai.extractCounterMove()',
        lastExecutionMs: 310,
      },
    ],
  },
  {
    id: 'worker_sales_conversion',
    role: 'analyst',
    canonicalWorkerId: 'worker_sales_conversion',
    name: 'Sales & Conversion',
    title: 'CRO, Cart Abandonment & Retention Specialist',
    description:
      'Detects checkout friction points, evaluates abandoned carts, and optimizes conversion funnels.',
    status: 'thinking',
    activeTask:
      'Evaluating abandoned cart recovery flows and WhatsApp ping sequences',
    latencyMs: 104,
    tokensPerSec: 58.2,
    subAgents: [
      {
        id: 'sub_cart_recovery',
        name: 'Cart Abandonment Engine',
        roleDescription: 'WhatsApp recovery triggers generator',
        status: 'thinking',
        tool: 'sales.evaluateAbandoned()',
        lastExecutionMs: 260,
      },
      {
        id: 'sub_funnel_cro',
        name: 'Checkout Friction Detector',
        roleDescription: 'Drop-off root cause analyzer',
        status: 'idle',
        tool: 'cro.detectFriction()',
        lastExecutionMs: 190,
      },
    ],
  },
  {
    id: 'worker_customer_support',
    role: 'writer',
    canonicalWorkerId: 'worker_customer_support',
    name: 'Support & Delight',
    title: 'Customer Experience, CX AI & Post-Purchase Concierge',
    description:
      'Triages customer tickets, tracks automated WhatsApp delivery status, and maintains CSAT 4.9/5.',
    status: 'idle',
    activeTask: 'Zero pending escalation tickets. Customer CSAT: 4.9/5',
    latencyMs: 76,
    tokensPerSec: 46.8,
    subAgents: [
      {
        id: 'sub_triage',
        name: 'Ticket Triage Engine',
        roleDescription: 'Automated CS triage & sentiment classifier',
        status: 'idle',
        tool: 'support.triageTickets()',
        lastExecutionMs: 150,
      },
      {
        id: 'sub_whatsapp_support',
        name: 'WhatsApp Resolution Bot',
        roleDescription: 'Real-time order tracking messenger',
        status: 'idle',
        tool: 'whatsapp.autoResolve()',
        lastExecutionMs: 110,
      },
    ],
  },
  {
    id: 'worker_content_blog',
    role: 'writer',
    canonicalWorkerId: 'worker_content_blog',
    name: 'Content & Copywriting',
    title: 'Multilingual Brand Storyteller & Copywriting Engine',
    description:
      'Synthesizes high-converting ad copy, Bengali & Hinglish voice scripts, and editorial blog posts.',
    status: 'thinking',
    activeTask:
      'Synthesizing natural spoken Bengali voice scripts and bridal editorial',
    latencyMs: 115,
    tokensPerSec: 64.0,
    subAgents: [
      {
        id: 'sub_copy',
        name: 'Multilingual Copywriter',
        roleDescription: 'High-converting ad copy synthesizer',
        status: 'thinking',
        tool: 'content.bengaliScript()',
        lastExecutionMs: 290,
      },
      {
        id: 'sub_story',
        name: 'Brand Storytelling Engine',
        roleDescription: 'Crafts luxury brand narratives',
        status: 'idle',
        tool: 'content.brandStory()',
        lastExecutionMs: 210,
      },
    ],
  },
  {
    id: 'worker_inventory',
    role: 'coder',
    canonicalWorkerId: 'worker_inventory',
    name: 'Jewelry Inventory',
    title: 'Safety Stock, Reorder Point & Inventory Intelligence',
    description:
      'Evaluates SKU stock velocity, lead times, and maintains safety margins to prevent stockouts.',
    status: 'idle',
    activeTask: 'Stock velocity balanced. 18 days of supply for gold pendants',
    latencyMs: 84,
    tokensPerSec: 49.2,
    subAgents: [
      {
        id: 'sub_stockout_guard',
        name: 'Stockout Risk Sentinel',
        roleDescription: 'Reorder threshold monitor',
        status: 'idle',
        tool: 'inventory.forecastVelocity()',
        lastExecutionMs: 140,
      },
    ],
  },
  {
    id: 'worker_review_feedback',
    role: 'analyst',
    canonicalWorkerId: 'worker_review_feedback',
    name: 'Reviews & UGC',
    title: 'Customer Reviews, UGC Curation & Trust Architect',
    description:
      'Curates 5-star customer unboxing photos, monitors review sentiment, and validates buyer badges.',
    status: 'idle',
    activeTask:
      'Curating 5-star customer unboxing photos for homepage social proof',
    latencyMs: 79,
    tokensPerSec: 47.0,
    subAgents: [
      {
        id: 'sub_ugc_curator',
        name: 'UGC Photo Moderator',
        roleDescription: 'Photo authenticity & quality inspector',
        status: 'idle',
        tool: 'reviews.aggregateSentiment()',
        lastExecutionMs: 130,
      },
    ],
  },
  {
    id: 'worker_execution',
    role: 'coder',
    canonicalWorkerId: 'worker_execution',
    name: 'Task Execution',
    title: 'Full-Stack Feature Architect & Autonomous Executor',
    description:
      'Executes approved database migrations, TypeScript builds, and verifies system health.',
    status: 'working',
    activeTask: 'Validating zero-breakage TypeScript builds & Supabase schemas',
    latencyMs: 110,
    tokensPerSec: 61.2,
    subAgents: [
      {
        id: 'sub_architect',
        name: 'TypeScript Architect',
        roleDescription: 'Static type-checking & contract validator',
        status: 'working',
        tool: 'tsc.noEmit()',
        lastExecutionMs: 850,
      },
      {
        id: 'sub_migrations',
        name: 'Database Migration Runner',
        roleDescription: 'Supabase SQL schema migrator',
        status: 'completed',
        tool: 'supabase.runMigrations()',
        lastExecutionMs: 140,
      },
    ],
  },
  {
    id: 'worker_monitoring_verification',
    role: 'analyst',
    canonicalWorkerId: 'worker_monitoring_verification',
    name: 'Monitoring Sentinel',
    title: 'System Health, Security Auditing & Uptime Sentinel',
    description:
      'Monitors API latency, endpoint uptime, Cloudinary connection pools, and database health.',
    status: 'idle',
    activeTask:
      'All endpoints 100% operational. Cloudinary & Supabase pools healthy',
    latencyMs: 65,
    tokensPerSec: 42.0,
    subAgents: [
      {
        id: 'sub_health_sentinel',
        name: 'Endpoint Latency Prober',
        roleDescription: 'Probes API latency & health checks',
        status: 'idle',
        tool: 'health.probeEndpoints()',
        lastExecutionMs: 90,
      },
    ],
  },
  {
    id: 'worker_orders_logistics',
    role: 'coder',
    canonicalWorkerId: 'worker_orders_logistics',
    name: 'Orders & Logistics',
    title: 'Head of Order Fulfillment & Logistics Intelligence',
    description:
      'Tracks courier SLAs (Shiprocket, BlueDart), fulfillment pipeline velocity, and prevents RTO.',
    status: 'idle',
    activeTask: 'Tracking courier SLAs and active RTO prevention algorithms',
    latencyMs: 58,
    tokensPerSec: 46.5,
    subAgents: [
      {
        id: 'sub_logistics_sla',
        name: 'Courier SLA Tracker',
        roleDescription: 'Shiprocket & BlueDart courier monitor',
        status: 'idle',
        tool: 'orders.getPipelineStatus()',
        lastExecutionMs: 115,
      },
    ],
  },
  {
    id: 'worker_accounts_tax',
    role: 'analyst',
    canonicalWorkerId: 'worker_accounts_tax',
    name: 'Accounts & Tax',
    title: 'Chief Accounts Officer & GST Compliance Manager',
    description:
      'Audits 3% jewelry GST compliance, generates compliant B2C/B2B tax invoices, and reconciles cashbook.',
    status: 'idle',
    activeTask:
      'Auditing 3% GST calculation accuracy and daily cashbook reconciliation',
    latencyMs: 72,
    tokensPerSec: 52.0,
    subAgents: [
      {
        id: 'sub_tax_compliance',
        name: 'GST Invoicing Engine',
        roleDescription: 'Validates 3% precious jewelry GST rates',
        status: 'idle',
        tool: 'tax.reconcileLedger()',
        lastExecutionMs: 135,
      },
    ],
  },
  {
    id: 'worker_performance_intelligence',
    role: 'analyst',
    canonicalWorkerId: 'worker_performance_intelligence',
    name: 'Performance Intelligence',
    title: 'Workforce Quality & SLA Auditor',
    description:
      'Continuous deterministic measurement of AI worker and staff KPIs, achievement points, and quality rubrics.',
    status: 'working',
    activeTask:
      'Auditing 16-worker output quality and deterministic SLA compliance',
    latencyMs: 42,
    tokensPerSec: 64.0,
    subAgents: [
      {
        id: 'sub_kpi_engine',
        name: 'Deterministic KPI Calculator',
        roleDescription: 'Calculates mathematical performance scores (0-100)',
        status: 'working',
        tool: 'perf.calculateMemberScorecard()',
        lastExecutionMs: 45,
      },
    ],
  },
  {
    id: 'worker_security_intelligence',
    role: 'coder',
    canonicalWorkerId: 'worker_security_intelligence',
    name: 'Security Intelligence',
    title: 'Autonomous Defense & Governance Auditor',
    description:
      'Zero-trust edge monitoring, CI/CD scan synthesis (Trivy/Semgrep/OSV/ZAP), and file upload quarantine.',
    status: 'working',
    activeTask:
      'Monitoring edge security events and enforcing zero-cost defense in depth',
    latencyMs: 38,
    tokensPerSec: 58.0,
    subAgents: [
      {
        id: 'sub_file_inspector',
        name: 'Magic-Byte & Polyglot Sanitizer',
        roleDescription: 'Deep binary inspection of customer file uploads',
        status: 'working',
        tool: 'security.inspectFilePayload()',
        lastExecutionMs: 28,
      },
      {
        id: 'sub_containment_gate',
        name: 'Reversible Containment Gateway',
        roleDescription: 'Auto-executes temporary rate-limits & quarantine',
        status: 'idle',
        tool: 'security.proposeContainment()',
        lastExecutionMs: 50,
      },
    ],
  },
];

export interface WorkerGridProps {
  workers?: WorkerNodeData[];
  onSelectWorker?: (workerId: string) => void;
  onPromptWorker?: (workerIdOrRole: string) => void;
  onChatWorker?: (worker: {
    workerId: string;
    name: string;
    title: string;
  }) => void;
  className?: string;
}

export function WorkerGrid({
  workers = INITIAL_WORKFORCE_DATA,
  onSelectWorker,
  onPromptWorker,
  onChatWorker,
  className = '',
}: WorkerGridProps) {
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [workerList, setWorkerList] = useState<WorkerNodeData[]>(workers);

  // Sync if workers prop changes
  React.useEffect(() => {
    if (workers && workers.length > 0) {
      setWorkerList(workers);
    }
  }, [workers]);

  const toggleExpand = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedWorkerId((prev) => (prev === id ? null : id));
  };

  return (
    <div className={`flex flex-col space-y-6 ${className}`}>
      {/* Dynamic Grid Header Telemetry */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark">
            <Layers className="h-5 w-5 text-violet-600 dark:text-amber-400" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
              Dynamic AI Workforce Grid
              <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                {workerList.length} Canonical Workers
              </span>
            </h2>
            <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
              Select card to inspect live telemetry or start dedicated 1:1 chat
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="flex items-center gap-1.5 rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-bold text-emerald-600 shadow-nm-flat dark:text-emerald-400 dark:shadow-nm-flat-dark">
            <Activity className="h-3.5 w-3.5" />
            <span>
              Active:{' '}
              {
                workerList.filter(
                  (w) => w.status === 'working' || w.status === 'thinking'
                ).length
              }{' '}
              / {workerList.length}
            </span>
          </span>
        </div>
      </div>

      {/* Responsive Neumorphic 14 Worker Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workerList.map((worker) => {
          const cfg =
            CO_WORKER_CONFIGS[worker.role] || CO_WORKER_CONFIGS.analyst;
          const isExpanded = expandedWorkerId === worker.id;
          const canonicalId = worker.canonicalWorkerId || worker.id;

          return (
            <motion.div
              layout
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              key={worker.id}
              onClick={() => onSelectWorker?.(canonicalId)}
              className={`flex cursor-pointer flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
                isExpanded
                  ? `border-2 ${cfg.borderClass} scale-[1.01] bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark`
                  : 'border-neutral-200/80 bg-nm-light-bg shadow-nm-convex hover:shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark'
              }`}
            >
              {/* Card Top Main Section */}
              <div className="space-y-4 p-5">
                {/* Header Row: Avatar & Title */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CoWorkerAvatar
                      role={worker.role}
                      status={worker.status}
                      size="sm"
                      onClick={() => onSelectWorker?.(canonicalId)}
                    />
                    <div>
                      <h3 className="flex items-center gap-1.5 text-sm font-bold text-nm-light-textPrimary dark:text-white">
                        {worker.name}
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${cfg.badgeClass}`}
                        >
                          {worker.role.toUpperCase()}
                        </span>
                      </h3>
                      <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
                        {worker.title}
                      </p>
                    </div>
                  </div>

                  {/* Status Indicator Badge */}
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                      worker.status === 'working'
                        ? 'animate-pulse border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : worker.status === 'thinking'
                          ? 'animate-pulse border-cyan-500/40 bg-cyan-500/15 text-cyan-600 dark:text-cyan-400'
                          : worker.status === 'completed'
                            ? 'border-violet-500/40 bg-violet-500/15 text-violet-600 dark:text-violet-400'
                            : 'border-neutral-300 bg-neutral-200/60 text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                    <span>{worker.status}</span>
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-nm-light-textSecondary dark:text-neutral-300">
                  {worker.description}
                </p>

                {/* Active Task & Tool Snippet */}
                <div className="space-y-1 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 text-xs shadow-nm-inset dark:border-neutral-800/80 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                  <div className="flex items-center justify-between">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                      Active Task
                    </span>
                    <span className="flex items-center gap-1 font-mono text-[10px] text-amber-600 dark:text-amber-400">
                      <Eye size={10} />
                      <span>Click card to inspect</span>
                    </span>
                  </div>
                  <p className="line-clamp-2 text-[11px] font-medium text-nm-light-textPrimary dark:text-neutral-200">
                    {worker.activeTask}
                  </p>
                </div>

                {/* Telemetry Bar */}
                <div className="flex items-center justify-between border-t border-neutral-200/60 pt-1 font-mono text-[11px] text-nm-light-textSecondary dark:border-neutral-800 dark:text-neutral-400">
                  <span>
                    Latency:{' '}
                    <strong className="text-emerald-600 dark:text-emerald-400">
                      {worker.latencyMs}ms
                    </strong>
                  </span>
                  <span>
                    Throughput:{' '}
                    <strong className="text-cyan-600 dark:text-cyan-400">
                      {worker.tokensPerSec} tok/s
                    </strong>
                  </span>
                </div>
              </div>

              {/* Card Action Controls: Chat with Worker & Sub-Agents */}
              <div
                className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200/80 bg-nm-light-bg px-4 py-2.5 dark:border-neutral-800 dark:bg-nm-dark-bg"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center gap-2">
                  {/* Explicit 1:1 Chat with Worker button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => {
                      if (onChatWorker) {
                        onChatWorker({
                          workerId: canonicalId,
                          name: worker.name,
                          title: worker.title,
                        });
                      } else if (onPromptWorker) {
                        onPromptWorker(canonicalId);
                      }
                    }}
                    className="flex items-center gap-1.5 rounded-xl border border-amber-500/50 bg-gradient-to-r from-amber-500/15 via-violet-500/10 to-amber-500/15 px-3 py-1.5 text-xs font-bold text-amber-800 shadow-nm-flat transition-all hover:opacity-95 dark:text-amber-300 dark:shadow-nm-flat-dark"
                    title={`Open 1:1 dedicated conversation with ${worker.name}`}
                  >
                    <MessageSquare
                      size={13}
                      className="text-amber-600 dark:text-amber-400"
                    />
                    <span>Chat 1:1</span>
                  </motion.button>

                  {/* @Prompt shortcut */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.96 }}
                    type="button"
                    onClick={() => onPromptWorker?.(canonicalId)}
                    className={`flex items-center gap-1 rounded-xl border ${cfg.borderClass} bg-nm-gradient-light px-2.5 py-1.5 text-xs font-medium text-violet-700 shadow-nm-flat transition-all hover:opacity-90 dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark`}
                    title={`Mention @${worker.name} in Co-Founder chat`}
                  >
                    <Send size={11} />
                    <span>@Prompt</span>
                  </motion.button>
                </div>

                {/* Sub-Agents Hierarchy Button */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={(e) => toggleExpand(worker.id, e)}
                  className="flex items-center gap-1 rounded-xl border border-neutral-300 bg-nm-light-bg px-2.5 py-1.5 text-xs font-semibold text-nm-light-textSecondary shadow-nm-flat transition-all hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark dark:hover:text-white"
                >
                  <span>{worker.subAgents.length} Sub-Agents</span>
                  {isExpanded ? (
                    <ChevronUp size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                </motion.button>
              </div>

              {/* Expandable Sub-Agents Hierarchy Panel */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-neutral-200/80 bg-nm-light-bg/80 p-4 dark:border-neutral-800 dark:bg-nm-dark-bg/80"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="space-y-2.5">
                      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                        Managed Sub-Agents & Tools
                      </span>

                      {worker.subAgents.map((sub, sIdx) => (
                        <motion.div
                          initial={{ opacity: 0, x: -6 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: sIdx * 0.04 }}
                          key={sub.id}
                          className="flex items-center justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2.5 text-xs shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`h-2 w-2 rounded-full ${
                                  sub.status === 'working'
                                    ? 'animate-pulse bg-emerald-500'
                                    : sub.status === 'thinking'
                                      ? 'animate-pulse bg-cyan-400'
                                      : 'bg-neutral-400'
                                }`}
                              />
                              <span className="truncate font-bold text-nm-light-textPrimary dark:text-white">
                                {sub.name}
                              </span>
                            </div>
                            <p className="mt-0.5 truncate text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                              {sub.roleDescription}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="rounded border border-violet-500/20 bg-violet-500/10 px-1.5 py-0.5 font-mono text-[9px] text-violet-700 dark:text-violet-300">
                              {sub.tool}
                            </span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
