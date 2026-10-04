'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Layers,
  Activity,
  Cpu,
  Radio,
  Sliders,
  Maximize2,
  Minimize2,
  Workflow,
  Orbit,
  Bot,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { WorkforceSwarm3D } from './WorkforceSwarm3D';
import { LiveWorkingWorkspace } from './LiveWorkingWorkspace';
import { Cofounder3DCharacter } from './Cofounder3DCharacter';
import { INITIAL_AI_HIERARCHY } from './nodes-data';
import { AgentNode } from './types';

interface AiHierarchyVisualizerProps {
  audioLevel?: number;
  isThinking?: boolean;
  className?: string;
  initialSelectedId?: string;
}

export const AiHierarchyVisualizer: React.FC<AiHierarchyVisualizerProps> = ({
  audioLevel = 0,
  isThinking = false,
  className = '',
  initialSelectedId = 'co_founder',
}) => {
  const [nodes, setNodes] = useState<AgentNode[]>(INITIAL_AI_HIERARCHY);
  const [selectedNodeId, setSelectedNodeId] =
    useState<string>(initialSelectedId);
  const [viewMode, setViewMode] = useState<'3d_swarm' | 'hierarchy_tree'>(
    '3d_swarm'
  );
  const [filterLevel, setFilterLevel] = useState<
    'all' | 'apex' | 'core' | 'coworker'
  >('all');

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) || nodes[0];

  const handleSimulateWork = (nodeId: string) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id === nodeId) {
          return {
            ...n,
            state: 'executing',
            telemetry: {
              ...n.telemetry,
              progressPct: 15,
              currentAction: `Executing live swarm directive for ${n.name}...`,
            },
          };
        }
        return n;
      })
    );
  };

  const filteredNodes = nodes.filter((n) => {
    if (filterLevel === 'apex') return n.level === 'apex_co_founder';
    if (filterLevel === 'core') return n.level === 'core_worker';
    if (filterLevel === 'coworker') return n.level === 'co_worker';
    return true;
  });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Controls Header */}
      <div className="flex flex-col items-start justify-between gap-4 rounded-3xl border border-neutral-800 bg-[#15161b]/90 p-4 shadow-2xl backdrop-blur-xl sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/15 shadow-md shadow-amber-500/10">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-neutral-100">
              <span>AI Workforce 3D Command Center</span>
              <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                19 Agents Active
              </span>
            </h2>
            <p className="text-xs text-neutral-400">
              Apex AI Co-Founder • 12 Specialized Core Workers • 6 Marketing
              Co-Workers
            </p>
          </div>
        </div>

        {/* View Mode & Filter Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Level Filter */}
          <div className="flex rounded-2xl border border-neutral-800 bg-neutral-950 p-1 font-mono text-xs shadow-inner">
            {(['all', 'apex', 'core', 'coworker'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`rounded-xl px-3 py-1.5 capitalize transition-all ${
                  filterLevel === lvl
                    ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300 shadow-sm'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                {lvl === 'all'
                  ? 'All (19)'
                  : lvl === 'apex'
                    ? 'Apex (1)'
                    : lvl === 'core'
                      ? 'Workers (12)'
                      : 'Co-Workers (6)'}
              </button>
            ))}
          </div>

          {/* 3D vs Tree Toggle */}
          <div className="flex rounded-2xl border border-neutral-800 bg-neutral-950 p-1 font-mono text-xs shadow-inner">
            <button
              onClick={() => setViewMode('3d_swarm')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                viewMode === '3d_swarm'
                  ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" />
              <span>3D Swarm</span>
            </button>
            <button
              onClick={() => setViewMode('hierarchy_tree')}
              className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 transition-all ${
                viewMode === 'hierarchy_tree'
                  ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>Hierarchy Tree</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport: 3D Swarm or Tree View */}
      {viewMode === '3d_swarm' ? (
        <div className="space-y-6">
          <WorkforceSwarm3D
            nodes={filteredNodes}
            selectedNodeId={selectedNodeId}
            onSelectNode={(id) => setSelectedNodeId(id)}
            audioLevel={audioLevel}
            isThinking={isThinking}
            filterLevel={filterLevel}
          />

          {/* Selected Worker Live Working Workspace */}
          <LiveWorkingWorkspace
            node={selectedNode}
            onSimulateWork={handleSimulateWork}
          />
        </div>
      ) : (
        /* Neural Hierarchy Tree View */
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Left: Hierarchy Tree List (5 Cols) */}
          <div className="max-h-[680px] space-y-3 overflow-y-auto rounded-3xl border border-neutral-800 bg-[#14151a] p-5 shadow-2xl lg:col-span-5">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-neutral-300">
                Agent Directory ({filteredNodes.length})
              </span>
              <span className="font-mono text-[11px] text-neutral-500">
                Click to inspect
              </span>
            </div>

            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const isSelected = node.id === selectedNodeId;
                const isApex = node.level === 'apex_co_founder';

                return (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNodeId(node.id)}
                    className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition-all ${
                      isSelected
                        ? 'border-amber-500/60 bg-amber-500/10 shadow-md'
                        : 'border-neutral-800/80 bg-neutral-900/60 hover:border-neutral-700 hover:bg-neutral-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="h-3 w-3 shrink-0 rounded-full shadow-sm"
                        style={{ backgroundColor: node.accentColor }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">
                            {node.name}
                          </p>
                          {isApex && (
                            <span className="py-0.2 rounded border border-amber-500/40 bg-amber-500/20 px-1.5 font-mono text-[9px] font-bold text-amber-300">
                              APEX
                            </span>
                          )}
                        </div>
                        <p className="line-clamp-1 text-[11px] text-neutral-400">
                          {node.title}
                        </p>
                      </div>
                    </div>
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 transition-transform ${
                        isSelected
                          ? 'translate-x-0.5 text-amber-400'
                          : 'text-neutral-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Live Working Workspace for Selected Agent (7 Cols) */}
          <div className="lg:col-span-7">
            <LiveWorkingWorkspace
              node={selectedNode}
              onSimulateWork={handleSimulateWork}
            />
          </div>
        </div>
      )}
    </div>
  );
};
