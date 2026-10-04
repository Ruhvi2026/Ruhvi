'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Activity,
  Zap,
  Terminal,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Radio,
  Sliders,
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
  const [activeTab, setActiveTab] = useState<
    'overview' | 'logs' | 'capabilities'
  >('overview');
  const [simulating, setSimulating] = useState(false);
  const [liveAction, setLiveAction] = useState<string>(
    node.telemetry.currentAction
  );
  const [liveProgress, setLiveProgress] = useState<number>(
    node.telemetry.progressPct
  );

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
      setLiveAction(
        `Executing tool bridge: ${node.telemetry.activeTool || 'core.compute()'}`
      );
    }, 1200);

    setTimeout(() => {
      setLiveProgress(85);
      setLiveAction(`Synthesizing intelligence & updating state vectors...`);
    }, 2400);

    setTimeout(() => {
      setLiveProgress(100);
      setLiveAction(
        `Task completed with verified safety gates. Ready for next directive.`
      );
      setSimulating(false);
      toast.success(`${node.name} completed execution successfully! ✨`);
    }, 3600);
  };

  const getStatusBadge = (state: AgentWorkState) => {
    switch (state) {
      case 'executing':
      case 'generating':
        return (
          <span className="flex animate-pulse items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> ACTIVE
            WORKING
          </span>
        );
      case 'analyzing':
      case 'thinking':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-950/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-sky-400">
            <span className="h-1.5 w-1.5 animate-ping rounded-full bg-sky-400" />{' '}
            PROCESSING
          </span>
        );
      case 'waiting_approval':
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-950/80 px-2.5 py-0.5 font-mono text-[11px] font-medium text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> APPROVAL
            GATE
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 rounded-full border border-stone-800 bg-stone-900 px-2.5 py-0.5 font-mono text-[11px] font-medium text-stone-400">
            <span className="h-1.5 w-1.5 rounded-full bg-stone-500" /> STANDBY
            IDLE
          </span>
        );
    }
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-stone-800 bg-stone-900/95 p-6 shadow-2xl backdrop-blur-xl ${className}`}
    >
      {/* Background Accent Glow */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full opacity-15 blur-3xl"
        style={{ backgroundColor: node.color }}
      />

      {/* Header Banner */}
      <div className="relative z-10 flex flex-col items-start justify-between gap-4 border-b border-stone-800 pb-5 md:flex-row md:items-center">
        <div className="flex items-center gap-3.5">
          <div
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl border shadow-lg"
            style={{
              backgroundColor: `${node.color}15`,
              borderColor: `${node.color}40`,
            }}
          >
            {/* Animated Mini Dot Avatar */}
            <div className="relative flex items-center justify-center">
              <div
                className="absolute h-4 w-4 animate-ping rounded-full opacity-30"
                style={{ backgroundColor: node.accentColor }}
              />
              <div
                className="h-5 w-5 rounded-full shadow-lg"
                style={{ backgroundColor: node.color }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-stone-100">
                {node.name}
              </h3>
              {getStatusBadge(simulating ? 'executing' : node.state)}
            </div>
            <p className="mt-0.5 font-sans text-xs text-stone-400">
              {node.title}
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 rounded-xl border border-stone-800 bg-stone-950 p-1">
          {(['overview', 'logs', 'capabilities'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-1 font-mono text-xs capitalize transition ${
                activeTab === tab
                  ? 'bg-stone-800 font-medium text-stone-100 shadow'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Display Body */}
      <div className="relative z-10 space-y-5 py-5">
        {activeTab === 'overview' && (
          <>
            {/* Working Animation & Live Action Box */}
            <div className="p-4.5 rounded-xl border border-stone-800/90 bg-stone-950/90 shadow-inner">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2 font-mono text-xs font-medium text-stone-300">
                  <Activity className="h-4 w-4 animate-spin text-amber-400" />
                  <span>Current Operation & Thought Process:</span>
                </div>
                <span className="font-mono text-[11px] font-bold text-amber-400/90">
                  {liveProgress}% COMPLETE
                </span>
              </div>

              <p className="mb-3 rounded-lg border border-stone-800/80 bg-stone-900/60 p-3 font-mono text-xs leading-relaxed text-stone-200">
                {liveAction}
              </p>

              {/* Progress Bar with Gradient Glow */}
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-stone-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400 transition-all duration-500"
                  style={{ width: `${liveProgress}%` }}
                />
              </div>

              {/* Real-time Dynamic Waveform visualizer */}
              <div className="mt-3.5 flex h-6 items-center justify-center gap-1">
                {[
                  0.4, 0.9, 0.6, 1.2, 0.8, 1.4, 0.5, 1.1, 0.7, 1.3, 0.6, 1.0,
                ].map((v, i) => {
                  const isActive = simulating || node.state !== 'idle';
                  const height = isActive
                    ? Math.max(4, Math.sin(i + Date.now() * 0.005) * 12 + 10)
                    : 4;
                  return (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-gradient-to-t from-amber-500 to-yellow-300 transition-all duration-150"
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
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
                <span className="mb-1 block font-mono text-[10px] uppercase text-stone-400">
                  Latency
                </span>
                <span className="font-mono text-sm font-semibold text-emerald-400">
                  {node.telemetry.latencyMs} ms
                </span>
              </div>
              <div className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
                <span className="mb-1 block font-mono text-[10px] uppercase text-stone-400">
                  Throughput
                </span>
                <span className="font-mono text-sm font-semibold text-sky-400">
                  {node.telemetry.tokensPerSec} t/s
                </span>
              </div>
              <div className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
                <span className="mb-1 block font-mono text-[10px] uppercase text-stone-400">
                  Compute Load
                </span>
                <span className="font-mono text-sm font-semibold text-amber-400">
                  {node.telemetry.computeLoadPct}%
                </span>
              </div>
              <div className="rounded-xl border border-stone-800/80 bg-stone-950/60 p-3">
                <span className="mb-1 block font-mono text-[10px] uppercase text-stone-400">
                  Autonomy
                </span>
                <span className="block truncate font-mono text-xs font-medium text-stone-300">
                  {node.telemetry.autonomyLevel}
                </span>
              </div>
            </div>

            {/* Active Tool Bridge */}
            {node.telemetry.activeTool && (
              <div className="flex items-center justify-between rounded-xl border border-stone-800/80 bg-stone-950/60 p-3 font-mono text-xs">
                <div className="flex items-center gap-2 text-stone-400">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />
                  <span>Dispatched Tool Bridge:</span>
                </div>
                <code className="font-semibold text-amber-300">
                  {node.telemetry.activeTool}
                </code>
              </div>
            )}
          </>
        )}

        {activeTab === 'logs' && (
          <div className="max-h-64 space-y-2 overflow-y-auto rounded-xl border border-stone-800 bg-stone-950 p-4 font-mono text-xs">
            {node.telemetry.logLines.map((log, index) => (
              <div
                key={index}
                className="flex items-start gap-2 text-stone-300"
              >
                <span className="select-none text-stone-500">
                  [{log.timestamp}]
                </span>
                <span
                  className={`py-0.2 rounded px-1.5 text-[10px] font-bold uppercase ${
                    log.level === 'success'
                      ? 'border border-emerald-800 bg-emerald-950 text-emerald-400'
                      : log.level === 'warn'
                        ? 'border border-amber-800 bg-amber-950 text-amber-400'
                        : log.level === 'exec'
                          ? 'border border-sky-800 bg-sky-950 text-sky-400'
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
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {node.capabilities.map((cap, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 rounded-xl border border-stone-800 bg-stone-950/60 p-3 text-xs text-stone-200"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{cap}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Trigger Button */}
      <div className="relative z-10 flex items-center justify-between border-t border-stone-800/80 pt-2">
        <span className="font-mono text-[11px] text-stone-500">
          Hierarchy:{' '}
          {node.level === 'apex_co_founder'
            ? 'Level 0 (Apex)'
            : node.level === 'core_worker'
              ? 'Level 1 (Core Worker)'
              : 'Level 2 (Specialized Co-Worker)'}
        </span>

        <button
          onClick={handleTriggerWork}
          disabled={simulating}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 text-xs font-bold text-stone-950 shadow-lg transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
        >
          {simulating ? (
            <>
              <Activity className="h-3.5 w-3.5 animate-spin" />
              <span>Orchestrating AI Execution...</span>
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5 fill-current" />
              <span>Trigger Test Directive on {node.name.split(':')[0]}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
