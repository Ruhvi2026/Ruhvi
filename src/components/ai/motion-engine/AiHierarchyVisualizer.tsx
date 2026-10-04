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
import { GrokDots3DCanvas } from './GrokDots3DCanvas';
import { WorkerDisplayWindow } from './WorkerDisplayWindow';
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
  const [viewMode, setViewMode] = useState<'3d_galaxy' | 'hierarchy_tree'>(
    '3d_galaxy'
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
    <div className={`space-y-5 ${className}`}>
      {/* Top Controls Header */}
      <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-stone-800 bg-stone-900/90 p-4 shadow-xl backdrop-blur-md sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/15">
            <Sparkles className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="font-mono text-sm font-bold uppercase tracking-wider text-stone-100">
              AI Swarm 3D Motion Architecture
            </h2>
            <p className="text-xs text-stone-400">
              Grok Dots Particle Body • Apex Co-Founder • 12 Core Workers • 6
              Co-Workers
            </p>
          </div>
        </div>

        {/* View Mode & Filter Switcher */}
        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex rounded-xl border border-stone-800 bg-stone-950 p-1 font-mono text-xs">
            {(['all', 'apex', 'core', 'coworker'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`rounded-lg px-2.5 py-1 capitalize transition ${
                  filterLevel === lvl
                    ? 'border border-amber-500/40 bg-amber-500/20 font-bold text-amber-300'
                    : 'text-stone-400 hover:text-stone-200'
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
          <div className="flex rounded-xl border border-stone-800 bg-stone-950 p-1 font-mono text-xs">
            <button
              onClick={() => setViewMode('3d_galaxy')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                viewMode === '3d_galaxy'
                  ? 'bg-amber-500 font-bold text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" />
              <span>3D Galaxy</span>
            </button>
            <button
              onClick={() => setViewMode('hierarchy_tree')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1 transition ${
                viewMode === 'hierarchy_tree'
                  ? 'bg-amber-500 font-bold text-stone-950 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Workflow className="h-3.5 w-3.5" />
              <span>Hierarchy Tree</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      {viewMode === '3d_galaxy' ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* 3D Motion Canvas */}
          <div className="lg:col-span-7">
            <GrokDots3DCanvas
              nodes={filteredNodes}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
              audioLevel={audioLevel}
              isThinking={isThinking}
            />
          </div>

          {/* Live Telemetry Display Window */}
          <div className="lg:col-span-5">
            <WorkerDisplayWindow
              node={selectedNode}
              onSimulateWork={handleSimulateWork}
              className="h-full"
            />
          </div>
        </div>
      ) : (
        /* Hierarchical Neural Tree View */
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="max-h-[480px] overflow-y-auto rounded-2xl border border-stone-800 bg-stone-950/90 p-5 lg:col-span-7">
            <div className="space-y-4 font-mono text-xs">
              {/* Level 0: Apex */}
              <div className="rounded-xl border border-amber-500/40 bg-amber-950/20 p-3.5">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-2 font-bold text-amber-400">
                    <div className="h-2.5 w-2.5 animate-ping rounded-full bg-amber-400" />
                    LEVEL 0: APEX ORCHESTRATOR
                  </span>
                  <button
                    onClick={() => setSelectedNodeId('co_founder')}
                    className="rounded bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-stone-950"
                  >
                    Select
                  </button>
                </div>
                <p className="font-semibold text-stone-300">{nodes[0].name}</p>
                <p className="mt-1 text-[11px] text-stone-400">
                  {nodes[0].title}
                </p>
              </div>

              {/* Level 1: 12 Workers */}
              <div className="space-y-3 border-l-2 border-stone-800 pl-4">
                <span className="block text-[11px] font-bold uppercase text-stone-400">
                  Level 1: 12 Autonomous Core Workers
                </span>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {nodes
                    .filter((n) => n.level === 'core_worker')
                    .map((worker) => (
                      <div
                        key={worker.id}
                        onClick={() => setSelectedNodeId(worker.id)}
                        className={`cursor-pointer rounded-xl border p-2.5 transition ${
                          worker.id === selectedNodeId
                            ? 'border-amber-500 bg-amber-950/30 shadow-lg'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: worker.color }}
                            />
                            <span className="truncate text-xs font-semibold text-stone-200">
                              {worker.name}
                            </span>
                          </div>
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] uppercase"
                            style={{
                              backgroundColor: `${worker.color}20`,
                              color: worker.accentColor,
                            }}
                          >
                            {worker.state}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                {/* Level 2: 6 Co-Workers under Worker 2 */}
                <div className="space-y-2 border-l-2 border-amber-500/30 pl-4 pt-2">
                  <span className="block text-[11px] font-bold uppercase text-amber-400/90">
                    Level 2: Marketing Specialized Co-Workers (under Worker 2)
                  </span>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {nodes
                      .filter((n) => n.level === 'co_worker')
                      .map((cw) => (
                        <div
                          key={cw.id}
                          onClick={() => setSelectedNodeId(cw.id)}
                          className={`cursor-pointer rounded-lg border p-2 text-[11px] transition ${
                            cw.id === selectedNodeId
                              ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                              : 'border-stone-800 bg-stone-900/40 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            <div
                              className="h-1.5 w-1.5 rounded-full"
                              style={{ backgroundColor: cw.color }}
                            />
                            <span className="truncate">{cw.name}</span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <WorkerDisplayWindow
              node={selectedNode}
              onSimulateWork={handleSimulateWork}
              className="h-full"
            />
          </div>
        </div>
      )}
    </div>
  );
};
