'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Workflow,
  Orbit,
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
  const [selectedNodeId, setSelectedNodeId] = useState<string>(initialSelectedId);
  const [viewMode, setViewMode] = useState<'3d_galaxy' | 'hierarchy_tree'>('3d_galaxy');
  const [filterLevel, setFilterLevel] = useState<'all' | 'apex' | 'core' | 'coworker'>('all');

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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-900/90 border border-stone-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-100 uppercase tracking-wider font-mono">
              AI Swarm 3D Motion Architecture
            </h2>
            <p className="text-xs text-stone-400">
              Grok Dots Particle Body • Apex Co-Founder • 12 Core Workers • 6 Co-Workers
            </p>
          </div>
        </div>

        {/* View Mode & Filter Switcher */}
        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-mono">
            {(['all', 'apex', 'core', 'coworker'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2.5 py-1 rounded-lg capitalize transition ${
                  filterLevel === lvl
                    ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {lvl === 'all' ? 'All (19)' : lvl === 'apex' ? 'Apex (1)' : lvl === 'core' ? 'Workers (12)' : 'Co-Workers (6)'}
              </button>
            ))}
          </div>

          {/* 3D vs Tree Toggle */}
          <div className="flex bg-stone-950 p-1 rounded-xl border border-stone-800 text-xs font-mono">
            <button
              onClick={() => setViewMode('3d_galaxy')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                viewMode === '3d_galaxy'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Orbit className="w-3.5 h-3.5" />
              <span>3D Galaxy</span>
            </button>
            <button
              onClick={() => setViewMode('hierarchy_tree')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg transition ${
                viewMode === 'hierarchy_tree'
                  ? 'bg-amber-500 text-stone-950 font-bold shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Hierarchy Tree</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Visualizer Area */}
      {viewMode === '3d_galaxy' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-stone-950/90 border border-stone-800 rounded-2xl p-5 overflow-y-auto max-h-[480px]">
            <div className="space-y-4 font-mono text-xs">
              {/* Level 0: Apex */}
              <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-amber-400 font-bold flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                    LEVEL 0: APEX ORCHESTRATOR
                  </span>
                  <button
                    onClick={() => setSelectedNodeId('co_founder')}
                    className="px-2 py-0.5 bg-amber-500 text-stone-950 rounded text-[10px] font-bold"
                  >
                    Select
                  </button>
                </div>
                <p className="text-stone-300 font-semibold">{nodes[0].name}</p>
                <p className="text-[11px] text-stone-400 mt-1">{nodes[0].title}</p>
              </div>

              {/* Level 1: 12 Workers */}
              <div className="pl-4 border-l-2 border-stone-800 space-y-3">
                <span className="text-stone-400 text-[11px] font-bold uppercase block">
                  Level 1: 12 Autonomous Core Workers
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {nodes
                    .filter((n) => n.level === 'core_worker')
                    .map((worker) => (
                      <div
                        key={worker.id}
                        onClick={() => setSelectedNodeId(worker.id)}
                        className={`p-2.5 rounded-xl border cursor-pointer transition ${
                          worker.id === selectedNodeId
                            ? 'border-amber-500 bg-amber-950/30 shadow-lg'
                            : 'border-stone-800 bg-stone-900/60 hover:border-stone-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: worker.color }}
                            />
                            <span className="font-semibold text-stone-200 text-xs truncate">
                              {worker.name}
                            </span>
                          </div>
                          <span
                            className="text-[10px] uppercase px-1.5 py-0.5 rounded"
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
                <div className="pl-4 border-l-2 border-amber-500/30 pt-2 space-y-2">
                  <span className="text-amber-400/90 text-[11px] font-bold uppercase block">
                    Level 2: Marketing Specialized Co-Workers (under Worker 2)
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {nodes
                      .filter((n) => n.level === 'co_worker')
                      .map((cw) => (
                        <div
                          key={cw.id}
                          onClick={() => setSelectedNodeId(cw.id)}
                          className={`p-2 rounded-lg border cursor-pointer text-[11px] transition ${
                            cw.id === selectedNodeId
                              ? 'border-amber-400 bg-amber-950/40 text-amber-200'
                              : 'border-stone-800 bg-stone-900/40 text-stone-400 hover:text-stone-200'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            <div
                              className="w-1.5 h-1.5 rounded-full"
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
