import React from 'react';
import {
  Bot,
  Search,
  Cpu,
  MessageSquare,
  Orbit,
  TrendingUp,
  Target,
} from 'lucide-react';

export interface SwarmWorkerNode {
  id: string;
  role:
    | 'cofounder'
    | 'researcher'
    | 'coder'
    | 'writer'
    | 'designer'
    | 'analyst'
    | 'marketer';
  name: string;
  title: string;
  description: string;
  accentHex: string;
  badgeClass: string;
  borderClass: string;
  activeTool: string;
  currentAction: string;
  status:
    'active' | 'thinking' | 'idle' | 'executing' | 'analyzing' | 'generating';
  latencyMs: number;
  tokensPerSec: number;
}

export const SWARM_NODES: SwarmWorkerNode[] = [
  {
    id: 'co_founder',
    role: 'cofounder',
    name: 'AI Co-Founder',
    title: 'Apex Business Orchestrator & Strategic Advisor',
    description:
      'Central strategy engine orchestrating multi-agent workforce and business metrics.',
    accentHex: '#8B5CF6',
    badgeClass:
      'border-role-cofounder-base/40 bg-role-cofounder-base/15 text-violet-700 dark:text-violet-300',
    borderClass: 'border-role-cofounder-base',
    activeTool: 'dispatcher.routeIntent()',
    currentAction: 'Monitoring catalog health & revenue trajectory',
    status: 'active',
    latencyMs: 142,
    tokensPerSec: 68.4,
  },
  {
    id: 'researcher',
    role: 'researcher',
    name: 'Researcher',
    title: 'Market Intelligence & Headless Web Scraper',
    description:
      'Finds market insights, crawls competitor offerings using Playwright live browser.',
    accentHex: '#00CFFF',
    badgeClass:
      'border-role-researcher-base/40 bg-role-researcher-base/15 text-cyan-700 dark:text-cyan-300',
    borderClass: 'border-role-researcher-base',
    activeTool: 'playwright.auditCompetitor()',
    currentAction: 'Analyzing competitor 22K pricing & promo offers',
    status: 'analyzing',
    latencyMs: 95,
    tokensPerSec: 54.2,
  },
  {
    id: 'coder',
    role: 'coder',
    name: 'Coder',
    title: 'Full-Stack Feature & System Architect',
    description:
      'Writes clean code, executes database migrations, and verifies API contracts.',
    accentHex: '#FF8A3D',
    badgeClass:
      'border-role-coder-base/40 bg-role-coder-base/15 text-orange-700 dark:text-orange-300',
    borderClass: 'border-role-coder-base',
    activeTool: 'taskManager.createSubTasks()',
    currentAction: 'Validating zero-breakage TypeScript builds',
    status: 'executing',
    latencyMs: 110,
    tokensPerSec: 61.2,
  },
  {
    id: 'writer',
    role: 'writer',
    name: 'Writer',
    title: 'Multilingual Copywriter & Brand Storyteller',
    description:
      'Creates marketing copy, Bengali & Hinglish spoken scripts, and product stories.',
    accentHex: '#FF4FA3',
    badgeClass:
      'border-role-writer-base/40 bg-role-writer-base/15 text-pink-700 dark:text-pink-300',
    borderClass: 'border-role-writer-base',
    activeTool: 'content.synthesizeMultilingual()',
    currentAction: 'Drafting spoken Bengali voice scripts',
    status: 'generating',
    latencyMs: 115,
    tokensPerSec: 64.0,
  },
  {
    id: 'designer',
    role: 'designer',
    name: 'Designer',
    title: 'UI/UX Motion Engine & 3D Spatial Designer',
    description:
      'Designs Neumorphic soft UIs, 3D particle simulations, and visual themes.',
    accentHex: '#6B46C1',
    badgeClass:
      'border-role-designer-base/40 bg-role-designer-base/15 text-purple-700 dark:text-purple-300',
    borderClass: 'border-role-designer-base',
    activeTool: 'theme.applyNeumorphism()',
    currentAction: 'Synthesizing convex & concave soft gradients',
    status: 'idle',
    latencyMs: 88,
    tokensPerSec: 51.5,
  },
  {
    id: 'analyst',
    role: 'analyst',
    name: 'Analyst',
    title: 'Financial Unit Economics & Cohort Analyst',
    description:
      'Monitors AOV, cohort retention, checkout drop-off rates, and gross margins.',
    accentHex: '#10B981',
    badgeClass:
      'border-role-analyst-base/40 bg-role-analyst-base/15 text-emerald-700 dark:text-emerald-300',
    borderClass: 'border-role-analyst-base',
    activeTool: 'supabase.queryOrders()',
    currentAction: 'Calculating AOV ₹3,850 and gross margin',
    status: 'active',
    latencyMs: 76,
    tokensPerSec: 48.0,
  },
  {
    id: 'marketer',
    role: 'marketer',
    name: 'Marketer',
    title: 'Growth Campaigns & Meta Ads Manager',
    description:
      'Formulates target audiences, budget rules, and continuous video ad flows.',
    accentHex: '#FFD84D',
    badgeClass:
      'border-role-marketer-base/40 bg-role-marketer-base/15 text-amber-700 dark:text-amber-300',
    borderClass: 'border-role-marketer-base',
    activeTool: 'metaAds.registerDraftCampaign()',
    currentAction: 'Monitoring PAUSED draft campaign performance',
    status: 'idle',
    latencyMs: 120,
    tokensPerSec: 72.1,
  },
];

