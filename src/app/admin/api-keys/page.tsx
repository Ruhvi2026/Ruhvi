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
  ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { RESOURCES, PERMISSION_LEVELS } from '@/lib/api-keys';
import type { ResourceKey, PermissionLevel } from '@/lib/api-keys';

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

type ScopeMap = Partial<Record<ResourceKey, PermissionLevel>>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function fmtDate(iso: string | null): string {
  if (!iso) return 'â€”';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function scopeMapToList(map: ScopeMap): string[] {
  return Object.entries(map)
    .filter(([, level]) => level && level !== 'none')
    .map(([resource, level]) => `${resource}:${level}`);
}

function scopeListToMap(scopes: string[]): ScopeMap {
  const map: ScopeMap = {};
  scopes.forEach((s) => {
    const [res, lvl] = s.split(':');
    if (res && lvl) map[res as ResourceKey] = lvl as PermissionLevel;
  });
  return map;
}

const LEVEL_COLORS: Record<string, string> = {
  read: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  write: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  read_write: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  admin: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
};

// ---------------------------------------------------------------------------
// StatusBadge
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

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
      }
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
// Permission Dropdown (per-resource)
// ---------------------------------------------------------------------------
function PermissionDropdown({
  resource,
  value,
  onChange,
}: {
  resource: ResourceKey;
  value: PermissionLevel;
  onChange: (resource: ResourceKey, level: PermissionLevel) => void;
}) {
  const colorMap: Record<string, string> = {
    none: 'text-slate-500',
    read: 'text-blue-400',
    write: 'text-orange-400',
    read_write: 'text-emerald-400',
    admin: 'text-rose-400',
  };

  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(resource, e.target.value as PermissionLevel)}
        className={`w-full appearance-none rounded-lg border border-white/10 bg-white/5 py-1.5 pl-3 pr-7 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-emerald-500/30 ${colorMap[value] ?? 'text-slate-500'}`}
      >
        {PERMISSION_LEVELS.map((level) => (
          <option
            key={level.value}
            value={level.value}
            className="bg-[#0d1117] text-white"
          >
            {level.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Key Reveal Modal
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-amber-500/30 bg-[#131726] p-6 shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <h3 className="font-semibold text-white">Copy your API key now</h3>
            <p className="mt-1 text-xs text-slate-400">
              This is the <strong className="text-amber-300">only time</strong>{' '}
              this key will be shown. After closing, store it in a secure secret
              manager.
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
              {visible ? rawKey : rawKey.slice(0, 12) + 'â€¢'.repeat(40)}
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
            onClick={() =>
              navigator.clipboard.writeText(rawKey).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" /> Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" /> Copy Key
              </>
            )}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Key Modal â€” Grouped Resources + Permission Dropdowns
// ---------------------------------------------------------------------------
function CreateKeyModal({
  onCreated,
  onClose,
}: {
  onCreated: (rawKey: string) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [scopeMap, setScopeMap] = useState<ScopeMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePermissionChange = (
    resource: ResourceKey,
    level: PermissionLevel
  ) => {
    setScopeMap((prev) => {
      const next = { ...prev };
      if (level === 'none') {
        delete next[resource];
      } else {
        next[resource] = level;
      }
      return next;
    });
  };

  const activeCount = Object.keys(scopeMap).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('Name is required');
    const scopes = scopeMapToList(scopeMap);
    if (scopes.length === 0)
      return setError('Grant at least one resource permission');

    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), scopes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      onCreated(data.rawKey);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-white/10 bg-[#0d1117] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div>
            <h3 className="font-semibold text-white">Generate New API Key</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              Set a permission level for each resource. Scopes are immutable
              after creation.
            </p>
          </div>
          <button onClick={onClose} className="text-slate-500 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {/* Name */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Key Name / Label
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. n8n â€” blog publishing"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/30"
            />
          </div>

          {/* Resource permission table */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">
                Resource Permissions
              </label>
              {activeCount > 0 && (
                <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                  {activeCount} resource{activeCount !== 1 ? 's' : ''} granted
                </span>
              )}
            </div>

            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/5 bg-white/[0.02]">
                    <th className="px-4 py-2.5 text-left font-medium text-slate-500">
                      Resource
                    </th>
                    <th className="w-44 px-4 py-2.5 text-left font-medium text-slate-500">
                      Permission Level
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {RESOURCES.map((resource) => {
                    const level = scopeMap[resource.key] ?? 'none';
                    return (
                      <tr
                        key={resource.key}
                        className={`transition-colors ${
                          level !== 'none'
                            ? 'bg-emerald-500/[0.03]'
                            : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="px-4 py-2.5">
                          <span
                            className={`font-medium ${level !== 'none' ? 'text-white' : 'text-slate-400'}`}
                          >
                            {resource.label}
                          </span>
                        </td>
                        <td className="w-44 px-4 py-2.5">
                          <PermissionDropdown
                            resource={resource.key}
                            value={level as PermissionLevel}
                            onChange={handlePermissionChange}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {error && (
            <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 border-t border-white/5 px-5 py-4">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading
              ? 'Generatingâ€¦'
              : `Generate Key${activeCount > 0 ? ` (${activeCount} resources)` : ''}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/10 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScopePills â€” compact display of a key's granted permissions
// ---------------------------------------------------------------------------
function ScopePills({ scopes }: { scopes: string[] }) {
  const map = scopeListToMap(scopes);
  const entries = Object.entries(map);
  if (entries.length === 0)
    return <span className="text-[10px] text-slate-600">â€”</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.map(([res, lvl]) => {
        const label = RESOURCES.find((r) => r.key === res)?.label ?? res;
        const levelLabel =
          PERMISSION_LEVELS.find((p) => p.value === lvl)?.label ?? lvl;
        return (
          <span
            key={res}
            className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${
              LEVEL_COLORS[lvl] ??
              'border-slate-500/20 bg-slate-500/10 text-slate-400'
            }`}
          >
            {label}
            <span className="opacity-50">Â·</span>
            {levelLabel}
          </span>
        );
      })}
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

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'revoked'
  >('all');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>(
    RESOURCES[0]?.key || 'blog'
  );

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/api-keys');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setKeys(data.keys);
    } catch (err: unknown) {
      toast.error(
        `Failed to load keys: ${err instanceof Error ? err.message : String(err)}`
      );
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

  const handleRevoke = async (
    keyId: string,
    keyName: string,
    force = false
  ) => {
    if (
      !confirm(
        `${force ? 'Permanently delete' : 'Revoke key'} "${keyName}"? This cannot be undone.`
      )
    )
      return;
    setRevoking(keyId);
    try {
      const res = await fetch(
        `/api/admin/api-keys?id=${keyId}${force ? '&force=true' : ''}`,
        {
          method: 'DELETE',
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Key "${keyName}" ${force ? 'deleted' : 'revoked'}`);
      fetchKeys();
    } catch (err: unknown) {
      toast.error(
        `Revoke failed: ${err instanceof Error ? err.message : String(err)}`
      );
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
            immutable after creation.
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

      {/* Endpoint info */}
      <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-cyan-400">
            External Endpoint
          </p>
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="rounded-lg border border-white/10 bg-[#131726] px-2 py-1 text-xs text-white focus:border-emerald-500 focus:outline-none"
          >
            {RESOURCES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <code className="text-xs text-slate-300">
            POST https://ruhvi.in/api/external/{selectedEndpoint}
          </code>
          <CopyButton
            text={`https://ruhvi.in/api/external/${selectedEndpoint}`}
          />
        </div>
        <p className="mt-1.5 text-[10px] text-slate-500">
          Pass the key as{' '}
          <code className="rounded bg-white/5 px-1">
            Authorization: Bearer {'<key>'}
          </code>
        </p>
      </div>

      {/* Filters and Permission Legend */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERMISSION_LEVELS.filter((p) => p.value !== 'none').map((p) => (
            <span
              key={p.value}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] font-semibold ${LEVEL_COLORS[p.value] ?? ''}`}
            >
              {p.label}
              <span className="font-normal opacity-60">· {p.description}</span>
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white focus:border-emerald-500 focus:outline-none [&>option]:bg-slate-900"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>
        </div>
      </div>

      {/* Keys table */}
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
                  <th className="px-4 py-3 text-left font-medium">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                  <th className="px-4 py-3 text-left font-medium">Last Used</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {keys
                  .filter((k) => {
                    if (statusFilter === 'active' && k.revoked_at) return false;
                    if (statusFilter === 'revoked' && !k.revoked_at)
                      return false;
                    if (search) {
                      const q = search.toLowerCase();
                      return (
                        k.name.toLowerCase().includes(q) ||
                        k.key_prefix.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .map((key) => (
                    <tr
                      key={key.id}
                      className="group border-b border-white/5 transition-colors last:border-0 hover:bg-white/5"
                    >
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">
                          {key.name}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <code className="rounded bg-white/5 px-2 py-1 text-slate-300">
                          {key.key_prefix}
                        </code>
                      </td>
                      <td className="px-6 py-4 text-slate-400">
                        <ScopePills scopes={key.scopes} />
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge revokedAt={key.revoked_at} />
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {fmtDate(key.created_at)}
                      </td>
                      <td className="px-6 py-4 text-slate-500">
                        {fmtDate(key.last_used_at)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!key.revoked_at ? (
                          <button
                            onClick={() => handleRevoke(key.id, key.name)}
                            disabled={revoking === key.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-orange-500/20 px-3 py-1.5 text-xs font-semibold text-orange-400 opacity-0 transition-all hover:bg-orange-500/10 hover:text-orange-300 disabled:opacity-50 group-hover:opacity-100"
                          >
                            {revoking === key.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <ShieldOff className="h-3.5 w-3.5" />
                            )}
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(key.id, key.name, true)}
                            disabled={revoking === key.id}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-1.5 text-xs font-semibold text-red-400 opacity-0 transition-all hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50 group-hover:opacity-100"
                          >
                            {revoking === key.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <X className="h-3.5 w-3.5" />
                            )}
                            Delete
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
