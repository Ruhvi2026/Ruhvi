'use client';

/**
 * /tech/api-keys â€” API Key Management for the Tech portal.
 * Terminal/monospace aesthetic. Shares the same backend as admin.
 */

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
  Terminal,
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
  read: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
  write: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
  read_write: 'bg-emerald-900/30 text-emerald-400 border-emerald-800/50',
  admin: 'bg-red-900/30 text-red-400 border-red-800/50',
};

// ---------------------------------------------------------------------------
// StatusBadge â€” tech portal colours
// ---------------------------------------------------------------------------
function StatusBadge({ revokedAt }: { revokedAt: string | null }) {
  if (revokedAt) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-red-800/50 bg-red-900/20 px-1.5 py-0.5 font-mono text-[10px] text-red-400">
        REVOKED
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded border border-emerald-800/50 bg-emerald-900/20 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400">
      <span className="h-1 w-1 animate-pulse rounded-full bg-emerald-400" />
      ACTIVE
    </span>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() =>
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
      }
      className="ml-1 text-slate-600 hover:text-cyan-400"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-cyan-400" />
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
    none: 'text-slate-600',
    read: 'text-blue-400',
    write: 'text-orange-400',
    read_write: 'text-emerald-400',
    admin: 'text-red-400',
  };
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(resource, e.target.value as PermissionLevel)}
        className={`w-full appearance-none rounded border border-slate-700 bg-slate-950 py-1.5 pl-3 pr-7 font-mono text-xs transition-colors focus:border-cyan-700 focus:outline-none ${colorMap[value] ?? 'text-slate-600'}`}
      >
        {PERMISSION_LEVELS.map((level) => (
          <option
            key={level.value}
            value={level.value}
            className="bg-slate-900 text-white"
          >
            {level.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-600" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-amber-700/40 bg-slate-900 p-6 font-mono shadow-2xl">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-white">Store this key now</p>
            <p className="mt-1 text-xs text-slate-400">
              This is the <span className="text-amber-300">only time</span> the
              raw key is shown. Save it in a secret manager (e.g. n8n
              credentials, Vault).
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-600 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 rounded border border-cyan-900/50 bg-slate-950 p-3">
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all text-xs text-cyan-300">
              {visible ? rawKey : rawKey.slice(0, 14) + 'â€¢'.repeat(38)}
            </code>
            <button
              onClick={() => setVisible((v) => !v)}
              className="text-slate-600 hover:text-cyan-400"
            >
              {visible ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={() =>
              navigator.clipboard.writeText(rawKey).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              })
            }
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-700 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600"
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
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-400 hover:text-white"
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

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) return setError('name is required');
    const scopes = scopeMapToList(scopeMap);
    if (!scopes.length)
      return setError('grant at least one resource permission');
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-cyan-900/50 bg-slate-900 font-mono shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2 text-cyan-400">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-semibold">generate_api_key</span>
          </div>
          <button onClick={onClose} className="text-slate-600 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-widest text-cyan-700">
              Label
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="n8n â€” blog publishing"
              className="w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-cyan-700 focus:outline-none"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-widest text-cyan-700">
                Resource Permissions
              </label>
              {activeCount > 0 && (
                <span className="rounded bg-cyan-900/30 px-2 py-0.5 text-[10px] text-cyan-400">
                  {activeCount} granted
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded border border-slate-800">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-800/30">
                    <th className="px-4 py-2 text-left text-[10px] uppercase tracking-widest text-slate-600">
                      resource
                    </th>
                    <th className="w-40 px-4 py-2 text-left text-[10px] uppercase tracking-widest text-slate-600">
                      permission
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {RESOURCES.map((resource) => {
                    const level = scopeMap[resource.key] ?? 'none';
                    return (
                      <tr
                        key={resource.key}
                        className={`transition-colors ${level !== 'none' ? 'bg-cyan-950/20' : 'hover:bg-slate-800/20'}`}
                      >
                        <td className="px-4 py-2">
                          <span
                            className={
                              level !== 'none'
                                ? 'text-cyan-300'
                                : 'text-slate-500'
                            }
                          >
                            {resource.label}
                          </span>
                        </td>
                        <td className="w-40 px-4 py-2">
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
            <p className="rounded border border-red-800/50 bg-red-900/20 px-3 py-2 text-xs text-red-400">
              error: {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-slate-800 px-5 py-4">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-700 py-2.5 text-sm font-semibold text-white hover:bg-cyan-600 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading
              ? 'Generatingâ€¦'
              : `Generate${activeCount > 0 ? ` (${activeCount} resources)` : ''}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm text-slate-500 hover:text-white"
          >
            cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ScopePills
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
              'border-slate-700 bg-slate-800 text-slate-400'
            }`}
          >
            {label}
            <span className="opacity-40">Â·</span>
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
export default function TechApiKeysPage() {
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
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
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
    if (!confirm(`Revoke "${keyName}"? This cannot be undone.`)) return;
    setRevoking(keyId);
    try {
      const res = await fetch(`/api/admin/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`"${keyName}" revoked`);
      fetchKeys();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6 font-mono">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-cyan-400">
            <KeyRound className="h-5 w-5" />
            api_keys
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Machine-to-machine auth. Scopes immutable after creation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchKeys}
            className="rounded border border-slate-700 p-2 text-slate-500 hover:border-cyan-700 hover:text-cyan-400"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded border border-cyan-700/50 bg-cyan-950/30 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-900/40"
          >
            <Plus className="h-4 w-4" /> new key
          </button>
        </div>
      </div>

      <div className="rounded border border-cyan-900/50 bg-slate-900/50 p-4 text-xs">
        <span className="text-cyan-700">{'//'} external endpoint</span>
        <div className="mt-1 flex items-center">
          <span className="text-slate-500">POST </span>
          <code className="ml-2 text-cyan-300">
            https://ruhvi.in/api/external/blog
          </code>
          <CopyBtn text="https://ruhvi.in/api/external/blog" />
        </div>
        <div className="mt-1 text-slate-600">
          Authorization: Bearer {'<key>'}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {PERMISSION_LEVELS.filter((p) => p.value !== 'none').map((p) => (
          <span
            key={p.value}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${LEVEL_COLORS[p.value] ?? ''}`}
          >
            {p.label}
            <span className="opacity-50">â€”</span>
            <span className="opacity-60">{p.description}</span>
          </span>
        ))}
      </div>

      <div className="overflow-hidden rounded border border-slate-800 bg-slate-900">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-600">
            <p>{'//'} no keys found</p>
            <button
              onClick={() => setShowCreate(true)}
              className="mt-4 inline-flex items-center gap-2 rounded border border-cyan-700/50 px-3 py-2 text-xs text-cyan-400 hover:bg-cyan-950/30"
            >
              <Plus className="h-3.5 w-3.5" /> generate first key
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[10px] uppercase tracking-widest text-slate-600">
                  <th className="px-4 py-3 text-left">name</th>
                  <th className="px-4 py-3 text-left">prefix</th>
                  <th className="px-4 py-3 text-left">permissions</th>
                  <th className="px-4 py-3 text-left">status</th>
                  <th className="px-4 py-3 text-left">created</th>
                  <th className="px-4 py-3 text-left">last_used</th>
                  <th className="px-4 py-3 text-right">_</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {keys.map((key) => (
                  <tr key={key.id} className="group hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-300">{key.name}</td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-slate-800 px-1.5 py-0.5 text-cyan-400">
                        {key.key_prefix}
                      </code>
                    </td>
                    <td className="max-w-xs px-4 py-3">
                      <ScopePills scopes={key.scopes} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge revokedAt={key.revoked_at} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(key.created_at)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {fmtDate(key.last_used_at)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!key.revoked_at && (
                        <button
                          onClick={() => handleRevoke(key.id, key.name)}
                          disabled={revoking === key.id}
                          className="inline-flex items-center gap-1 rounded border border-red-900/40 px-2 py-1 text-[10px] text-red-500 opacity-0 transition-opacity hover:bg-red-900/20 disabled:opacity-40 group-hover:opacity-100"
                        >
                          {revoking === key.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <ShieldOff className="h-3 w-3" />
                          )}
                          revoke
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