export const getRoleTheme = (role: SwarmWorkerNode['role']) => {
  switch (role) {
    case 'cofounder':
      return {
        accent: '#8B5CF6',
        border: 'border-role-cofounder-base',
        badge:
          'border-role-cofounder-base/40 bg-role-cofounder-base/15 text-violet-700 dark:text-violet-300',
        glow: 'shadow-[0_0_20px_rgba(139,92,246,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(139,92,246,0.5)]',
        text: 'text-role-cofounder-base',
        bgGradient: 'from-violet-500/20 via-violet-500/10 to-transparent',
      };
    case 'researcher':
      return {
        accent: '#00CFFF',
        border: 'border-role-researcher-base',
        badge:
          'border-role-researcher-base/40 bg-role-researcher-base/15 text-cyan-700 dark:text-cyan-300',
        glow: 'shadow-[0_0_20px_rgba(0,207,255,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(0,207,255,0.5)]',
        text: 'text-role-researcher-base',
        bgGradient: 'from-cyan-500/20 via-cyan-500/10 to-transparent',
      };
    case 'coder':
      return {
        accent: '#FF8A3D',
        border: 'border-role-coder-base',
        badge:
          'border-role-coder-base/40 bg-role-coder-base/15 text-orange-700 dark:text-orange-300',
        glow: 'shadow-[0_0_20px_rgba(255,138,61,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(255,138,61,0.5)]',
        text: 'text-role-coder-base',
        bgGradient: 'from-orange-500/20 via-orange-500/10 to-transparent',
      };
    case 'writer':
      return {
        accent: '#FF4FA3',
        border: 'border-role-writer-base',
        badge:
          'border-role-writer-base/40 bg-role-writer-base/15 text-pink-700 dark:text-pink-300',
        glow: 'shadow-[0_0_20px_rgba(255,79,163,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(255,79,163,0.5)]',
        text: 'text-role-writer-base',
        bgGradient: 'from-pink-500/20 via-pink-500/10 to-transparent',
      };
    case 'designer':
      return {
        accent: '#6B46C1',
        border: 'border-role-designer-base',
        badge:
          'border-role-designer-base/40 bg-role-designer-base/15 text-purple-700 dark:text-purple-300',
        glow: 'shadow-[0_0_20px_rgba(107,70,193,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(107,70,193,0.5)]',
        text: 'text-role-designer-base',
        bgGradient: 'from-purple-500/20 via-purple-500/10 to-transparent',
      };
    case 'analyst':
      return {
        accent: '#10B981',
        border: 'border-role-analyst-base',
        badge:
          'border-role-analyst-base/40 bg-role-analyst-base/15 text-emerald-700 dark:text-emerald-300',
        glow: 'shadow-[0_0_20px_rgba(16,185,129,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(16,185,129,0.5)]',
        text: 'text-role-analyst-base',
        bgGradient: 'from-emerald-500/20 via-emerald-500/10 to-transparent',
      };
    case 'marketer':
      return {
        accent: '#FFD84D',
        border: 'border-role-marketer-base',
        badge:
          'border-role-marketer-base/40 bg-role-marketer-base/15 text-amber-700 dark:text-amber-300',
        glow: 'shadow-[0_0_20px_rgba(255,216,77,0.25)]',
        activeGlow: 'shadow-[0_0_35px_rgba(255,216,77,0.5)]',
        text: 'text-role-marketer-base',
        bgGradient: 'from-yellow-500/20 via-yellow-500/10 to-transparent',
      };
  }
};

export const getWorkerIcon = (role: SwarmWorkerNode['role']) => {
  switch (role) {
    case 'cofounder':
      return <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />;
    case 'researcher':
      return <Search className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />;
    case 'coder':
      return <Cpu className="h-4 w-4 text-orange-600 dark:text-orange-400" />;
    case 'writer':
      return (
        <MessageSquare className="h-4 w-4 text-pink-600 dark:text-pink-400" />
      );
    case 'designer':
      return <Orbit className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    case 'analyst':
      return (
        <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
      );
    case 'marketer':
      return <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
  }
};
