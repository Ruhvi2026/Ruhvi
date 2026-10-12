'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
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
  Gem,
  Camera,
  Bell,
  ShieldAlert,
  ShieldCheck,
  Mic,
  Volume2,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
const VisualInspectionModal = dynamic(
  () =>
    import('@/components/admin/jewelry/VisualInspectionModal').then(
      (m) => m.VisualInspectionModal
    ),
  { ssr: false }
);
import { LiveVoiceVisualizer } from '@/components/co-founder/LiveVoiceVisualizer';

export interface LiveActivity {
  id: string;
  workerRole: CoWorkerRole;
  actionText: string;
  url?: string;
  type: 'browsing' | 'typing' | 'analyzing';
}

export interface ProactiveWorkspaceSignal {
  id: string;
  category: 'BUSINESS' | 'RISK' | 'OPPORTUNITY' | 'FOLLOW_UP' | 'SYSTEM';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  actionLabel?: string;
  imageUrl?: string;
  productName?: string;
}

export interface LiveWorkspaceProps {
  activeWorkers?: CoWorkerRole[];
  currentActivity?: LiveActivity;
  className?: string;
  onWorkerClick?: (role: CoWorkerRole) => void;
  // Step 9.3 Additions
  proactiveSignals?: ProactiveWorkspaceSignal[];
  onSignalAction?: (signal: ProactiveWorkspaceSignal) => void;
  onSignalDismiss?: (signalId: string) => void;
  onInspectImage?: (imageUrl: string, productName?: string) => void;
  onStartVoice?: () => void;
  voiceState?: 'idle' | 'listening' | 'speaking' | 'connecting';
  frequencyData?: Uint8Array;
}

// Preset interactive demonstration tasks
export const DEMO_PRESET_ACTIVITIES: Array<{
  id: string;
  title: string;
  category: string;
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
  {
    id: 'visual_inspection',
    title: 'Jewelry Multimodal QC',
    category: 'Visual Appraisal',
    type: 'analyzing',
    activeWorkers: ['designer', 'analyst'],
    activity: {
      id: 'act_visual',
      workerRole: 'designer',
      actionText: 'Appraising Gemstones...',
      url: 'catalog://sku-ruhvi-peacock-ring',
      type: 'analyzing',
    },
    url: 'catalog://sku-ruhvi-peacock-ring',
    statusBadge: 'Grade A+ • 22K Mirror Polish Verified',
  },
];

export const DEFAULT_PROACTIVE_SIGNALS: ProactiveWorkspaceSignal[] = [
  {
    id: 'sig-comp-1',
    category: 'RISK',
    severity: 'high',
    title: 'Competitor Price Shift Detected',
    summary: 'GIVA slashed prices by 15% on fine jewellery ring category.',
    actionLabel: 'Analyze Price Beat',
    productName: 'Romance Solitaire Ring',
  },
  {
    id: 'sig-vision-1',
    category: 'OPPORTUNITY',
    severity: 'medium',
    title: 'PDP Image Quality Audit Required',
    summary:
      'Peacock Filigree Ring needs gemological appraisal & photography QC.',
    actionLabel: 'Inspect Jewelry Image',
    imageUrl:
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
    productName: 'Peacock Filigree Ring',
  },
  {
    id: 'sig-stock-1',
    category: 'BUSINESS',
    severity: 'critical',
    title: 'Low Stock Velocity Warning',
    summary:
      'Only 2 units remaining for 22K Bengali Choker with high surge demand.',
    actionLabel: 'Reorder Stock',
    productName: '22K Bengali Choker',
  },
];

