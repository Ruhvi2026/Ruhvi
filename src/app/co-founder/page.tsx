'use client';

import React, { useState, useEffect } from 'react';
import {
  Send,
  Bot,
  User,
  Mic,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Cpu,
  RefreshCw,
  Clock,
  ShieldCheck,
  Globe,
  Search,
  Trash2,
  ExternalLink,
  Plus,
  BarChart3,
  Target,
  Zap,
  Activity,
  Radio,
  Wifi,
  SlidersHorizontal,
  Volume2,
  Play,
  Check,
  X,
  Info,
  Layers,
  Orbit,
} from 'lucide-react';
import { LiveVoiceVisualizer } from '@/components/co-founder/LiveVoiceVisualizer';
import { PlaywrightBrowserWindow } from '@/components/co-founder/PlaywrightBrowserWindow';
import { AiHierarchyVisualizer } from '@/components/ai/motion-engine/AiHierarchyVisualizer';
import { useLiveKitVoice } from '@/hooks/useLiveKitVoice';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  provider?: string;
  model?: string;
  fallbackUsed?: boolean;
  timestamp?: number;
}

export default function CoFounderPortalPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'chat' | 'swarm_3d'>(
    'voice'
  );
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Greetings Founder. I am your Ruhvi AI Co-Founder on co-founder.ruhvi.in. I have direct access to your real-time catalog, sales metrics, support tickets, and system architecture. You can speak with me using live WebRTC audio or type below.',
      timestamp: Date.now(),
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  // Model & Provider Selection State
  const [providers, setProviders] = useState<any[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('auto');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('bn-IN');
  const [fallbackChain, setFallbackChain] = useState<any[]>([]);
  const [loadingModels, setLoadingModels] = useState<boolean>(true);

  // Voice Studio Customization States
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('auto');
  const [speechRate, setSpeechRate] = useState<number>(0.92);
  const [speechPitch, setSpeechPitch] = useState<number>(1.0);
  const [voiceStyle, setVoiceStyle] = useState<
    'spoken_bengali' | 'banglish' | 'standard'
  >('spoken_bengali');
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedVoiceURI = localStorage.getItem('ruhvi_co_founder_voice_uri');
      if (savedVoiceURI) setSelectedVoiceURI(savedVoiceURI);

      const savedRate = localStorage.getItem('ruhvi_co_founder_speech_rate');
      if (savedRate) setSpeechRate(parseFloat(savedRate));

      const savedPitch = localStorage.getItem('ruhvi_co_founder_speech_pitch');
      if (savedPitch) setSpeechPitch(parseFloat(savedPitch));

      const savedStyle = localStorage.getItem('ruhvi_co_founder_voice_style');
      if (savedStyle) setVoiceStyle(savedStyle as any);
    }
  }, []);

  // Quick Widget States
  const [proactiveSignals, setProactiveSignals] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [selectedWidgetTab, setSelectedWidgetTab] = useState<
    | 'alerts'
    | 'approvals'
    | 'competitors'
    | 'seo'
    | 'architecture'
    | 'usage'
    | 'browser'
    | 'plans'
    | 'swarm'
  >('alerts');
  const [architectureInfo, setArchitectureInfo] = useState<any>(null);

  // Strategic Action Plans States
  const [actionPlans, setActionPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(false);

  // Playwright Live Browser Window States
  const [browserData, setBrowserData] = useState<any>(null);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [isBrowserMinimized, setIsBrowserMinimized] = useState(false);
  const [isBrowserLoading, setIsBrowserLoading] = useState(false);

  // LiveKit Usage State
  const [liveKitUsage, setLiveKitUsage] = useState<any>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);

  // Competitor Tracking States
  const [competitors, setCompetitors] = useState<any[]>([]);
  const [newCompName, setNewCompName] = useState('');
  const [newCompUrl, setNewCompUrl] = useState('');
  const [newCompCategory, setNewCompCategory] = useState('Fine Jewellery');
  const [isAddingComp, setIsAddingComp] = useState(false);
  const [analyzingCompId, setAnalyzingCompId] = useState<string | null>(null);

  // SEO Health States
  const [seoReport, setSeoReport] = useState<any>(null);
  const [loadingSeo, setLoadingSeo] = useState(false);

  // Realtime LiveKit Voice Hook
  const voice = useLiveKitVoice({
    provider: selectedProvider,
    model: selectedModel,
    language: selectedLanguage,
    voiceURI: selectedVoiceURI,
    speechRate,
    speechPitch,
    voiceStyle,
    onTranscript: (speaker, text, meta) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: speaker,
          text,
          provider: meta?.provider,
          model: meta?.model,
          fallbackUsed: meta?.fallbackUsed,
          timestamp: Date.now(),
        },
      ]);
    },
  });

  // Fetch Signals & Approvals from Co-Founder Tools
  const refreshStrategicWidgets = async () => {
    try {
      setLoadingWidgets(true);

      // Fetch active proactive signals
      const sigRes = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'get_proactive_signals',
          args: { limit: 5 },
        }),
      });
      if (sigRes.ok) {
        const sigData = await sigRes.json();
        setProactiveSignals(sigData.data || []);
      }

      // Fetch pending approvals
      const appRes = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toolName: 'get_pending_approvals', args: {} }),
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        setPendingApprovals(appData.data || []);
      }

      // Fetch repository architecture
      const archRes = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'get_repository_architecture',
          args: {},
        }),
      });
      if (archRes.ok) {
        const archData = await archRes.json();
        setArchitectureInfo(archData.data || null);
      }
    } catch (err) {
      console.error('[Failed to fetch widgets]', err);
    } finally {
      setLoadingWidgets(false);
    }
  };

  const fetchActionPlans = async () => {
    try {
      setLoadingPlans(true);
      const res = await fetch('/api/admin/co-founder/action-plans');
      if (res.ok) {
        const data = await res.json();
        setActionPlans(data.plans || []);
      }
    } catch {
      // quiet fallback
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleExecuteActionPlan = async (planId: string) => {
    try {
      toast.loading('Creating tasks in Task Manager...', { id: 'exec-plan' });
      const res = await fetch('/api/admin/co-founder/action-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'execute', planId }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(
          `Success! Created ${data.tasksCreatedCount} tasks in Task Manager`,
          { id: 'exec-plan' }
        );
        fetchActionPlans();
      } else {
        toast.error(`Execution failed: ${data.error || 'Unknown error'}`, {
          id: 'exec-plan',
        });
      }
    } catch (err: any) {
      toast.error(`Failed to execute plan: ${err.message}`, {
        id: 'exec-plan',
      });
    }
  };

  const fetchCompetitors = async () => {
    try {
      const res = await fetch('/api/admin/co-founder/competitors');
      if (res.ok) {
        const data = await res.json();
        setCompetitors(data.competitors || []);
      }
    } catch {
      // quiet fallback
    }
  };

  const fetchSeoReport = async () => {
    try {
      setLoadingSeo(true);
      const res = await fetch('/api/admin/co-founder/seo-audit');
      if (res.ok) {
        const data = await res.json();
        setSeoReport(data);
      }
    } catch {
      // quiet fallback
    } finally {
      setLoadingSeo(false);
    }
  };

  const fetchAIModels = async () => {
    try {
      setLoadingModels(true);
      const res = await fetch('/api/admin/co-founder/models');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
        setFallbackChain(data.fallbackChain || []);

        const savedProvider =
          typeof window !== 'undefined'
            ? localStorage.getItem('ruhvi_co_founder_provider')
            : null;
        const savedModel =
          typeof window !== 'undefined'
            ? localStorage.getItem('ruhvi_co_founder_model')
            : null;

        if (savedProvider) {
          setSelectedProvider(savedProvider);
        } else if (data.currentConfig?.provider) {
          setSelectedProvider(data.currentConfig.provider);
        }

        if (savedModel) {
          setSelectedModel(savedModel);
        } else if (data.currentConfig?.model) {
          setSelectedModel(data.currentConfig.model);
        }

        const savedLang =
          typeof window !== 'undefined'
            ? localStorage.getItem('ruhvi_co_founder_lang')
            : null;
        if (savedLang) {
          setSelectedLanguage(savedLang);
        }
      }
    } catch (e) {
      console.error('Failed to load AI models:', e);
    } finally {
      setLoadingModels(false);
    }
  };

  const fetchLiveKitUsage = async () => {
    try {
      setLoadingUsage(true);
      const res = await fetch('/api/admin/co-founder/livekit-usage');
      if (res.ok) {
        const data = await res.json();
        setLiveKitUsage(data);
      }
    } catch (err) {
      console.error('Failed to load LiveKit usage:', err);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    fetchAIModels();
    fetchLiveKitUsage();
    refreshStrategicWidgets();
    fetchCompetitors();
    fetchSeoReport();
    fetchActionPlans();
  }, []);

  // Handle Chat Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/co-founder/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            sender: m.sender,
            text: m.text,
          })),
          channel: 'text',
          provider: selectedProvider,
          model: selectedModel,
        }),
      });

      const data = await res.json();
      if (data.browsingResult) {
        setBrowserData(data.browsingResult);
        setIsBrowserOpen(true);
        setIsBrowserMinimized(false);
        setSelectedWidgetTab('browser');
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.response || 'No response received.',
          provider: data.provider,
          model: data.model,
          fallbackUsed: data.fallbackUsed,
          timestamp: Date.now(),
        },
      ]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: `Error: ${errorText}`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Playwright Live Browsing Action
  const handleBrowseUrl = async (url: string) => {
    try {
      setIsBrowserOpen(true);
      setIsBrowserMinimized(false);
      setIsBrowserLoading(true);
      setSelectedWidgetTab('browser');

      const res = await fetch('/api/admin/co-founder/browse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, captureScreenshot: true }),
      });

      const json = await res.json();
      if (json.ok && json.data) {
        setBrowserData(json.data);
        toast.success(`Browsed: ${json.data.title || url}`, { icon: '🌐' });
      } else {
        toast.error(json.error || 'Failed to browse website');
        if (json.data) setBrowserData(json.data);
      }
    } catch (err: any) {
      toast.error(`Browsing failed: ${err.message}`);
    } finally {
      setIsBrowserLoading(false);
    }
  };

  // Acknowledge Signal Action
  const handleAcknowledgeSignal = async (signalId: string) => {
    try {
      const res = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'acknowledge_proactive_signal',
          args: { signal_id: signalId },
        }),
      });
      if (res.ok) {
        toast.success('Signal acknowledged');
        setProactiveSignals((prev) => prev.filter((s) => s.id !== signalId));
      }
    } catch {
      toast.error('Failed to acknowledge signal');
    }
  };

  // Submit Approval Decision
  const handleApprovalDecision = async (
    approvalId: string,
    decision: 'approved' | 'rejected'
  ) => {
    try {
      const res = await fetch('/api/admin/co-founder/tools/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toolName: 'submit_approval_decision',
          args: { approval_id: approvalId, decision },
        }),
      });
      if (res.ok) {
        toast.success(`Action successfully ${decision}`);
        setPendingApprovals((prev) => prev.filter((a) => a.id !== approvalId));
      }
    } catch {
      toast.error('Failed to submit approval');
    }
  };

  // Add Competitor
  const handleAddCompetitor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim() || !newCompUrl.trim()) {
      toast.error('Please enter both competitor name and website URL');
      return;
    }

    try {
      setIsAddingComp(true);
      const res = await fetch('/api/admin/co-founder/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCompName.trim(),
          website_url: newCompUrl.trim(),
          category: newCompCategory.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Added ${newCompName} to tracking!`);
        setCompetitors((prev) => [data.competitor, ...prev]);
        setNewCompName('');
        setNewCompUrl('');
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to add competitor');
      }
    } catch {
      toast.error('Error adding competitor');
    } finally {
      setIsAddingComp(false);
    }
  };

  // Delete Competitor
  const handleDeleteCompetitor = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/admin/co-founder/competitors?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toast.success(`Removed ${name}`);
        setCompetitors((prev) => prev.filter((c) => c.id !== id));
      } else {
        toast.error('Failed to delete competitor');
      }
    } catch {
      toast.error('Error deleting competitor');
    }
  };

  // Analyze Competitor Live
  const handleAnalyzeCompetitor = async (id: string, name: string) => {
    try {
      setAnalyzingCompId(id);
      toast.loading(`Analyzing ${name}'s website live...`, {
        id: `analyze-${id}`,
      });

      const comp = competitors.find((c) => c.id === id);
      if (comp?.website_url) {
        handleBrowseUrl(comp.website_url);
      }

      const res = await fetch('/api/admin/co-founder/competitors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'analyze', id }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Analysis complete for ${name}!`, {
          id: `analyze-${id}`,
        });
        setCompetitors((prev) =>
          prev.map((c) =>
            c.id === id
              ? {
                  ...c,
                  latest_insights: data.insights,
                  last_analyzed_at: new Date().toISOString(),
                }
              : c
          )
        );
      } else {
        const err = await res.json();
        toast.error(err.error || 'Analysis failed', { id: `analyze-${id}` });
      }
    } catch {
      toast.error('Failed to run live analysis', { id: `analyze-${id}` });
    } finally {
      setAnalyzingCompId(null);
    }
  };

  const activeProviderObj = providers.find(
    (p) => p.id === selectedProvider || p.type === selectedProvider
  );
  const currentAvailableModels = activeProviderObj?.models || [];

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col space-y-4 p-4 text-neutral-100 md:p-6">
      {/* Top Header & Dark Neumorphic Controls */}
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-neutral-800/90 bg-[#14151a]/95 p-4 shadow-2xl backdrop-blur-2xl lg:flex-row lg:items-center">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-violet-600 to-amber-500 shadow-lg shadow-violet-500/25">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              AI Co-Founder
              <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-300">
                Executive Command Center
              </span>
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
              <span>LiveKit Multimodal Voice & 3D Workforce</span>
              {liveKitUsage && (
                <button
                  onClick={() => {
                    setSelectedWidgetTab('usage');
                    fetchLiveKitUsage();
                  }}
                  title="Click to view LiveKit Cloud Free Tier analytics"
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-900 px-2 py-0.5 font-mono text-[10px] text-emerald-400 transition-colors hover:border-violet-500/40"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                  <span>
                    Free:{' '}
                    {(
                      10000 -
                      (liveKitUsage.quotas?.participantMinutes?.used ?? 0)
                    ).toLocaleString()}{' '}
                    mins left
                  </span>
                </button>
              )}
            </p>
          </div>
        </div>

        {/* Engine Controls & Mode Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          {/* AI Provider & Model Picker */}
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-950/80 p-1.5 shadow-inner">
            {/* Provider Selector */}
            <div className="flex items-center gap-1.5 px-2 py-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400 ring-2 ring-emerald-400/20" />
              <label
                htmlFor="co-founder-provider-select"
                className="text-[11px] font-semibold text-neutral-400"
              >
                Provider:
              </label>
              <select
                id="co-founder-provider-select"
                value={selectedProvider}
                onChange={(e) => {
                  const newProv = e.target.value;
                  setSelectedProvider(newProv);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('ruhvi_co_founder_provider', newProv);
                  }
                  if (newProv === 'auto') {
                    setSelectedModel('auto');
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('ruhvi_co_founder_model', 'auto');
                    }
                  } else {
                    const prov = providers.find(
                      (p) => p.id === newProv || p.type === newProv
                    );
                    const firstM = prov?.models?.[0] || 'auto';
                    setSelectedModel(firstM);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('ruhvi_co_founder_model', firstM);
                    }
                  }
                }}
                className="cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-neutral-200 outline-none transition-colors hover:border-violet-500/40 focus:border-violet-500 focus:text-violet-300"
              >
                <option value="auto">⚡ Auto (Admin Fallback)</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.isOnline ? '●' : '○'}
                  </option>
                ))}
              </select>
            </div>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5 border-l border-neutral-800 px-2 py-0.5">
              <Cpu className="h-3.5 w-3.5 text-violet-400" />
              <label
                htmlFor="co-founder-model-select"
                className="text-[11px] font-semibold text-neutral-400"
              >
                Model:
              </label>
              <select
                id="co-founder-model-select"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem(
                      'ruhvi_co_founder_model',
                      e.target.value
                    );
                  }
                }}
                className="cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-violet-300 outline-none transition-colors hover:border-violet-500/40 focus:border-violet-500 focus:text-violet-200"
              >
                {selectedProvider === 'auto' ? (
                  <>
                    <option value="auto">
                      Default (Gemini 3.5 Flash Lite)
                    </option>
                    <option value="gemini-3.5-flash-lite">
                      gemini-3.5-flash-lite (Ultra Fast)
                    </option>
                    <option value="gemini-3.6-flash">gemini-3.6-flash</option>
                    <option value="gemini-1.5-pro">
                      gemini-1.5-pro (Deep Reasoning)
                    </option>
                    <option value="deepseek-chat">
                      deepseek-chat (DeepSeek V3)
                    </option>
                    <option value="deepseek-reasoner">
                      deepseek-reasoner (DeepSeek R1)
                    </option>
                  </>
                ) : (
                  currentAvailableModels.map((m: string) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))
                )}
              </select>
            </div>

            {/* Voice Input Language Selector */}
            <div className="flex items-center gap-1.5 border-l border-neutral-800 px-2 py-0.5">
              <Globe className="h-3.5 w-3.5 text-cyan-400" />
              <label
                htmlFor="co-founder-lang-select"
                className="text-[11px] font-semibold text-neutral-400"
              >
                Lang:
              </label>
              <select
                id="co-founder-lang-select"
                value={selectedLanguage}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setSelectedLanguage(newLang);
                  if (typeof window !== 'undefined') {
                    localStorage.setItem('ruhvi_co_founder_lang', newLang);
                  }
                }}
                className="cursor-pointer rounded-xl border border-neutral-800 bg-neutral-900 px-2 py-1 text-xs font-semibold text-cyan-300 outline-none transition-colors hover:border-cyan-500/40 focus:border-cyan-500 focus:text-cyan-200"
              >
                <option value="bn-IN">বাংলা (Bengali)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
              </select>
            </div>

            {/* Voice Studio Settings Modal Trigger */}
            <div className="flex items-center border-l border-neutral-800 px-2 py-0.5">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-violet-500/10 px-2.5 py-1 text-xs font-semibold text-violet-300 transition-all hover:border-violet-500/60 hover:bg-violet-500/20"
                title="Voice Studio Settings"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-violet-400" />
                <span>Voice Studio</span>
                {voice.hasBengaliVoice ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                    title="Native Bengali Voice Active"
                  />
                ) : (
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400"
                    title="Audio Tuning Recommended"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex items-center rounded-2xl border border-neutral-800 bg-neutral-950 p-1 shadow-inner">
            <button
              onClick={() => setActiveTab('voice')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'voice'
                  ? 'bg-gradient-to-r from-violet-600 to-amber-500 font-bold text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Realtime Voice</span>
            </button>
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-gradient-to-r from-violet-600 to-amber-500 font-bold text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Interactive Chat</span>
            </button>
            <button
              onClick={() => setActiveTab('swarm_3d')}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'swarm_3d'
                  ? 'bg-gradient-to-r from-violet-600 to-amber-500 font-bold text-white shadow-md'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" />
              <span>3D Workforce</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Chain Badge Banner */}
      {fallbackChain.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-800/80 bg-[#121318]/90 px-4 py-2 text-[11px] text-neutral-400 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-violet-300">
              Active Fallback Chain:
            </span>
            {fallbackChain.map((item, idx) => (
              <React.Fragment key={item.id}>
                <span
                  className={`inline-flex items-center gap-1 font-mono ${
                    item.id === selectedProvider
                      ? 'rounded-md border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 font-bold text-violet-300'
                      : 'text-neutral-300'
                  }`}
                >
                  {item.name}
                </span>
                {idx < fallbackChain.length - 1 && (
                  <span className="text-neutral-600">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
          <a
            href="https://admin.ruhvi.in/tech/ai-settings"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-violet-400 transition-colors hover:text-violet-300"
          >
            <span>Configure Fallback in Admin AI</span>
            <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Main View Area */}
      {activeTab === 'swarm_3d' ? (
        <div className="flex-1 overflow-y-auto">
          <AiHierarchyVisualizer
            audioLevel={voice.audioLevel}
            isThinking={
              voice.state === 'listening' || voice.state === 'speaking'
            }
          />
        </div>
      ) : (
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden lg:grid-cols-12">
          {/* Left Column (7 cols on voice, 5 on chat): 3D Voice Visualizer */}
          <div
            className={`flex flex-col justify-center ${
              activeTab === 'voice'
                ? 'lg:col-span-7'
                : 'hidden opacity-80 lg:col-span-5 lg:flex'
            }`}
          >
            <LiveVoiceVisualizer
              state={voice.state}
              isMuted={voice.isMuted}
              onToggleMute={voice.toggleMute}
              onDisconnect={voice.disconnect}
              onStart={voice.startSession}
              errorMessage={voice.errorMessage}
              roomName={voice.roomName}
              audioLevel={voice.audioLevel}
              interimTranscript={voice.interimTranscript}
            />
          </div>

          {/* Right Column (5 or 7 cols): Intelligence Drawer & Chat Stream */}
          <div
            className={`flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-800/90 bg-[#13141a]/95 shadow-2xl backdrop-blur-2xl ${
              activeTab === 'voice' ? 'lg:col-span-5' : 'lg:col-span-7'
            }`}
          >
            {/* Header Controls for Right Column */}
            <div className="flex items-center justify-between border-b border-neutral-800 bg-[#16171e]/80 px-4 py-3 text-xs font-medium text-neutral-400">
              <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto py-0.5">
                <button
                  onClick={() => setSelectedWidgetTab('alerts')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'alerts'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Alerts ({proactiveSignals.length})
                </button>
                <button
                  onClick={() => setSelectedWidgetTab('approvals')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'approvals'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Approvals ({pendingApprovals.length})
                </button>
                <button
                  onClick={() => setSelectedWidgetTab('competitors')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'competitors'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Competitors ({competitors.length})
                </button>
                <button
                  onClick={() => setSelectedWidgetTab('seo')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'seo'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  SEO Health
                </button>
                <button
                  onClick={() => setSelectedWidgetTab('architecture')}
                  className={`rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'architecture'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  Architecture
                </button>
                <button
                  onClick={() => {
                    setSelectedWidgetTab('usage');
                    fetchLiveKitUsage();
                  }}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'usage'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Activity
                    size={11}
                    className={
                      selectedWidgetTab === 'usage'
                        ? 'text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>LiveKit</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedWidgetTab('browser');
                    setIsBrowserOpen(true);
                    setIsBrowserMinimized(false);
                  }}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'browser'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Globe
                    size={11}
                    className={
                      selectedWidgetTab === 'browser'
                        ? 'text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Browser</span>
                  {isBrowserLoading ? (
                    <RefreshCw
                      size={9}
                      className="animate-spin text-amber-400"
                    />
                  ) : browserData ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  ) : null}
                </button>
                <button
                  onClick={() => {
                    setSelectedWidgetTab('plans');
                    fetchActionPlans();
                  }}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'plans'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Layers
                    size={11}
                    className={
                      selectedWidgetTab === 'plans'
                        ? 'text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Plans ({actionPlans.length})</span>
                </button>
                <button
                  onClick={() => setSelectedWidgetTab('swarm')}
                  className={`flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'swarm'
                      ? 'border border-violet-500/40 bg-violet-500/20 font-bold text-violet-300'
                      : 'text-neutral-400 hover:text-neutral-200'
                  }`}
                >
                  <Orbit
                    size={11}
                    className={
                      selectedWidgetTab === 'swarm'
                        ? 'text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Swarm</span>
                </button>
              </div>
              <button
                onClick={() => {
                  refreshStrategicWidgets();
                  if (selectedWidgetTab === 'usage') fetchLiveKitUsage();
                  if (selectedWidgetTab === 'plans') fetchActionPlans();
                }}
                disabled={loadingWidgets || loadingUsage || loadingPlans}
                title="Refresh Intelligence"
                className="p-1 text-neutral-400 transition-colors hover:text-white"
              >
                <RefreshCw
                  size={12}
                  className={
                    loadingWidgets || loadingUsage || loadingPlans
                      ? 'animate-spin'
                      : ''
                  }
                />
              </button>
            </div>

            {/* Quick Intelligence Drawer */}
            <div
              className={`overflow-y-auto border-b border-neutral-800/60 bg-neutral-950/40 p-4 transition-all duration-200 ${
                selectedWidgetTab === 'competitors' ||
                selectedWidgetTab === 'seo' ||
                selectedWidgetTab === 'usage' ||
                selectedWidgetTab === 'browser' ||
                selectedWidgetTab === 'plans'
                  ? 'max-h-[560px]'
                  : 'max-h-48'
              }`}
            >
              {selectedWidgetTab === 'alerts' && (
                <div className="space-y-2">
                  {proactiveSignals.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-1 text-[11px] text-neutral-400">
                      <ShieldCheck size={13} className="text-emerald-400" />
                      All inventory, support, and sales signals are normal.
                    </p>
                  ) : (
                    proactiveSignals.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-neutral-800 bg-[#16171d]/90 p-2.5 shadow-sm"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            size={14}
                            className="mt-0.5 shrink-0 text-amber-400"
                          />
                          <div>
                            <p className="text-xs font-bold text-white">
                              {sig.title}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-neutral-400">
                              {sig.summary}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcknowledgeSignal(sig.id)}
                          className="rounded-lg bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-700"
                        >
                          Dismiss
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedWidgetTab === 'approvals' && (
                <div className="space-y-2">
                  {pendingApprovals.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-1 text-[11px] text-neutral-400">
                      <CheckCircle size={13} className="text-emerald-400" />
                      No high-impact actions awaiting founder authorization.
                    </p>
                  ) : (
                    pendingApprovals.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-800 bg-[#16171d]/90 p-2.5 shadow-sm"
                      >
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-white">
                            {app.action_type?.replace(/_/g, ' ')}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-neutral-400">
                            {app.recommendation_summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleApprovalDecision(app.id, 'approved')
                            }
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-400 transition-colors hover:bg-emerald-500/30"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApprovalDecision(app.id, 'rejected')
                            }
                            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-400 transition-colors hover:bg-rose-500/30"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedWidgetTab === 'competitors' && (
                <div className="space-y-3">
                  <form
                    onSubmit={handleAddCompetitor}
                    className="space-y-2 rounded-2xl border border-neutral-800 bg-[#16171d]/90 p-3"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-400">
                      <Target size={13} />
                      <span>Track New Competitor Website</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="Brand Name (e.g. GIVA, CaratLane)"
                        className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
                      />
                      <input
                        type="text"
                        value={newCompUrl}
                        onChange={(e) => setNewCompUrl(e.target.value)}
                        placeholder="Website URL (e.g. giva.co)"
                        className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-xs text-white placeholder-neutral-500 focus:border-violet-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={newCompCategory}
                        onChange={(e) => setNewCompCategory(e.target.value)}
                        className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1.5 text-[11px] text-neutral-300 focus:outline-none"
                      >
                        <option value="Fine Jewellery">Fine Jewellery</option>
                        <option value="Silver Jewellery">
                          Silver Jewellery
                        </option>
                        <option value="Gold Plated">Gold Plated</option>
                        <option value="Fashion Jewellery">
                          Fashion Jewellery
                        </option>
                      </select>
                      <button
                        type="submit"
                        disabled={
                          isAddingComp ||
                          !newCompName.trim() ||
                          !newCompUrl.trim()
                        }
                        className="flex items-center gap-1 rounded-xl bg-violet-600 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                      >
                        <Plus size={13} />
                        <span>
                          {isAddingComp ? 'Adding...' : 'Add to Tracking'}
                        </span>
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    {competitors.length === 0 ? (
                      <p className="py-1 text-center text-[11px] text-neutral-400">
                        No competitors saved yet. Enter a brand name & website
                        above.
                      </p>
                    ) : (
                      competitors.map((comp) => (
                        <div
                          key={comp.id}
                          className="space-y-1.5 rounded-2xl border border-neutral-800 bg-[#16171d]/80 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">
                                {comp.name}
                              </span>
                              <span className="rounded-md border border-neutral-700 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
                                {comp.category}
                              </span>
                              <a
                                href={
                                  comp.website_url.startsWith('http')
                                    ? comp.website_url
                                    : `https://${comp.website_url}`
                                }
                                target="_blank"
                                rel="noreferrer"
                                className="text-neutral-500 transition-colors hover:text-violet-400"
                                title="Visit website"
                              >
                                <ExternalLink size={11} />
                              </a>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleAnalyzeCompetitor(comp.id, comp.name)
                                }
                                disabled={analyzingCompId === comp.id}
                                className="flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/20 px-2 py-1 text-[10px] font-bold text-violet-300 transition-colors hover:bg-violet-500/30 disabled:opacity-50"
                              >
                                <Search
                                  size={10}
                                  className={
                                    analyzingCompId === comp.id
                                      ? 'animate-spin'
                                      : ''
                                  }
                                />
                                <span>
                                  {analyzingCompId === comp.id
                                    ? 'Analyzing...'
                                    : 'Analyze Live'}
                                </span>
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteCompetitor(comp.id, comp.name)
                                }
                                className="p-1 text-neutral-500 transition-colors hover:text-rose-400"
                                title="Delete competitor"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {comp.latest_insights ? (
                            <div className="space-y-1 rounded-xl border border-neutral-800 bg-neutral-950/70 p-2.5 text-[11px] text-neutral-300">
                              {comp.latest_insights.positioning && (
                                <p>
                                  <strong className="text-neutral-400">
                                    Positioning:
                                  </strong>{' '}
                                  {comp.latest_insights.positioning}
                                </p>
                              )}
                              {comp.latest_insights.promotions && (
                                <p>
                                  <strong className="text-amber-400">
                                    Promotions:
                                  </strong>{' '}
                                  {comp.latest_insights.promotions}
                                </p>
                              )}
                              {comp.latest_insights.strategicCounterMove && (
                                <p className="text-emerald-400">
                                  <strong>🚀 Ruhvi Counter-Move:</strong>{' '}
                                  {comp.latest_insights.strategicCounterMove}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] italic text-neutral-500">
                              Not analyzed yet. Click &apos;Analyze Live&apos;
                              to extract live offers & positioning.
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {selectedWidgetTab === 'seo' && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between rounded-2xl border border-neutral-800 bg-[#16171d]/90 p-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-xs font-bold text-emerald-400">
                        {seoReport?.healthScore || 85}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">
                          Catalog SEO Health Score
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {seoReport?.totalProductsScanned || 0} Products
                          Scanned
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={fetchSeoReport}
                      disabled={loadingSeo}
                      className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-[10px] font-bold text-white transition-colors hover:bg-violet-500 disabled:opacity-50"
                    >
                      <RefreshCw
                        size={10}
                        className={loadingSeo ? 'animate-spin' : ''}
                      />
                      <span>{loadingSeo ? 'Scanning...' : 'Rescan SEO'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-2">
                      <p className="text-xs font-bold text-rose-400">
                        {seoReport?.missingMetaDescriptions || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                        Missing Meta
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-2">
                      <p className="text-xs font-bold text-amber-400">
                        {seoReport?.weakKeywordCount || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                        Weak Keywords
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 p-2">
                      <p className="text-xs font-bold text-neutral-300">
                        {seoReport?.missingAltText || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                        Missing Alt
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedWidgetTab === 'architecture' && (
                <div className="space-y-1.5 rounded-2xl border border-neutral-800 bg-[#16171d]/80 p-2 text-[11px] text-neutral-300">
                  <p className="flex items-center gap-1.5">
                    <Cpu size={12} className="text-cyan-400" />
                    <strong>Framework:</strong>{' '}
                    {architectureInfo?.framework ||
                      'Next.js 15 (App Router) + React 19 + Three.js 3D Engine'}
                  </p>
                  <p>
                    <strong>Total Database Migrations:</strong>{' '}
                    {architectureInfo?.totalMigrations || 28}
                  </p>
                  <p className="line-clamp-1">
                    <strong>Active Integrations:</strong>{' '}
                    {architectureInfo?.activeIntegrations?.join(', ') ||
                      'LiveKit, Gemini, Supabase, Firebase, Sentry, Three.js'}
                  </p>
                </div>
              )}

              {selectedWidgetTab === 'usage' && (
                <div className="space-y-3">
                  <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-neutral-800 bg-[#16171d]/90 p-3 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/20 text-xs font-bold text-violet-300">
                        <Radio className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">
                            LiveKit Cloud Developer Tier
                          </p>
                          <span className="py-0.2 flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 text-[9px] font-bold uppercase tracking-wider text-emerald-400">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Free Tier
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-400">
                          Host: ruhvi-rkkfx6qd.livekit.cloud • Cycle resets in{' '}
                          {liveKitUsage?.billingPeriod?.daysRemaining ?? 29}{' '}
                          days
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedWidgetTab === 'browser' && (
                <div className="p-1">
                  <PlaywrightBrowserWindow
                    data={browserData}
                    isLoading={isBrowserLoading}
                    isOpen={isBrowserOpen}
                    isMinimized={isBrowserMinimized}
                    onClose={() => {
                      setIsBrowserOpen(false);
                      setSelectedWidgetTab('alerts');
                    }}
                    onMinimize={() => setIsBrowserMinimized(true)}
                    onRestore={() => {
                      setIsBrowserMinimized(false);
                      setSelectedWidgetTab('browser');
                    }}
                    onBrowseUrl={(url) => handleBrowseUrl(url)}
                  />
                </div>
              )}

              {selectedWidgetTab === 'plans' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-white">
                      <Layers size={13} className="text-violet-400" />
                      Strategic Action Plans ({actionPlans.length})
                    </h3>
                  </div>

                  {actionPlans.length === 0 ? (
                    <p className="py-3 text-center text-xs text-neutral-400">
                      No Action Plans Active right now.
                    </p>
                  ) : (
                    actionPlans.map((plan: any) => (
                      <div
                        key={plan.id}
                        className="space-y-1.5 rounded-2xl border border-neutral-800 bg-[#16171d]/80 p-3"
                      >
                        <h4 className="text-xs font-bold text-white">
                          {plan.title}
                        </h4>
                        <p className="text-[11px] text-neutral-400">
                          {plan.goal}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedWidgetTab === 'swarm' && (
                <div className="space-y-4">
                  <AiHierarchyVisualizer
                    audioLevel={voice.audioLevel}
                    isThinking={
                      voice.state === 'listening' || voice.state === 'speaking'
                    }
                  />
                </div>
              )}
            </div>

            {/* Conversation Messages Container */}
            <div className="flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-3xl p-3.5 text-sm ${
                      m.sender === 'user'
                        ? 'rounded-tr-none bg-gradient-to-r from-violet-600 to-amber-500 font-medium text-white shadow-md'
                        : 'rounded-tl-none border border-neutral-800 bg-[#16171d] text-neutral-200 shadow-sm'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2 text-[11px] font-semibold opacity-90">
                      <div className="flex items-center gap-1.5">
                        {m.sender === 'user' ? (
                          <User size={13} />
                        ) : (
                          <Bot size={13} className="text-violet-400" />
                        )}
                        <span>
                          {m.sender === 'user' ? 'You' : 'AI Co-Founder'}
                        </span>
                      </div>
                      {m.sender === 'assistant' && (m.model || m.provider) && (
                        <span className="flex items-center gap-1 rounded-md border border-neutral-800 bg-neutral-950/80 px-2 py-0.5 font-mono text-[9px] text-violet-300">
                          <Zap size={9} className="text-violet-400" />
                          <span>{m.model || m.provider}</span>
                          {m.fallbackUsed && (
                            <span className="font-bold text-rose-400">
                              (fallback)
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                    <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                      {m.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input Box */}
            <div className="border-t border-neutral-800 bg-[#16171e]/70 p-3">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI Co-Founder about sales, stock, tickets, or strategy..."
                  className="flex-1 rounded-2xl border border-neutral-800 bg-neutral-950 px-4 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-violet-500/50 focus:outline-none"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-r from-violet-600 to-amber-500 px-5 py-2.5 text-xs font-bold text-white transition-all hover:from-violet-500 hover:to-amber-400 active:scale-95 disabled:opacity-50"
                >
                  <Send size={14} />
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Voice Customization Studio Modal */}
      {isVoiceModalOpen && (
        <div
          id="co-founder-voice-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          onClick={() => setIsVoiceModalOpen(false)}
        >
          <div
            id="co-founder-voice-modal"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl border border-neutral-800 bg-[#15161c] p-6 shadow-2xl backdrop-blur-2xl"
          >
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/15 text-violet-300">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-white">
                    Executive Voice Studio
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-300">
                      ভয়েস ও উচ্চারণ
                    </span>
                  </h3>
                  <p className="text-xs text-neutral-400">
                    বাংলা ও ভারতীয় ভাষার স্পষ্ট উচ্চারণ, ব্রাউজার ভয়েস এবং গতি
                    নিয়ন্ত্রণ করুন
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(false)}
                className="rounded-xl p-1.5 text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 max-h-[72vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  ১. বাংলা বলার ধরন (Spoken Bengali Style)
                </label>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setVoiceStyle('spoken_bengali');
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(
                          'ruhvi_co_founder_voice_style',
                          'spoken_bengali'
                        );
                      }
                    }}
                    className={`flex flex-col rounded-2xl border p-3.5 text-left transition-all ${
                      voiceStyle === 'spoken_bengali'
                        ? 'border-violet-500 bg-violet-500/15 text-white shadow-md'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <div className="mb-1 flex w-full items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-violet-300">
                        {voiceStyle === 'spoken_bengali' && (
                          <Check className="h-3.5 w-3.5 text-violet-400" />
                        )}
                        সহজ চলিত মুখের বাংলা
                      </span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        Recommended
                      </span>
                    </div>
                    <p className="text-[11px] leading-normal text-neutral-400">
                      মুখে কথা বলার মতো স্বাভাবিক মিষ্টি বাংলা। “এবং”, “বলিবেন”
                      বারণ।
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setVoiceStyle('banglish');
                      if (typeof window !== 'undefined') {
                        localStorage.setItem(
                          'ruhvi_co_founder_voice_style',
                          'banglish'
                        );
                      }
                    }}
                    className={`flex flex-col rounded-2xl border p-3.5 text-left transition-all ${
                      voiceStyle === 'banglish'
                        ? 'border-cyan-500 bg-cyan-500/15 text-white shadow-md'
                        : 'border-neutral-800 bg-neutral-950/60 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                    }`}
                  >
                    <div className="mb-1 flex w-full items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                        {voiceStyle === 'banglish' && (
                          <Check className="h-3.5 w-3.5 text-cyan-400" />
                        )}
                        বাংলিশ মোড (Banglish)
                      </span>
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-300">
                        100% Clear
                      </span>
                    </div>
                    <p className="text-[11px] leading-normal text-neutral-400">
                      ইংরেজি হরফে বাংলা। যেকোনো উইন্ডোজ বা ব্রাউজারে স্পষ্ট
                      উচ্চারণ।
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="co-founder-tts-voice-select"
                    className="text-xs font-semibold uppercase tracking-wider text-neutral-400"
                  >
                    ২. স্পিচ ভয়েস নির্বাচন (Browser Speech Engine)
                  </label>
                  <span className="font-mono text-[11px] text-neutral-500">
                    {voice.availableVoices.length} voices detected
                  </span>
                </div>
                <select
                  id="co-founder-tts-voice-select"
                  value={selectedVoiceURI}
                  onChange={(e) => {
                    const uri = e.target.value;
                    setSelectedVoiceURI(uri);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem('ruhvi_co_founder_voice_uri', uri);
                    }
                  }}
                  className="w-full rounded-2xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                >
                  <option value="auto">
                    ✨ Auto-Detect (স্বয়ংক্রিয় সেরা কণ্ঠস্বর)
                  </option>
                  {voice.availableVoices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    ৩. কথার গতি (Speech Speed)
                  </label>
                  <span className="font-mono text-xs font-bold text-violet-300">
                    {speechRate.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min="0.75"
                  max="1.25"
                  step="0.02"
                  value={speechRate}
                  onChange={(e) => {
                    const rate = parseFloat(e.target.value);
                    setSpeechRate(rate);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(
                        'ruhvi_co_founder_speech_rate',
                        rate.toString()
                      );
                    }
                  }}
                  className="w-full cursor-pointer accent-violet-500"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                    ৪. ভয়েসের সুর (Voice Pitch)
                  </label>
                  <span className="font-mono text-xs font-bold text-violet-300">
                    {speechPitch.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.80"
                  max="1.20"
                  step="0.05"
                  value={speechPitch}
                  onChange={(e) => {
                    const pitch = parseFloat(e.target.value);
                    setSpeechPitch(pitch);
                    if (typeof window !== 'undefined') {
                      localStorage.setItem(
                        'ruhvi_co_founder_speech_pitch',
                        pitch.toString()
                      );
                    }
                  }}
                  className="w-full cursor-pointer accent-violet-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    voice.testVoice();
                    toast.success('ভয়েস টেস্ট চালু করা হয়েছে...', {
                      id: 'voice-test',
                    });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/40 bg-violet-500/10 py-2.5 text-xs font-bold text-violet-300 transition-all hover:bg-violet-500/20 active:scale-[0.99]"
                >
                  <Play className="h-4 w-4 fill-violet-400 text-violet-400" />
                  <span>ভয়েস পরীক্ষা করুন (Play Live Sample)</span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-neutral-800 pt-4">
              <button
                type="button"
                onClick={() => {
                  setIsVoiceModalOpen(false);
                  toast.success('ভয়েস সেটিংস সংরক্ষিত হয়েছে');
                }}
                className="rounded-2xl bg-gradient-to-r from-violet-600 to-amber-500 px-5 py-2 text-xs font-bold text-white shadow-md hover:from-violet-500 hover:to-amber-400"
              >
                সংরক্ষণ করুন (Done)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Browser Minimized Pill */}
      {isBrowserOpen &&
        (isBrowserMinimized || selectedWidgetTab !== 'browser') && (
          <PlaywrightBrowserWindow
            data={browserData}
            isLoading={isBrowserLoading}
            isOpen={isBrowserOpen}
            isMinimized={isBrowserMinimized}
            onClose={() => setIsBrowserOpen(false)}
            onMinimize={() => setIsBrowserMinimized(true)}
            onRestore={() => {
              setIsBrowserMinimized(false);
              setSelectedWidgetTab('browser');
            }}
            onBrowseUrl={(url) => handleBrowseUrl(url)}
          />
        )}
    </div>
  );
}
