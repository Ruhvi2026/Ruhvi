'use client';

import React, { useState } from 'react';
import {
  CoWorkerAvatar,
  CO_WORKER_CONFIGS,
  CoWorkerRole,
  CoWorkerStatus,
} from './CoWorkerAvatar';
import { Sparkles } from 'lucide-react';

export const CO_WORKER_SPEC_DESCRIPTIONS: Record<
  Exclude<CoWorkerRole, 'cofounder'>,
  { tagline: string }
> = {
  researcher: { tagline: 'Explores the web, finds new info.' },
  coder: { tagline: 'Writes code, builds features.' },
  writer: { tagline: 'Creates content, ideas, docs.' },
  designer: { tagline: 'Designs UI/UX, visuals, brand.' },
  analyst: { tagline: 'Analyzes data, finds patterns.' },
  marketer: { tagline: 'Grows audience, handles campaigns.' },
};

export function CoWorkerCharactersBanner({
  onSelectRole,
}: {
  onSelectRole?: (role: CoWorkerRole) => void;
}) {
  const workerRoles: Array<Exclude<CoWorkerRole, 'cofounder'>> = [
    'researcher',
    'coder',
    'writer',
    'designer',
    'analyst',
    'marketer',
  ];

  return (
    <div className="flex flex-col space-y-4 rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-6 text-nm-light-textPrimary shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:text-nm-dark-textPrimary dark:shadow-nm-flat-dark">
      <h3 className="text-sm font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
        AI Co-Worker Characters
      </h3>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {workerRoles.map((roleKey) => {
          const cfg = CO_WORKER_CONFIGS[roleKey];
          const spec = CO_WORKER_SPEC_DESCRIPTIONS[roleKey];
          const IconComp = cfg.icon;

          return (
            <div
              key={roleKey}
              onClick={() => onSelectRole?.(roleKey)}
              className="group flex cursor-pointer flex-col items-center justify-between rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-4 text-center shadow-nm-convex transition-all duration-300 hover:scale-105 dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark"
            >
              {/* 3D Bot Character */}
              <CoWorkerAvatar
                role={roleKey}
                status="idle"
                size="md"
                showBadge={true}
                showDetails={false}
              />

              {/* Theme Icon Micro-Button */}
              <div
                className={`mb-2 mt-4 flex h-8 w-8 items-center justify-center rounded-full border shadow-nm-flat dark:shadow-nm-flat-dark ${cfg.badgeClass}`}
              >
                <IconComp size={15} />
              </div>

              {/* Character Title */}
              <h4 className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                {cfg.name}
              </h4>

              {/* Exact Spec Description */}
              <p className="mt-1 text-[10px] leading-tight text-nm-light-textSecondary dark:text-neutral-400">
                {spec.tagline}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function CoWorkerShowcase() {
  const [selectedRole, setSelectedRole] = useState<CoWorkerRole>('researcher');
  const [activeStatus, setActiveStatus] = useState<CoWorkerStatus>('working');
  const roles = Object.keys(CO_WORKER_CONFIGS) as CoWorkerRole[];
  const statuses: CoWorkerStatus[] = [
    'idle',
    'thinking',
    'working',
    'completed',
    'error',
  ];

  return (
    <div className="space-y-6">
      {/* 1. Exact Visual Spec Reference Banner */}
      <CoWorkerCharactersBanner onSelectRole={(r) => setSelectedRole(r)} />

      {/* 2. Interactive Status Showcase Panel */}
      <div className="flex flex-col space-y-6 rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-6 text-nm-light-textPrimary shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:text-nm-dark-textPrimary dark:shadow-nm-flat-dark">
        {/* Header Controls */}
        <div className="flex flex-col justify-between gap-4 border-b border-neutral-200/80 pb-4 dark:border-neutral-800 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark">
              <Sparkles className="h-5 w-5 text-violet-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="flex items-center gap-2 text-base font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
                Interactive Bot States Showcase
                <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold text-violet-700 dark:text-violet-300">
                  {roles.length} Roles Active
                </span>
              </h2>
              <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
                Test character behavior across idle, thinking, working,
                completed, and error states
              </p>
            </div>
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-neutral-300/70 bg-nm-light-bg p-1 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
            {statuses.map((st) => (
              <button
                key={st}
                onClick={() => setActiveStatus(st)}
                className={`rounded-xl px-3 py-1 text-[11px] font-bold capitalize transition-all ${
                  activeStatus === st
                    ? 'bg-nm-gradient-light text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark'
                    : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Bot Detailed State Inspection Panel */}
        {selectedRole && (
          <div className="space-y-4 rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-5 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <CoWorkerAvatar
                  role={selectedRole}
                  status={activeStatus}
                  size="sm"
                />
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-bold text-nm-light-textPrimary dark:text-white">
                    {CO_WORKER_CONFIGS[selectedRole].name}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${CO_WORKER_CONFIGS[selectedRole].badgeClass}`}
                    >
                      {CO_WORKER_CONFIGS[selectedRole].title}
                    </span>
                  </h3>
                  <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
                    {CO_WORKER_CONFIGS[selectedRole].tagline}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="rounded-xl border border-neutral-300/80 bg-nm-light-bg px-3 py-1.5 text-nm-light-textSecondary shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark">
                  HEX: {CO_WORKER_CONFIGS[selectedRole].baseHex}
                </span>
              </div>
            </div>

            {/* Size Variants Showcase Row */}
            <div className="grid grid-cols-1 items-center gap-4 text-center md:grid-cols-3">
              <div className="flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Small Variant (sm)
                </span>
                <CoWorkerAvatar
                  role={selectedRole}
                  status={activeStatus}
                  size="sm"
                />
              </div>

              <div className="flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Medium Variant (md)
                </span>
                <CoWorkerAvatar
                  role={selectedRole}
                  status={activeStatus}
                  size="md"
                />
              </div>

              <div className="flex flex-col items-center rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-2 text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Large Variant (lg)
                </span>
                <CoWorkerAvatar
                  role={selectedRole}
                  status={activeStatus}
                  size="lg"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
