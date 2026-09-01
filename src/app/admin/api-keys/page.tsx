'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Plus,
  RefreshCw,
  Copy,
  Check,
  ShieldOff,
  AlertTriangle,
  X,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ApiKeyRecord {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  created_at: string;
  created_by: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
}

const ALL_SCOPES = [
  {
    value: 'blog:write',
    label: 'Blog → Write',
    description: 'Create blog posts',
  },
  { value: 'blog:read', label: 'Blog → Read', description: 'Read blog posts' },
  {
    value: 'orders:read',
    label: 'Orders → Read',
    description: 'Read order data',
  },
  {
    value: 'orders:write',
    label: 'Orders → Write',
    description: 'Create / update orders',
  },
  {
    value: 'inventory:read',
    label: 'Inventory → Read',
    description: 'Read stock levels',
  },
  {
    value: 'inventory:write',
    label: 'Inventory → Write',
    description: 'Adjust inventory',
  },
  {
    value: 'support:read',
    label: 'Support → Read',
    description: 'Read support tickets',
  },
  {
    value: 'support:write',
    label: 'Support → Write',
    description: 'Create support tickets',
  },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatusBadge({ revokedAt }: { revokedAt: string | null }) {
  if (revokedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-rose-400">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
        Revoked
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-400">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
      Active
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      title="Copy"
      className="ml-2 rounded p-1 text-slate-500 transition-colors hover:text-emerald-400"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-emerald-400" />
      ) : (
        <Copy className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// One-Time Key Reveal Modal
// ---------------------------------------------------------------------------
function KeyRevealModal({
  rawKey,
  onClose,
}: {
  rawKey: string;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#131726] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <h3 className="font-semibold text-white">Copy your API key now</h3>
            <p className="mt-1 text-xs text-slate-400">
              This is the <strong className="text-amber-300">only time</strong>{' '}
              this key will be shown. After closing this dialog, it cannot be
              retrieved. Store it in a secure secrets manager.
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-500 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 rounded-lg border border-white/10 bg-[#0d0f1a] p-3">
          <div className="flex items-center justify-between gap-2">
            <code className="flex-1 break-all font-mono text-xs text-emerald-300">
              {visible ? rawKey : rawKey.slice(0, 12) + '•'.repeat(40)}
            </code>
            <button
              onClick={() => setVisible((v) => !v)}
              className="flex-shrink-0 text-slate-500 hover:text-white"
              title={visible ? 'Hide' : 'Reveal'}
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={copy}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Key
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:border-white/20 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Key Modal
// ---------------------------------------------------------------------------
function CreateKeyModal({
  onCreated,
  onClose,
}: {
  onCreated: (rawKey: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required');
    if (selectedScopes.length === 0)
      return setError('Select at least one scope');

    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes: selectedScopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onCreated(data.rawKey);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-white/10 bg-[#131726] p-6 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="font-semibold text-white">Generate New API Key</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Key Name / Label
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. n8n — blog publishing"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-medium text-slate-400">
              Scopes (immutable after creation)
            </label>
            <div className="space-y-2">
              {ALL_SCOPES.map((scope) => (
                <label
                  key={scope.value}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    selectedScopes.includes(scope.value)
                      ? 'border-emerald-500/40 bg-emerald-500/5'
                      : 'border-white/5 hover:border-white/10'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="mt-0.5 accent-emerald-500"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">
                      {scope.label}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {scope.description}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {loading ? 'Generating…' : 'Generate Key'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys);
    } catch (err: any) {
      toast.error(`Failed to load keys: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreated = (rawKey: string) => {
    setShowCreate(false);
    setNewRawKey(rawKey);
    fetchKeys();
  };

  const handleRevoke = async (keyId: string, keyName: string) => {
    if (!confirm(`Revoke key "${keyName}"? This cannot be undone.`)) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/admin/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Key "${keyName}" revoked`);
      fetchKeys();
    } catch (err: any) {
      toast.error(`Revoke failed: ${err.message}`);
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">API Keys</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Machine-to-machine keys for external tools (e.g. n8n). Scopes are
            immutable.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchKeys}
            title="Refresh"
            className="rounded-lg border border-white/10 p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            <Plus className="h-4 w-4" />
            New Key
          </button>
        </div>
      </div>

      {/* API Base URL info card */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <p className="text-xs font-semibold text-cyan-400">External Endpoint</p>
        <div className="mt-1 flex items-center gap-1">
          <code className="text-xs text-slate-300">
            POST https://ruhvi.in/api/external/blog
          </code>
          <CopyButton text="https://ruhvi.in/api/external/blog" />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Pass the key as{' '}
          <code className="rounded bg-white/5 px-1">
            Authorization: Bearer {'<key>'}
          </code>
        </p>
      </div>

      {/* Keys Table */}
      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-emerald-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-16 text-center">
            <KeyRound className="mx-auto h-8 w-8 text-slate-700" />
            <p className="mt-3 text-sm text-slate-500">No API keys yet</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
            >
              <Plus className="h-4 w-4" />
              Generate your first key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5 text-slate-500">
                  <th className="px-4 py-3 text-left font-medium">Name</th>
                  <th className="px-4 py-3 text-left font-medium">
                    Key Prefix
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Scopes</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {keys.map((key) => (
                  <tr
                    key={key.id}
                    className="group transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-3 font-medium text-white">
                      {key.name}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center">
                        <code className="rounded bg-white/5 px-1.5 py-0.5 font-mono text-slate-400">
                          {key.key_prefix}
                        </code>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {key.scopes.map((s) => (
                          <span
                            key={s}
                            className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-[10px] font-semibold text-indigo-400"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge revokedAt={key.revoked_at} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {fmtDate(key.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {fmtDate(key.last_used_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!key.revoked_at && (
                        <button
                          onClick={() => handleRevoke(key.id, key.name)}
                          disabled={revoking === key.id}
                          title="Revoke key"
                          className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 px-2.5 py-1.5 text-[10px] font-semibold text-rose-400 opacity-0 transition-all hover:bg-rose-500/10 disabled:opacity-50 group-hover:opacity-100"
                        >
                          {revoking === key.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldOff className="h-3 w-3" />
                          )}
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreate && (
        <CreateKeyModal
          onCreated={handleCreated}
          onClose={() => setShowCreate(false)}
        />
      )}
      {newRawKey && (
        <KeyRevealModal rawKey={newRawKey} onClose={() => setNewRawKey(null)} />
      )}
    </div>
  );
}
