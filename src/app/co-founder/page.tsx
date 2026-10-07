'use client';

import React, { useState, useEffect, useRef } from 'react';
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
import { CoFounderCharacter } from '@/components/co-founder/CoFounderCharacter';
import { CoWorkerAvatar } from '@/components/co-founder/CoWorkerAvatar';
import { CoWorkerShowcase } from '@/components/co-founder/CoWorkerShowcase';
import {
  WorkerGrid,
  WorkerNodeData,
} from '@/components/co-founder/workforce/WorkerGrid';
import { AiHierarchyVisualizer } from '@/components/ai/motion-engine/AiHierarchyVisualizer';
import { LiveWorkspace } from '@/components/co-founder/workspace/LiveWorkspace';
import {
  SwarmWorkerNode,
  SWARM_NODES,
  getRoleTheme,
  getWorkerIcon,
} from '@/components/co-founder/swarm/swarmTypes';
import { useCoFounderWorkforce } from '@/hooks/useCoFounderWorkforce';
import {
  agentNodesToSwarmNodes,
  agentNodesToWorkerGrid,
} from '@/lib/ai/co-founder/workers/client-status';
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
  role?:
    | 'cofounder'
    | 'researcher'
    | 'coder'
    | 'writer'
    | 'designer'
    | 'analyst'
    | 'marketer';
  workerName?: string;
}

