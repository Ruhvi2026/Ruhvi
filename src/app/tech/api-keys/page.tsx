'use client';

/**
 * /tech/api-keys — API Key Management for the Tech portal.
 * Shares the same backend as admin.
 */

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
  Shield,
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
  if (!iso) return '—';
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
// StatusBadge — tech portal colours
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
      className="ml-1 text-slate-500 hover:text-tech-primary dark:text-slate-500"
    >
      {copied ? (
        <Check className="h-3.5 w-3.5 text-tech-primary" />
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
        className={`w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-7 font-mono text-xs transition-colors focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 ${colorMap[value] ?? 'text-slate-600'}`}
      >
        {PERMISSION_LEVELS.map((level) => (
          <option
            key={level.value}
            value={level.value}
            className="bg-[#0f0f17] text-slate-900 dark:text-white"
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
      <div className="mx-4 w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-tech-card">
        <div className="mb-4 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white">
              Store this key now
            </p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
              This is the <span className="text-amber-300">only time</span> the
              raw key is shown. Save it in a secret manager (e.g. n8n
              credentials, Vault).
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all font-mono text-xs text-cyan-300">
              {visible ? rawKey : rawKey.slice(0, 14) + '•'.repeat(38)}
            </code>
            <button
              onClick={() => setVisible((v) => !v)}
              className="text-slate-500 hover:text-tech-primary dark:text-slate-500"
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
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-500 dark:text-white"
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
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:text-white"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create Key Modal — Grouped Resources + Permission Dropdowns
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
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-white/10 dark:bg-tech-card">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4 dark:border-tech-border">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <Terminal className="h-4 w-4 text-tech-primary" />
            <span className="text-sm font-semibold">Generate API Key</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-500 dark:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
              Label
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="n8n — blog publishing"
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                Resource Permissions
              </label>
              {activeCount > 0 && (
                <span className="rounded bg-tech-primary/10 px-2 py-0.5 text-[10px] text-tech-primary">
                  {activeCount} granted
                </span>
              )}
            </div>
            <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-white/10">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-white/5">
                    <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      Resource
                    </th>
                    <th className="w-40 px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest text-slate-600 dark:text-slate-400">
                      Permission
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {RESOURCES.map((resource) => {
                    const level = scopeMap[resource.key] ?? 'none';
                    return (
                      <tr
                        key={resource.key}
                        className={`transition-colors ${level !== 'none' ? 'bg-cyan-500/5' : 'hover:bg-gray-50 dark:bg-white/5'}`}
                      >
                        <td className="px-4 py-2">
                          <span
                            className={
                              level !== 'none'
                                ? 'text-cyan-300'
                                : 'text-slate-500 dark:text-slate-500'
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
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
              Error: {error}
            </p>
          )}
        </div>

        <div className="flex gap-3 border-t border-gray-200 px-5 py-4 dark:border-tech-border">
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-sm font-semibold text-slate-900 hover:bg-cyan-500 disabled:opacity-50 dark:text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="h-4 w-4" />
            )}
            {loading
              ? 'Generating…'
              : `Generate${activeCount > 0 ? ` (${activeCount} resources)` : ''}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm text-slate-600 hover:text-slate-900 dark:border-white/10 dark:text-slate-400 dark:text-white"
          >
            Cancel
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
    return <span className="text-[10px] text-slate-600">—</span>;
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
              'border-slate-700 bg-slate-800 text-slate-600 dark:text-slate-400'
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
  const [revoking, setRevoking] = useState<string | null>(null);

  // New Filters
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
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleRevoke = async (
    keyId: string,
    keyName: string,
    force = false
  ) => {
    if (
      !confirm(
        `${force ? 'Permanently delete' : 'Revoke'} "${keyName}"? This cannot be undone.`
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
      toast.success(`"${keyName}" ${force ? 'deleted' : 'revoked'}`);
      fetchKeys();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <KeyRound className="h-6 w-6 text-tech-primary" />
            API Keys
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Machine-to-machine authentication. Scopes are immutable after
            creation.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchKeys}
            className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-slate-600 transition-colors hover:bg-white hover:text-slate-900 dark:border-white/10 dark:bg-white/10 dark:bg-white/5 dark:text-slate-400 dark:text-white"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Read-only notice — key creation & permission management is admin-only */}
      <div className="flex items-center gap-3 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3.5">
        <Shield className="h-4 w-4 flex-shrink-0 text-cyan-400" />
        <p className="text-xs text-slate-400 dark:text-slate-400">
          This portal is <strong className="text-cyan-300">read-only</strong>.
          API key generation and permission management are handled in the{' '}
          <Link
            href="https://admin.ruhvi.in/admin/api-keys"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
          >
            Admin Panel
          </Link>
          .
        </p>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 text-xs dark:border-tech-border dark:bg-tech-card">
        <div className="flex items-center justify-between">
          <span className="font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">
            External Endpoint
          </span>
          <select
            value={selectedEndpoint}
            onChange={(e) => setSelectedEndpoint(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {RESOURCES.map((r) => (
              <option key={r.key} value={r.key}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex items-center">
          <span className="text-slate-500 dark:text-slate-500">POST</span>
          <code className="ml-2 font-mono text-tech-primary">
            https://ruhvi.in/api/external/{selectedEndpoint}
          </code>
          <CopyBtn text={`https://ruhvi.in/api/external/${selectedEndpoint}`} />
        </div>
        <div className="mt-1 text-slate-500 dark:text-slate-500">
          Authorization: Bearer {'<key>'}
        </div>
      </div>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {PERMISSION_LEVELS.filter((p) => p.value !== 'none').map((p) => (
            <span
              key={p.value}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-[10px] ${LEVEL_COLORS[p.value] ?? ''}`}
            >
              {p.label}
              <span className="opacity-50">·</span>
              <span className="opacity-60">{p.description}</span>
            </span>
          ))}
        </div>

        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search keys..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-slate-900 placeholder-slate-500 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'all' | 'active' | 'revoked')
            }
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-slate-900 focus:border-cyan-500 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="revoked">Revoked Only</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-tech-border dark:bg-tech-card">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center text-sm text-slate-600 dark:text-slate-400">
            <p>No API keys found.</p>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-500">
              Key management is available in{' '}
              <Link
                href="https://admin.ruhvi.in/admin/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
              >
                Admin Panel
              </Link>
              .
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-[10px] uppercase tracking-wider text-slate-600 dark:border-tech-border dark:bg-white/5 dark:text-slate-400">
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Prefix</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Permissions
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Created</th>
                  <th className="px-4 py-3 text-left font-semibold">
                    Last Used
                  </th>
                  <th className="px-4 py-3 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
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
                      className="group hover:bg-gray-50 dark:bg-white/5"
                    >
                      <td className="px-4 py-3 text-slate-900 dark:text-slate-200">
                        {key.name}
                      </td>
                      <td className="px-4 py-3">
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-tech-primary dark:bg-white/10">
                          {key.key_prefix}
                        </code>
                      </td>
                      <td className="max-w-xs px-4 py-3">
                        <ScopePills scopes={key.scopes} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge revokedAt={key.revoked_at} />
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-500">
                        {fmtDate(key.created_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-500 dark:text-slate-500">
                        {fmtDate(key.last_used_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!key.revoked_at ? (
                          <button
                            onClick={() => handleRevoke(key.id, key.name)}
                            disabled={revoking === key.id}
                            className="inline-flex items-center gap-1 rounded border border-orange-900/40 px-2 py-1 text-[10px] text-orange-400 opacity-0 transition-opacity hover:bg-orange-500/10 disabled:opacity-40 group-hover:opacity-100"
                          >
                            {revoking === key.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <ShieldOff className="h-3 w-3" />
                            )}
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRevoke(key.id, key.name, true)}
                            disabled={revoking === key.id}
                            className="inline-flex items-center gap-1 rounded border border-red-900/40 px-2 py-1 text-[10px] text-red-400 opacity-0 transition-opacity hover:bg-red-500/10 disabled:opacity-40 group-hover:opacity-100"
                          >
                            {revoking === key.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <X className="h-3 w-3" />
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
    </div>
  );
}
