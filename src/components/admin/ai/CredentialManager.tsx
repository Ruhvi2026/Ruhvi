'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronUp,
  ChevronDown,
  ShieldAlert,
  Loader2,
  KeyRound,
  RotateCcw,
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  HelpCircle,
  Shield,
  Activity,
} from 'lucide-react';
import type { ProviderCredential } from './types';

interface CredentialManagerProps {
  providerId: string;
  providerName: string;
  onCredentialsChange?: (credentials: ProviderCredential[]) => void;
}

const HEALTH_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  healthy: {
    label: 'Healthy',
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    icon: <CheckCircle2 className="h-3.5 w-3.5" />,
  },
  rate_limited: {
    label: 'Rate Limited',
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  quota_exhausted: {
    label: 'Quota Exhausted',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10 border-orange-500/20',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
  },
  cooldown: {
    label: 'Cooldown',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10 border-blue-500/20',
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  invalid: {
    label: 'Invalid Key',
    color: 'text-red-400',
    bg: 'bg-red-500/10 border-red-500/20',
    icon: <XCircle className="h-3.5 w-3.5" />,
  },
  unknown: {
    label: 'Standby',
    color: 'text-gray-400',
    bg: 'bg-gray-500/10 border-gray-500/20',
    icon: <HelpCircle className="h-3.5 w-3.5" />,
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = HEALTH_CONFIG[status] || HEALTH_CONFIG.unknown;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function formatRelativeTime(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

function formatCooldown(until: string | null): string {
  if (!until) return '';
  const rem = new Date(until).getTime() - Date.now();
  if (rem <= 0) return 'Ready';
  const m = Math.floor(rem / 60000);
  const s = Math.floor((rem % 60000) / 1000);
  if (m > 0) return `${m}m ${s}s remaining`;
  return `${s}s remaining`;
}

export default function CredentialManager({
  providerId,
  providerName,
  onCredentialsChange,
}: CredentialManagerProps) {
  const [credentials, setCredentials] = useState<ProviderCredential[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<
    Record<string, { ok: boolean; msg: string; latency?: number }>
  >({});
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Add form state
  const [newName, setNewName] = useState('');
  const [newKey, setNewKey] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const fetchCredentials = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/ai/credentials?providerId=${providerId}`
      );
      if (res.ok) {
        const data = await res.json();
        const creds = data.credentials || [];
        setCredentials(creds);
        onCredentialsChange?.(creds);
      }
    } catch {
      /* silently fail */
    } finally {
      setLoading(false);
    }
  }, [providerId, onCredentialsChange]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  // ── Actions ──────────────────────────────────────────────────────────────

  const handleAdd = async () => {
    if (!newName.trim() || !newKey.trim()) {
      showMsg('error', 'Display name and API key are required.');
      return;
    }
    setSaving('new');
    try {
      const res = await fetch('/api/admin/ai/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider_id: providerId,
          display_name: newName.trim(),
          apiKey: newKey.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewName('');
        setNewKey('');
        setShowAddForm(false);
        showMsg('success', `Credential "${newName}" added successfully.`);
        await fetchCredentials();
      } else {
        showMsg('error', data.error || 'Failed to add credential.');
      }
    } catch {
      showMsg('error', 'Network error while adding credential.');
    } finally {
      setSaving(null);
    }
  };

  const handleEdit = async (id: string) => {
    setSaving(id);
    try {
      const body: any = { id, display_name: editName, is_enabled: editEnabled };
      if (editKey.trim() && editKey !== '••••••••••••') {
        body.apiKey = editKey.trim();
      }
      const res = await fetch('/api/admin/ai/credentials', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditKey('');
        showMsg('success', 'Credential updated.');
        await fetchCredentials();
      } else {
        showMsg('error', data.error || 'Failed to update credential.');
      }
    } catch {
      showMsg('error', 'Network error while updating credential.');
    } finally {
      setSaving(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete credential "${name}"? This cannot be undone.`)) return;
    setSaving(id);
    try {
      const res = await fetch(`/api/admin/ai/credentials?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showMsg('success', `Credential "${name}" deleted.`);
        await fetchCredentials();
      } else {
        const data = await res.json();
        showMsg('error', data.error || 'Failed to delete.');
      }
    } catch {
      showMsg('error', 'Network error while deleting.');
    } finally {
      setSaving(null);
    }
  };

  const handleTest = async (id: string) => {
    setTesting(id);
    setTestResults((prev) => ({
      ...prev,
      [id]: { ok: false, msg: 'Testing...' },
    }));
    try {
      const res = await fetch('/api/admin/ai/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test', id }),
      });
      const data = await res.json();
      setTestResults((prev) => ({
        ...prev,
        [id]: {
          ok: data.success,
          msg: data.message || data.error || 'Done',
          latency: data.latency_ms,
        },
      }));
      if (data.success) await fetchCredentials();
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [id]: { ok: false, msg: 'Network error during test.' },
      }));
    } finally {
      setTesting(null);
    }
  };

  const handleReset = async (id: string) => {
    setSaving(id);
    try {
      const res = await fetch('/api/admin/ai/credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset', id }),
      });
      if (res.ok) {
        showMsg('success', 'Health state reset to standby.');
        await fetchCredentials();
      }
    } catch {
      /* silently fail */
    } finally {
      setSaving(null);
    }
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const newCreds = [...credentials];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newCreds.length) return;
    [newCreds[index], newCreds[targetIndex]] = [
      newCreds[targetIndex],
      newCreds[index],
    ];
    const order = newCreds.map((c, i) => ({ id: c.id, priority: i + 1 }));
    setCredentials(newCreds.map((c, i) => ({ ...c, priority: i + 1 })));
    await fetch('/api/admin/ai/credentials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reorder', order }),
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading credentials...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold text-white">
            API Credentials
          </span>
          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-400">
            {credentials.length}
          </span>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add API Key
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === 'success'
              ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
              : 'border-red-500/20 bg-red-500/10 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="space-y-3 rounded-xl border border-blue-500/20 bg-blue-500/5 p-4">
          <h4 className="text-sm font-semibold text-white">
            New API Credential
          </h4>
          <div>
            <label className="mb-1 block text-xs text-gray-400">
              Display Name
            </label>
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={`e.g. ${providerName} Account A`}
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-400">API Key</label>
            <input
              type="password"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="Paste your API key here"
              className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              🔒 Stored securely server-side. Never exposed to the browser.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={saving === 'new'}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
            >
              {saving === 'new' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Save Credential
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewName('');
                setNewKey('');
              }}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {credentials.length === 0 && !showAddForm && (
        <div className="rounded-xl border border-dashed border-gray-700 p-6 text-center">
          <KeyRound className="mx-auto mb-2 h-8 w-8 text-gray-600" />
          <p className="text-sm text-gray-400">
            No credentials configured yet.
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Add API keys to enable multi-key failover. The system falls back to
            the legacy single key below until credentials are added.
          </p>
        </div>
      )}

      {/* Credential List */}
      {credentials.map((cred, index) => {
        const cfg = HEALTH_CONFIG[cred.health_status] || HEALTH_CONFIG.unknown;
        const isEditing = editingId === cred.id;
        const isSavingThis = saving === cred.id;
        const isTestingThis = testing === cred.id;
        const testResult = testResults[cred.id];
        const successRate =
          cred.total_requests > 0
            ? Math.round((cred.success_count / cred.total_requests) * 100)
            : null;

        return (
          <div
            key={cred.id}
            className={`rounded-xl border transition-all ${
              cred.health_status === 'healthy'
                ? 'border-emerald-500/20 bg-gray-800/60'
                : cred.health_status === 'invalid'
                  ? 'border-red-500/20 bg-red-500/5'
                  : cred.health_status === 'rate_limited' ||
                      cred.health_status === 'quota_exhausted'
                    ? 'border-amber-500/20 bg-amber-500/5'
                    : 'border-gray-700 bg-gray-800/40'
            }`}
          >
            {/* Card Header */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                {/* Priority badge */}
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-white">
                      {cred.display_name}
                    </span>
                    <StatusBadge status={cred.health_status} />
                    {!cred.is_enabled && (
                      <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-400">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-gray-500">
                    <span className="font-mono">
                      {cred.masked_key || '(No key stored)'}
                    </span>
                    {cred.total_requests > 0 && (
                      <span>
                        {cred.total_requests.toLocaleString()} requests
                      </span>
                    )}
                    {successRate !== null && (
                      <span
                        className={
                          successRate >= 90
                            ? 'text-emerald-500'
                            : successRate >= 70
                              ? 'text-amber-500'
                              : 'text-red-500'
                        }
                      >
                        {successRate}% success
                      </span>
                    )}
                    {cred.last_used_at && (
                      <span>
                        Last used {formatRelativeTime(cred.last_used_at)}
                      </span>
                    )}
                  </div>
                  {(cred.health_status === 'rate_limited' ||
                    cred.health_status === 'quota_exhausted' ||
                    cred.health_status === 'cooldown') &&
                    cred.cooldown_until && (
                      <div className="mt-1 text-xs text-amber-400">
                        ⏳ {formatCooldown(cred.cooldown_until)}
                      </div>
                    )}
                  {cred.health_status === 'invalid' && cred.last_error && (
                    <div className="mt-1 text-xs text-red-400">
                      ✕ {cred.last_error}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1">
                {/* Move up/down */}
                <button
                  onClick={() => handleMove(index, 'up')}
                  disabled={index === 0}
                  title="Increase priority"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-30"
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleMove(index, 'down')}
                  disabled={index === credentials.length - 1}
                  title="Decrease priority"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white disabled:opacity-30"
                >
                  <ChevronDown className="h-4 w-4" />
                </button>

                {/* Test */}
                <button
                  onClick={() => handleTest(cred.id)}
                  disabled={isTestingThis || !cred.has_key}
                  title="Test this credential"
                  className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/10 disabled:opacity-40"
                >
                  {isTestingThis ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                  Test
                </button>

                {/* Edit */}
                <button
                  onClick={() => {
                    setEditingId(isEditing ? null : cred.id);
                    setEditName(cred.display_name);
                    setEditKey('');
                    setEditEnabled(cred.is_enabled);
                  }}
                  title="Edit"
                  className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-700 hover:text-white"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>

                {/* Reset health */}
                {(cred.health_status === 'rate_limited' ||
                  cred.health_status === 'invalid' ||
                  cred.health_status === 'quota_exhausted') && (
                  <button
                    onClick={() => handleReset(cred.id)}
                    disabled={isSavingThis}
                    title="Reset health state"
                    className="rounded-lg p-1.5 text-amber-400 transition-colors hover:bg-amber-500/10"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={() => handleDelete(cred.id, cred.display_name)}
                  disabled={isSavingThis}
                  title="Delete credential"
                  className="rounded-lg p-1.5 text-red-400 transition-colors hover:bg-red-500/10"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Test result banner */}
            {testResult && (
              <div
                className={`mx-4 mb-3 rounded-lg px-3 py-2 text-xs ${
                  testResult.ok
                    ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                    : testing === cred.id
                      ? 'border border-blue-500/20 bg-blue-500/10 text-blue-400'
                      : 'border border-red-500/20 bg-red-500/10 text-red-400'
                }`}
              >
                {testResult.msg}
                {testResult.latency && ` (${testResult.latency}ms)`}
              </div>
            )}

            {/* Edit form */}
            {isEditing && (
              <div className="space-y-3 border-t border-gray-700 p-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">
                      Display Name
                    </label>
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs text-gray-400">
                      Replace API Key (optional)
                    </label>
                    <input
                      type="password"
                      value={editKey}
                      onChange={(e) => setEditKey(e.target.value)}
                      placeholder="Leave blank to keep existing key"
                      className="w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 font-mono text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editEnabled}
                    onChange={(e) => setEditEnabled(e.target.checked)}
                    className="h-4 w-4 accent-blue-500"
                  />
                  <span className="text-sm text-gray-300">Enabled</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(cred.id)}
                    disabled={isSavingThis}
                    className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:opacity-50"
                  >
                    {isSavingThis ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setEditingId(null);
                      setEditKey('');
                    }}
                    className="rounded-lg border border-gray-600 px-4 py-2 text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Summary row */}
      {credentials.length > 0 && (
        <div className="flex items-center gap-4 rounded-lg bg-gray-800/40 px-4 py-2.5 text-xs text-gray-400">
          <div className="flex items-center gap-1.5">
            <Activity className="h-3.5 w-3.5 text-blue-400" />
            <span>
              {credentials
                .reduce((s, c) => s + c.total_requests, 0)
                .toLocaleString()}{' '}
              total requests
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            <span>
              {
                credentials.filter(
                  (c) =>
                    c.health_status === 'healthy' ||
                    c.health_status === 'unknown'
                ).length
              }{' '}
              healthy
            </span>
          </div>
          {credentials.some(
            (c) =>
              c.health_status === 'rate_limited' ||
              c.health_status === 'quota_exhausted'
          ) && (
            <div className="flex items-center gap-1.5 text-amber-400">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {
                  credentials.filter(
                    (c) =>
                      c.health_status === 'rate_limited' ||
                      c.health_status === 'quota_exhausted'
                  ).length
                }{' '}
                in cooldown
              </span>
            </div>
          )}
          {credentials.some((c) => c.health_status === 'invalid') && (
            <div className="flex items-center gap-1.5 text-red-400">
              <XCircle className="h-3.5 w-3.5" />
              <span>
                {
                  credentials.filter((c) => c.health_status === 'invalid')
                    .length
                }{' '}
                invalid
              </span>
            </div>
          )}
          <div className="ml-auto text-gray-500">
            Priority 1 = highest (tried first)
          </div>
        </div>
      )}
    </div>
  );
}
