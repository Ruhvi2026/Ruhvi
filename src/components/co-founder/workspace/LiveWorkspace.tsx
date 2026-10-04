'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CoWorkerAvatar,
  CO_WORKER_CONFIGS,
  CoWorkerRole,
} from '@/components/co-founder/CoWorkerAvatar';
import {
  Globe,
  Folder,
  Code2,
  CheckCircle2,
  Search,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Terminal,
  Activity,
  Layers,
  ArrowRight,
  TrendingUp,
  SlidersHorizontal,
  Play,
  Pause,
} from 'lucide-react';

export interface LiveActivity {
  id: string;
  workerRole: CoWorkerRole;
  actionText: string;
  url?: string;
  type: 'browsing' | 'typing' | 'analyzing';
}

export interface LiveWorkspaceProps {
  activeWorkers?: CoWorkerRole[];
  currentActivity?: LiveActivity;
  className?: string;
  onWorkerClick?: (role: CoWorkerRole) => void;
}

// Preset interactive demonstration tasks matching the reference image specs
export const DEMO_PRESET_ACTIVITIES: Array<{
  id: string;
  title: string;
  category: 'Website Research' | 'Code in Progress' | 'Growth & Analytics';
  type: 'browsing' | 'typing' | 'analyzing';
  activeWorkers: CoWorkerRole[];
  activity: LiveActivity;
  url: string;
  statusBadge: string;
}> = [
  {
    id: 'research',
    title: 'Website Research',
    category: 'Website Research',
    type: 'browsing',
    activeWorkers: ['researcher', 'writer'],
    activity: {
      id: 'act_research',
      workerRole: 'researcher',
      actionText: 'Researching...',
      url: 'https://giva.co/collections/fine-jewellery',
      type: 'browsing',
    },
    url: 'https://giva.co/collections/fine-jewellery',
    statusBadge: 'Scraping 22K Gold Promos',
  },
  {
    id: 'coding',
    title: 'Code in Progress',
    category: 'Code in Progress',
    type: 'typing',
    activeWorkers: ['coder'],
    activity: {
      id: 'act_code',
      workerRole: 'coder',
      actionText: 'Writing code...',
      url: 'src/services/pricingEngine.ts',
      type: 'typing',
    },
    url: 'src/services/pricingEngine.ts',
    statusBadge: 'Running tests... All Passed',
  },
  {
    id: 'analysis',
    title: 'Analytics & Growth Audit',
    category: 'Growth & Analytics',
    type: 'analyzing',
    activeWorkers: ['analyst', 'marketer'],
    activity: {
      id: 'act_analysis',
      workerRole: 'analyst',
      actionText: 'Calculating AOV...',
      url: 'supabase://metrics/cohort-aov',
      type: 'analyzing',
    },
    url: 'supabase://metrics/cohort-aov',
    statusBadge: 'AOV ₹3,850 • Gross Margin 44.2%',
  },
];

