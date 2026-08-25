'use client';

import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  Settings,
  Database,
  Wand2,
  MessageSquare,
  PlaySquare,
  ShieldCheck,
  Activity,
} from 'lucide-react';

// Import our new sub-components
import AiDashboard from '@/components/admin/ai/AiDashboard';
import AiProviders from '@/components/admin/ai/AiProviders';
import AiRouting from '@/components/admin/ai/AiRouting';
import AiDiagnostics from '@/components/admin/ai/AiDiagnostics';
import AiPrompts from '@/components/admin/ai/AiPrompts';
import AiPlayground from '@/components/admin/ai/AiPlayground';
import AiGlobalSettings from '@/components/admin/ai/AiGlobalSettings';
import AiSecurity from '@/components/admin/ai/AiSecurity';
import AiAnalytics from '@/components/admin/ai/AiAnalytics';
import { AiComponentProps } from '@/components/admin/ai/types';
import { AlertOctagon } from 'lucide-react';

export default function AISettingsPage() {
  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'analytics'
    | 'providers'
    | 'features'
    | 'diagnostics'
    | 'prompts'
    | 'playground'
    | 'security'
    | 'global'
  >('dashboard');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Shared States
  const [providers, setProviders] = useState<any[]>([]);
  const [features, setFeatures] = useState<any>({});
  const [prompts, setPrompts] = useState<any>({});
  const [globalConfig, setGlobalConfig] = useState<any>({});
  const [logs, setLogs] = useState<any[]>([]);

  const PREDEFINED_PROVIDERS: Record<string, any> = {
    gemini: {
      name: 'Google Gemini',
      models: [
        'gemini-3.6-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro',
      ],
    },
    openai: {
      name: 'OpenAI',
      models: ['gpt-4o-mini', 'gpt-4o', 'gpt-3.5-turbo'],
    },
    anthropic: {
      name: 'Anthropic Claude',
      models: [
        'claude-3-haiku-20240307',
        'claude-3-sonnet-20240229',
        'claude-3-opus-20240229',
      ],
    },
    openrouter: { name: 'OpenRouter', models: [] },
    deepseek: {
      name: 'DeepSeek AI',
      models: ['deepseek-chat', 'deepseek-reasoner'],
    },
    custom: {
      name: 'Custom Gateway (OpenAI Compatible)',
      models: [],
      isCustom: true,
    },
  };

  useEffect(() => {
    fetchSettings();
    fetchLogs();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/admin/ai/settings');
      if (res.ok) {
        const data = await res.json();
        setProviders(data.ai_providers || []);
        setFeatures(data.ai_features || {});
        setPrompts(data.ai_prompts || {});
        setGlobalConfig(data.ai_global || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/ai/logs');
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/ai/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ai_providers: providers,
          ai_features: features,
          ai_prompts: prompts,
          ai_global: globalConfig,
        }),
      });
      if (!res.ok) throw new Error('Failed to save settings');
      const data = await res.json();
      if (data.ai_providers && Array.isArray(data.ai_providers)) {
        setProviders(data.ai_providers);
      }
      if (data.ai_features) setFeatures(data.ai_features);
      if (data.ai_prompts) setPrompts(data.ai_prompts);
      if (data.ai_global) setGlobalConfig(data.ai_global);

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'An error occurred' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-4 text-white">
        <div className="relative flex h-16 w-16 items-center justify-center">
          <div className="absolute h-full w-full animate-ping rounded-full border-2 border-emerald-500/30"></div>
          <div className="absolute h-12 w-12 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
          <Wand2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="text-lg font-medium text-gray-300">
          Initializing AI Core...
        </div>
        <div className="text-sm text-gray-500">
          Loading secure keys and routing topology
        </div>
      </div>
    );
  }

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <Activity className="h-5 w-5" />,
    },
    {
      id: 'analytics',
      label: 'Analytics',
      icon: <BarChart3 className="h-5 w-5" />,
    },
    {
      id: 'providers',
      label: 'Providers',
      icon: <Database className="h-5 w-5" />,
    },
    {
      id: 'features',
      label: 'Routing & Fallback',
      icon: <Settings className="h-5 w-5" />,
    },
    {
      id: 'diagnostics',
      label: 'Failure Diagnostics (24h)',
      icon: <AlertOctagon className="h-5 w-5" />,
    },
    {
      id: 'prompts',
      label: 'Prompts',
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: 'playground',
      label: 'Playground',
      icon: <PlaySquare className="h-5 w-5" />,
    },
    {
      id: 'security',
      label: 'Security & Rate Limits',
      icon: <ShieldCheck className="h-5 w-5" />,
    },
    {
      id: 'global',
      label: 'Global Settings',
      icon: <Wand2 className="h-5 w-5" />,
    },
  ];

  const commonProps: AiComponentProps = {
    providers,
    setProviders,
    features,
    setFeatures,
    prompts,
    setPrompts,
    globalConfig,
    setGlobalConfig,
    logs,
    saveSettings,
    isSaving,
    PREDEFINED_PROVIDERS,
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-8">
      {/* Header */}
      <div>
        <h1 className="mb-2 text-3xl font-bold text-white">
          AI Control Center
        </h1>
        <p className="text-gray-400">
          Enterprise operations console for managing AI providers, security,
          rate limiting, and 24h fallback diagnostics.
        </p>
      </div>

      {/* Floating Toast Notification */}
      {message && (
        <div className="animate-in slide-in-from-bottom-5 fade-in fixed bottom-6 right-6 z-50 duration-300">
          <div
            className={`flex items-center gap-3 rounded-xl border px-6 py-4 shadow-2xl backdrop-blur-md ${
              message.type === 'success'
                ? 'border-emerald-500/30 bg-emerald-950/90 text-emerald-300 shadow-emerald-900/20'
                : 'border-red-500/30 bg-red-950/90 text-red-300 shadow-red-900/20'
            }`}
          >
            {message.type === 'success' ? (
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
            ) : (
              <AlertOctagon className="h-5 w-5 text-red-400" />
            )}
            <span className="text-sm font-semibold">{message.text}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-wrap gap-2 rounded-xl border border-gray-700 bg-gray-800 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id as any)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-gray-400 hover:bg-gray-700 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>

      {/* Dynamic Content */}
      <div className="mt-8">
        {activeTab === 'dashboard' && <AiDashboard {...commonProps} />}
        {activeTab === 'analytics' && <AiAnalytics {...commonProps} />}
        {activeTab === 'providers' && <AiProviders {...commonProps} />}
        {activeTab === 'features' && <AiRouting {...commonProps} />}
        {activeTab === 'diagnostics' && <AiDiagnostics {...commonProps} />}
        {activeTab === 'prompts' && <AiPrompts {...commonProps} />}
        {activeTab === 'playground' && <AiPlayground {...commonProps} />}
        {activeTab === 'security' && <AiSecurity {...commonProps} />}
        {activeTab === 'global' && <AiGlobalSettings {...commonProps} />}
      </div>
    </div>
  );
}
