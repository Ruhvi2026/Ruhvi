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
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Zap,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
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
}

export const INITIAL_WORKFORCE_DATA: WorkerNodeData[] = [
  {
    id: 'researcher',
    role: 'researcher',
    name: 'Researcher',
    title: 'Market Intelligence Engine',
    description:
      'Finds competitor insights and crawls live websites via Playwright.',
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
        id: 'sub_seo',
        name: 'SEO Health Inspector',
        roleDescription: 'Sitemap & meta tags auditor',
        status: 'idle',
        tool: 'seo.auditCatalog()',
        lastExecutionMs: 180,
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
    id: 'coder',
    role: 'coder',
    name: 'Coder',
    title: 'Full-Stack Feature Architect',
    description:
      'Writes clean code, executes DB migrations, and verifies API contracts.',
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
      {
        id: 'sub_qa',
        name: 'Playwright E2E Suite',
        roleDescription: 'Automated user journey testing',
        status: 'idle',
        tool: 'playwright.testCheckout()',
        lastExecutionMs: 1200,
      },
    ],
  },
  {
    id: 'writer',
    role: 'writer',
    name: 'Writer',
    title: 'Multilingual Copywriter',
    description:
      'Creates marketing copy, Bengali & Hinglish scripts, and product stories.',
    status: 'thinking',
    activeTask: 'Synthesizing natural spoken Bengali voice scripts',
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
      {
        id: 'sub_voice_tune',
        name: 'Voice Script Tuner',
        roleDescription: 'Speech rate & phonetics optimizer',
        status: 'idle',
        tool: 'voice.tunePhonetics()',
        lastExecutionMs: 150,
      },
    ],
  },
  {
    id: 'designer',
    role: 'designer',
    name: 'Designer',
    title: 'UI/UX Motion Engine',
    description:
      'Designs Neumorphic soft UIs, 3D particle simulations, and visual themes.',
    status: 'idle',
    activeTask: 'Synthesizing convex & concave soft gradients',
    latencyMs: 88,
    tokensPerSec: 51.5,
    subAgents: [
      {
        id: 'sub_motion',
        name: 'Spatial Motion Engine',
        roleDescription: '3D particle physics & smooth transitions',
        status: 'idle',
        tool: 'motion.renderParticles()',
        lastExecutionMs: 95,
      },
      {
        id: 'sub_theme',
        name: 'Neumorphism Palette Generator',
        roleDescription: 'Soft shadow & light token synthesizer',
        status: 'idle',
        tool: 'theme.synthesizeSoftUI()',
        lastExecutionMs: 110,
      },
    ],
  },
  {
    id: 'analyst',
    role: 'analyst',
    name: 'Analyst',
    title: 'Unit Economics & Cohort Analyst',
    description:
      'Monitors AOV, cohort retention, checkout drop-off, and gross margins.',
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
    id: 'marketer',
    role: 'marketer',
    name: 'Marketer',
    title: 'Growth Campaigns & Ads Manager',
    description:
      'Formulates target audiences, budget rules, and continuous ad flows.',
    status: 'idle',
    activeTask: 'Monitoring PAUSED draft campaign performance',
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
];

export interface WorkerGridProps {
  workers?: WorkerNodeData[];
  onSelectWorker?: (workerId: string) => void;
  onPromptWorker?: (role: string) => void;
  className?: string;
}

export function WorkerGrid({
  workers = INITIAL_WORKFORCE_DATA,
  onSelectWorker,
  onPromptWorker,
  className = '',
}: WorkerGridProps) {
  const [expandedWorkerId, setExpandedWorkerId] = useState<string | null>(null);
  const [workerList, setWorkerList] = useState<WorkerNodeData[]>(workers);

  const toggleExpand = (id: string) => {
    setExpandedWorkerId((prev) => (prev === id ? null : id));
  };

  const handleUpdateStatus = (id: string, newStatus: CoWorkerStatus) => {
    setWorkerList((prev) =>
      prev.map((w) => (w.id === id ? { ...w, status: newStatus } : w))
    );
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
                {workerList.length} Core Co-Workers
              </span>
            </h2>
            <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
              Click any worker card to expand sub-agent hierarchy & real-time
              tools
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

      {/* Responsive Neumorphic 6 Worker Cards Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {workerList.map((worker) => {
          const cfg = CO_WORKER_CONFIGS[worker.role];
          const isExpanded = expandedWorkerId === worker.id;

          return (
            <motion.div
              layout
              whileHover={{ y: -3 }}
              transition={{ duration: 0.2 }}
              key={worker.id}
              className={`flex flex-col justify-between overflow-hidden rounded-3xl border transition-all duration-300 ${
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
                      onClick={() => onSelectWorker?.(worker.id)}
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
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                    Active Task
                  </span>
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

              {/* Card Action Controls & Hierarchy Expand Button */}
              <div className="flex items-center justify-between border-t border-neutral-200/80 bg-nm-light-bg px-4 py-2.5 dark:border-neutral-800 dark:bg-nm-dark-bg">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => onPromptWorker?.(worker.role)}
                  className={`flex items-center gap-1.5 rounded-xl border ${cfg.borderClass} bg-nm-gradient-light px-3 py-1.5 text-xs font-bold text-violet-700 shadow-nm-flat transition-all hover:opacity-90 dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark`}
                >
                  <Send size={12} />
                  <span>@Prompt</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => toggleExpand(worker.id)}
                  className="flex items-center gap-1.5 rounded-xl border border-neutral-300 bg-nm-light-bg px-3 py-1.5 text-xs font-semibold text-nm-light-textSecondary shadow-nm-flat transition-all hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark dark:hover:text-white"
                >
                  <span>{worker.subAgents.length} Sub-Agents</span>
                  {isExpanded ? (
                    <ChevronUp size={14} />
                  ) : (
                    <ChevronDown size={14} />
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
