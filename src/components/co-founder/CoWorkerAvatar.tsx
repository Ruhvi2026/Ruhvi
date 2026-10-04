'use client';

import React from 'react';
import { motion } from 'motion/react';
import {
  Bot,
  Search,
  Code,
  FileText,
  Palette,
  TrendingUp,
  Megaphone,
  Check,
  AlertTriangle,
  RefreshCw,
  Zap,
} from 'lucide-react';

export type CoWorkerRole =
  | 'cofounder'
  | 'researcher'
  | 'coder'
  | 'writer'
  | 'designer'
  | 'analyst'
  | 'marketer';

export type CoWorkerStatus =
  'idle' | 'thinking' | 'working' | 'completed' | 'error';

export interface CoWorkerProps {
  role: CoWorkerRole;
  status?: CoWorkerStatus;
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
  onClick?: () => void;
  className?: string;
  showBadge?: boolean;
  showDetails?: boolean;
}

export const CO_WORKER_CONFIGS: Record<
  CoWorkerRole,
  {
    name: string;
    title: string;
    tagline: string;
    icon: React.ElementType;
    baseHex: string;
    gradientFrom: string;
    gradientVia: string;
    gradientTo: string;
    eyeColor: string;
    glowShadow: string;
    activeGlowShadow: string;
    borderClass: string;
    badgeClass: string;
    bgGradientClass: string;
  }
> = {
  cofounder: {
    name: 'AI Co-Founder',
    title: 'Apex Business Orchestrator',
    tagline: 'Orchestrates workforce & strategy',
    icon: Bot,
    baseHex: '#8B5CF6',
    gradientFrom: '#C4B5FD',
    gradientVia: '#8B5CF6',
    gradientTo: '#553C9A',
    eyeColor: 'bg-violet-200 shadow-[0_0_12px_#C4B5FD]',
    glowShadow: 'shadow-[0_0_20px_rgba(139,92,246,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(139,92,246,0.6)]',
    borderClass: 'border-violet-400/50',
    badgeClass:
      'bg-violet-500/15 border-violet-500/40 text-violet-700 dark:text-violet-300',
    bgGradientClass: 'from-violet-400 via-violet-500 to-violet-800',
  },
  researcher: {
    name: 'Researcher',
    title: 'Market Intelligence Bot',
    tagline: 'Explores & finds insights',
    icon: Search,
    baseHex: '#00CFFF',
    gradientFrom: '#67E8F9',
    gradientVia: '#00CFFF',
    gradientTo: '#0369A1',
    eyeColor: 'bg-cyan-300 shadow-[0_0_12px_#00CFFF]',
    glowShadow: 'shadow-[0_0_20px_rgba(0,207,255,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(0,207,255,0.6)]',
    borderClass: 'border-cyan-400/50',
    badgeClass:
      'bg-cyan-500/15 border-cyan-500/40 text-cyan-700 dark:text-cyan-300',
    bgGradientClass: 'from-cyan-400 via-cyan-500 to-cyan-700',
  },
  coder: {
    name: 'Coder',
    title: 'Full-Stack Feature Architect',
    tagline: 'Builds apps & APIs',
    icon: Code,
    baseHex: '#FF8A3D',
    gradientFrom: '#FDBA74',
    gradientVia: '#FF8A3D',
    gradientTo: '#C2410C',
    eyeColor: 'bg-orange-300 shadow-[0_0_12px_#FF8A3D]',
    glowShadow: 'shadow-[0_0_20px_rgba(255,138,61,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(255,138,61,0.6)]',
    borderClass: 'border-orange-400/50',
    badgeClass:
      'bg-orange-500/15 border-orange-500/40 text-orange-700 dark:text-orange-300',
    bgGradientClass: 'from-orange-400 via-orange-500 to-orange-700',
  },
  writer: {
    name: 'Writer',
    title: 'Multilingual Copywriter',
    tagline: 'Creates written content',
    icon: FileText,
    baseHex: '#FF4FA3',
    gradientFrom: '#F472B6',
    gradientVia: '#FF4FA3',
    gradientTo: '#BE185D',
    eyeColor: 'bg-pink-300 shadow-[0_0_12px_#FF4FA3]',
    glowShadow: 'shadow-[0_0_20px_rgba(255,79,163,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(255,79,163,0.6)]',
    borderClass: 'border-pink-400/50',
    badgeClass:
      'bg-pink-500/15 border-pink-500/40 text-pink-700 dark:text-pink-300',
    bgGradientClass: 'from-pink-400 via-pink-500 to-pink-700',
  },
  designer: {
    name: 'Designer',
    title: 'UI/UX Motion Engine',
    tagline: 'Crafts visual assets & UI',
    icon: Palette,
    baseHex: '#8B5CF6',
    gradientFrom: '#C4B5FD',
    gradientVia: '#8B5CF6',
    gradientTo: '#553C9A',
    eyeColor: 'bg-purple-300 shadow-[0_0_12px_#8B5CF6]',
    glowShadow: 'shadow-[0_0_20px_rgba(139,92,246,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(139,92,246,0.6)]',
    borderClass: 'border-purple-400/50',
    badgeClass:
      'bg-purple-500/15 border-purple-500/40 text-purple-700 dark:text-purple-300',
    bgGradientClass: 'from-purple-400 via-purple-500 to-purple-800',
  },
  analyst: {
    name: 'Analyst',
    title: 'Unit Economics & Metrics',
    tagline: 'Analyzes metrics & data',
    icon: TrendingUp,
    baseHex: '#10B981',
    gradientFrom: '#6EE7B7',
    gradientVia: '#10B981',
    gradientTo: '#047857',
    eyeColor: 'bg-emerald-300 shadow-[0_0_12px_#10B981]',
    glowShadow: 'shadow-[0_0_20px_rgba(16,185,129,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(16,185,129,0.6)]',
    borderClass: 'border-emerald-400/50',
    badgeClass:
      'bg-emerald-500/15 border-emerald-500/40 text-emerald-700 dark:text-emerald-300',
    bgGradientClass: 'from-emerald-400 via-emerald-500 to-emerald-800',
  },
  marketer: {
    name: 'Marketer',
    title: 'Growth & Ads Manager',
    tagline: 'Grows the Ruhvi brand',
    icon: Megaphone,
    baseHex: '#FFD84D',
    gradientFrom: '#FDE047',
    gradientVia: '#FFD84D',
    gradientTo: '#B45309',
    eyeColor: 'bg-amber-300 shadow-[0_0_12px_#FFD84D]',
    glowShadow: 'shadow-[0_0_20px_rgba(255,216,77,0.35)]',
    activeGlowShadow: 'shadow-[0_0_35px_rgba(255,216,77,0.6)]',
    borderClass: 'border-amber-400/50',
    badgeClass:
      'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300',
    bgGradientClass: 'from-amber-300 via-amber-400 to-amber-600',
  },
};

