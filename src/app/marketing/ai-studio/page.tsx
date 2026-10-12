'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Sparkles,
  Send,
  Loader2,
  Layers,
  ArrowRight,
  ShieldCheck,
  Film,
  BarChart3,
  Bot,
  Orbit,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CoWorkerStatusPanel } from '@/lib/../components/marketing/ai-studio/CoWorkerStatusPanel';
import { CreativeMediaStudio } from '@/lib/../components/marketing/ai-studio/CreativeMediaStudio';
import { CampaignReviewCard } from '@/lib/../components/marketing/ai-studio/CampaignReviewCard';
const AiHierarchyVisualizer = dynamic(
  () =>
    import('@/components/ai/motion-engine/AiHierarchyVisualizer').then(
      (m) => m.AiHierarchyVisualizer
    ),
  { ssr: false }
);

export default function MarketingAiStudioPage() {
  const [prompt, setPrompt] = useState(
    'Create an ad campaign for 22K Gold Plated Choker'
  );
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'creative_studio' | 'campaign_review' | 'coworkers' | 'motion_3d'
  >('creative_studio');
  const [executionResult, setExecutionResult] = useState<any>(null);

  const samplePrompts = [
    'Create an ad campaign for 22K Gold Plated Choker',
    'Make a 15-second video ad with Bengali and Hindi voiceovers',
    'Analyze competitors and suggest high-converting ad angles',
    'Set up Meta Ads campaign draft with ₹2,500/day budget',
    'Create festive discount campaign with coupon RUHVI500',
  ];

  const handleRunTask = async (taskText: string) => {
    setLoading(true);
    try {
      // Execute Marketing Worker via internal tool API
      const res = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'dispatch_worker_task',
          args: {
            worker_id: 'worker_marketing',
            task: taskText,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute marketing task');
      }

      setExecutionResult(data.data?.result || null);
      toast.success('Marketing Worker generated campaign assets! ✨');
    } catch (err: any) {
      toast.error(err.message || 'Error executing marketing worker');
    } finally {
      setLoading(false);
    }
  };

  const creativeData = executionResult?.data?.creativeMedia;
  const adsData = executionResult?.data?.adsExecution;
  const strategyData = executionResult?.data?.strategy;

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Bot className="h-4 w-4" />
            <span>AI Co-Founder • Marketing Worker Ecosystem</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-stone-100">
            Marketing AI Studio & Co-Workers
          </h1>
          <p className="mt-1 text-sm text-stone-400">
            Orchestrate Strategy, Creative Media (Google Flow 2-Video Prompts),
            and Approval-Gated Ads Execution.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 rounded-xl border border-stone-800 bg-stone-900 p-1">
          <button
            onClick={() => setActiveTab('creative_studio')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              activeTab === 'creative_studio'
                ? 'bg-amber-500 font-bold text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Creative Media Studio
          </button>
          <button
            onClick={() => setActiveTab('campaign_review')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              activeTab === 'campaign_review'
                ? 'bg-amber-500 font-bold text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Campaign Review & Approval
          </button>
          <button
            onClick={() => setActiveTab('coworkers')}
            className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              activeTab === 'coworkers'
                ? 'bg-amber-500 font-bold text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Co-Workers Registry
          </button>
          <button
            onClick={() => setActiveTab('motion_3d')}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium transition ${
              activeTab === 'motion_3d'
                ? 'bg-amber-500 font-bold text-stone-950 shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Orbit className="h-3.5 w-3.5" />
            <span>3D Swarm Motion</span>
          </button>
        </div>
      </div>

      {/* Natural Language Prompt Bar */}
      <div className="space-y-3 rounded-2xl border border-stone-800 bg-stone-900 p-5 shadow-2xl">
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-200">
          Ask Marketing Worker / Dispatch Co-Workers
        </label>
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Create a Facebook ad campaign for 22K Gold Plated Choker"
            className="flex-1 rounded-xl border border-stone-800 bg-stone-950 px-4 py-3 text-sm text-stone-100 placeholder-stone-500 transition focus:border-amber-500 focus:outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleRunTask(prompt);
              }
            }}
          />
          <button
            onClick={() => handleRunTask(prompt)}
            disabled={loading || !prompt.trim()}
            className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-3 text-xs font-bold text-stone-950 shadow-lg transition hover:from-amber-400 hover:to-amber-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            <span>{loading ? 'Orchestrating...' : 'Generate Campaign'}</span>
          </button>
        </div>

        {/* Preset quick pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="self-center text-[11px] text-stone-500">Try:</span>
          {samplePrompts.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(sample);
                handleRunTask(sample);
              }}
              className="rounded-lg border border-stone-800 bg-stone-950 px-2.5 py-1 text-[11px] text-stone-400 transition hover:bg-stone-800 hover:text-stone-200"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area based on Selected Tab */}
      {activeTab === 'coworkers' && <CoWorkerStatusPanel />}

      {activeTab === 'motion_3d' && (
        <div className="space-y-6">
          <AiHierarchyVisualizer initialSelectedId="worker_2" />
        </div>
      )}

      {activeTab === 'creative_studio' && (
        <div className="space-y-6">
          <CreativeMediaStudio
            creativeData={creativeData}
            campaignId="cmp_active_flight"
          />
        </div>
      )}

      {activeTab === 'campaign_review' && (
        <div className="space-y-6">
          <CampaignReviewCard campaignDraft={adsData?.campaignDraft} />
        </div>
      )}

      {/* Strategy Summary & Executive Voice readout if available */}
      {strategyData && (
        <div className="space-y-4 rounded-2xl border border-stone-800 bg-stone-900 p-6 shadow-xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Sparkles className="h-4 w-4" />
            <span>Active Strategy Summary</span>
          </div>
          <p className="font-sans text-sm leading-relaxed text-stone-200">
            {executionResult?.executiveVoiceSummary}
          </p>

          <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
            {strategyData.angles.map((angle: any, idx: number) => (
              <div
                key={idx}
                className="rounded-xl border border-stone-800 bg-stone-950 p-3.5 text-xs"
              >
                <span className="mb-1 block font-semibold text-amber-400">
                  Hook #{idx + 1}
                </span>
                <p className="font-medium text-stone-200">{angle.hook}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