export default function CoFounderPortalPage() {
  const [activeTab, setActiveTab] = useState<
    'voice' | 'chat' | 'swarm_3d' | 'workspace'
  >('voice');
  const [selectedWorkerId, setSelectedWorkerId] =
    useState<string>('co_founder');
  const [input, setInput] = useState('');
  const genId = () => crypto.randomUUID();

  // Responsive character sizes for the 3D swarm view
  const [swarmCharSize, setSwarmCharSize] = useState(260);
  const [compactSwarmCharSize, setCompactSwarmCharSize] = useState(220);
  useEffect(() => {
    const updateSizes = () => {
      const vw = window.innerWidth;
      if (vw < 640) {
        setSwarmCharSize(180);
        setCompactSwarmCharSize(150);
      } else if (vw < 1024) {
        setSwarmCharSize(220);
        setCompactSwarmCharSize(180);
      } else {
        setSwarmCharSize(260);
        setCompactSwarmCharSize(220);
      }
    };
    updateSizes();
    window.addEventListener('resize', updateSizes);
    return () => window.removeEventListener('resize', updateSizes);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Greetings Founder. I am your Ruhvi AI Co-Founder on co-founder.ruhvi.in. I have direct access to your real-time catalog, sales metrics, support tickets, and system architecture. You can speak with me using live WebRTC audio or type below.',
      timestamp: Date.now(),
      role: 'cofounder',
      workerName: 'AI Co-Founder',
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
  const voiceModalRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isVoiceModalOpen) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement;
      const timer = setTimeout(() => {
        const firstFocusable =
          voiceModalRef.current?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
        firstFocusable?.focus();
      }, 0);
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setIsVoiceModalOpen(false);
      };
      document.addEventListener('keydown', handleEscape);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
      };
    } else {
      previouslyFocusedRef.current?.focus();
    }
  }, [isVoiceModalOpen]);

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
    | 'workspace'
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

  // Live Workforce Data Hook
  const { data: workforceData } = useCoFounderWorkforce();
  const liveSwarmNodes: SwarmWorkerNode[] = workforceData
    ? agentNodesToSwarmNodes(workforceData.nodes)
    : SWARM_NODES;
  const liveWorkerGrid: WorkerNodeData[] = workforceData
    ? agentNodesToWorkerGrid(workforceData.nodes)
    : [];

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
      const activeNode = SWARM_NODES.find((n) => n.id === selectedWorkerId);
      const role =
        speaker === 'user' ? undefined : activeNode?.role || 'cofounder';
      const workerName =
        speaker === 'user' ? 'You' : activeNode?.name || 'AI Co-Founder';

      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          sender: speaker,
          text,
          provider: meta?.provider,
          model: meta?.model,
          fallbackUsed: meta?.fallbackUsed,
          timestamp: Date.now(),
          role,
          workerName,
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
      } else {
        toast.error('Failed to load proactive signals');
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
      } else {
        toast.error('Failed to load pending approvals');
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
      } else {
        toast.error('Failed to load repository architecture');
      }
    } catch (err) {
      console.error('[Failed to fetch widgets]', err);
      toast.error('Failed to load intelligence widgets');
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
      } else {
        toast.error('Failed to load action plans');
      }
    } catch {
      toast.error('Failed to load action plans');
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
      } else {
        toast.error('Failed to load competitors');
      }
    } catch {
      toast.error('Failed to load competitors');
    }
  };

  const fetchSeoReport = async () => {
    try {
      setLoadingSeo(true);
      const res = await fetch('/api/admin/co-founder/seo-audit');
      if (res.ok) {
        const data = await res.json();
        setSeoReport(data);
      } else {
        toast.error('Failed to load SEO report');
      }
    } catch {
      toast.error('Failed to load SEO report');
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
      } else {
        toast.error('Failed to load AI models');
      }
    } catch (e) {
      console.error('Failed to load AI models:', e);
      toast.error('Failed to load AI models');
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
      } else {
        toast.error('Failed to load LiveKit usage');
      }
    } catch (err) {
      console.error('Failed to load LiveKit usage:', err);
      toast.error('Failed to load LiveKit usage');
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
  const executeChatMessage = async (rawText: string) => {
    if (!rawText.trim() || isLoading) return;

    const rawInput = rawText.trim();
    let targetedRole: any = 'cofounder';
    let workerName = 'AI Co-Founder';

    const lower = rawInput.toLowerCase();
    if (lower.includes('@researcher')) {
      targetedRole = 'researcher';
      workerName = 'Researcher';
    } else if (lower.includes('@coder')) {
      targetedRole = 'coder';
      workerName = 'Coder';
    } else if (lower.includes('@writer')) {
      targetedRole = 'writer';
      workerName = 'Writer';
    } else if (lower.includes('@designer')) {
      targetedRole = 'designer';
      workerName = 'Designer';
    } else if (lower.includes('@analyst')) {
      targetedRole = 'analyst';
      workerName = 'Analyst';
    } else if (lower.includes('@marketer')) {
      targetedRole = 'marketer';
      workerName = 'Marketer';
    } else if (selectedWorkerId && selectedWorkerId !== 'co_founder') {
      const node = SWARM_NODES.find((n) => n.id === selectedWorkerId);
      if (node) {
        targetedRole = node.role;
        workerName = node.name;
      }
    }

    const userMsg: ChatMessage = {
      id: genId(),
      sender: 'user',
      text: rawInput,
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
          role: targetedRole,
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
          id: genId(),
          sender: 'assistant',
          text: data.response || 'No response received.',
          provider: data.provider,
          model: data.model,
          fallbackUsed: data.fallbackUsed,
          timestamp: Date.now(),
          role: targetedRole,
          workerName,
        },
      ]);
    } catch (err: unknown) {
      const errorText = err instanceof Error ? err.message : 'Unknown error';
      setMessages((prev) => [
        ...prev,
        {
          id: genId(),
          sender: 'assistant',
          text: `Error: ${errorText}`,
          timestamp: Date.now(),
          role: targetedRole,
          workerName,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    executeChatMessage(input);
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
      } else {
        const err = await res.json();
        toast.error(err.error || 'Failed to acknowledge signal');
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
      } else {
        const err = await res.json();
        toast.error(err.error || `Failed to ${decision} action`);
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

  // Interactive 3D Spatial Workforce Swarm UI Component Render
  const renderSwarmSpatialUI = (
    swarmNodes: SwarmWorkerNode[] = SWARM_NODES,
    isCompact = false
  ) => {
    const selectedNode =
      swarmNodes.find((n) => n.id === selectedWorkerId) || swarmNodes[0];
    const cofounderNode = swarmNodes[0];

    const activeWorkerCount = swarmNodes.filter(
      (n) =>
        n.status === 'active' ||
        n.status === 'executing' ||
        n.status === 'analyzing' ||
        n.status === 'generating'
    ).length;
    const avgLatency = Math.round(
      swarmNodes.reduce((sum, n) => sum + n.latencyMs, 0) / swarmNodes.length
    );

    return (
      <div className="flex flex-col space-y-4">
        {/* Telemetry Header */}
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark sm:flex-row sm:items-center sm:justify-between sm:p-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark">
              <Orbit className="animate-spin-slow h-5 w-5 text-violet-600 dark:text-violet-400" />
            </div>
            <div>
              <h3 className="flex items-center gap-2 text-xs font-bold text-nm-light-textPrimary dark:text-white">
                AI Workforce Swarm Orbit
                <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-2 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                  {activeWorkerCount > 0
                    ? `${activeWorkerCount} Agents Active`
                    : `${swarmNodes.length} Agents Synchronized`}
                </span>
              </h3>
              <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                Select any worker to inspect telemetry, active tool, or delegate
                intent.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 font-mono text-[10px]">
            <div className="flex items-center gap-1 text-nm-light-textSecondary dark:text-neutral-400">
              <Wifi size={11} className="text-emerald-500" />
              <span>WebRTC Active</span>
            </div>
            <div className="flex items-center gap-1 text-nm-light-textSecondary dark:text-neutral-400">
              <Activity size={11} className="text-violet-500" />
              <span>Avg Latency: {avgLatency}ms</span>
            </div>
          </div>
        </div>

        {/* Spatial Orbital Container */}
        <div
          className={`relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-4 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark sm:p-6 ${isCompact ? 'min-h-[360px]' : 'min-h-[400px] md:min-h-[460px]'}`}
        >
          {/* Soft Background Grid & Radial Glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.08)_0%,transparent_70%)]" />
          <div className="pointer-events-none absolute inset-0 scale-[0.75] animate-pulse rounded-full border border-violet-500/10" />
          <div className="pointer-events-none absolute inset-0 scale-[0.9] rounded-full border border-dashed border-neutral-300 dark:border-neutral-800" />

          {/* Orbit Lines & Swarm Nodes Grid */}
          <div className="relative z-10 grid w-full max-w-4xl grid-cols-1 items-center justify-items-center gap-6 md:grid-cols-3">
            {/* Left Orbit Column (Researcher, Writer, Analyst) */}
            <div className="flex w-full max-w-xs flex-col gap-4">
              {swarmNodes
                .filter((n) =>
                  ['researcher', 'writer', 'analyst'].includes(n.role)
                )
                .map((node) => {
                  const theme = getRoleTheme(node.role);
                  const isSelected = selectedWorkerId === node.id;
                  const avatarStatus =
                    node.status === 'executing' || node.status === 'active'
                      ? 'working'
                      : node.status === 'analyzing' ||
                          node.status === 'generating'
                        ? 'thinking'
                        : 'idle';
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedWorkerId(node.id)}
                      className={`group relative flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-all duration-300 ${
                        isSelected
                          ? `border-2 ${theme.border} bg-nm-gradient-light dark:bg-nm-gradient-dark ${theme.activeGlow} scale-105`
                          : `hover:scale-102 border-neutral-200/80 bg-nm-light-bg shadow-nm-convex dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark ${theme.glow}`
                      }`}
                    >
                      <CoWorkerAvatar
                        role={node.role}
                        status={avatarStatus}
                        size="sm"
                        showBadge={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-nm-light-textPrimary dark:text-white">
                            {node.name}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${node.status === 'active' || node.status === 'executing' ? 'animate-pulse bg-emerald-500' : node.status === 'analyzing' || node.status === 'generating' ? 'animate-pulse bg-cyan-400' : 'bg-neutral-400'}`}
                          />
                        </div>
                        <p className="truncate text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                          {node.title}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[9px] text-nm-light-textSecondary/80 dark:text-neutral-500">
                          {node.activeTool}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>

            {/* Central Pedestal: AI Co-Founder Apex Entity */}
            <div className="my-4 flex flex-col items-center justify-center md:my-0">
              <CoFounderCharacter
                state={
                  voice.state === 'speaking'
                    ? 'speaking'
                    : voice.state === 'listening'
                      ? 'listening'
                      : voice.state === 'connecting'
                        ? 'thinking'
                        : 'idle'
                }
                audioLevel={voice.audioLevel}
                size={isCompact ? compactSwarmCharSize : swarmCharSize}
                onClick={() => setSelectedWorkerId(cofounderNode.id)}
                interactive={true}
              />
            </div>

            {/* Right Orbit Column (Coder, Designer, Marketer) */}
            <div className="flex w-full max-w-xs flex-col gap-4">
              {swarmNodes
                .filter((n) =>
                  ['coder', 'designer', 'marketer'].includes(n.role)
                )
                .map((node) => {
                  const theme = getRoleTheme(node.role);
                  const isSelected = selectedWorkerId === node.id;
                  const avatarStatus =
                    node.status === 'executing' || node.status === 'active'
                      ? 'working'
                      : node.status === 'analyzing' ||
                          node.status === 'generating'
                        ? 'thinking'
                        : 'idle';
                  return (
                    <button
                      key={node.id}
                      onClick={() => setSelectedWorkerId(node.id)}
                      className={`group relative flex items-center gap-3.5 rounded-2xl border p-3 text-left transition-all duration-300 ${
                        isSelected
                          ? `border-2 ${theme.border} bg-nm-gradient-light dark:bg-nm-gradient-dark ${theme.activeGlow} scale-105`
                          : `hover:scale-102 border-neutral-200/80 bg-nm-light-bg shadow-nm-convex dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-convex-dark ${theme.glow}`
                      }`}
                    >
                      <CoWorkerAvatar
                        role={node.role}
                        status={avatarStatus}
                        size="sm"
                        showBadge={false}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate text-xs font-bold text-nm-light-textPrimary dark:text-white">
                            {node.name}
                          </span>
                          <span
                            className={`h-2 w-2 rounded-full ${node.status === 'active' || node.status === 'executing' ? 'animate-pulse bg-emerald-500' : node.status === 'analyzing' || node.status === 'generating' ? 'animate-pulse bg-cyan-400' : 'bg-neutral-400'}`}
                          />
                        </div>
                        <p className="truncate text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                          {node.title}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[9px] text-nm-light-textSecondary/80 dark:text-neutral-500">
                          {node.activeTool}
                        </p>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Selected Node Telemetry & Context Panel */}
        {selectedNode && (
          <div
            className={`rounded-3xl border ${getRoleTheme(selectedNode.role).border} space-y-3 bg-nm-light-bg p-5 shadow-nm-flat dark:bg-nm-dark-bg dark:shadow-nm-flat-dark`}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200/80 pb-3 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${getRoleTheme(selectedNode.role).badge} shadow-nm-flat dark:shadow-nm-flat-dark`}
                >
                  {getWorkerIcon(selectedNode.role)}
                </div>
                <div>
                  <h4 className="flex items-center gap-2 text-sm font-bold text-nm-light-textPrimary dark:text-white">
                    {selectedNode.name}
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${getRoleTheme(selectedNode.role).badge}`}
                    >
                      {selectedNode.role.toUpperCase()}
                    </span>
                  </h4>
                  <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
                    {selectedNode.title}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setInput(`@${selectedNode.role} `);
                    setActiveTab('chat');
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border ${getRoleTheme(selectedNode.role).border} bg-nm-gradient-light px-3.5 py-2 text-xs font-bold text-nm-light-textPrimary shadow-nm-flat transition-all hover:opacity-90 dark:bg-nm-gradient-dark dark:text-white dark:shadow-nm-flat-dark`}
                >
                  <MessageSquare size={13} />
                  <span>@Prompt {selectedNode.name}</span>
                </button>
              </div>
            </div>

            <p className="text-xs leading-relaxed text-nm-light-textSecondary dark:text-neutral-300">
              {selectedNode.description}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-1 text-xs sm:grid-cols-2 md:grid-cols-4">
              <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Active Tool
                </span>
                <span className="block truncate font-mono text-[11px] text-violet-700 dark:text-violet-300">
                  {selectedNode.activeTool}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Current Action
                </span>
                <span className="block truncate text-[11px] text-nm-light-textPrimary dark:text-neutral-200">
                  {selectedNode.currentAction}
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Response Latency
                </span>
                <span className="block font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {selectedNode.latencyMs} ms
                </span>
              </div>
              <div className="rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark">
                <span className="mb-0.5 block text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Throughput
                </span>
                <span className="block font-mono text-[11px] font-bold text-cyan-600 dark:text-cyan-400">
                  {selectedNode.tokensPerSec} tok/s
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-7xl flex-col space-y-4 bg-nm-light-bg p-3 text-nm-light-textPrimary dark:bg-nm-dark-bg dark:text-nm-dark-textPrimary md:p-4 lg:p-6">
      {/* Top Header & Dark Neumorphic Controls */}
      <div className="flex flex-col justify-between gap-3 rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark lg:flex-row lg:items-center lg:gap-4 lg:p-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-nm-gradient-light shadow-nm-flat dark:bg-nm-gradient-dark dark:shadow-nm-flat-dark">
            <Sparkles className="h-6 w-6 text-violet-600 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-nm-light-textPrimary dark:text-white">
              AI Co-Founder
              <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300">
                Executive Command Center
              </span>
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-nm-light-textSecondary dark:text-neutral-400">
              <span>LiveKit Multimodal Voice & 3D Workforce Swarm</span>
              {liveKitUsage && (
                <button
                  onClick={() => {
                    setSelectedWidgetTab('usage');
                    fetchLiveKitUsage();
                  }}
                  title="Click to view LiveKit Cloud Free Tier analytics"
                  className="inline-flex items-center gap-1 rounded-md border border-neutral-300 bg-nm-light-bg px-2 py-0.5 font-mono text-[10px] text-emerald-600 shadow-nm-flat transition-colors hover:border-violet-500/40 dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-emerald-400 dark:shadow-nm-flat-dark"
                >
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500 dark:bg-emerald-400" />
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
        <div className="scrollbar-thin flex flex-nowrap items-center gap-3 overflow-x-auto py-0.5">
          {/* AI Provider & Model Picker */}
          <div className="flex flex-nowrap items-center gap-1.5 rounded-2xl border border-neutral-300/70 bg-nm-light-bg px-2 py-1.5 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark sm:gap-2 sm:px-3">
            {/* Provider Selector */}
            <div className="flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-400/20 dark:bg-emerald-400" />
              <label
                htmlFor="co-founder-provider-select"
                className="text-[11px] font-semibold text-nm-light-textSecondary dark:text-neutral-400"
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
                className="min-h-[44px] cursor-pointer rounded-xl border border-neutral-300 bg-nm-light-bg px-2.5 py-1 text-xs font-semibold text-nm-light-textPrimary shadow-nm-flat outline-none transition-colors hover:border-violet-500/40 focus:border-violet-500 focus:text-violet-700 dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-200 dark:shadow-nm-flat-dark dark:focus:text-violet-400"
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
            <div className="flex items-center gap-1.5 whitespace-nowrap border-l border-neutral-300 px-2 py-0.5 dark:border-neutral-800">
              <Cpu className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              <label
                htmlFor="co-founder-model-select"
                className="text-[11px] font-semibold text-nm-light-textSecondary dark:text-neutral-400"
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
                className="min-h-[44px] cursor-pointer rounded-xl border border-neutral-300 bg-nm-light-bg px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-nm-flat outline-none transition-colors hover:border-violet-500/40 focus:border-violet-500 focus:text-violet-700 dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-violet-300 dark:shadow-nm-flat-dark dark:focus:text-violet-400"
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
            <div className="flex items-center gap-1.5 whitespace-nowrap border-l border-neutral-300 px-2 py-0.5 dark:border-neutral-800">
              <Globe className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
              <label
                htmlFor="co-founder-lang-select"
                className="text-[11px] font-semibold text-nm-light-textSecondary dark:text-neutral-400"
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
                className="cursor-pointer rounded-xl border border-neutral-300 bg-nm-light-bg px-2 py-1 text-xs font-semibold text-cyan-700 shadow-nm-flat outline-none transition-colors hover:border-cyan-500/40 focus:border-cyan-500 focus:text-cyan-600 dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-cyan-300 dark:shadow-nm-flat-dark dark:focus:text-cyan-200"
              >
                <option value="bn-IN">বাংলা (Bengali)</option>
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
              </select>
            </div>

            {/* Voice Studio Settings Modal Trigger */}
            <div className="flex items-center whitespace-nowrap border-l border-neutral-300 px-2 py-0.5 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(true)}
                className="flex items-center gap-1.5 rounded-xl border border-violet-500/30 bg-nm-gradient-light px-2.5 py-1 text-xs font-semibold text-violet-700 shadow-nm-flat transition-all hover:border-violet-500/60 dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark"
                title="Voice Studio Settings"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span>Voice Studio</span>
                {voice.hasBengaliVoice ? (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400"
                    title="Native Bengali Voice Active"
                  />
                ) : (
                  <span
                    className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500 dark:bg-amber-400"
                    title="Audio Tuning Recommended"
                  />
                )}
              </button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div
            className="scrollbar-thin flex items-center overflow-x-auto rounded-2xl border border-neutral-300/70 bg-nm-light-bg p-1 shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark"
            role="tablist"
            aria-label="Co-Founder mode switch"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'voice'}
              aria-controls="voice-panel"
              onClick={() => setActiveTab('voice')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'voice'
                  ? 'bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark'
                  : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Mic className="h-3.5 w-3.5" />
              <span>Realtime Voice</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'chat'}
              aria-controls="chat-panel"
              onClick={() => setActiveTab('chat')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'chat'
                  ? 'bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark'
                  : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Interactive Chat</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'swarm_3d'}
              aria-controls="swarm-3d-panel"
              onClick={() => setActiveTab('swarm_3d')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'swarm_3d'
                  ? 'bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark'
                  : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Orbit className="h-3.5 w-3.5" />
              <span>3D Workforce Swarm</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'workspace'}
              aria-controls="workspace-panel"
              onClick={() => setActiveTab('workspace')}
              className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-medium transition-all duration-200 ${
                activeTab === 'workspace'
                  ? 'bg-nm-gradient-light font-bold text-cyan-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-cyan-300 dark:shadow-nm-flat-dark'
                  : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white'
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              <span>Live Workspace</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fallback Chain Badge Banner */}
      {fallbackChain.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg px-4 py-2 text-[11px] text-nm-light-textSecondary shadow-nm-flat dark:border-neutral-800/80 dark:bg-nm-dark-bg dark:text-neutral-400 dark:shadow-nm-flat-dark">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-violet-700 dark:text-violet-300">
              Active Fallback Chain:
            </span>
            {fallbackChain.map((item, idx) => (
              <React.Fragment key={item.id}>
                <span
                  className={`inline-flex items-center gap-1 font-mono ${
                    item.id === selectedProvider
                      ? 'rounded-md border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 font-bold text-violet-700 dark:text-violet-300'
                      : 'text-nm-light-textPrimary dark:text-neutral-300'
                  }`}
                >
                  {item.name}
                </span>
                {idx < fallbackChain.length - 1 && (
                  <span className="text-neutral-400 dark:text-neutral-600">
                    →
                  </span>
                )}
              </React.Fragment>
            ))}
          </div>
          <a
            href="https://admin.ruhvi.in/tech/ai-settings"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[10px] text-violet-600 transition-colors hover:text-violet-700 dark:text-violet-400 dark:hover:text-violet-300"
          >
            <span>Configure Fallback in Admin AI</span>
            <ExternalLink size={10} />
          </a>
        </div>
      )}

      {/* Main View Area */}
      {activeTab === 'swarm_3d' ? (
        <div className="flex-1 space-y-6 overflow-y-auto pr-1">
          <AiHierarchyVisualizer
            isThinking={
              voice.state === 'listening' || voice.state === 'connecting'
            }
            liveNodes={workforceData?.nodes}
            isLiveData={!!workforceData}
            selectedNodeId={selectedWorkerId}
            onSelectNode={setSelectedWorkerId}
            className="mb-6"
          />
          {renderSwarmSpatialUI(liveSwarmNodes, false)}
          <WorkerGrid
            workers={liveWorkerGrid.length > 0 ? liveWorkerGrid : undefined}
            onSelectWorker={(id) => setSelectedWorkerId(id)}
            onPromptWorker={(role) => {
              setInput(`@${role} `);
              setActiveTab('chat');
            }}
          />
        </div>
      ) : activeTab === 'workspace' ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <LiveWorkspace
            onWorkerClick={(role) => {
              setInput(`@${role} `);
              setActiveTab('chat');
            }}
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
              messages={messages}
              onSendMessage={executeChatMessage}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column (5 or 7 cols): Intelligence Drawer & Chat Stream */}
          <div
            className={`flex h-full flex-col overflow-hidden rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-0 shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800/90 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark ${
              activeTab === 'voice' ? 'lg:col-span-5' : 'lg:col-span-7'
            }`}
          >
            {/* Header Controls for Right Column */}
            <div className="flex items-center justify-between border-b border-neutral-200/80 bg-nm-light-bg px-4 py-3 text-xs font-medium text-nm-light-textSecondary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-400">
              <div
                className="scrollbar-thin flex items-center gap-1.5 overflow-x-auto py-0.5"
                role="tablist"
                aria-label="Intelligent drawer tabs"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'alerts'}
                  aria-controls="alerts-panel"
                  onClick={() => setSelectedWidgetTab('alerts')}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'alerts'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Alerts ({proactiveSignals.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'approvals'}
                  aria-controls="approvals-panel"
                  onClick={() => setSelectedWidgetTab('approvals')}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'approvals'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Approvals ({pendingApprovals.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'competitors'}
                  aria-controls="competitors-panel"
                  onClick={() => setSelectedWidgetTab('competitors')}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'competitors'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Competitors ({competitors.length})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'seo'}
                  aria-controls="seo-panel"
                  onClick={() => setSelectedWidgetTab('seo')}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'seo'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  SEO Health
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'architecture'}
                  aria-controls="architecture-panel"
                  onClick={() => setSelectedWidgetTab('architecture')}
                  className={`shrink-0 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'architecture'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  Architecture
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'usage'}
                  aria-controls="usage-panel"
                  onClick={() => {
                    setSelectedWidgetTab('usage');
                    fetchLiveKitUsage();
                  }}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'usage'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Activity
                    size={11}
                    className={
                      selectedWidgetTab === 'usage'
                        ? 'text-violet-700 dark:text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>LiveKit</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'browser'}
                  aria-controls="browser-panel"
                  onClick={() => {
                    setSelectedWidgetTab('browser');
                    setIsBrowserOpen(true);
                    setIsBrowserMinimized(false);
                  }}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'browser'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Globe
                    size={11}
                    className={
                      selectedWidgetTab === 'browser'
                        ? 'text-violet-700 dark:text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Browser</span>
                  {isBrowserLoading ? (
                    <RefreshCw
                      size={9}
                      className="animate-spin text-amber-500 dark:text-amber-400"
                    />
                  ) : browserData ? (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
                  ) : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'plans'}
                  aria-controls="plans-panel"
                  onClick={() => {
                    setSelectedWidgetTab('plans');
                    fetchActionPlans();
                  }}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'plans'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Layers
                    size={11}
                    className={
                      selectedWidgetTab === 'plans'
                        ? 'text-violet-700 dark:text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Plans ({actionPlans.length})</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'swarm'}
                  aria-controls="swarm-panel"
                  onClick={() => setSelectedWidgetTab('swarm')}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'swarm'
                      ? 'border border-violet-500/40 bg-nm-gradient-light font-bold text-violet-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Orbit
                    size={11}
                    className={
                      selectedWidgetTab === 'swarm'
                        ? 'text-violet-700 dark:text-violet-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Swarm</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={selectedWidgetTab === 'workspace'}
                  aria-controls="workspace-panel"
                  onClick={() => setSelectedWidgetTab('workspace')}
                  className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl px-2.5 py-1 text-[11px] font-medium transition-all ${
                    selectedWidgetTab === 'workspace'
                      ? 'border border-cyan-500/40 bg-nm-gradient-light font-bold text-cyan-700 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-cyan-300 dark:shadow-nm-flat-dark'
                      : 'text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-neutral-200'
                  }`}
                >
                  <Activity
                    size={11}
                    className={
                      selectedWidgetTab === 'workspace'
                        ? 'text-cyan-700 dark:text-cyan-300'
                        : 'text-neutral-500'
                    }
                  />
                  <span>Workspace</span>
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
                className="p-1 text-nm-light-textSecondary transition-colors hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:text-white"
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
              className={`overflow-y-auto border-b border-neutral-200/60 bg-nm-light-bg p-4 shadow-nm-inset transition-all duration-200 dark:border-neutral-800/60 dark:bg-nm-dark-bg dark:shadow-nm-inset-dark ${
                selectedWidgetTab === 'competitors' ||
                selectedWidgetTab === 'seo' ||
                selectedWidgetTab === 'usage' ||
                selectedWidgetTab === 'browser' ||
                selectedWidgetTab === 'plans' ||
                selectedWidgetTab === 'swarm' ||
                selectedWidgetTab === 'workspace'
                  ? 'max-h-[600px]'
                  : 'max-h-48'
              }`}
            >
              {selectedWidgetTab === 'alerts' && (
                <div
                  className="space-y-2"
                  aria-live="polite"
                  aria-label="Proactive alerts"
                >
                  {proactiveSignals.length === 0 ? (
                    <p className="flex items-center gap-1.5 py-1 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <ShieldCheck
                        size={13}
                        className="text-emerald-500 dark:text-emerald-400"
                      />
                      All inventory, support, and sales signals are normal.
                    </p>
                  ) : (
                    proactiveSignals.map((sig) => (
                      <div
                        key={sig.id}
                        className="flex items-start justify-between gap-2 rounded-xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
                      >
                        <div className="flex items-start gap-2">
                          <AlertTriangle
                            size={14}
                            className="mt-0.5 shrink-0 text-amber-500 dark:text-amber-400"
                          />
                          <div>
                            <p className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                              {sig.title}
                            </p>
                            <p className="line-clamp-1 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                              {sig.summary}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAcknowledgeSignal(sig.id)}
                          className="rounded-lg bg-nm-light-bg px-2 py-0.5 text-[10px] text-nm-light-textSecondary shadow-nm-flat transition-colors hover:bg-neutral-200 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark dark:hover:bg-neutral-700"
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
                    <p className="flex items-center gap-1.5 py-1 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <CheckCircle
                        size={13}
                        className="text-emerald-500 dark:text-emerald-400"
                      />
                      No high-impact actions awaiting founder authorization.
                    </p>
                  ) : (
                    pendingApprovals.map((app) => (
                      <div
                        key={app.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200/80 bg-nm-light-bg p-2.5 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
                      >
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-nm-light-textPrimary dark:text-white">
                            {app.action_type?.replace(/_/g, ' ')}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                            {app.recommendation_summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() =>
                              handleApprovalDecision(app.id, 'approved')
                            }
                            className="rounded-lg border border-emerald-500/40 bg-emerald-500/20 px-2.5 py-1 text-[10px] font-bold text-emerald-600 shadow-nm-flat transition-colors hover:bg-emerald-500/30 dark:text-emerald-400 dark:shadow-nm-flat-dark"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() =>
                              handleApprovalDecision(app.id, 'rejected')
                            }
                            className="rounded-lg border border-rose-500/40 bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold text-rose-600 shadow-nm-flat transition-colors hover:bg-rose-500/30 dark:text-rose-400 dark:shadow-nm-flat-dark"
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
                    className="space-y-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
                  >
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-violet-600 dark:text-violet-400">
                      <Target size={13} />
                      <span>Track New Competitor Website</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <input
                        type="text"
                        value={newCompName}
                        onChange={(e) => setNewCompName(e.target.value)}
                        placeholder="Brand Name (e.g. GIVA, CaratLane)"
                        className="rounded-xl border border-neutral-300/80 bg-nm-light-bg px-3 py-2 text-xs text-nm-light-textPrimary placeholder-neutral-400 shadow-nm-inset focus:border-violet-500 focus:outline-none dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:placeholder-neutral-500 dark:shadow-nm-inset-dark"
                      />
                      <input
                        type="text"
                        value={newCompUrl}
                        onChange={(e) => setNewCompUrl(e.target.value)}
                        placeholder="Website URL (e.g. giva.co)"
                        className="rounded-xl border border-neutral-300/80 bg-nm-light-bg px-3 py-2 text-xs text-nm-light-textPrimary placeholder-neutral-400 shadow-nm-inset focus:border-violet-500 focus:outline-none dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:placeholder-neutral-500 dark:shadow-nm-inset-dark"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <select
                        value={newCompCategory}
                        onChange={(e) => setNewCompCategory(e.target.value)}
                        className="rounded-xl border border-neutral-300/80 bg-nm-light-bg px-3 py-1.5 text-[11px] text-nm-light-textPrimary shadow-nm-flat focus:outline-none dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark"
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
                        className="flex items-center gap-1 rounded-xl bg-nm-gradient-light px-3.5 py-1.5 text-xs font-bold text-violet-700 shadow-nm-flat transition-colors hover:opacity-90 disabled:opacity-50 dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark"
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
                      <p className="py-1 text-center text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                        No competitors saved yet. Enter a brand name & website
                        above.
                      </p>
                    ) : (
                      competitors.map((comp) => (
                        <div
                          key={comp.id}
                          className="space-y-1.5 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                                {comp.name}
                              </span>
                              <span className="rounded-md border border-neutral-300 bg-nm-light-bg px-1.5 py-0.5 text-[9px] font-medium text-nm-light-textSecondary shadow-nm-flat dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400 dark:shadow-nm-flat-dark">
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
                                className="text-neutral-500 transition-colors hover:text-violet-600 dark:hover:text-violet-400"
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
                                className="flex items-center gap-1 rounded-lg border border-violet-500/40 bg-violet-500/20 px-2 py-1 text-[10px] font-bold text-violet-700 shadow-nm-flat transition-colors hover:bg-violet-500/30 disabled:opacity-50 dark:text-violet-300 dark:shadow-nm-flat-dark"
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
                                className="p-1 text-neutral-500 transition-colors hover:text-rose-500 dark:hover:text-rose-400"
                                title="Delete competitor"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </div>

                          {comp.latest_insights ? (
                            <div className="space-y-1 rounded-xl border border-neutral-300/80 bg-nm-light-bg p-2.5 text-[11px] text-nm-light-textPrimary shadow-nm-inset dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-inset-dark">
                              {comp.latest_insights.positioning && (
                                <p>
                                  <strong className="text-nm-light-textSecondary dark:text-neutral-400">
                                    Positioning:
                                  </strong>{' '}
                                  {comp.latest_insights.positioning}
                                </p>
                              )}
                              {comp.latest_insights.promotions && (
                                <p>
                                  <strong className="text-amber-600 dark:text-amber-400">
                                    Promotions:
                                  </strong>{' '}
                                  {comp.latest_insights.promotions}
                                </p>
                              )}
                              {comp.latest_insights.strategicCounterMove && (
                                <p className="text-emerald-600 dark:text-emerald-400">
                                  <strong>🚀 Ruhvi Counter-Move:</strong>{' '}
                                  {comp.latest_insights.strategicCounterMove}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[10px] italic text-nm-light-textSecondary dark:text-neutral-500">
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
                <div
                  className="space-y-2.5"
                  aria-live="polite"
                  aria-label="SEO health report"
                >
                  {loadingSeo ? (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <RefreshCw
                        size={13}
                        className="animate-spin text-violet-500"
                      />
                      Scanning catalog SEO health...
                    </p>
                  ) : seoReport ? (
                    <div className="flex items-center justify-between rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-500/20 text-xs font-bold text-emerald-600 shadow-nm-flat dark:text-emerald-400 dark:shadow-nm-flat-dark">
                          {seoReport?.healthScore || 85}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                            Catalog SEO Health Score
                          </p>
                          <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                            {seoReport?.totalProductsScanned || 0} Products
                            Scanned
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={fetchSeoReport}
                        disabled={loadingSeo}
                        className="flex items-center gap-1 rounded-xl bg-nm-gradient-light px-3 py-1.5 text-[10px] font-bold text-violet-700 shadow-nm-flat transition-colors hover:opacity-90 disabled:opacity-50 dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark"
                      >
                        <RefreshCw
                          size={10}
                          className={loadingSeo ? 'animate-spin' : ''}
                        />
                        <span>{loadingSeo ? 'Scanning...' : 'Rescan SEO'}</span>
                      </button>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <Info
                        size={13}
                        className="text-neutral-400 dark:text-neutral-500"
                      />
                      No SEO report available. Click 'Rescan SEO' to generate
                      one.
                    </p>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-xl border border-neutral-200/80 bg-nm-light-bg p-2 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
                      <p className="text-xs font-bold text-rose-600 dark:text-rose-400">
                        {seoReport?.missingMetaDescriptions || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                        Missing Meta
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-200/80 bg-nm-light-bg p-2 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                        {seoReport?.weakKeywordCount || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                        Weak Keywords
                      </p>
                    </div>
                    <div className="rounded-xl border border-neutral-200/80 bg-nm-light-bg p-2 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark">
                      <p className="text-xs font-bold text-nm-light-textPrimary dark:text-neutral-300">
                        {seoReport?.missingAltText || 0}
                      </p>
                      <p className="text-[9px] uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                        Missing Alt
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {selectedWidgetTab === 'architecture' && (
                <div className="space-y-1.5 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-2 text-[11px] text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-300 dark:shadow-nm-flat-dark">
                  {loadingWidgets ? (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <RefreshCw
                        size={13}
                        className="animate-spin text-violet-500"
                      />
                      Loading repository architecture...
                    </p>
                  ) : architectureInfo ? (
                    <div>
                      <p className="flex items-center gap-1.5">
                        <Cpu
                          size={12}
                          className="text-cyan-600 dark:text-cyan-400"
                        />
                        <strong>Framework:</strong>{' '}
                        {architectureInfo?.framework ||
                          'Next.js 15 (App Router) + React 19 + LiveKit WebRTC Engine'}
                      </p>
                      <p>
                        <strong>Total Database Migrations:</strong>{' '}
                        {architectureInfo?.totalMigrations || 28}
                      </p>
                      <p className="line-clamp-1">
                        <strong>Active Integrations:</strong>{' '}
                        {architectureInfo?.activeIntegrations?.join(', ') ||
                          'LiveKit, Gemini, Supabase, Firebase, Sentry'}
                      </p>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <Info
                        size={13}
                        className="text-neutral-400 dark:text-neutral-500"
                      />
                      No architecture data loaded. Try refreshing.
                    </p>
                  )}
                </div>
              )}

              {selectedWidgetTab === 'usage' && (
                <div
                  className="space-y-3"
                  aria-live="polite"
                  aria-label="LiveKit usage telemetry"
                >
                  {loadingUsage && !liveKitUsage ? (
                    <p className="flex items-center gap-1.5 py-2 text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                      <RefreshCw
                        size={13}
                        className="animate-spin text-violet-500"
                      />
                      Fetching LiveKit telemetry...
                    </p>
                  ) : (
                    <div className="flex flex-col items-start justify-between gap-2 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark sm:flex-row sm:items-center">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-violet-500/30 bg-violet-500/20 text-violet-600 shadow-nm-flat dark:text-violet-400 dark:shadow-nm-flat-dark">
                          <Activity size={16} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                              LiveKit Cloud Telemetry
                            </p>
                            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                              Free Tier
                            </span>
                          </div>
                          <p className="text-[10px] text-nm-light-textSecondary dark:text-neutral-400">
                            Host: ruhvi-rkkfx6qd.livekit.cloud • Cycle resets in{' '}
                            {liveKitUsage?.billingPeriod?.daysRemaining ?? 29}{' '}
                            days
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
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
                  <div className="flex items-center justify-between border-b border-neutral-200/80 pb-2 dark:border-neutral-800">
                    <h3 className="flex items-center gap-1.5 text-xs font-bold text-nm-light-textPrimary dark:text-white">
                      <Layers
                        size={13}
                        className="text-violet-600 dark:text-violet-400"
                      />
                      Strategic Action Plans ({actionPlans.length})
                    </h3>
                  </div>

                  {actionPlans.length === 0 ? (
                    <p className="py-3 text-center text-xs text-nm-light-textSecondary dark:text-neutral-400">
                      No Action Plans Active right now.
                    </p>
                  ) : (
                    actionPlans.map((plan: any) => (
                      <div
                        key={plan.id}
                        className="space-y-1.5 rounded-2xl border border-neutral-200/80 bg-nm-light-bg p-3 shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
                      >
                        <h4 className="text-xs font-bold text-nm-light-textPrimary dark:text-white">
                          {plan.title}
                        </h4>
                        <p className="text-[11px] text-nm-light-textSecondary dark:text-neutral-400">
                          {plan.goal}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              )}

              {selectedWidgetTab === 'swarm' && (
                <div className="space-y-6">
                  {renderSwarmSpatialUI(liveSwarmNodes, true)}
                  <CoWorkerShowcase />
                </div>
              )}

              {selectedWidgetTab === 'workspace' && (
                <div className="space-y-4">
                  <LiveWorkspace
                    className="p-1 sm:p-2"
                    onWorkerClick={(role) => {
                      setInput(`@${role} `);
                      setActiveTab('chat');
                    }}
                  />
                </div>
              )}
            </div>

            {/* Dedicated Conversation Messages Stream Panel */}
            <div className="scrollbar-thin flex-1 space-y-3 overflow-y-auto p-4">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                const role = isUser ? undefined : m.role || 'cofounder';
                const roleTheme = role ? getRoleTheme(role) : null;
                const workerName = isUser
                  ? 'You'
                  : m.workerName || 'AI Co-Founder';

                return (
                  <div
                    key={m.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[88%] rounded-3xl p-3.5 text-xs sm:max-w-[85%] sm:p-4 sm:text-sm ${
                        isUser
                          ? 'rounded-tr-none border border-violet-500/20 bg-nm-gradient-light font-medium text-violet-950 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-white dark:shadow-nm-flat-dark'
                          : `rounded-tl-none border-l-4 ${roleTheme?.border || 'border-violet-500'} border-y border-r border-neutral-200/80 bg-nm-light-bg text-nm-light-textPrimary shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-200 dark:shadow-nm-flat-dark`
                      }`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2 text-[11px] font-semibold">
                        <div className="flex items-center gap-2">
                          {isUser ? (
                            <div className="flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                              <User size={13} />
                              <span>You</span>
                            </div>
                          ) : (
                            <div
                              className={`flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${roleTheme?.badge}`}
                            >
                              {getWorkerIcon(role || 'cofounder')}
                              <span>{workerName}</span>
                            </div>
                          )}
                        </div>
                        {!isUser && (m.model || m.provider) && (
                          <span className="flex items-center gap-1 rounded-md border border-neutral-300/80 bg-nm-light-bg px-2 py-0.5 font-mono text-[9px] text-nm-light-textSecondary shadow-nm-flat dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-400 dark:shadow-nm-flat-dark">
                            <Zap
                              size={9}
                              className="text-violet-600 dark:text-violet-400"
                            />
                            <span>{m.model || m.provider}</span>
                            {m.fallbackUsed && (
                              <span className="font-bold text-rose-600 dark:text-rose-400">
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
                );
              })}
            </div>

            {/* Message Input Box & Worker Quick Tags */}
            <div className="space-y-2.5 border-t border-neutral-200/80 bg-nm-light-bg p-3.5 dark:border-neutral-800 dark:bg-nm-dark-bg">
              {/* Worker Shortcut Selector Pills */}
              <div className="scrollbar-none flex items-center gap-1.5 overflow-x-auto pb-0.5">
                <span className="mr-1 shrink-0 text-[10px] font-bold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  Delegate:
                </span>
                {SWARM_NODES.map((node) => {
                  const theme = getRoleTheme(node.role);
                  const isSelected = selectedWorkerId === node.id;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        setSelectedWorkerId(node.id);
                        if (!input.includes(`@${node.role}`)) {
                          setInput(
                            (prev) =>
                              `@${node.role} ${prev.replace(/^@\w+\s*/, '')}`
                          );
                        }
                      }}
                      className={`flex shrink-0 items-center gap-1 whitespace-nowrap rounded-xl border px-2.5 py-1 text-[10px] font-bold transition-all ${
                        isSelected
                          ? `${theme.border} ${theme.badge} shadow-nm-flat dark:shadow-nm-flat-dark`
                          : 'border-neutral-300/70 bg-nm-light-bg text-nm-light-textSecondary hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-400 dark:hover:text-white'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-current' : 'bg-neutral-400'}`}
                      />
                      <span>@{node.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Form Input */}
              <form onSubmit={handleSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask your AI Co-Founder or tag @worker (e.g. @coder, @researcher)..."
                  className="flex-1 rounded-2xl border border-neutral-300/80 bg-nm-light-bg px-4 py-2.5 text-xs text-nm-light-textPrimary placeholder-neutral-400 shadow-nm-inset focus:border-violet-500/50 focus:outline-none dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:placeholder-neutral-500 dark:shadow-nm-inset-dark"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="flex shrink-0 items-center justify-center rounded-2xl bg-nm-gradient-light px-5 py-2.5 text-xs font-bold text-violet-700 shadow-nm-flat transition-all hover:opacity-90 active:scale-95 disabled:opacity-50 dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark"
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
            ref={voiceModalRef}
            role="dialog"
            aria-modal="true"
            aria-label={
              selectedLanguage === 'bn-IN'
                ? 'Executive Voice Studio Settings (Voice Studio)'
                : selectedLanguage === 'hi-IN'
                  ? 'Executive Voice Studio Settings (Voice Studio)'
                  : 'Executive Voice Studio Settings'
            }
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-3xl border border-neutral-200/80 bg-nm-light-bg p-6 shadow-nm-flat backdrop-blur-2xl dark:border-neutral-800 dark:bg-nm-dark-bg dark:shadow-nm-flat-dark"
          >
            <div className="flex items-center justify-between border-b border-neutral-200/80 pb-4 dark:border-neutral-800">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-500/30 bg-violet-500/15 text-violet-600 shadow-nm-flat dark:text-violet-300 dark:shadow-nm-flat-dark">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="flex items-center gap-2 text-base font-bold text-nm-light-textPrimary dark:text-white">
                    {selectedLanguage === 'hi-IN'
                      ? 'एक्जीक्यूटिव वॉयस स्टूडियो'
                      : selectedLanguage === 'bn-IN'
                        ? 'Executive Voice Studio'
                        : 'Executive Voice Studio'}
                    <span className="rounded-full border border-violet-500/30 bg-violet-500/20 px-2 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">
                      {selectedLanguage === 'hi-IN'
                        ? 'वॉयस सेटिंग्स'
                        : selectedLanguage === 'bn-IN'
                          ? 'ভয়েস ও উচ্চারণ'
                          : 'Voice Studio'}
                    </span>
                  </h3>
                  <p className="text-xs text-nm-light-textSecondary dark:text-neutral-400">
                    {selectedLanguage === 'hi-IN'
                      ? 'ब्राउज़र वॉयस और भाषा नियंत्रण सेट करें'
                      : selectedLanguage === 'bn-IN'
                        ? 'বাংলা ও ভারতীয় ভাষার স্পষ্ট উচ্চারণ, ব্রাউজার ভয়েস এবং গতি নিয়ন্ত্রণ করুন'
                        : 'Configure browser voice, speech rate, pitch and language preferences'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsVoiceModalOpen(false)}
                className="rounded-xl p-1.5 text-nm-light-textSecondary transition-colors hover:bg-neutral-200 hover:text-nm-light-textPrimary dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 max-h-[72vh] space-y-5 overflow-y-auto pr-1">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                  {selectedLanguage === 'hi-IN'
                    ? '1. बोलने का अंदाज (Spoken Style)'
                    : selectedLanguage === 'bn-IN'
                      ? '১. বাংলা বলার ধরন (Spoken Bengali Style)'
                      : '1. Voice Style'}
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
                        ? 'border-violet-500 bg-nm-gradient-light font-bold text-violet-800 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-white dark:shadow-nm-flat-dark'
                        : 'border-neutral-300/80 bg-nm-light-bg text-nm-light-textSecondary shadow-nm-inset hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-400 dark:shadow-nm-inset-dark dark:hover:text-neutral-200'
                    }`}
                  >
                    <div className="mb-1 flex w-full items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-violet-700 dark:text-violet-300">
                        {voiceStyle === 'spoken_bengali' && (
                          <Check className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                        )}
                        {selectedLanguage === 'hi-IN'
                          ? 'सरल बोलचाल का बंगाली'
                          : selectedLanguage === 'bn-IN'
                            ? 'সহজ চলিত মুখের বাংলা'
                            : 'Natural Spoken Bengali'}
                      </span>
                      <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                        {selectedLanguage === 'bn-IN'
                          ? 'সুপারিশিত'
                          : 'Recommended'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-normal text-nm-light-textSecondary dark:text-neutral-400">
                      {selectedLanguage === 'hi-IN'
                        ? 'बोले जाने वाला प्राकृतिक मीठा बंगाली। "और", "बोलिए" बचाएं।'
                        : selectedLanguage === 'bn-IN'
                          ? 'মুখে কথা বলার মতো স্বাভাবিক মিষ্টি বাংলা। “এবং”, “বলিবেন” বারণ।'
                          : 'Natural sweet Bengali as spoken. Avoids “এবং”, “বলিবেন” for clearer TTS.'}
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
                        ? 'border-cyan-500 bg-nm-gradient-light font-bold text-cyan-800 shadow-nm-flat dark:bg-nm-gradient-dark dark:text-white dark:shadow-nm-flat-dark'
                        : 'border-neutral-300/80 bg-nm-light-bg text-nm-light-textSecondary shadow-nm-inset hover:text-nm-light-textPrimary dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-neutral-400 dark:shadow-nm-inset-dark dark:hover:text-neutral-200'
                    }`}
                  >
                    <div className="mb-1 flex w-full items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                        {voiceStyle === 'banglish' && (
                          <Check className="h-3.5 w-3.5 text-cyan-600 dark:text-cyan-400" />
                        )}
                        {selectedLanguage === 'bn-IN'
                          ? 'বাংলিশ মোড (Banglish)'
                          : 'Banglish Mode'}
                      </span>
                      <span className="rounded bg-cyan-500/20 px-1.5 py-0.5 text-[10px] font-bold text-cyan-700 dark:text-cyan-300">
                        {selectedLanguage === 'bn-IN'
                          ? '১০০% স্পষ্ট'
                          : '100% Clear'}
                      </span>
                    </div>
                    <p className="text-[11px] leading-normal text-nm-light-textSecondary dark:text-neutral-400">
                      {selectedLanguage === 'bn-IN'
                        ? 'ইংরেজি হরফে বাংলা। যেকোনো উইন্ডোজ বা ব্রাউজারে স্পষ্ট উচ্চারণ।'
                        : 'Bengali in English letters. Clear pronunciation on any system.'}
                    </p>
                  </button>
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="co-founder-tts-voice-select"
                    className="text-xs font-semibold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400"
                  >
                    {selectedLanguage === 'hi-IN'
                      ? '2. स्पीच वॉयस चयन (Browser Speech Engine)'
                      : selectedLanguage === 'bn-IN'
                        ? '২. স্পিচ ভয়েস নির্বাচন (Browser Speech Engine)'
                        : '2. Voice Selection'}
                  </label>
                  <span className="font-mono text-[11px] text-nm-light-textSecondary dark:text-neutral-500">
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
                  className="w-full rounded-2xl border border-neutral-300/80 bg-nm-light-bg px-3.5 py-2.5 text-xs text-nm-light-textPrimary shadow-nm-inset outline-none focus:border-violet-500 dark:border-neutral-800 dark:bg-nm-dark-bg dark:text-white dark:shadow-nm-inset-dark"
                >
                  <option value="auto">
                    {selectedLanguage === 'bn-IN'
                      ? '✨ স্বয়ংক্রিয় সেরা কণ্ঠস্বর'
                      : '✨ Auto-Detect Best Voice'}
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                    {selectedLanguage === 'hi-IN'
                      ? '3. भाषण की गति (Speech Speed)'
                      : selectedLanguage === 'bn-IN'
                        ? '৩. কথার গতি (Speech Speed)'
                        : '3. Speech Speed'}
                  </label>
                  <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-300">
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
                  <label className="text-xs font-semibold uppercase tracking-wider text-nm-light-textSecondary dark:text-neutral-400">
                    {selectedLanguage === 'hi-IN'
                      ? '4. वॉयस पिच (Voice Pitch)'
                      : selectedLanguage === 'bn-IN'
                        ? '৪. ভয়েসের সুর (Voice Pitch)'
                        : '4. Voice Pitch'}
                  </label>
                  <span className="font-mono text-xs font-bold text-violet-700 dark:text-violet-300">
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
                    toast.success(
                      selectedLanguage === 'bn-IN'
                        ? 'ভয়েস টেস্ট চালু করা হয়েছে...'
                        : selectedLanguage === 'hi-IN'
                          ? 'वॉयस टेस्ट शुरू हो गया...'
                          : 'Voice test started...',
                      { id: 'voice-test' }
                    );
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border border-violet-500/40 bg-nm-gradient-light py-2.5 text-xs font-bold text-violet-700 shadow-nm-flat transition-all hover:opacity-90 active:scale-[0.99] dark:bg-nm-gradient-dark dark:text-violet-300 dark:shadow-nm-flat-dark"
                >
                  <Play className="h-4 w-4 fill-violet-600 text-violet-600 dark:fill-violet-400 dark:text-violet-400" />
                  <span>
                    {selectedLanguage === 'bn-IN'
                      ? 'ভয়েস পরীক্ষা করুন'
                      : selectedLanguage === 'hi-IN'
                        ? 'लाइव सैंपल चलाएं'
                        : 'Play Live Sample'}
                  </span>
                </button>
              </div>
            </div>

            <div className="mt-6 flex justify-end border-t border-neutral-200/80 pt-4 dark:border-neutral-800">
              <button
                type="button"
                onClick={() => {
                  setIsVoiceModalOpen(false);
                  toast.success(
                    selectedLanguage === 'bn-IN'
                      ? 'ভয়েস সেটি সেটিংস সংরক্ষিত হয়েছে'
                      : selectedLanguage === 'hi-IN'
                        ? 'वॉयस सेटिंग्स सहेजी गईं'
                        : 'Voice settings saved'
                  );
                }}
                className="rounded-2xl bg-nm-gradient-light px-5 py-2 text-xs font-bold text-violet-700 shadow-nm-flat hover:opacity-90 dark:bg-nm-gradient-dark dark:text-amber-400 dark:shadow-nm-flat-dark"
              >
                {selectedLanguage === 'bn-IN'
                  ? 'সংরক্ষণ করুন (Done)'
                  : selectedLanguage === 'hi-IN'
                    ? 'सहेजें (Done)'
                    : 'Save (Done)'}
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