export function CoWorkerAvatar({
  role,
  status = 'idle',
  size = 'md',
  active = false,
  onClick,
  className = '',
  showBadge = true,
  showDetails = false,
}: CoWorkerProps) {
  const config = CO_WORKER_CONFIGS[role] || CO_WORKER_CONFIGS.researcher;
  const RoleIcon = config.icon;

  const isWorking = status === 'working';
  const isThinking = status === 'thinking';
  const isCompleted = status === 'completed';
  const isError = status === 'error';

  // Dimension mapping
  const dimensions = {
    sm: { avatar: 64, visorW: 42, visorH: 26, eyeW: 8, eyeH: 10, icon: 12 },
    md: { avatar: 96, visorW: 64, visorH: 38, eyeW: 11, eyeH: 14, icon: 16 },
    lg: { avatar: 128, visorW: 86, visorH: 52, eyeW: 15, eyeH: 18, icon: 20 },
  }[size];

  return (
    <motion.div
      onClick={onClick}
      whileHover={onClick ? { scale: 1.07 } : undefined}
      whileTap={onClick ? { scale: 0.95 } : undefined}
      className={`group relative flex select-none flex-col items-center justify-center transition-all duration-300 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {/* 1. Status Top Node / Antenna */}
      <div className="relative mb-1 flex items-center justify-center">
        <motion.div
          animate={{ scale: isWorking || isThinking ? [1, 1.35, 1] : 1 }}
          transition={{
            repeat: Infinity,
            duration: isWorking ? 1.2 : 2,
            ease: 'easeInOut',
          }}
          className={`h-3 w-3 rounded-full border border-white/40 transition-all duration-300 ${
            isWorking || isThinking ? 'animate-ping' : ''
          }`}
          style={{ backgroundColor: config.baseHex }}
        />
        <div
          className="absolute h-2 w-2 rounded-full"
          style={{ backgroundColor: config.baseHex }}
        />
      </div>

      {/* 2. Soft 3D Bot Head Shell with Smooth Subtle Idle Bobbing */}
      <motion.div
        animate={{ y: isWorking ? [0, -3, 0] : isThinking ? [0, -2, 0] : 0 }}
        transition={{
          y: {
            duration: isWorking ? 2 : 2.8,
            repeat: Infinity,
            ease: 'easeInOut',
          },
        }}
        className={`relative flex items-center justify-center rounded-full p-2 shadow-nm-convex ring-1 ring-white/30 transition-all duration-300 dark:shadow-nm-convex-dark ${
          active || isWorking ? config.activeGlowShadow : config.glowShadow
        }`}
        style={{
          width: `${dimensions.avatar}px`,
          height: `${dimensions.avatar}px`,
          background: `radial-gradient(circle at 35% 25%, ${config.gradientFrom} 0%, ${config.gradientVia} 55%, ${config.gradientTo} 100%)`,
        }}
      >
        {/* Overhead Studio Specular Bounce Light */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-b from-white/40 via-white/10 to-transparent" />

        {/* Inner Shadow Volumetric Depth */}
        <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-tr from-black/20 via-transparent to-white/20" />

        {/* Specular Rim Light Arc */}
        <div className="blur-xs pointer-events-none absolute left-4 top-1.5 h-6 w-12 -rotate-12 rounded-full bg-white/40" />

        {/* 3. Animated Recessed Glossy Visor Screen */}
        <div
          className="relative flex items-center justify-center rounded-full border border-white/25 bg-[#0B0D13] p-2 shadow-[inset_0_4px_12px_rgba(0,0,0,0.95)]"
          style={{
            width: `${dimensions.visorW}px`,
            height: `${dimensions.visorH}px`,
          }}
        >
          {/* Visor Glass Reflection */}
          <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-80" />

          {/* Expressive Digital Eyes */}
          <div className="relative z-10 flex items-center justify-center space-x-3">
            {isCompleted ? (
              /* Happy Eyes (^ ^) */
              <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                <span>^</span>
                <span>^</span>
              </div>
            ) : isError ? (
              /* Alert Error State */
              <AlertTriangle className="h-4 w-4 animate-pulse text-rose-400" />
            ) : (
              <>
                <div
                  className={`rounded-full transition-all duration-200 ${
                    config.eyeColor
                  } ${isThinking ? 'animate-pulse' : ''}`}
                  style={{
                    width: `${dimensions.eyeW}px`,
                    height: `${isWorking ? dimensions.eyeH * 1.2 : dimensions.eyeH}px`,
                  }}
                />
                <div
                  className={`rounded-full transition-all duration-200 ${
                    config.eyeColor
                  } ${isThinking ? 'animate-pulse' : ''}`}
                  style={{
                    width: `${dimensions.eyeW}px`,
                    height: `${isWorking ? dimensions.eyeH * 1.2 : dimensions.eyeH}px`,
                    animationDelay: '120ms',
                  }}
                />
              </>
            )}
          </div>
        </div>

        {/* 4. Role Icon Micro-Badge */}
        {showBadge && (
          <div
            className={`absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-white/40 bg-nm-light-bg p-1.5 shadow-nm-flat dark:bg-nm-dark-bg dark:shadow-nm-flat-dark ${config.badgeClass}`}
          >
            <RoleIcon size={dimensions.icon} />
          </div>
        )}
      </motion.div>

      {/* 5. Hovering Magnetic Base & Shadow */}
      <motion.div
        animate={{
          scaleX: isWorking ? [1, 1.15, 1] : [1, 1.05, 1],
          opacity: isWorking ? [0.25, 0.45, 0.25] : [0.2, 0.35, 0.2],
        }}
        transition={{
          duration: isWorking ? 2 : 2.8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="blur-xs mt-2 h-1.5 rounded-full bg-current opacity-30"
        style={{
          width: `${dimensions.avatar * 0.65}px`,
          color: config.baseHex,
        }}
      />

      {/* 6. Optional Worker Details Label Card */}
      {showDetails && (
        <div className="mt-3 text-center">
          <h4 className="flex items-center justify-center gap-1.5 text-xs font-bold text-nm-light-textPrimary dark:text-white">
            <span>{config.name}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold ${config.badgeClass}`}
            >
              {status.toUpperCase()}
            </span>
          </h4>
          <p className="mt-0.5 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
            {config.tagline}
          </p>
        </div>
      )}
    </motion.div>
  );
}