export function LiveWorkspace({
  activeWorkers,
  currentActivity,
  className = '',
  onWorkerClick,
}: LiveWorkspaceProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [codeTypeIndex, setCodeTypeIndex] = useState(0);

  // Active state derived from props or selected demo preset
  const preset = DEMO_PRESET_ACTIVITIES[selectedPresetIndex];
  const workers =
    activeWorkers && activeWorkers.length > 0
      ? activeWorkers
      : preset.activeWorkers;
  const activity = currentActivity || preset.activity;
  const activeType = activity.type;

  // Code editor simulated typing content
  const mockCodeSnippet = `export async function calculateCompetitiveMargin(
  sku: string,
  baseCost: number,
  competitorPrice: number
): Promise<{ marginPercent: number; isCounterViable: boolean }> {
  const targetPrice = competitorPrice * 0.95; // 5% Price Beat Rule
  const grossMargin = (targetPrice - baseCost) / targetPrice;
  
  // Verify unit economics against Ruhvi threshold
  return {
    marginPercent: Math.round(grossMargin * 100),
    isCounterViable: grossMargin >= 0.38,
  };
}`;

  useEffect(() => {
    if (!isLiveSimulating || activeType !== 'typing') return;
    const timer = setInterval(() => {
      setCodeTypeIndex((prev) =>
        prev < mockCodeSnippet.length ? prev + 3 : prev
      );
    }, 45);
    return () => clearInterval(timer);
  }, [isLiveSimulating, activeType, mockCodeSnippet]);

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-6 text-nm-light-textPrimary shadow-nm-flat backdrop-blur-2xl transition-all dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:text-nm-dark-textPrimary dark:shadow-nm-flat-dark ${className}`}
    >
      {/* Top Workspace Header Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-200/80 pb-4 dark:border-neutral-800 lg:flex-row lg:items-center">
        <div className="flex items-center gap-3">
          <motion.div
            whileHover={{ scale: 1.05, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark"
          >
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-amber-400" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
                Live Worker Workspace
              </h2>
              <span className="flex animate-pulse items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-2.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span>REAL-TIME AGENT EXECUTION</span>
              </span>
            </div>
            <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
              See what your AI Co-Workers are doing in real time
            </p>
          </div>
        </div>

        {/* Preset Mode Switcher (Website Research | Code in Progress | Analytics) */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex items-center rounded-2xl border border-neutral-300/70 bg-nm-light-bg p-1 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
            {DEMO_PRESET_ACTIVITIES.map((item, idx) => {
              const isSelected = selectedPresetIndex === idx;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedPresetIndex(idx);
                    setCodeTypeIndex(0);
                  }}
                  className={`relative z-10 flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                    isSelected
                      ? 'text-violet-700 dark:text-amber-400'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeWorkspacePreset"
                      className="absolute inset-0 rounded-xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark"
                      transition={{
                        type: 'spring',
                        stiffness: 380,
                        damping: 30,
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center gap-1.5">
                    {item.type === 'browsing' ? (
                      <Globe size={13} className="text-cyan-500" />
                    ) : item.type === 'typing' ? (
                      <Code2 size={13} className="text-orange-500" />
                    ) : (
                      <TrendingUp size={13} className="text-emerald-500" />
                    )}
                    <span>{item.category}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Pause / Play Live Simulation Button */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            type="button"
            onClick={() => setIsLiveSimulating(!isLiveSimulating)}
            className="flex items-center gap-1.5 rounded-2xl border border-neutral-300 bg-nm-light-bg px-3 py-1.5 text-xs font-semibold text-nm-light-textSecondary shadow-nm-flat transition-all hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark dark:hover:text-white"
            title="Toggle Live Agent Simulation"
          >
            {isLiveSimulating ? (
              <Pause size={13} className="text-amber-500" />
            ) : (
              <Play size={13} className="text-emerald-500" />
            )}
            <span>{isLiveSimulating ? 'Live' : 'Paused'}</span>
          </motion.button>
        </div>
      </div>

      {/* Main Workspace Stage Area (Two Layers: Background Window + Foreground Floating Avatars) */}
      <div className="relative mt-6 flex min-h-[520px] flex-col items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-flat dark:border-neutral-800/80 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark md:p-8">
        {/* Soft Radial Ambient Lighting */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.06)_0%,transparent_75%)]" />

        {/* Left Floating Satellite Widget Pill (Folder / Project asset) */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          className="pointer-events-none absolute left-4 top-1/3 z-10 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-convex dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark md:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-600 shadow-nm-flat dark:text-cyan-400 dark:shadow-nm-flat-dark">
            <Folder size={18} />
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
            Catalog
          </span>
        </motion.div>

        {/* Right Floating Satellite Widget Pill (Globe / Scraper status) */}
        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{
            duration: 4.5,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: 0.5,
          }}
          className="pointer-events-none absolute right-4 top-1/4 z-10 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-convex dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark md:flex"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500/15 text-violet-600 shadow-nm-flat dark:text-violet-400 dark:shadow-nm-flat-dark">
            <Globe size={18} className="animate-spin-slow" />
          </div>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider text-neutral-400">
            Scraper
          </span>
        </motion.div>

        {/* ======================================================== */}
        {/* LAYER A: Central Mock Browser / IDE / Terminal Window UI */}
        {/* ======================================================== */}
        <motion.div
          layout
          className="relative z-0 w-full max-w-3xl overflow-hidden rounded-3xl border border-neutral-200/90 bg-nm-light-bg shadow-nm-convex dark:border-neutral-800 dark:bg-[#12141A] dark:shadow-nm-convex-dark"
        >
          {/* Mock Window Title Bar & Traffic Light Dots */}
          <div className="flex items-center justify-between border-b border-neutral-200/80 bg-nm-light-bg px-4 py-3 dark:border-neutral-800 dark:bg-[#161822]">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-rose-400/80" />
              <span className="h-3 w-3 rounded-full bg-amber-400/80" />
              <span className="h-3 w-3 rounded-full bg-emerald-400/80" />
              <span className="ml-2 font-mono text-xs font-semibold text-nm-light-textSecondary dark:text-neutral-400">
                {preset.title}
              </span>
            </div>

            {/* Window URL / File Breadcrumb Bar */}
            <div className="flex max-w-md flex-1 items-center justify-center px-4">
              <div className="flex w-full items-center gap-2 rounded-xl border border-neutral-300/80 bg-nm-light-bg px-3 py-1 shadow-nm-inset dark:border-neutral-800 dark:bg-[#0E1015] dark:shadow-nm-inset-dark">
                {activeType === 'browsing' ? (
                  <Search size={12} className="shrink-0 text-cyan-500" />
                ) : activeType === 'typing' ? (
                  <Code2 size={12} className="shrink-0 text-orange-500" />
                ) : (
                  <Activity size={12} className="shrink-0 text-emerald-500" />
                )}
                <span className="truncate font-mono text-[11px] text-nm-light-textPrimary dark:text-neutral-300">
                  {activity.url || preset.url}
                </span>
                <RefreshCw
                  size={10}
                  className={`ml-auto text-neutral-400 ${isLiveSimulating ? 'animate-spin' : ''}`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-400">
              <ExternalLink
                size={13}
                className="cursor-pointer transition-colors hover:text-violet-500"
              />
            </div>
          </div>

          {/* Window Viewport Content with Fluid Animated Cross-Fade */}
          <div className="relative min-h-[300px] p-5">
            <AnimatePresence mode="wait">
              {/* TYPE 1: WEBSITE RESEARCH BROWSER VIEW (Matches Reference Image Left) */}
              {activeType === 'browsing' && (
                <motion.div
                  key="browsing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  {/* Browser Inner Header Banner */}
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-inset dark:border-neutral-800 dark:bg-[#181A24] dark:shadow-nm-inset-dark">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-xs font-bold text-cyan-600 shadow-nm-flat dark:text-cyan-400 dark:shadow-nm-flat-dark">
                        GIVA
                      </div>
                      <div>
                        <h4 className="flex items-center gap-2 text-xs font-bold text-nm-light-textPrimary dark:text-white">
                          Fine Jewellery Catalog Audit
                          <span className="rounded bg-cyan-500/20 px-2 py-0.5 text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                            22K Gold
                          </span>
                        </h4>
                        <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                          Live Headless Scrape • 128 products indexed
                        </p>
                      </div>
                    </div>
                    <span className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                      200 OK
                    </span>
                  </div>

                  {/* Scraped Competitor Cards & Extraction Matrix */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="space-y-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                          Romance Solitaire Ring
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₹3,499
                        </span>
                      </div>
                      <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                        Competitor Promo: Flat 15% OFF on checkout
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          Counter-Move Viable
                        </span>
                        <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-700 dark:text-violet-300">
                          Match at ₹3,299
                        </span>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="space-y-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                          22K Golden Bloom Pendant
                        </span>
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          ₹6,850
                        </span>
                      </div>
                      <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                        Competitor Shipping: Free Delivery in 48h
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <span className="rounded bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-bold text-amber-600 dark:text-amber-400">
                          Inventory Alert
                        </span>
                        <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[9px] font-bold text-cyan-700 dark:text-cyan-300">
                          Ruhvi Stock: 18 units
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* Animated Scanner Highlight Bar with Smooth Sliding Spring */}
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-800">
                    <motion.div
                      animate={{ x: ['-100%', '300%'] }}
                      transition={{
                        duration: 2.2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="h-full w-1/3 rounded-full bg-gradient-to-r from-cyan-400 to-violet-500"
                    />
                  </div>
                </motion.div>
              )}

              {/* TYPE 2: CODE IN PROGRESS IDE VIEW (Matches Reference Image Right) */}
              {activeType === 'typing' && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex gap-4 font-mono text-xs"
                >
                  {/* File Tree Sidebar */}
                  <div className="hidden w-44 shrink-0 flex-col space-y-1 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-inset dark:border-neutral-800/80 dark:bg-[#0E1015] dark:shadow-nm-inset-dark sm:flex">
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                      project
                    </span>
                    <div className="space-y-1 text-[11px] text-neutral-400">
                      <div className="flex items-center gap-1.5 text-neutral-400">
                        <Folder size={11} className="text-amber-500" />
                        <span>src</span>
                      </div>
                      <div className="ml-3 flex items-center gap-1.5 text-neutral-400">
                        <Folder size={11} className="text-amber-500" />
                        <span>services</span>
                      </div>
                      <div className="ml-6 flex items-center gap-1.5 rounded bg-orange-500/10 px-1.5 py-0.5 font-bold text-orange-600 dark:text-orange-400">
                        <Code2 size={11} />
                        <span className="truncate">pricingEngine.ts</span>
                      </div>
                      <div className="ml-3 flex items-center gap-1.5 text-neutral-500">
                        <Code2 size={11} />
                        <span>database.ts</span>
                      </div>
                    </div>
                  </div>

                  {/* Code Window with Syntax Highlighting & Typing Cursor */}
                  <div className="flex-1 overflow-x-auto rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-inset dark:border-neutral-800/80 dark:bg-[#0A0C10] dark:shadow-nm-inset-dark">
                    <div className="space-y-1 font-mono text-xs leading-relaxed text-neutral-300">
                      <pre className="whitespace-pre-wrap font-semibold text-emerald-600 dark:text-emerald-400">
                        {mockCodeSnippet.slice(
                          0,
                          codeTypeIndex || mockCodeSnippet.length
                        )}
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.8, repeat: Infinity }}
                          className="ml-0.5 inline-block h-3.5 w-1.5 bg-orange-500 align-middle"
                        />
                      </pre>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* TYPE 3: GROWTH & ANALYTICS AUDIT VIEW */}
              {activeType === 'analyzing' && (
                <motion.div
                  key="analyzing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-3 text-center sm:grid-cols-3">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark"
                    >
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        Average Order Value
                      </span>
                      <h4 className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
                        ₹3,850
                      </h4>
                      <span className="text-[10px] font-semibold text-emerald-500">
                        +14.2% MoM
                      </span>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark"
                    >
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        Gross Margin
                      </span>
                      <h4 className="mt-1 text-lg font-bold text-violet-600 dark:text-violet-400">
                        44.2%
                      </h4>
                      <span className="text-[10px] font-semibold text-violet-500">
                        Exceeds 40% Target
                      </span>
                    </motion.div>

                    <motion.div
                      whileHover={{ y: -2 }}
                      className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark"
                    >
                      <span className="text-[10px] font-bold uppercase text-neutral-400">
                        Checkout Conversion
                      </span>
                      <h4 className="mt-1 text-lg font-bold text-cyan-600 dark:text-cyan-400">
                        68.4%
                      </h4>
                      <span className="text-[10px] font-semibold text-cyan-500">
                        Razorpay / COD Balanced
                      </span>
                    </motion.div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 text-xs shadow-nm-inset dark:border-neutral-800 dark:bg-[#12141A] dark:shadow-nm-inset-dark">
                    <div className="flex items-center gap-2">
                      <Activity size={14} className="text-emerald-500" />
                      <span className="font-semibold text-nm-light-textPrimary dark:text-white">
                        Active Recommendation:
                      </span>
                      <span className="text-nm-light-textSecondary dark:text-neutral-300">
                        Run WhatsApp abandoned cart trigger at 45 mins.
                      </span>
                    </div>
                    <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                      High Impact
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Window Test / Execution Status Pill (Matches Reference Image Right: "Running tests...") */}
          <div className="flex items-center justify-between border-t border-neutral-200/80 bg-nm-light-bg px-5 py-2.5 dark:border-neutral-800 dark:bg-[#161822]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 animate-ping rounded-full bg-emerald-500" />
              <span className="font-mono text-xs font-bold text-nm-light-textPrimary dark:text-white">
                {preset.statusBadge}
              </span>
            </div>
            <div className="flex items-center gap-1.5 font-mono text-[10px] text-neutral-400">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Zero System Regression</span>
            </div>
          </div>
        </motion.div>

        {/* ======================================================== */}
        {/* LAYER B: Foreground Stage Area with Active Co-Workers   */}
        {/* ======================================================== */}

        {/* FOREGROUND WORKER 1: Primary Agent Floating with Physics */}
        {workers[0] && (
          <motion.div
            layout
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -8, 0],
            }}
            transition={{
              y: { duration: 3.2, repeat: Infinity, ease: 'easeInOut' },
              layout: { type: 'spring', stiffness: 300, damping: 25 },
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onWorkerClick?.(workers[0])}
            className={`absolute z-20 flex cursor-pointer items-center gap-3 ${
              activeType === 'typing'
                ? 'right-12 top-4 md:right-16 md:top-8' // Perched playfully atop IDE like in Reference Image Right
                : 'bottom-6 right-6 md:bottom-8 md:right-12' // Floating bottom-right like in Reference Image Left
            }`}
          >
            {/* The 3D Bot Character */}
            <div className="drop-shadow-xl">
              <CoWorkerAvatar
                role={workers[0]}
                status="working"
                size={activeType === 'typing' ? 'sm' : 'md'}
                showBadge={true}
                showDetails={false}
              />
            </div>

            {/* Action Pill (Matches "Researching..." or "Writing code..." from Spec) */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, x: -6 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{
                delay: 0.15,
                type: 'spring',
                stiffness: 400,
                damping: 20,
              }}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200/90 bg-nm-light-bg px-3.5 py-1.5 text-xs font-bold text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-[#181A24] dark:text-white dark:shadow-nm-flat-dark"
            >
              <span
                className="h-2 w-2 animate-ping rounded-full"
                style={{
                  backgroundColor: CO_WORKER_CONFIGS[workers[0]].baseHex,
                }}
              />
              <span>{activity.actionText}</span>
            </motion.div>
          </motion.div>
        )}

        {/* FOREGROUND WORKER 2: Secondary Collaborating Agent (If multi-agent presence) */}
        {workers[1] && (
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, -6, 0],
            }}
            transition={{
              y: {
                duration: 3.8,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: 0.4,
              },
              scale: { type: 'spring', stiffness: 300, damping: 25 },
            }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => onWorkerClick?.(workers[1])}
            className="absolute bottom-6 left-6 z-20 flex cursor-pointer items-center gap-3 md:bottom-8 md:left-12"
          >
            <div className="drop-shadow-lg">
              <CoWorkerAvatar
                role={workers[1]}
                status="working"
                size="sm"
                showBadge={true}
                showDetails={false}
              />
            </div>

            {/* Secondary Action Bubble */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0, x: 6 }}
              animate={{ scale: 1, opacity: 1, x: 0 }}
              transition={{
                delay: 0.25,
                type: 'spring',
                stiffness: 400,
                damping: 20,
              }}
              className="flex items-center gap-1.5 rounded-2xl border border-neutral-200/90 bg-nm-light-bg px-3 py-1.5 text-xs font-bold text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-[#181A24] dark:text-white dark:shadow-nm-flat-dark"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: CO_WORKER_CONFIGS[workers[1]].baseHex,
                }}
              />
              <span className="capitalize">{workers[1]}:</span>
              <span className="font-normal text-neutral-400">
                {workers[1] === 'writer'
                  ? 'Drafting copy...'
                  : 'Synthesizing...'}
              </span>
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* Bottom Summary Footer */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-nm-light-textSecondary dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="font-bold text-nm-light-textPrimary dark:text-white">
            Active Workforce:
          </span>
          {workers.map((r) => (
            <motion.span
              whileHover={{ scale: 1.05 }}
              key={r}
              className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${CO_WORKER_CONFIGS[r].badgeClass}`}
            >
              @{CO_WORKER_CONFIGS[r].name}
            </motion.span>
          ))}
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px]">
          <Activity size={12} className="text-emerald-500" />
          <span>Realtime WebRTC & Live Browser Connected</span>
        </div>
      </div>
    </div>
  );
}
