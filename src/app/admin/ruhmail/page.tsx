'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Users,
  Shield,
  Plus,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Inbox,
  Send,
  Sliders,
  Sparkles,
  ArrowRight,
  HardDrive,
  Download,
  FileText,
} from 'lucide-react';
import type {
  RuhMailbox,
  RuhMailRoutingRule,
  RuhMailDriveFile,
} from '@/types/mailbox';

interface Stats {
  totalMailboxes: number;
  totalRules: number;
  totalSignatures: number;
  inboundMessages: number;
  outboundMessages: number;
  unreadMessages: number;
}

export default function RuhMailAdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'mailboxes' | 'rules' | 'drive' | 'seed'
  >('overview');
  const [stats, setStats] = useState<Stats | null>(null);
  const [mailboxes, setMailboxes] = useState<RuhMailbox[]>([]);
  const [rules, setRules] = useState<RuhMailRoutingRule[]>([]);
  const [driveFiles, setDriveFiles] = useState<RuhMailDriveFile[]>([]);
  const [loading, setLoading] = useState(true);

  // Drive state
  const [uploading, setUploading] = useState(false);

  // New Mailbox Form
  const [newLocalPart, setNewLocalPart] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newType, setNewType] = useState<'personal' | 'shared'>('personal');
  const [creatingMailbox, setCreatingMailbox] = useState(false);

  // New Rule Form
  const [newRuleField, setNewRuleField] = useState<
    'from' | 'to' | 'subject' | 'has_attachment'
  >('from');
  const [newRuleOp, setNewRuleOp] = useState<
    'contains' | 'equals' | 'starts_with'
  >('contains');
  const [newRuleVal, setNewRuleVal] = useState('');
  const [newRuleAction, setNewRuleAction] = useState<
    'forward' | 'label' | 'assign' | 'reject'
  >('assign');
  const [newRuleActionVal, setNewRuleActionVal] = useState('support@ruhvi.in');
  const [creatingRule, setCreatingRule] = useState(false);

  // Seed response
  const [seedResult, setSeedResult] = useState<any>(null);
  const [seeding, setSeeding] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [resStats, resAccounts, resRules, resDrive] = await Promise.all([
        fetch('/api/mailbox/admin').then((r) => r.json()),
        fetch('/api/mailbox/accounts').then((r) => r.json()),
        fetch('/api/mailbox/routing').then((r) => r.json()),
        fetch('/api/mailbox/drive/files').then((r) => r.json()),
      ]);

      if (resStats.success) setStats(resStats.stats);
      if (resAccounts.success) setMailboxes(resAccounts.mailboxes);
      if (resRules.success) setRules(resRules.rules);
      if (resDrive.success) setDriveFiles(resDrive.files);
    } catch (err) {
      console.error('Failed to load RuhMail data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/mailbox/drive/upload', {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDriveFile = async (id: string) => {
    if (!confirm('Delete this file from RuhMail Drive?')) return;
    try {
      const res = await fetch(`/api/mailbox/drive/files?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch {
      alert('Delete failed');
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateMailbox = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLocalPart.trim()) return;

    try {
      setCreatingMailbox(true);
      const res = await fetch('/api/mailbox/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          local_part: newLocalPart,
          display_name: newDisplayName,
          mailbox_type: newType,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewLocalPart('');
        setNewDisplayName('');
        loadData();
      } else {
        alert(data.error || 'Failed to create mailbox');
      }
    } catch (err) {
      alert('Error creating mailbox');
    } finally {
      setCreatingMailbox(false);
    }
  };

  const handleDeleteMailbox = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this mailbox?')) return;
    try {
      const res = await fetch(`/api/mailbox/admin?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      } else {
        alert(data.error || 'Failed to deactivate');
      }
    } catch (err) {
      alert('Failed to delete mailbox');
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleVal.trim() || !newRuleActionVal.trim()) return;

    try {
      setCreatingRule(true);
      const res = await fetch('/api/mailbox/routing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition_field: newRuleField,
          condition_op: newRuleOp,
          condition_value: newRuleVal,
          action: newRuleAction,
          action_value: newRuleActionVal,
          priority: 100,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setNewRuleVal('');
        loadData();
      } else {
        alert(data.error || 'Failed to create rule');
      }
    } catch (err) {
      alert('Error creating rule');
    } finally {
      setCreatingRule(false);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm('Delete this routing rule?')) return;
    try {
      const res = await fetch(`/api/mailbox/routing?id=${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        loadData();
      }
    } catch (err) {
      alert('Error deleting rule');
    }
  };

  const handleRunSeed = async () => {
    try {
      setSeeding(true);
      const res = await fetch('/api/mailbox/admin/seed-mailboxes');
      const data = await res.json();
      setSeedResult(data);
      loadData();
    } catch (err) {
      alert('Seed failed');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0d121f] p-6 text-slate-200 sm:p-8">
      {/* Top Header */}
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 shadow-lg shadow-emerald-500/20">
                <Mail className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
                  RuhMail Console
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-400">
                    Self-Hosted Team Engine
                  </span>
                </h1>
                <p className="mt-0.5 text-xs text-slate-400">
                  100% Native Workspace replacing Mailflare Team Licensing.
                  Governed by Cloudflare D1 & R2.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10 active:scale-95"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
              />
              Refresh
            </button>
            <button
              onClick={handleRunSeed}
              disabled={seeding}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 active:scale-95"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {seeding ? 'Seeding Tables...' : 'Seed D1 Schema'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 border-b border-white/5 pb-2">
          {[
            { id: 'overview', label: 'Overview & Telemetry', icon: Sliders },
            {
              id: 'mailboxes',
              label: `Mailboxes (${mailboxes.length})`,
              icon: Inbox,
            },
            {
              id: 'rules',
              label: `Routing Rules (${rules.length})`,
              icon: Shield,
            },
            {
              id: 'drive',
              label: `Drive Vault (${driveFiles.length})`,
              icon: HardDrive,
            },
            { id: 'seed', label: 'Schema Status', icon: CheckCircle2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                  active
                    ? 'border border-emerald-500/30 bg-emerald-500/15 text-emerald-400'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-[#13192B] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Active Mailboxes
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats?.totalMailboxes || mailboxes.length}
                </p>
                <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="h-3 w-3" /> Zero seat licensing
                  limits
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13192B] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Routing Rules
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats?.totalRules || rules.length}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Autonomous rule execution
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13192B] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Inbound Messages
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats?.inboundMessages || 0}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">
                  Stored in Cloudflare D1
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-[#13192B] p-4 shadow-sm">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Outbound Sent
                </span>
                <p className="mt-1 text-2xl font-bold text-white">
                  {stats?.outboundMessages || 0}
                </p>
                <p className="mt-1 text-[10px] text-emerald-400">
                  Multi-provider Orchestrator
                </p>
              </div>
            </div>

            {/* Architecture Card */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#13192B] p-6">
              <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
                RuhMail Architecture & Deployment Invariants
              </h3>
              <p className="text-xs leading-relaxed text-slate-300">
                By routing inbound custom domain traffic via Cloudflare Email
                Routing directly into our D1 database (`mailflare`) and
                dispatching outbound emails through Ruhvi Email Orchestrator, we
                maintain complete zero-cloud vendor lock-in. No external license
                check, software token, or subscription fee is needed.
              </p>
              <div className="grid grid-cols-1 gap-3 pt-2 md:grid-cols-3">
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <p className="text-xs font-semibold text-emerald-400">
                    Database Layer
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Cloudflare D1 (Serverless SQL in APAC)
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <p className="text-xs font-semibold text-emerald-400">
                    Object Storage
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Cloudflare R2 (mailflare-raw MIME Storage)
                  </p>
                </div>
                <div className="rounded-xl border border-white/5 bg-black/30 p-3">
                  <p className="text-xs font-semibold text-emerald-400">
                    Delivery Gateway
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    Resend / Mailjet / Brevo Multi-Failover
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MAILBOXES */}
        {activeTab === 'mailboxes' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Create Box */}
            <div className="h-fit space-y-4 rounded-2xl border border-white/10 bg-[#13192B] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Plus className="h-4 w-4 text-emerald-400" />
                Provision New Mailbox
              </h2>
              <form onSubmit={handleCreateMailbox} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Username / Local Part
                  </label>
                  <div className="mt-1 flex items-center rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 focus-within:border-emerald-500">
                    <input
                      type="text"
                      placeholder="e.g. orders"
                      value={newLocalPart}
                      onChange={(e) => setNewLocalPart(e.target.value)}
                      className="w-full bg-transparent text-xs text-white outline-none"
                    />
                    <span className="font-mono text-[11px] text-slate-500">
                      @ruhvi.in
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Display Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Orders & Fulfillment"
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Mailbox Type
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="personal">
                      Personal Mailbox (Assigned Staff)
                    </option>
                    <option value="shared">
                      Shared Team Inbox (Entire Department)
                    </option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={creatingMailbox}
                  className="active:scale-98 mt-2 w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {creatingMailbox ? 'Creating...' : 'Create Mailbox'}
                </button>
              </form>
            </div>

            {/* List */}
            <div className="space-y-3 lg:col-span-2">
              <h2 className="flex items-center justify-between text-sm font-bold text-white">
                <span>Active Registered Mailboxes</span>
                <span className="text-xs font-normal text-slate-400">
                  {mailboxes.length} Active in D1
                </span>
              </h2>

              <div className="space-y-2">
                {mailboxes.map((mb) => (
                  <div
                    key={mb.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#13192B] p-4 transition hover:border-white/20"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-600/20">
                        {mb.mailbox_type === 'shared' ? (
                          <Users className="h-4 w-4 text-emerald-400" />
                        ) : (
                          <Inbox className="h-4 w-4 text-emerald-400" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-white">
                            {mb.display_name}
                          </p>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                              mb.mailbox_type === 'shared'
                                ? 'border border-violet-500/30 bg-violet-500/20 text-violet-300'
                                : 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-300'
                            }`}
                          >
                            {mb.mailbox_type}
                          </span>
                        </div>
                        <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                          {mb.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDeleteMailbox(mb.id)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                        title="Deactivate mailbox"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RULES */}
        {activeTab === 'rules' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Create Rule */}
            <div className="h-fit space-y-4 rounded-2xl border border-white/10 bg-[#13192B] p-5">
              <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                <Shield className="h-4 w-4 text-emerald-400" />
                Add Routing Rule
              </h2>
              <form onSubmit={handleCreateRule} className="space-y-3">
                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Condition Target
                  </label>
                  <select
                    value={newRuleField}
                    onChange={(e) => setNewRuleField(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="from">Sender Email (From)</option>
                    <option value="to">Recipient Email (To)</option>
                    <option value="subject">Subject Line</option>
                    <option value="has_attachment">
                      Has Attachment (true/false)
                    </option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400">
                      Operator
                    </label>
                    <select
                      value={newRuleOp}
                      onChange={(e) => setNewRuleOp(e.target.value as any)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a2235] px-2 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    >
                      <option value="contains">Contains</option>
                      <option value="equals">Equals</option>
                      <option value="starts_with">Starts With</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400">
                      Match Value
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. @vendor.com"
                      value={newRuleVal}
                      onChange={(e) => setNewRuleVal(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Action
                  </label>
                  <select
                    value={newRuleAction}
                    onChange={(e) => setNewRuleAction(e.target.value as any)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-[#1a2235] px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  >
                    <option value="assign">Assign to Mailbox</option>
                    <option value="forward">Forward Email</option>
                    <option value="label">Add Tag/Label</option>
                    <option value="reject">Reject / Drop</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400">
                    Action Target / Value
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. support@ruhvi.in"
                    value={newRuleActionVal}
                    onChange={(e) => setNewRuleActionVal(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingRule}
                  className="active:scale-98 mt-2 w-full rounded-xl bg-emerald-600 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {creatingRule ? 'Saving Rule...' : 'Save Rule'}
                </button>
              </form>
            </div>

            {/* Rules List */}
            <div className="space-y-3 lg:col-span-2">
              <h2 className="flex items-center justify-between text-sm font-bold text-white">
                <span>Active Routing Rules</span>
                <span className="text-xs font-normal text-slate-400">
                  {rules.length} Rules in Priority Order
                </span>
              </h2>

              <div className="space-y-2">
                {rules.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-[#13192B] p-8 text-center text-xs text-slate-400">
                    No custom routing rules yet. Add your first rule on the
                    left.
                  </div>
                ) : (
                  rules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-[#13192B] p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            IF{' '}
                            <span className="font-mono text-emerald-400">
                              {rule.condition_field}
                            </span>{' '}
                            {rule.condition_op} &quot;
                            <span className="text-amber-300">
                              {rule.condition_value}
                            </span>
                            &quot;
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
                          <ArrowRight className="h-3 w-3 text-emerald-400" />
                          <span className="text-[10px] font-bold uppercase text-slate-300">
                            {rule.action}:
                          </span>
                          <span className="font-mono text-emerald-400">
                            {rule.action_value}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteRule(rule.id)}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: DRIVE VAULT */}
        {activeTab === 'drive' && (
          <div className="space-y-6">
            <div className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-[#13192B] p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-sm font-bold text-white">
                  <HardDrive className="h-4 w-4 text-emerald-400" />
                  RuhMail Cloudflare R2 Storage Vault
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Zero-egress object storage for company attachments, contracts,
                  and customer design assets.
                </p>
              </div>

              <div>
                <label className="active:scale-98 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500">
                  <Plus className="h-3.5 w-3.5" />
                  {uploading ? 'Uploading to R2...' : 'Upload File'}
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* File List */}
            <div className="space-y-4 rounded-2xl border border-white/10 bg-[#13192B] p-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Files & Documents ({driveFiles.length})
              </h3>

              {driveFiles.length === 0 ? (
                <div className="p-12 text-center text-xs text-slate-500">
                  No files stored in drive yet. Click &apos;Upload File&apos;
                  above to store in Cloudflare R2.
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {driveFiles.map((f) => (
                    <div
                      key={f.id}
                      className="flex items-center justify-between gap-4 rounded-xl px-2 py-3 transition hover:bg-white/[0.02]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-600/20">
                          <FileText className="h-4 w-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="max-w-md truncate text-xs font-bold text-white">
                            {f.name}
                          </p>
                          <p className="mt-0.5 text-[10px] text-slate-400">
                            {(f.file_size / 1024).toFixed(1)} KB &bull;{' '}
                            {f.content_type}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <a
                          href={`/api/mailbox/drive/download/${f.id}`}
                          download
                          className="rounded-lg p-2 text-slate-400 transition hover:bg-emerald-500/10 hover:text-emerald-400"
                          title="Download from R2"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => handleDeleteDriveFile(f.id)}
                          className="rounded-lg p-2 text-slate-500 transition hover:bg-rose-500/10 hover:text-rose-400"
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: SEED / SCHEMA */}
        {activeTab === 'seed' && (
          <div className="space-y-4 rounded-2xl border border-white/10 bg-[#13192B] p-6">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Cloudflare D1 Table Verification & Seeding Status
            </h2>
            <p className="text-xs text-slate-400">
              The RuhMail engine runs on dedicated tables inside Cloudflare D1
              (`mailflare` DB). Click below to execute schema migrations if any
              table is missing.
            </p>

            <button
              onClick={handleRunSeed}
              disabled={seeding}
              className="active:scale-98 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-950/40 transition hover:bg-emerald-500"
            >
              {seeding
                ? 'Executing D1 Migration...'
                : 'Re-Run Table Creation & Seed'}
            </button>

            {seedResult && (
              <pre className="mt-4 max-h-60 overflow-auto rounded-xl border border-white/10 bg-black/50 p-4 font-mono text-xs text-emerald-300">
                {JSON.stringify(seedResult, null, 2)}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
