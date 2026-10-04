'use client';

import React, { useState } from 'react';
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
import { AiHierarchyVisualizer } from '@/components/ai/motion-engine/AiHierarchyVisualizer';

export default function MarketingAiStudioPage() {
  const [prompt, setPrompt] = useState('Create an ad campaign for 22K Gold Plated Choker');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'creative_studio' | 'campaign_review' | 'coworkers' | 'motion_3d'>('creative_studio');
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
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Bot className="w-4 h-4" />
            <span>AI Co-Founder • Marketing Worker Ecosystem</span>
          </div>
          <h1 className="text-3xl font-extrabold text-stone-100 tracking-tight">
            Marketing AI Studio & Co-Workers
          </h1>
          <p className="text-stone-400 text-sm mt-1">
            Orchestrate Strategy, Creative Media (Google Flow 2-Video Prompts), and Approval-Gated Ads Execution.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-stone-900 border border-stone-800 rounded-xl">
          <button
            onClick={() => setActiveTab('creative_studio')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'creative_studio'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Creative Media Studio
          </button>
          <button
            onClick={() => setActiveTab('campaign_review')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'campaign_review'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Campaign Review & Approval
          </button>
          <button
            onClick={() => setActiveTab('coworkers')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'coworkers'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            Co-Workers Registry
          </button>
          <button
            onClick={() => setActiveTab('motion_3d')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg transition ${
              activeTab === 'motion_3d'
                ? 'bg-amber-500 text-stone-950 font-bold shadow'
                : 'text-stone-400 hover:text-stone-200'
            }`}
          >
            <Orbit className="w-3.5 h-3.5" />
            <span>3D Swarm Motion</span>
          </button>
        </div>
      </div>

      {/* Natural Language Prompt Bar */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5 shadow-2xl space-y-3">
        <label className="text-xs font-semibold text-stone-200 uppercase tracking-wider block">
          Ask Marketing Worker / Dispatch Co-Workers
        </label>
        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. Create a Facebook ad campaign for 22K Gold Plated Choker"
            className="flex-1 bg-stone-950 border border-stone-800 rounded-xl px-4 py-3 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !loading) {
                handleRunTask(prompt);
              }
            }}
          />
          <button
            onClick={() => handleRunTask(prompt)}
            disabled={loading || !prompt.trim()}
            className="px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span>{loading ? 'Orchestrating...' : 'Generate Campaign'}</span>
          </button>
        </div>

        {/* Preset quick pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="text-[11px] text-stone-500 self-center">Try:</span>
          {samplePrompts.map((sample, idx) => (
            <button
              key={idx}
              onClick={() => {
                setPrompt(sample);
                handleRunTask(sample);
              }}
              className="text-[11px] px-2.5 py-1 bg-stone-950 hover:bg-stone-800 text-stone-400 hover:text-stone-200 rounded-lg border border-stone-800 transition"
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
          <CreativeMediaStudio creativeData={creativeData} campaignId="cmp_active_flight" />
        </div>
      )}

      {activeTab === 'campaign_review' && (
        <div className="space-y-6">
          <CampaignReviewCard campaignDraft={adsData?.campaignDraft} />
        </div>
      )}

      {/* Strategy Summary & Executive Voice readout if available */}
      {strategyData && (
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-xl space-y-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Active Strategy Summary</span>
          </div>
          <p className="text-sm text-stone-200 leading-relaxed font-sans">
            {executionResult?.executiveVoiceSummary}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {strategyData.angles.map((angle: any, idx: number) => (
              <div key={idx} className="p-3.5 bg-stone-950 rounded-xl border border-stone-800 text-xs">
                <span className="text-amber-400 font-semibold block mb-1">Hook #{idx + 1}</span>
                <p className="text-stone-200 font-medium">{angle.hook}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
