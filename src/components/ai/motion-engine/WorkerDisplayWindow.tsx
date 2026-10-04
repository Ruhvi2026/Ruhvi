'use client';

import React, { useState } from 'react';
import {
  Activity,
  Zap,
  Play,
  CheckCircle2,
} from 'lucide-react';
import { AgentNode, AgentWorkState } from './types';
import toast from 'react-hot-toast';

interface WorkerDisplayWindowProps {
  node: AgentNode;
  onSimulateWork?: (nodeId: string) => void;
  className?: string;
}

export const WorkerDisplayWindow: React.FC<WorkerDisplayWindowProps> = ({
  node,
  onSimulateWork,
  className = '',
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'capabilities'>('overview');
  const [simulating, setSimulating] = useState(false);
  const [liveAction, setLiveAction] = useState<string>(node.telemetry.currentAction);
  const [liveProgress, setLiveProgress] = useState<number>(node.telemetry.progressPct);

  const handleTriggerWork = () => {
    setSimulating(true);
    setLiveProgress(10);
    setLiveAction(`Initializing autonomous execution run for ${node.name}...`);
    toast.success(`Dispatched live task to ${node.name}`);

    if (onSimulateWork) {
      onSimulateWork(node.id);
    }

    setTimeout(() => {
      setLiveProgress(45);
      setLiveAction(`Executing tool bridge: ${node.telemetry.activeTool || 'core.compute()'}`);
    }, 1200);

    setTimeout(() => {
      setLiveProgress(85);
      setLiveAction(`Synthesizing intelligence & updating state vectors...`);
    }, 2400);

    setTimeout(() => {
      setLiveProgress(100);
      setLiveAction(`Task completed with verified safety gates. Ready for next directive.`);
      setSimulating(false);
      toast.success(`${node.name} completed execution successfully! ✨`);
    }, 3600);
  };

  const getStatusBadge = (state: AgentWorkState) => {
    switch (state) {
      case 'executing':
      case 'generating':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> ACTIVE WORKING
          </span>
        );
      case 'analyzing':
      case 'thinking':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-sky-950/80 text-sky-400 border border-sky-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" /> PROCESSING
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> APPROVAL GATE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium bg-stone-900 text-stone-400 border border-stone-800">
            <span className="w-1.5 h-1.5 rounded-full bg-stone-500" /> STANDBY IDLE
          </span>
        );
    }
  };

  return (
    <div className={`bg-stone-900/95 border border-stone-800 rounded-2xl p-6 shadow-2xl backdrop-blur-xl relative overflow-hidden ${className}`}>
      {/* Background Accent Glow */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full blur-3xl opacity-15 pointer-events-none"
        style={{ backgroundColor: node.color }}
      />

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-5 border-b border-stone-800 relative z-10">
        <div className="flex items-center gap-3.5">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center border shadow-lg relative"
            style={{
              backgroundColor: `${node.color}15`,
              borderColor: `${node.color}40`,
            }}
          >
            {/* Animated Mini Dot Avatar */}
            <div className="relative flex items-center justify-center">
              <div
                className="w-4 h-4 rounded-full animate-ping opacity-30 absolute"
                style={{ backgroundColor: node.accentColor }}
              />
              <div
                className="w-5 h-5 rounded-full shadow-lg"
                style={{ backgroundColor: node.color }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-stone-100">{node.name}</h3>
              {getStatusBadge(simulating ? 'executing' : node.state)}
            </div>
            <p className="text-xs text-stone-400 mt-0.5 font-sans">{node.title}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-stone-950 p-1 rounded-xl border border-stone-800">
          {(['overview', 'logs', 'capabilities'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition ${
                activeTab === tab
                  ? 'bg-stone-800 text-stone-100 font-medium shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Display Body */}
      <div className="py-5 space-y-5 relative z-10">
        {activeTab === 'overview' && (
          <>
            {/* Working Animation & Live Action Box */}
            <div className="bg-stone-950/90 border border-stone-800/90 rounded-xl p-4.5 shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-xs font-mono font-medium text-stone-300">
                  <Activity className="w-4 h-4 text-amber-400 animate-spin" />
                  <span>Current Operation & Thought Process:</span>
                </div>
                <span className="text-[11px] font-mono text-amber-400/90 font-bold">
                  {liveProgress}% COMPLETE
                </span>
              </div>

              <p className="text-xs text-stone-200 font-mono leading-relaxed bg-stone-900/60 p-3 rounded-lg border border-stone-800/80 mb-3">
                {liveAction}
              </p>

              {/* Progress Bar with Gradient Glow */}
              <div className="w-full h-2 bg-stone-800 rounded-full overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${liveProgress}%` }}
                />
              </div>

              {/* Real-time Dynamic Waveform visualizer */}
              <div className="flex items-center justify-center gap-1 mt-3.5 h-6">
                {[0.4, 0.9, 0.6, 1.2, 0.8, 1.4, 0.5, 1.1, 0.7, 1.3, 0.6, 1.0].map((v, i) => {
                  const isActive = simulating || node.state !== 'idle';
                  const height = isActive ? Math.max(4, Math.sin(i + Date.now() * 0.005) * 12 + 10) : 4;
                  return (
                    <div
                      key={i}
                      className="w-1 bg-gradient-to-t from-amber-500 to-yellow-300 rounded-full transition-all duration-150"
                      style={{
                        height: `${height}px`,
                        opacity: isActive ? 0.9 : 0.25,
                      }}
                    />
                  );
                })}
              </div>
            </div>

            {/* Live Telemetry Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-stone-950/60 border border-stone-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Latency</span>
                <span className="text-sm font-mono font-semibold text-emerald-400">
                  {node.telemetry.latencyMs} ms
                </span>
              </div>
              <div className="bg-stone-950/60 border border-stone-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Throughput</span>
                <span className="text-sm font-mono font-semibold text-sky-400">
                  {node.telemetry.tokensPerSec} t/s
                </span>
              </div>
              <div className="bg-stone-950/60 border border-stone-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Compute Load</span>
                <span className="text-sm font-mono font-semibold text-amber-400">
                  {node.telemetry.computeLoadPct}%
                </span>
              </div>
              <div className="bg-stone-950/60 border border-stone-800/80 p-3 rounded-xl">
                <span className="text-[10px] font-mono uppercase text-stone-400 block mb-1">Autonomy</span>
                <span className="text-xs font-mono font-medium text-stone-300 truncate block">
                  {node.telemetry.autonomyLevel}
                </span>
              </div>
            </div>

            {/* Active Tool Bridge */}
            {node.telemetry.activeTool && (
              <div className="flex items-center justify-between p-3 bg-stone-950/60 border border-stone-800/80 rounded-xl text-xs font-mono">
                <div className="flex items-center gap-2 text-stone-400">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Dispatched Tool Bridge:</span>
                </div>
                <code className="text-amber-300 font-semibold">{node.telemetry.activeTool}</code>
              </div>
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <div className="bg-stone-950 rounded-xl p-4 border border-stone-800 font-mono text-xs max-h-64 overflow-y-auto space-y-2">
            {node.telemetry.logLines.map((log, index) => (
              <div key={index} className="flex items-start gap-2 text-stone-300">
                <span className="text-stone-500 select-none">[{log.timestamp}]</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] uppercase font-bold ${
                    log.level === 'success'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : log.level === 'warn'
                      ? 'bg-amber-950 text-amber-400 border border-amber-800'
                      : log.level === 'exec'
                      ? 'bg-sky-950 text-sky-400 border border-sky-800'
                      : 'bg-stone-900 text-stone-400'
                  }`}
                >
                  {log.level}
                </span>
                <span className="leading-relaxed">{log.message}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'capabilities' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {node.capabilities.map((cap, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 p-3 bg-stone-950/60 border border-stone-800 rounded-xl text-xs text-stone-200"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Trigger Button */}
      <div className="pt-2 flex items-center justify-between border-t border-stone-800/80 relative z-10">
        <span className="text-[11px] text-stone-500 font-mono">
          Hierarchy: {node.level === 'apex_co_founder' ? 'Level 0 (Apex)' : node.level === 'core_worker' ? 'Level 1 (Core Worker)' : 'Level 2 (Specialized Co-Worker)'}
        </span>

        <button
          onClick={handleTriggerWork}
          disabled={simulating}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-stone-950 font-bold text-xs rounded-xl shadow-lg transition"
        >
          {simulating ? (
            <>
              <Activity className="w-3.5 h-3.5 animate-spin" />
              <span>Orchestrating AI Execution...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Trigger Test Directive on {node.name.split(':')[0]}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