export function LiveWorkspace({
  activeWorkers,
  currentActivity,
  className = '',
  onWorkerClick,
  proactiveSignals,
  onSignalAction,
  onSignalDismiss,
  onInspectImage,
  onStartVoice,
  voiceState = 'idle',
  frequencyData,
}: LiveWorkspaceProps) {
  const [selectedPresetIndex, setSelectedPresetIndex] = useState(0);
  const [isLiveSimulating, setIsLiveSimulating] = useState(true);
  const [codeTypeIndex, setCodeTypeIndex] = useState(0);

  // Proactive Signals Dock state
  const [activeSignals, setActiveSignals] = useState<
    ProactiveWorkspaceSignal[]
  >(proactiveSignals || DEFAULT_PROACTIVE_SIGNALS);
  const [isDockExpanded, setIsDockExpanded] = useState(true);

  // Visual Inspection Modal state
  const [isInspectionOpen, setIsInspectionOpen] = useState(false);
  const [inspectedImageUrl, setInspectedImageUrl] = useState<string>(
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80'
  );
  const [inspectedProductName, setInspectedProductName] = useState<string>(
    'Ruhvi 22K Peacock Filigree Ring'
  );

  // Sync external proactive signals if provided
  useEffect(() => {
    if (proactiveSignals) {
      setActiveSignals(proactiveSignals);
    }
  }, [proactiveSignals]);

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

  // Handle open inspection modal
  const handleOpenInspection = (imageUrl?: string, productName?: string) => {
    const targetUrl =
      imageUrl ||
      'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80';
    const targetName = productName || 'Ruhvi 22K Peacock Filigree Ring';

    setInspectedImageUrl(targetUrl);
    setInspectedProductName(targetName);
    setIsInspectionOpen(true);

    if (onInspectImage) {
      onInspectImage(targetUrl, targetName);
    }
  };

  // Handle signal dismiss
  const handleDismissSignal = (id: string) => {
    setActiveSignals((prev) => prev.filter((s) => s.id !== id));
    if (onSignalDismiss) {
      onSignalDismiss(id);
    }
  };

  // Handle signal action click
  const handleTriggerSignalAction = (signal: ProactiveWorkspaceSignal) => {
    if (
      signal.imageUrl ||
      signal.title.toLowerCase().includes('image') ||
      signal.title.toLowerCase().includes('quality')
    ) {
      handleOpenInspection(signal.imageUrl, signal.productName);
    }
    if (onSignalAction) {
      onSignalAction(signal);
    }
  };

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

        {/* Preset Mode Switcher & Voice Audio Status */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Preset Switcher Tabs */}
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
                    ) : item.id === 'visual_inspection' ? (
                      <Gem size={13} className="text-amber-500" />
                    ) : (
                      <TrendingUp size={13} className="text-emerald-500" />
                    )}
                    <span>{item.category}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {/* Voice Session Trigger Button */}
          {onStartVoice && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              type="button"
              onClick={onStartVoice}
              className={`flex items-center gap-1.5 rounded-2xl border px-3 py-1.5 text-xs font-semibold shadow-nm-flat transition-all ${
                voiceState === 'speaking' || voiceState === 'listening'
                  ? 'animate-pulse border-emerald-500/50 bg-emerald-500/20 text-emerald-400'
                  : 'border-neutral-300 bg-nm-light-bg text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:hover:text-white'
              }`}
              title="Speak with Co-Founder Brain"
            >
              {voiceState === 'speaking' ? (
                <Volume2 size={13} className="text-emerald-400" />
              ) : (
                <Mic size={13} className="text-amber-400" />
              )}
              <span>
                {voiceState === 'speaking'
                  ? 'Speaking'
                  : voiceState === 'listening'
                    ? 'Listening'
                    : 'Voice Brain'}
              </span>
            </motion.button>
          )}

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

        {/* Left Floating Satellite Widget Pill (Catalog Asset) */}
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

        {/* Right Floating Satellite Widget Pill (Globe Scraper / Gem) */}
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
              <div className="flex w-full items-center gap-2 rounded-xl border border-neutral-200/70 bg-nm-light-bg px-3 py-1 font-mono text-[11px] text-neutral-500 shadow-nm-inset dark:border-neutral-800/80 dark:bg-[#0E1015] dark:text-neutral-400 dark:shadow-nm-inset-dark">
                {activeType === 'browsing' ? (
                  <Globe size={11} className="text-cyan-500" />
                ) : activeType === 'typing' ? (
                  <Code2 size={11} className="text-orange-500" />
                ) : preset.id === 'visual_inspection' ? (
                  <Gem size={11} className="text-amber-500" />
                ) : (
                  <Terminal size={11} className="text-emerald-500" />
                )}
                <span className="truncate">{preset.url}</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-neutral-400">
              <RefreshCw
                size={12}
                className={`transition-all ${isLiveSimulating ? 'animate-spin-slow text-violet-500' : ''}`}
              />
            </div>
          </div>

          {/* Inner Stage Views Controlled by Presets */}
          <div className="p-5">
            <AnimatePresence mode="wait">
              {/* TYPE 1: WEBSITE RESEARCH BROWSER VIEW */}
              {activeType === 'browsing' && (
                <motion.div
                  key="browsing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
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

              {/* TYPE 2: CODE IN PROGRESS IDE VIEW */}
              {activeType === 'typing' && (
                <motion.div
                  key="typing"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="flex gap-4 font-mono text-xs"
                >
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
                      <div className="ml-6 flex items-center gap-1.5 font-bold text-orange-500">
                        <Code2 size={11} />
                        <span>pricingEngine.ts</span>
                      </div>
                    </div>
                  </div>

                  <div className="relative flex-1 overflow-hidden rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-4 font-mono text-[11px] leading-relaxed shadow-nm-inset dark:border-neutral-800/80 dark:bg-[#0B0D12] dark:shadow-nm-inset-dark">
                    <pre className="overflow-x-auto text-neutral-800 dark:text-neutral-300">
                      <code>
                        {mockCodeSnippet.slice(0, codeTypeIndex)}
                        <span className="inline-block h-3.5 w-1.5 animate-pulse bg-orange-500" />
                      </code>
                    </pre>
                  </div>
                </motion.div>
              )}

              {/* TYPE 3: GROWTH & ANALYTICS VIEW */}
              {activeType === 'analyzing' && preset.id === 'analysis' && (
                <motion.div
                  key="analysis"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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

              {/* TYPE 4: JEWELRY MULTIMODAL QC & VISUAL INSPECTION VIEW (Step 9.3) */}
              {activeType === 'analyzing' &&
                preset.id === 'visual_inspection' && (
                  <motion.div
                    key="visual_inspection"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                    className="space-y-4"
                  >
                    <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-inset dark:border-neutral-800 dark:bg-[#181A24] dark:shadow-nm-inset-dark sm:flex-row">
                      <div className="flex items-center gap-3.5">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-amber-500/30 bg-zinc-900 shadow-md">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src="https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80"
                            alt="Ruhvi 22K Peacock Filigree Ring"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                              Ruhvi 22K Peacock Filigree Ring
                            </h4>
                            <span className="rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-bold text-emerald-400">
                              Grade A+ • 94/100
                            </span>
                          </div>
                          <p className="text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                            22K Yellow Gold (Mirror Polish) • 14x VVS Round Pavé
                            Diamonds
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenInspection(
                            'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=800&q=80',
                            'Ruhvi 22K Peacock Filigree Ring'
                          )
                        }
                        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-1.5 text-xs font-bold text-zinc-950 shadow-md shadow-amber-500/20 transition-all hover:from-amber-400 hover:to-amber-500"
                      >
                        <Camera size={13} />
                        <span>Launch Visual Inspection</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark">
                        <span className="text-[10px] font-bold uppercase text-neutral-400">
                          Lighting & Studio Score
                        </span>
                        <h4 className="mt-1 text-base font-bold text-emerald-500">
                          92% Compliant
                        </h4>
                        <span className="text-[10px] text-neutral-400">
                          Zero harsh glare on shank
                        </span>
                      </div>

                      <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark">
                        <span className="text-[10px] font-bold uppercase text-neutral-400">
                          Craftsmanship Integrity
                        </span>
                        <h4 className="mt-1 text-base font-bold text-emerald-500">
                          94 / 100
                        </h4>
                        <span className="text-[10px] text-neutral-400">
                          0 high severity flaws detected
                        </span>
                      </div>

                      <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-[#151722] dark:shadow-nm-flat-dark">
                        <span className="text-[10px] font-bold uppercase text-neutral-400">
                          Generated Visual Tags
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300">
                            #22kGold
                          </span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300">
                            #Filigree
                          </span>
                          <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[9px] text-zinc-300">
                            #Bridal
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
            </AnimatePresence>
          </div>

          {/* Bottom Window Test / Execution Status Pill */}
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
                ? 'right-12 top-4 md:right-16 md:top-8'
                : 'bottom-6 right-6 md:bottom-8 md:right-12'
            }`}
          >
            <div className="drop-shadow-lg">
              <CoWorkerAvatar
                role={workers[0]}
                status="working"
                size="md"
                showBadge={true}
                showDetails={false}
              />
            </div>

            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 6 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                type: 'spring',
                stiffness: 400,
                damping: 20,
              }}
              className="flex items-center gap-2 rounded-2xl border border-neutral-200/90 bg-nm-light-bg px-3.5 py-2 text-xs font-bold text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-[#181A24] dark:text-white dark:shadow-nm-flat-dark"
            >
              <span
                className="h-2 w-2 animate-pulse rounded-full"
                style={{
                  backgroundColor: CO_WORKER_CONFIGS[workers[0]].baseHex,
                }}
              />
              <span className="capitalize">{workers[0]}:</span>
              <span className="font-normal text-neutral-400">
                {activity.actionText}
              </span>
            </motion.div>
          </motion.div>
        )}

        {workers[1] && (
          <motion.div
            layout
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{
              scale: 1,
              opacity: 1,
              y: [0, 6, 0],
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

      {/* ======================================================== */}
      {/* LAYER C: Proactive Intelligence Notification Dock (Step 9.3) */}
      {/* ======================================================== */}
      {activeSignals.length > 0 && (
        <div className="mt-5 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-flat dark:border-neutral-800/80 dark:bg-zinc-950 dark:shadow-nm-flat-dark">
          {/* Dock Header */}
          <div className="flex items-center justify-between border-b border-neutral-200/60 pb-2 dark:border-zinc-800/60">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-500/10 p-1.5 text-amber-500">
                <Bell className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-nm-light-textPrimary dark:text-zinc-200">
                Co-Founder Ambient Proactive Signals ({activeSignals.length})
              </span>
              <span className="h-1.5 w-1.5 animate-ping rounded-full bg-amber-500" />
            </div>

            <button
              type="button"
              onClick={() => setIsDockExpanded(!isDockExpanded)}
              className="flex items-center gap-1 text-[11px] text-neutral-400 transition-colors hover:text-white"
            >
              <span>{isDockExpanded ? 'Collapse' : 'Expand'}</span>
              {isDockExpanded ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          </div>

          {/* Dock Content Signals List */}
          {isDockExpanded && (
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              {activeSignals.map((signal) => {
                const isCritical = signal.severity === 'critical';
                const isHigh = signal.severity === 'high';
                const isMedium = signal.severity === 'medium';

                return (
                  <div
                    key={signal.id}
                    className={`relative flex flex-col justify-between gap-2.5 rounded-xl border p-3 text-xs transition-all ${
                      isCritical
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                        : isHigh
                          ? 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                          : 'border-zinc-800/80 bg-zinc-900/60 text-zinc-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                            isCritical
                              ? 'border-rose-500/40 bg-rose-500/20 text-rose-300'
                              : isHigh
                                ? 'border-amber-500/40 bg-amber-500/20 text-amber-300'
                                : 'border-blue-500/40 bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {signal.category}
                        </span>
                        <span className="truncate text-[11px] font-semibold text-zinc-100">
                          {signal.title}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDismissSignal(signal.id)}
                        className="p-0.5 text-zinc-500 transition-colors hover:text-zinc-300"
                        title="Dismiss Signal"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <p className="text-[11px] leading-tight text-zinc-300/90">
                      {signal.summary}
                    </p>

                    {signal.actionLabel && (
                      <button
                        type="button"
                        onClick={() => handleTriggerSignalAction(signal)}
                        className={`flex items-center gap-1 self-start rounded-lg border px-2.5 py-1 text-[10px] font-bold transition-colors ${
                          isCritical
                            ? 'border-rose-500/40 bg-rose-950 text-rose-200 hover:bg-rose-900'
                            : isHigh
                              ? 'border-amber-500/40 bg-amber-950 text-amber-200 hover:bg-amber-900'
                              : 'border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                        }`}
                      >
                        <span>{signal.actionLabel}</span>
                        <ArrowRight className="h-2.5 w-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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

      {/* Embedded Multimodal Visual Inspection Modal (Step 9.3) */}
      <VisualInspectionModal
        isOpen={isInspectionOpen}
        onClose={() => setIsInspectionOpen(false)}
        imageUrl={inspectedImageUrl}
        productName={inspectedProductName}
      />
    </div>
  );
}
