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
} from 'lucide-react';
import { LiveVoiceVisualizer } from '@/components/co-founder/LiveVoiceVisualizer';
import { useLiveKitVoice } from '@/hooks/useLiveKitVoice';
import toast from 'react-hot-toast';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

export default function CoFounderPortalPage() {
  const [activeTab, setActiveTab] = useState<'voice' | 'chat'>('voice');
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

  // Quick Widget States
  const [proactiveSignals, setProactiveSignals] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loadingWidgets, setLoadingWidgets] = useState(false);
  const [selectedWidgetTab, setSelectedWidgetTab] = useState<
    'alerts' | 'approvals' | 'competitors' | 'seo' | 'architecture'
  >('alerts');
  const [architectureInfo, setArchitectureInfo] = useState<any>(null);

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
    onTranscript: (speaker, text) => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: speaker,
          text,
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

  useEffect(() => {
    refreshStrategicWidgets();
    fetchCompetitors();
    fetchSeoReport();
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
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'assistant',
          text: data.response || 'No response received.',
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

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-7xl flex-col p-4 text-neutral-100 md:p-6">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col justify-between gap-4 border-b border-neutral-800 pb-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-amber-600 shadow-lg shadow-amber-500/20">
            <Sparkles className="h-5 w-5 text-neutral-950" />
          </div>
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-white">
              AI Co-Founder
              <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-400">
                Executive Portal
              </span>
            </h1>
            <p className="text-xs text-neutral-400">
              LiveKit Multimodal Voice & Strategic Decision Engine
            </p>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex items-center rounded-xl border border-neutral-800 bg-neutral-900 p-1">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'voice'
                ? 'bg-amber-500 font-semibold text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <Mic className="h-3.5 w-3.5" />
            <span>Realtime Voice</span>
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-2 rounded-lg px-4 py-1.5 text-xs font-medium transition-all duration-200 ${
              activeTab === 'chat'
                ? 'bg-amber-500 font-semibold text-neutral-950 shadow-md'
                : 'text-neutral-400 hover:text-white'
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Interactive Chat</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Visualizer/Chat & Strategic Intelligence */}
      <div className="grid flex-1 grid-cols-1 gap-6 overflow-hidden pt-6 lg:grid-cols-12">
        {/* Left Column (7 cols): Voice Visualizer or Extended Chat */}
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
          />
        </div>

        {/* Right Column (5 or 12 cols): Dual Feed + Intelligence Tabs */}
        <div
          className={`flex h-full flex-col overflow-hidden rounded-2xl border border-neutral-800/80 bg-neutral-950/60 backdrop-blur-md ${
            activeTab === 'voice' ? 'lg:col-span-5' : 'lg:col-span-7'
          }`}
        >
          {/* Header Controls for Right Column */}
          <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/50 px-4 py-3 text-xs font-medium text-neutral-400">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSelectedWidgetTab('alerts')}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  selectedWidgetTab === 'alerts'
                    ? 'bg-amber-500/20 font-semibold text-amber-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Alerts ({proactiveSignals.length})
              </button>
              <button
                onClick={() => setSelectedWidgetTab('approvals')}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  selectedWidgetTab === 'approvals'
                    ? 'bg-amber-500/20 font-semibold text-amber-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Approvals ({pendingApprovals.length})
              </button>
              <button
                onClick={() => setSelectedWidgetTab('competitors')}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  selectedWidgetTab === 'competitors'
                    ? 'bg-amber-500/20 font-semibold text-amber-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Competitors ({competitors.length})
              </button>
              <button
                onClick={() => setSelectedWidgetTab('seo')}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  selectedWidgetTab === 'seo'
                    ? 'bg-amber-500/20 font-semibold text-amber-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                SEO Health
              </button>
              <button
                onClick={() => setSelectedWidgetTab('architecture')}
                className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
                  selectedWidgetTab === 'architecture'
                    ? 'bg-amber-500/20 font-semibold text-amber-400'
                    : 'text-neutral-400 hover:text-neutral-200'
                }`}
              >
                Architecture
              </button>
            </div>
            <button
              onClick={refreshStrategicWidgets}
              disabled={loadingWidgets}
              title="Refresh Intelligence"
              className="p-1 transition-colors hover:text-white"
            >
              <RefreshCw
                size={12}
                className={loadingWidgets ? 'animate-spin' : ''}
              />
            </button>
          </div>

          {/* Quick Intelligence Drawer */}
          <div
            className={`overflow-y-auto border-b border-neutral-800/60 bg-neutral-900/30 p-3 transition-all duration-200 ${
              selectedWidgetTab === 'competitors' || selectedWidgetTab === 'seo'
                ? 'max-h-80'
                : 'max-h-44'
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
                      className="flex items-start justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 p-2"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle
                          size={14}
                          className="mt-0.5 shrink-0 text-amber-400"
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {sig.title}
                          </p>
                          <p className="line-clamp-1 text-[11px] text-neutral-400">
                            {sig.summary}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleAcknowledgeSignal(sig.id)}
                        className="rounded bg-neutral-800 px-2 py-0.5 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-700"
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
                      className="flex items-center justify-between gap-2 rounded-lg border border-neutral-800 bg-neutral-900/80 p-2"
                    >
                      <div>
                        <p className="text-[11px] text-xs font-semibold uppercase tracking-wider text-white">
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
                          className="rounded bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 transition-colors hover:bg-emerald-500/30"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() =>
                            handleApprovalDecision(app.id, 'rejected')
                          }
                          className="rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/30"
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
                {/* Add Competitor Form */}
                <form
                  onSubmit={handleAddCompetitor}
                  className="space-y-2 rounded-xl border border-neutral-800 bg-neutral-900/90 p-2.5"
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-400">
                    <Target size={13} />
                    <span>Track New Competitor Website</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    <input
                      type="text"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      placeholder="Brand Name (e.g. GIVA, CaratLane)"
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={newCompUrl}
                      onChange={(e) => setNewCompUrl(e.target.value)}
                      placeholder="Website URL (e.g. giva.co)"
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <select
                      value={newCompCategory}
                      onChange={(e) => setNewCompCategory(e.target.value)}
                      className="rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1.5 text-[11px] text-neutral-300 focus:outline-none"
                    >
                      <option value="Fine Jewellery">Fine Jewellery</option>
                      <option value="Silver Jewellery">Silver Jewellery</option>
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
                      className="flex items-center gap-1 rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-bold text-neutral-950 transition-colors hover:bg-amber-600 disabled:opacity-50"
                    >
                      <Plus size={13} />
                      <span>
                        {isAddingComp ? 'Adding...' : 'Add to Tracking'}
                      </span>
                    </button>
                  </div>
                </form>

                {/* Competitors List */}
                <div className="space-y-2">
                  {competitors.length === 0 ? (
                    <p className="py-1 text-center text-[11px] text-neutral-400">
                      No competitors saved yet. Enter a brand name & website
                      above to start tracking.
                    </p>
                  ) : (
                    competitors.map((comp) => (
                      <div
                        key={comp.id}
                        className="space-y-1.5 rounded-xl border border-neutral-800 bg-neutral-900/80 p-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white">
                              {comp.name}
                            </span>
                            <span className="rounded border border-neutral-700/60 bg-neutral-800 px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
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
                              className="text-neutral-500 transition-colors hover:text-amber-400"
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
                              className="flex items-center gap-1 rounded bg-amber-500/20 px-2 py-1 text-[10px] font-semibold text-amber-300 transition-colors hover:bg-amber-500/30 disabled:opacity-50"
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

                        {/* Insights snippet */}
                        {comp.latest_insights ? (
                          <div className="space-y-1 rounded-lg border border-neutral-800/80 bg-neutral-950/70 p-2 text-[11px] text-neutral-300">
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
                            Not analyzed yet. Click &apos;Analyze Live&apos; to
                            extract their live offers & positioning.
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
                <div className="flex items-center justify-between rounded-xl border border-neutral-800 bg-neutral-900/90 p-2.5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/20 text-xs font-bold text-emerald-400">
                      {seoReport?.healthScore || 85}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Catalog SEO Health Score
                      </p>
                      <p className="text-[10px] text-neutral-400">
                        {seoReport?.totalProductsScanned || 0} Products Scanned
                        in Catalog
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={fetchSeoReport}
                    disabled={loadingSeo}
                    className="flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-[10px] font-bold text-neutral-950 transition-colors hover:bg-amber-600 disabled:opacity-50"
                  >
                    <RefreshCw
                      size={10}
                      className={loadingSeo ? 'animate-spin' : ''}
                    />
                    <span>{loadingSeo ? 'Scanning...' : 'Rescan SEO'}</span>
                  </button>
                </div>

                {/* Breakdown Stats */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-2">
                    <p className="text-xs font-bold text-rose-400">
                      {seoReport?.missingMetaDescriptions || 0}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                      Missing Meta
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-2">
                    <p className="text-xs font-bold text-amber-400">
                      {seoReport?.weakKeywordCount || 0}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                      Weak Keywords
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-800 bg-neutral-900/80 p-2">
                    <p className="text-xs font-bold text-neutral-300">
                      {seoReport?.missingAltText || 0}
                    </p>
                    <p className="text-[9px] uppercase tracking-wider text-neutral-400">
                      Missing Alt
                    </p>
                  </div>
                </div>

                {/* Action Items */}
                <div className="space-y-1.5">
                  {seoReport?.topActionItems?.map((item: any, idx: number) => (
                    <div
                      key={idx}
                      className="space-y-0.5 rounded-lg border border-neutral-800 bg-neutral-950/80 p-2 text-[11px]"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-white">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${item.severity === 'critical' ? 'bg-rose-500' : 'bg-amber-500'}`}
                        />
                        <span>{item.issue}</span>
                      </div>
                      <p className="pl-3 text-[10px] text-neutral-400">
                        {item.recommendedAction}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedWidgetTab === 'architecture' && (
              <div className="space-y-1 text-[11px] text-neutral-300">
                <p className="flex items-center gap-1.5">
                  <Cpu size={12} className="text-cyan-400" />
                  <strong>Framework:</strong>{' '}
                  {architectureInfo?.framework ||
                    'Next.js 15 (App Router) + React 19'}
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
                  className={`max-w-[85%] rounded-2xl p-3.5 text-sm ${
                    m.sender === 'user'
                      ? 'rounded-tr-none bg-amber-500 font-medium text-neutral-950 shadow-md shadow-amber-500/10'
                      : 'rounded-tl-none border border-neutral-800 bg-neutral-900 text-neutral-200 shadow-sm'
                  }`}
                >
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold opacity-80">
                    {m.sender === 'user' ? (
                      <User size={13} />
                    ) : (
                      <Bot size={13} />
                    )}
                    <span>{m.sender === 'user' ? 'You' : 'AI Co-Founder'}</span>
                  </div>
                  <p className="whitespace-pre-wrap text-xs leading-relaxed sm:text-sm">
                    {m.text}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Message Input Box */}
          <div className="border-t border-neutral-800 bg-neutral-900/50 p-3">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your AI Co-Founder about sales, stock, tickets, or strategy..."
                className="flex-1 rounded-xl border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-xs text-white placeholder-neutral-500 focus:border-amber-500/50 focus:outline-none"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="flex shrink-0 items-center justify-center rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-semibold text-neutral-950 transition-colors hover:bg-amber-600 disabled:opacity-50"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
