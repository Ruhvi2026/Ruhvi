'use client';

import React, { useState, useRef } from 'react';
import { AiComponentProps } from './types';
import CredentialManager from './CredentialManager';
import {
  Plus,
  Server,
  Edit2,
  Trash2,
  Check,
  X,
  Eye,
  EyeOff,
  ShieldAlert,
  Loader2,
  Lock,
  Unlock,
  ChevronDown,
  ChevronUp,
  Upload,
  KeyRound,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { ENV_KEY_MAP, maskApiKey } from '@/lib/ai/keys';

export default function AiProviders({
  providers,
  setProviders,
  logs = [],
  PREDEFINED_PROVIDERS,
  saveSettings,
  isSaving,
}: AiComponentProps) {
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { type: 'success' | 'error'; msg: string; time?: number }>
  >({});
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);
  const [discoveringModels, setDiscoveringModels] = useState<string | null>(
    null
  );
  const [discoverResults, setDiscoverResults] = useState<
    Record<string, { type: 'success' | 'error'; msg: string }>
  >({});
  const [freeOnlyFilters, setFreeOnlyFilters] = useState<
    Record<string, boolean>
  >({});

  // Compute 100% real live database metrics per provider
  const getProviderMetrics = (providerId: string) => {
    const pLogs = (logs || []).filter((l) => l.provider === providerId);
    const reqCount = pLogs.length;
    const cost = pLogs.reduce(
      (acc, curr) => acc + (Number(curr.estimated_cost) || 0),
      0
    );
    const lastLog = pLogs[0];
    let lastUsedText = 'Never used';
    if (lastLog && lastLog.created_at) {
      const diffMinutes = Math.floor(
        (Date.now() - new Date(lastLog.created_at).getTime()) / 60000
      );
      if (diffMinutes < 1) lastUsedText = 'Just now';
      else if (diffMinutes < 60) lastUsedText = `${diffMinutes}m ago`;
      else if (diffMinutes < 1440)
        lastUsedText = `${Math.floor(diffMinutes / 60)}h ago`;
      else lastUsedText = new Date(lastLog.created_at).toLocaleDateString();
    }
    return { reqCount, cost, lastUsedText };
  };

  const handleAddProvider = (type: string) => {
    const predefined = PREDEFINED_PROVIDERS[type];
    if (!predefined) return;

    const existing = providers.find((p) => p.id === type || p.type === type);
    if (existing) {
      setExpandedProvider(existing.id);
      return;
    }

    const newProvider = {
      id: type,
      type: type,
      name: predefined.name,
      apiKey: '',
      hasKey: false,
      isEnvKey: false,
      maskedKey: '',
      isEnabled: true,
      models: predefined.models || [],
      priority: providers.length + 1,
      status: 'offline',
      isCustom: Boolean(predefined.isCustom),
    };
    setProviders([...providers, newProvider]);
    setExpandedProvider(type);
  };

  const handleRemoveProvider = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setProviders(providers.filter((p) => p.id !== id));
  };

  const updateProvider = (id: string, field: string, value: any) => {
    setProviders(
      providers.map((p) => {
        if (p.id === id) {
          const updated = { ...p, [field]: value };
          if (field === 'apiKey') {
            if (value && value !== '__CLEAR_KEY__') {
              updated.hasKey = true;
              updated.maskedKey = maskApiKey(value);
            } else if (value === '__CLEAR_KEY__') {
              updated.hasKey = false;
              updated.maskedKey = '';
            }
          }
          return updated;
        }
        return p;
      })
    );
  };

  const clearProviderKey = (id: string) => {
    updateProvider(id, 'apiKey', '__CLEAR_KEY__');
  };

  const handleCredentialsChange = (providerId: string, creds: any[]) => {
    const enabledCreds = creds.filter((c: any) => c.is_enabled !== false);
    const healthyCreds = enabledCreds.filter(
      (c: any) => c.health_status !== 'invalid'
    );
    const hasCreds = enabledCreds.length > 0;

    setProviders(
      providers.map((p) => {
        if (p.id === providerId || p.type === providerId) {
          if (hasCreds) {
            return {
              ...p,
              hasKey: true,
              status:
                healthyCreds.length > 0
                  ? p.isEnabled
                    ? 'online'
                    : 'offline'
                  : 'offline',
              maskedKey:
                p.maskedKey ||
                (enabledCreds[0]?.display_name
                  ? `•••••••••••• (${enabledCreds.length} Key${enabledCreds.length > 1 ? 's' : ''})`
                  : '••••••••••••'),
            };
          }
        }
        return p;
      })
    );
  };

  const testConnection = async (provider: any) => {
    setTestingProvider(provider.id);
    const startTime = Date.now();
    try {
      const res = await fetch('/api/admin/ai/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.id,
          providerType: provider.type,
          apiKey: provider.apiKey || '',
        }),
      });
      const data = await res.json();
      const endTime = Date.now();

      if (res.ok && data.success) {
        setTestResults((prev) => ({
          ...prev,
          [provider.id]: {
            type: 'success',
            msg: data.message || 'Connection successful!',
            time: endTime - startTime,
          },
        }));
        updateProvider(provider.id, 'status', 'online');
      } else {
        setTestResults((prev) => ({
          ...prev,
          [provider.id]: {
            type: 'error',
            msg: data.error || 'Connection failed.',
            time: endTime - startTime,
          },
        }));
        updateProvider(provider.id, 'status', 'offline');
      }
    } catch (err: any) {
      setTestResults((prev) => ({
        ...prev,
        [provider.id]: { type: 'error', msg: 'Network error occurred.' },
      }));
      updateProvider(provider.id, 'status', 'offline');
    } finally {
      setTestingProvider(null);
    }
  };

  const discoverModels = async (provider: any) => {
    setDiscoveringModels(provider.id);
    try {
      const res = await fetch('/api/admin/ai/discover-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: provider.type || provider.id,
          baseUrl: provider.baseUrl,
          customHeaders: provider.customHeaders,
          apiKey: provider.apiKey || '',
          freeOnly: !!freeOnlyFilters[provider.id],
        }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setDiscoverResults((prev) => ({
          ...prev,
          [provider.id]: { type: 'success', msg: data.message },
        }));
        updateProvider(provider.id, 'models', data.models);
      } else {
        setDiscoverResults((prev) => ({
          ...prev,
          [provider.id]: {
            type: 'error',
            msg: data.error || 'Failed to discover models.',
          },
        }));
      }
    } catch (err: any) {
      setDiscoverResults((prev) => ({
        ...prev,
        [provider.id]: { type: 'error', msg: 'Failed to discover models.' },
      }));
    } finally {
      setDiscoveringModels(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      const lines = content.split('\n');
      const updatedProviders = [...providers];

      const addOrUpdateProvider = (type: string, apiKey: string) => {
        const existing = updatedProviders.find(
          (p) => p.type === type || p.id === type
        );
        if (existing) {
          existing.apiKey = apiKey;
          existing.hasKey = Boolean(apiKey);
          existing.maskedKey = maskApiKey(apiKey);
        } else if (PREDEFINED_PROVIDERS[type]) {
          updatedProviders.push({
            id: type,
            type: type,
            name: PREDEFINED_PROVIDERS[type].name,
            apiKey: apiKey,
            hasKey: Boolean(apiKey),
            maskedKey: maskApiKey(apiKey),
            isEnvKey: false,
            isEnabled: true,
            models: PREDEFINED_PROVIDERS[type].models || [],
            priority: updatedProviders.length + 1,
            status: apiKey ? 'online' : 'offline',
          });
        }
      };

      lines.forEach((line) => {
        const [key, ...valueParts] = line.split('=');
        if (!key || valueParts.length === 0) return;

        const val = valueParts.join('=').trim().replace(/['"]/g, '');
        const cleanKey = key.trim();

        if (cleanKey === 'GEMINI_API_KEY') {
          addOrUpdateProvider('gemini', val);
        } else if (cleanKey === 'CUSTOM_GATEWAY_API_KEY') {
          addOrUpdateProvider('custom', val);
        } else if (
          cleanKey === 'CUSTOM_GATEWAY_BASE_URL' ||
          cleanKey === 'CUSTOM_BASE_URL' ||
          cleanKey === 'GATEWAY_BASE_URL'
        ) {
          const custom = updatedProviders.find(
            (p) => p.type === 'custom' || p.id === 'custom'
          );
          if (custom) {
            custom.baseUrl = val;
          } else {
            addOrUpdateProvider('custom', '');
            const newCustom = updatedProviders.find(
              (p) => p.type === 'custom' || p.id === 'custom'
            );
            if (newCustom) newCustom.baseUrl = val;
          }
        } else if (cleanKey === 'OPENAI_API_KEY') {
          addOrUpdateProvider('openai', val);
        } else if (cleanKey === 'ANTHROPIC_API_KEY') {
          addOrUpdateProvider('anthropic', val);
        } else if (cleanKey === 'OPENROUTER_API_KEY') {
          addOrUpdateProvider('openrouter', val);
        } else if (cleanKey === 'DEEPSEEK_API_KEY') {
          addOrUpdateProvider('deepseek', val);
        }
      });

      setProviders(updatedProviders);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">
            Configured AI Providers
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Manage provider credentials, auto-discovery of models, and real-time
            connectivity status.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm text-white focus:ring-1 focus:ring-emerald-500"
            onChange={(e) => {
              if (e.target.value) {
                handleAddProvider(e.target.value);
                e.target.value = '';
              }
            }}
            defaultValue=""
          >
            <option value="" disabled>
              + Add Provider
            </option>
            {Object.keys(PREDEFINED_PROVIDERS)
              .filter((k) => !providers.find((p) => p.type === k || p.id === k))
              .map((key) => (
                <option key={key} value={key}>
                  {PREDEFINED_PROVIDERS[key].name}
                </option>
              ))}
          </select>

          <input
            type="file"
            accept=".env,.env.ai,.txt"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
          >
            <Upload className="h-4 w-4" />
            Import .env
          </button>

          <button
            onClick={saveSettings}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-700"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Check className="h-4 w-4" />
            )}
            Save Configuration
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-800 bg-[#131418] shadow-2xl">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="border-b border-gray-800 bg-[#1a1b20] text-xs font-semibold uppercase text-gray-500">
            <tr>
              <th className="px-6 py-4">Provider</th>
              <th className="hidden px-6 py-4 md:table-cell">API Key Status</th>
              <th className="hidden px-6 py-4 lg:table-cell">Permissions</th>
              <th className="px-6 py-4 text-right">Usage</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {providers.map((provider) => {
              const isConfigured = Boolean(
                provider.hasKey ||
                provider.isEnvKey ||
                (provider.apiKey && provider.apiKey !== '__CLEAR_KEY__')
              );

              return (
                <React.Fragment key={provider.id}>
                  <tr
                    className="group cursor-pointer transition-colors hover:bg-gray-800/30"
                    onClick={() =>
                      setExpandedProvider(
                        expandedProvider === provider.id ? null : provider.id
                      )
                    }
                  >
                    <td className="px-6 py-5">
                      <div className="flex items-center gap-3">
                        <div
                          className={`rounded-lg border p-2 ${
                            provider.isEnabled
                              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'border-gray-700 bg-gray-800 text-gray-500'
                          }`}
                        >
                          {provider.isEnabled ? (
                            <Unlock className="h-4 w-4" />
                          ) : (
                            <Lock className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <div className="text-base font-bold text-white">
                            {provider.name}
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span
                              className={`flex h-1.5 w-1.5 rounded-full ${
                                provider.status === 'online'
                                  ? 'bg-emerald-500'
                                  : 'bg-red-500'
                              }`}
                            ></span>
                            <span className="text-xs capitalize text-gray-500">
                              {provider.status ||
                                (isConfigured ? 'online' : 'offline')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="hidden px-6 py-5 md:table-cell">
                      {provider.isEnvKey && !provider.hasKey ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2.5 py-1 font-mono text-xs text-cyan-300">
                          <KeyRound className="h-3 w-3 text-cyan-400" />
                          {ENV_KEY_MAP[provider.type] || 'ENV_KEY'} (System)
                        </span>
                      ) : isConfigured ? (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-1 font-mono text-xs text-emerald-300">
                          <KeyRound className="h-3 w-3 text-emerald-400" />
                          {provider.maskedKey || '•••••••••••• (Configured)'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-gray-700 bg-gray-800/80 px-2.5 py-1 font-mono text-xs text-gray-400">
                          Not Configured
                        </span>
                      )}
                    </td>

                    <td className="hidden px-6 py-5 lg:table-cell">
                      <span className="inline-flex items-center gap-1.5 rounded border border-[#166534] bg-[#0b3323] px-3 py-1 text-xs font-semibold text-[#22c55e]">
                        <Unlock className="h-3 w-3" />
                        {provider.models?.length
                          ? `${provider.models.length} Models`
                          : 'All models'}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right font-mono">
                      {(() => {
                        const m = getProviderMetrics(provider.id);
                        return (
                          <>
                            <div className="text-sm font-semibold text-gray-200">
                              {m.reqCount.toLocaleString()} reqs
                            </div>
                            <div className="text-xs font-semibold text-emerald-400">
                              ${m.cost.toFixed(4)}
                            </div>
                            <div className="mt-0.5 text-[11px] text-gray-500">
                              {m.lastUsedText}
                            </div>
                          </>
                        );
                      })()}
                    </td>

                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-3 text-gray-500">
                        <button
                          onClick={(e) => handleRemoveProvider(provider.id, e)}
                          className="z-10 p-1 transition-colors hover:text-red-400"
                          title="Delete Provider"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        {expandedProvider === provider.id ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 transition-colors group-hover:text-white" />
                        )}
                      </div>
                    </td>
                  </tr>

                  {expandedProvider === provider.id && (
                    <tr className="border-t-0 bg-gray-900/60">
                      <td
                        colSpan={5}
                        className="border-b border-gray-800 px-6 py-6"
                      >
                        <div className="max-w-4xl space-y-6">
                          <div className="mb-4 flex items-center justify-between">
                            <h4 className="flex items-center gap-2 font-medium text-white">
                              <Edit2 className="h-4 w-4 text-emerald-400" />{' '}
                              Configure {provider.name}
                            </h4>
                            <label className="flex cursor-pointer items-center gap-3">
                              <span className="text-sm font-medium text-gray-400">
                                Enable Provider
                              </span>
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  className="sr-only"
                                  checked={provider.isEnabled}
                                  onChange={(e) =>
                                    updateProvider(
                                      provider.id,
                                      'isEnabled',
                                      e.target.checked
                                    )
                                  }
                                />
                                <div
                                  className={`block h-6 w-10 rounded-full transition-colors ${
                                    provider.isEnabled
                                      ? 'bg-emerald-500'
                                      : 'bg-gray-700'
                                  }`}
                                ></div>
                                <div
                                  className={`dot absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                                    provider.isEnabled
                                      ? 'translate-x-4 transform'
                                      : ''
                                  }`}
                                ></div>
                              </div>
                            </label>
                          </div>

                          {/* API Key Configuration Section */}
                          <div className="space-y-3 rounded-lg border border-gray-800 bg-[#17181d] p-4">
                            <div className="flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-300">
                                API Key (Secure & Encrypted)
                              </label>
                              {provider.hasKey && (
                                <button
                                  type="button"
                                  onClick={() => clearProviderKey(provider.id)}
                                  className="text-xs text-red-400 underline hover:text-red-300"
                                >
                                  Remove Key
                                </button>
                              )}
                            </div>

                            {provider.isEnvKey && !provider.hasKey && (
                              <div className="rounded border border-cyan-500/20 bg-cyan-950/30 p-2.5 text-xs text-cyan-400">
                                ℹ️ Currently using server environment variable{' '}
                                <code className="font-mono text-cyan-200">
                                  {ENV_KEY_MAP[provider.type] || 'ENV_KEY'}
                                </code>
                                . Enter a key below only if you wish to override
                                it.
                              </div>
                            )}

                            {provider.hasKey && (
                              <div className="rounded border border-emerald-500/20 bg-emerald-950/30 p-2.5 text-xs text-emerald-400">
                                🔒 A secure API key is already configured in the
                                database. Enter a new key below only to replace
                                it.
                              </div>
                            )}

                            <div className="relative">
                              <input
                                type={
                                  showApiKeys[provider.id] ? 'text' : 'password'
                                }
                                value={
                                  provider.apiKey === '__CLEAR_KEY__'
                                    ? ''
                                    : provider.apiKey || ''
                                }
                                onChange={(e) =>
                                  updateProvider(
                                    provider.id,
                                    'apiKey',
                                    e.target.value
                                  )
                                }
                                placeholder={
                                  provider.hasKey
                                    ? `${provider.maskedKey || '••••••••••••'} (Leave blank to keep existing key)`
                                    : provider.isEnvKey
                                      ? 'Leave blank to use environment variable, or enter override key'
                                      : 'Paste API Key (e.g. AIzaSy..., sk-proj-...)'
                                }
                                autoComplete="new-password"
                                data-lpignore="true"
                                data-1p-ignore="true"
                                name={`ai_key_${provider.id}`}
                                id={`ai_key_${provider.id}`}
                                className="w-full rounded-lg border border-gray-700 bg-[#131418] py-3 pl-4 pr-10 font-mono text-sm text-white placeholder-gray-500 focus:ring-1 focus:ring-emerald-500"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setShowApiKeys((prev) => ({
                                    ...prev,
                                    [provider.id]: !prev[provider.id],
                                  }))
                                }
                                className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                              >
                                {showApiKeys[provider.id] ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {provider.type === 'custom' && (
                            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-400">
                                  Gateway Base URL
                                </label>
                                <input
                                  type="text"
                                  value={provider.baseUrl || ''}
                                  onChange={(e) =>
                                    updateProvider(
                                      provider.id,
                                      'baseUrl',
                                      e.target.value
                                    )
                                  }
                                  placeholder="http://localhost:11434/v1"
                                  className="w-full rounded-lg border border-gray-700 bg-[#131418] px-4 py-3 font-mono text-sm text-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="mb-2 block text-sm font-medium text-gray-400">
                                  Custom Inference Headers (JSON)
                                </label>
                                <textarea
                                  value={provider.customHeaders || ''}
                                  onChange={(e) =>
                                    updateProvider(
                                      provider.id,
                                      'customHeaders',
                                      e.target.value
                                    )
                                  }
                                  placeholder={'{\n  "x-api-key": "secret"\n}'}
                                  className="h-16 w-full resize-none rounded-lg border border-gray-700 bg-[#131418] px-4 py-3 font-mono text-sm text-white focus:ring-1 focus:ring-emerald-500"
                                />
                              </div>
                            </div>
                          )}

                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <label className="block text-sm font-medium text-gray-400">
                                Available Models
                              </label>

                              <div className="flex items-center gap-3">
                                {/* Free Models Only Toggle */}
                                <label className="flex cursor-pointer items-center gap-2 rounded-md border border-gray-700 bg-gray-900 px-3 py-1 transition-colors hover:bg-gray-800">
                                  <input
                                    type="checkbox"
                                    checked={!!freeOnlyFilters[provider.id]}
                                    onChange={(e) =>
                                      setFreeOnlyFilters((prev) => ({
                                        ...prev,
                                        [provider.id]: e.target.checked,
                                      }))
                                    }
                                    className="h-3.5 w-3.5 rounded border-gray-700 bg-gray-800 text-emerald-500 focus:ring-emerald-500"
                                  />
                                  <span className="text-xs font-semibold text-emerald-400">
                                    Free Models Only
                                  </span>
                                </label>

                                <button
                                  onClick={() => discoverModels(provider)}
                                  disabled={
                                    discoveringModels === provider.id ||
                                    (!isConfigured &&
                                      provider.type !== 'openrouter' &&
                                      provider.type !== 'custom')
                                  }
                                  className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-medium text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
                                >
                                  {discoveringModels === provider.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                                  )}
                                  Discover Models
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <input
                                type="text"
                                value={(provider.models || []).join(', ')}
                                onChange={(e) =>
                                  updateProvider(
                                    provider.id,
                                    'models',
                                    e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  )
                                }
                                placeholder="gemini-1.5-flash-latest, gpt-4o, claude-3-5-sonnet"
                                className="w-full rounded-lg border border-gray-700 bg-[#131418] px-4 py-3 font-mono text-sm text-white focus:ring-1 focus:ring-emerald-500"
                              />

                              {discoverResults[provider.id] && (
                                <div
                                  className={`relative flex items-start gap-3 rounded-lg border px-4 py-3 ${
                                    discoverResults[provider.id].type ===
                                    'success'
                                      ? 'border-emerald-500/30 bg-emerald-500/10'
                                      : 'border-red-500/30 bg-red-500/10'
                                  }`}
                                >
                                  <div className="mt-0.5">
                                    {discoverResults[provider.id].type ===
                                    'success' ? (
                                      <Check className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <X className="h-4 w-4 text-red-400" />
                                    )}
                                  </div>
                                  <div>
                                    <h4
                                      className={`text-sm font-medium ${
                                        discoverResults[provider.id].type ===
                                        'success'
                                          ? 'text-emerald-400'
                                          : 'text-red-400'
                                      }`}
                                    >
                                      {discoverResults[provider.id].type ===
                                      'success'
                                        ? 'Model discovery successful'
                                        : 'Discovery failed'}
                                    </h4>
                                    <p className="mt-1 font-mono text-xs text-gray-400">
                                      {discoverResults[provider.id].msg}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() =>
                                      setDiscoverResults((prev) => {
                                        const next = { ...prev };
                                        delete next[provider.id];
                                        return next;
                                      })
                                    }
                                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* ── Multi-Credential Management (Phase 2) ── */}
                          <div className="mb-6 rounded-xl border border-gray-700/60 bg-gray-900/40 p-5">
                            <CredentialManager
                              providerId={provider.id}
                              providerName={provider.name}
                              onCredentialsChange={(creds) =>
                                handleCredentialsChange(provider.id, creds)
                              }
                            />
                          </div>

                          {/* Actions & Results */}
                          <div className="mt-6 flex items-center justify-between border-t border-gray-800 pt-6">
                            <button
                              onClick={() => testConnection(provider)}
                              disabled={
                                testingProvider === provider.id ||
                                (!isConfigured && provider.type !== 'custom')
                              }
                              className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-400 transition-colors hover:text-emerald-300 disabled:opacity-50"
                            >
                              {testingProvider === provider.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <ShieldAlert className="h-4 w-4" />
                              )}
                              Run Diagnostics & Test
                            </button>

                            {testResults[provider.id] && (
                              <div
                                className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm ${
                                  testResults[provider.id].type === 'success'
                                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                                    : 'border border-red-500/20 bg-red-500/10 text-red-400'
                                }`}
                              >
                                {testResults[provider.id].type === 'success' ? (
                                  <Check className="h-4 w-4" />
                                ) : (
                                  <X className="h-4 w-4" />
                                )}
                                {testResults[provider.id].type === 'success'
                                  ? `Connected (${testResults[provider.id].time}ms)`
                                  : 'Connection Failed'}
                              </div>
                            )}
                          </div>

                          {testResults[provider.id]?.type === 'error' && (
                            <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/5 p-4 font-mono text-sm text-red-400">
                              {testResults[provider.id].msg}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}

            {providers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-20 text-center">
                  <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-800">
                    <Server className="h-8 w-8 text-gray-500" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-white">
                    No Providers Configured
                  </h3>
                  <p className="mx-auto max-w-sm text-sm text-gray-400">
                    Add an AI provider like Google Gemini, OpenAI, or Anthropic
                    to power your store's AI features.
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
