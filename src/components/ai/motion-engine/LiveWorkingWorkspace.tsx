'use client';

import React, { useState } from 'react';
import {
  Activity,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Code2,
  Globe,
  TrendingUp,
  Search,
  Zap,
  ShoppingBag,
  MessageSquare,
  Box,
  Star,
  ShieldCheck,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { AgentNode, AgentWorkState } from './types';
import { Cofounder3DCharacter } from './Cofounder3DCharacter';
import toast from 'react-hot-toast';

interface LiveWorkingWorkspaceProps {
  node: AgentNode;
  onSimulateWork?: (nodeId: string) => void;
  className?: string;
}

export const LiveWorkingWorkspace: React.FC<LiveWorkingWorkspaceProps> = ({
  node,
  onSimulateWork,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<
    'workspace' | 'telemetry' | 'capabilities'
  >('workspace');
  const [isExecuting, setIsExecuting] = useState(false);
  const [liveProgress, setLiveProgress] = useState(
    node.telemetry.progressPct || 45
  );
  const [liveAction, setLiveAction] = useState(node.telemetry.currentAction);

  const handleTriggerWork = () => {
    setIsExecuting(true);
    setLiveProgress(15);
    setLiveAction(`Initializing autonomous execution run for ${node.name}...`);
    toast.success(`Dispatched live task to ${node.name} ✨`);

    if (onSimulateWork) {
      onSimulateWork(node.id);
    }

    setTimeout(() => {
      setLiveProgress(50);
      setLiveAction(
        `Executing tool bridge: ${node.telemetry.activeTool || 'core.compute()'}`
      );
    }, 1200);

    setTimeout(() => {
      setLiveProgress(85);
      setLiveAction(
        `Synthesizing empirical findings and updating state vectors...`
      );
    }, 2400);

    setTimeout(() => {
      setLiveProgress(100);
      setLiveAction(`Task completed with verified safety gates.`);
      setIsExecuting(false);
      toast.success(`${node.name} completed execution successfully! ✨`);
    }, 3600);
  };

  const getStatusBadge = (state: AgentWorkState) => {
    switch (state) {
      case 'executing':
      case 'generating':
        return (
          <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/20 px-3 py-1 font-mono text-[11px] font-bold text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" /> ACTIVE
            WORKING
          </span>
        );
      case 'analyzing':
      case 'thinking':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-sky-500/40 bg-sky-500/20 px-3 py-1 font-mono text-[11px] font-bold text-sky-400">
            <span className="h-2 w-2 animate-ping rounded-full bg-sky-400" />{' '}
            PROCESSING
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-3 py-1 font-mono text-[11px] font-bold text-amber-400">
            <span className="h-2 w-2 rounded-full bg-amber-400" /> APPROVAL GATE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 font-mono text-[11px] font-medium text-neutral-400">
            <span className="h-2 w-2 rounded-full bg-neutral-500" /> STANDBY
            IDLE
          </span>
        );
    }
  };

  // Render contextual live workspace environment based on worker role
  const renderContextualEnvironment = () => {
    const role = node.id;

    if (role.includes('competitor') || role === 'worker_5') {
      // Browser Research Workspace
      return (
        <div className="space-y-3 rounded-2xl border border-neutral-800 bg-[#121318] p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-pink-400" />
              <span className="text-xs font-bold text-white">
                Playwright Headless Browser View
              </span>
            </div>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              Live Chromium Attached
            </span>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs text-neutral-300">
            <span className="text-pink-400">GET</span>
            <span className="text-neutral-400">
              https://giva.co/collections/22k-gold-jewellery
            </span>
          </div>

          <div className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <span className="text-[10px] font-bold uppercase text-neutral-400">
                Scraped Value Prop
              </span>
              <p className="font-semibold text-white">
                15% Festive Discount on 22K Pendants
              </p>
              <p className="text-[11px] text-neutral-400">
                Detected price floor: ₹2,499 with coupon FESTIVE15
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900/80 p-3">
              <span className="text-[10px] font-bold uppercase text-emerald-400">
                🚀 Ruhvi Strategic Counter-Move
              </span>
              <p className="font-semibold text-white">
                Highlight 6-Month Anti-Tarnish Lifetime Warranty
              </p>
              <p className="text-[11px] text-neutral-400">
                Higher price elasticity (+12%) against demi-fine competitors.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (
      role.includes('analytics') ||
      role.includes('sales') ||
      role === 'worker_1' ||
      role === 'worker_6'
    ) {
      // Analytics & BI Intelligence Workspace
      return (
        <div className="space-y-3 rounded-2xl border border-neutral-800 bg-[#121318] p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span className="text-xs font-bold text-white">
                Real-Time Financial & Cohort Intelligence
              </span>
            </div>
            <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] text-cyan-400">
              Supabase Orders CDC Synced
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
              <span className="text-[10px] font-semibold uppercase text-neutral-400">
                30D Gross Revenue
              </span>
              <p className="text-sm font-bold text-cyan-300">₹4,82,500</p>
              <span className="text-[9px] text-emerald-400">
                ↑ 18.4% vs last period
              </span>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
              <span className="text-[10px] font-semibold uppercase text-neutral-400">
                Average Order Value
              </span>
              <p className="text-sm font-bold text-white">₹3,850</p>
              <span className="text-[9px] text-emerald-400">
                ↑ 6.2% margin expansion
              </span>
            </div>
            <div className="rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
              <span className="text-[10px] font-semibold uppercase text-neutral-400">
                Cart Conversion
              </span>
              <p className="text-sm font-bold text-white">4.2%</p>
              <span className="text-[9px] text-neutral-400">
                Checkout Drop: 28%
              </span>
            </div>
          </div>
        </div>
      );
    }

    if (
      role.includes('marketing') ||
      role.includes('content') ||
      role === 'worker_2' ||
      role === 'worker_8'
    ) {
      // Marketing & Creative Media Studio
      return (
        <div className="space-y-3 rounded-2xl border border-neutral-800 bg-[#121318] p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-white">
                Two-Video Continuous Ad Pipeline
              </span>
            </div>
            <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">
              Cloudinary io1kkukg
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900/90 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300">
                  Video 1: Problem Hook & Cultural Spark
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  6.0s • 9:16 Vertical
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                &ldquo;Tired of gold jewelry turning black? Experience 22K pure
                e-coated elegance that shines forever.&rdquo;
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900/90 p-2.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-amber-300">
                  Video 2: Match-Cut Proof & Call to Action
                </span>
                <span className="font-mono text-[10px] text-neutral-400">
                  9.0s • Match-Cut Anchor
                </span>
              </div>
              <p className="text-[11px] text-neutral-300">
                Close-up macro pan of the Royal Peacock Choker with 6-month
                anti-tarnish guarantee certificate.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (role.includes('seo') || role === 'worker_3') {
      // SEO Health Diagnostics Workspace
      return (
        <div className="space-y-3 rounded-2xl border border-neutral-800 bg-[#121318] p-4 shadow-inner">
          <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                Search Discovery & Structured Data Audit
              </span>
            </div>
            <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
              Score: 92 / 100
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
              <span className="text-[10px] font-bold uppercase text-neutral-400">
                Target Keyword Ranks
              </span>
              <p className="font-semibold text-emerald-300">
                #1 &ldquo;anti tarnish 22k gold jewellery&rdquo;
              </p>
              <p className="text-neutral-300">
                #3 &ldquo;waterproof jewellery kolkata&rdquo;
              </p>
            </div>
            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-900 p-2.5">
              <span className="text-[10px] font-bold uppercase text-neutral-400">
                Structured Data Status
              </span>
              <p className="text-white">
                Product Schema: <span className="text-emerald-400">Valid</span>
              </p>
              <p className="text-white">
                Breadcrumbs: <span className="text-emerald-400">Valid</span>
              </p>
            </div>
          </div>
        </div>
      );
    }

    // Default Code / Execution / System Workspace
    return (
      <div className="space-y-3 rounded-2xl border border-neutral-800 bg-[#121318] p-4 shadow-inner">
        <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Code2 className="h-4 w-4 text-sky-400" />
            <span className="text-xs font-bold text-white">
              Autonomous System Execution & Task Dispatch
            </span>
          </div>
          <span className="rounded border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 font-mono text-[10px] text-sky-400">
            Task Manager Bridge Active
          </span>
        </div>

        <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-950 p-3 font-mono text-[11px] text-neutral-300">
          <p className="text-emerald-400">
            $ ruhvi-agent dispatch --worker={node.id} --safety=strict
          </p>
          <p className="text-neutral-500">
            [14:02:10] Verified database migration integrity
            (0109_co_founder_advisor_and_planner.sql)
          </p>
          <p className="text-neutral-400">
            [14:02:12] Active Tool:{' '}
            {node.telemetry.activeTool || 'system.execute()'}
          </p>
          <p className="text-sky-300">
            [14:02:15] Task payload verified with cryptographic approval guard.
          </p>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-neutral-800/90 bg-[#14151a] p-6 shadow-2xl backdrop-blur-2xl ${className}`}
    >
      {/* Background Subtle Accent Glow */}
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full opacity-20 blur-3xl"
        style={{ backgroundColor: node.color }}
      />

      {/* Header Section */}
      <div className="relative z-10 flex flex-col items-start justify-between gap-4 border-b border-neutral-800/80 pb-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          {/* Miniature 3D Character Avatar */}
          <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-neutral-700/80 bg-neutral-900 shadow-lg">
            <Cofounder3DCharacter
              roleId={node.id}
              name={node.name}
              baseColor={node.color}
              accentColor={node.accentColor}
              isApex={node.level === 'apex_co_founder'}
              state={isExecuting ? 'executing' : node.state}
              size={64}
              showPodium={false}
              interactive={false}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold tracking-tight text-white">
                {node.name}
              </h3>
              {getStatusBadge(isExecuting ? 'executing' : node.state)}
            </div>
            <p className="mt-0.5 text-xs text-neutral-400">{node.title}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerWork}
            disabled={isExecuting}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-4 py-2 text-xs font-bold text-neutral-950 shadow-md shadow-amber-500/20 transition-all hover:from-amber-300 hover:to-amber-400 active:scale-95 disabled:opacity-50"
          >
            <Play
              className={`h-3.5 w-3.5 fill-current ${isExecuting ? 'animate-spin' : ''}`}
            />
            <span>{isExecuting ? 'Executing...' : 'Run Directive'}</span>
          </button>
        </div>
      </div>

      {/* Progress & Live Action Ribbon */}
      <div className="mt-4 space-y-2 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-3">
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-neutral-400">
            <Activity className="h-3.5 w-3.5 animate-pulse text-amber-400" />
            <span>Current Real Action:</span>
          </span>
          <span className="font-mono font-bold text-amber-400">
            {liveProgress}%
          </span>
        </div>
        <p className="text-xs font-semibold text-neutral-200">{liveAction}</p>

        {/* Progress bar */}
        <div className="h-2 w-full overflow-hidden rounded-full border border-neutral-800 bg-neutral-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${liveProgress}%` }}
          />
        </div>
      </div>

      {/* Contextual Environment / Real Work view */}
      <div className="mt-4">{renderContextualEnvironment()}</div>

      {/* Telemetry Metrics Bar */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs md:grid-cols-4">
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2">
          <span className="text-[10px] font-bold uppercase text-neutral-500">
            Latency
          </span>
          <p className="font-mono font-bold text-neutral-200">
            {node.telemetry.latencyMs} ms
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2">
          <span className="text-[10px] font-bold uppercase text-neutral-500">
            Tokens / Sec
          </span>
          <p className="font-mono font-bold text-cyan-400">
            {node.telemetry.tokensPerSec}
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2">
          <span className="text-[10px] font-bold uppercase text-neutral-500">
            Compute Load
          </span>
          <p className="font-mono font-bold text-amber-400">
            {node.telemetry.computeLoadPct}%
          </p>
        </div>
        <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/60 p-2">
          <span className="text-[10px] font-bold uppercase text-neutral-500">
            Autonomy
          </span>
          <p className="font-mono font-bold text-emerald-400">
            {node.telemetry.autonomyLevel}
          </p>
        </div>
      </div>
    </div>
  );
};
