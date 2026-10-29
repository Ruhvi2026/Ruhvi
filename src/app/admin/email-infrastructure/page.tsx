'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  Server,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function EmailInfrastructurePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [testProvider, setTestProvider] = useState<
    'resend' | 'mailjet' | 'brevo'
  >('mailjet');
  const [testRecipient, setTestRecipient] = useState('shreya.maity@ruhvi.in');
  const [testSending, setTestSending] = useState(false);
  const [updatingPolicy, setUpdatingPolicy] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/email-infrastructure/status');
      const json = await res.json();
      if (json.success) {
        setData(json);
      } else {
        toast.error(json.error || 'Failed to load email infrastructure status');
      }
    } catch (err: any) {
      toast.error('Network error loading status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestSend = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestSending(true);
    try {
      const res = await fetch('/api/admin/email-infrastructure/test-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: testProvider,
          recipientEmail: testRecipient,
          subject: `[Ruhvi Test] Live ${testProvider.toUpperCase()} Verification`,
          message: `Testing provider connectivity from the Ruhvi Email Control Center.`,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(
          `Test email dispatched successfully via ${testProvider.toUpperCase()}! ID: ${result.providerMessageId || 'OK'}`
        );
        fetchStatus();
      } else {
        toast.error(
          result.error || `Failed to dispatch test email via ${testProvider}`
        );
      }
    } catch (err: any) {
      toast.error('Network error triggering test email');
    } finally {
      setTestSending(false);
    }
  };

  const handleUpdatePolicy = async (
    category: string,
    primaryProvider: string,
    fallbackProvider: string | null
  ) => {
    setUpdatingPolicy(category);
    try {
      const res = await fetch('/api/admin/email-infrastructure/policies', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          primaryProvider,
          fallbackProvider,
        }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success(`Updated routing for ${category}`);
        fetchStatus();
      } else {
        toast.error(result.error || 'Failed to update policy');
      }
    } catch {
      toast.error('Error updating policy');
    } finally {
      setUpdatingPolicy(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-amber-600" />
      </div>
    );
  }

  const { config, providers, policies, recentDeliveries } = data || {};

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-stone-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-stone-900">
            <Mail className="h-6 w-6 text-amber-600" />
            Email Infrastructure & Multi-Provider Control Center
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Production-grade orchestrator managing Resend + Mailjet with atomic
            quota, outbox retry, and fallback.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm hover:bg-stone-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            <ShieldCheck className="h-3.5 w-3.5" />
            Safe Mode Active
          </span>
        </div>
      </div>

      {/* Provider Status Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Resend Card */}
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stone-900 text-sm font-bold text-white">
                R
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Resend</h3>
                <span className="text-xs text-stone-500">
                  Transactional / Broadcasts API
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                providers?.resend?.configured
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {providers?.resend?.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Configured (
                  {providers?.resend?.source})
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" /> Not Configured
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs">
            <div>
              <span className="block text-stone-400">Sender Address:</span>
              <span className="font-medium text-stone-700">
                {providers?.resend?.senderEmail}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Health:</span>
              <span className="font-medium capitalize text-emerald-600">
                {providers?.resend?.healthStatus}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Daily Allowance:</span>
              <span className="font-medium text-stone-700">100 emails/day</span>
            </div>
            <div>
              <span className="block text-stone-400">Monthly Allowance:</span>
              <span className="font-medium text-stone-700">
                3,000 emails/month
              </span>
            </div>
          </div>
        </div>

        {/* Mailjet Card */}
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-600 text-sm font-bold text-white">
                MJ
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Mailjet</h3>
                <span className="text-xs text-stone-500">
                  Send API v3.1 / Campaigns
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                providers?.mailjet?.configured
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {providers?.mailjet?.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Configured (
                  {providers?.mailjet?.source})
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" /> Not Configured
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs">
            <div>
              <span className="block text-stone-400">Sender Address:</span>
              <span className="font-medium text-stone-700">
                {providers?.mailjet?.senderEmail}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Health:</span>
              <span className="font-medium capitalize text-emerald-600">
                {providers?.mailjet?.healthStatus}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Daily Allowance:</span>
              <span className="font-medium text-stone-700">200 emails/day</span>
            </div>
            <div>
              <span className="block text-stone-400">Monthly Allowance:</span>
              <span className="font-medium text-stone-700">
                6,000 emails/month
              </span>
            </div>
          </div>
        </div>

        {/* Brevo Card */}
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                B
              </div>
              <div>
                <h3 className="font-semibold text-stone-900">Brevo</h3>
                <span className="text-xs text-stone-500">
                  Staff Alerts / MCP Tools
                </span>
              </div>
            </div>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                providers?.brevo?.configured
                  ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {providers?.brevo?.configured ? (
                <>
                  <CheckCircle2 className="h-3 w-3" /> Configured (
                  {providers?.brevo?.source})
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" /> Not Configured
                </>
              )}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-stone-100 bg-stone-50 p-3 text-xs">
            <div>
              <span className="block text-stone-400">Sender Address:</span>
              <span className="font-medium text-stone-700">
                {providers?.brevo?.senderEmail || 'notifications@ruhvi.in'}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Health:</span>
              <span className="font-medium capitalize text-emerald-600">
                {providers?.brevo?.healthStatus}
              </span>
            </div>
            <div>
              <span className="block text-stone-400">Daily Allowance:</span>
              <span className="font-medium text-stone-700">300 emails/day</span>
            </div>
            <div>
              <span className="block text-stone-400">Monthly Allowance:</span>
              <span className="font-medium text-stone-700">
                9,000 emails/month
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Category Routing Policy Matrix */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-stone-900">
              Category Routing Policy Matrix
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Auto-failover enabled with atomic quota validation
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Primary Provider</th>
                <th className="px-6 py-3">Fallback Provider</th>
                <th className="px-6 py-3">Priority</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700">
              {policies &&
                Object.entries(policies).map(
                  ([category, pol]: [string, any]) => (
                    <tr key={category} className="hover:bg-stone-50/50">
                      <td className="px-6 py-4 font-medium text-stone-900">
                        <span className="font-mono text-xs">{category}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center rounded bg-stone-100 px-2 py-0.5 text-xs font-semibold uppercase text-stone-800">
                          {pol.primaryProvider}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {pol.fallbackProvider ? (
                          <span className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold uppercase text-amber-800">
                            {pol.fallbackProvider}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">
                        {pol.priority}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() =>
                            handleUpdatePolicy(
                              category,
                              pol.primaryProvider === 'resend'
                                ? 'mailjet'
                                : 'resend',
                              pol.primaryProvider === 'resend'
                                ? 'resend'
                                : 'mailjet'
                            )
                          }
                          disabled={updatingPolicy === category}
                          className="text-xs font-medium text-amber-700 underline hover:text-amber-800"
                        >
                          {updatingPolicy === category
                            ? 'Updating...'
                            : 'Swap Primary/Fallback'}
                        </button>
                      </td>
                    </tr>
                  )
                )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Test Send Panel */}
      <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2">
          <Send className="h-5 w-5 text-amber-600" />
          <h2 className="font-semibold text-stone-900">
            Controlled Live Provider Test
          </h2>
        </div>
        <p className="text-xs text-stone-500">
          Dispatches a real test email through the selected provider to verify
          delivery, SPF/DKIM headers, and network connectivity.
        </p>

        <form
          onSubmit={handleTestSend}
          className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3"
        >
          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Target Provider
            </label>
            <select
              value={testProvider}
              onChange={(e) => setTestProvider(e.target.value as any)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
            >
              <option value="mailjet">Mailjet (Send API v3.1)</option>
              <option value="resend">Resend (REST API)</option>
              <option value="brevo">Brevo (Staff &amp; Alerts API)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-stone-700">
              Test Recipient Address
            </label>
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="shreya.maity@ruhvi.in"
              required
              className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={testSending}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {testSending ? 'Sending Test...' : 'Send Live Test Email'}
            </button>
          </div>
        </form>
      </div>

      {/* Recent Outbox Deliveries */}
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-stone-200 bg-stone-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-600" />
            <h2 className="font-semibold text-stone-900">
              Recent Outbox Deliveries
            </h2>
          </div>
          <span className="text-xs text-stone-500">
            Live delivery ledger from Supabase
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
              <tr>
                <th className="px-6 py-3">Event Key / Type</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Recipient</th>
                <th className="px-6 py-3">Provider</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-700">
              {recentDeliveries && recentDeliveries.length > 0 ? (
                recentDeliveries.map((del: any) => (
                  <tr key={del.id} className="hover:bg-stone-50/50">
                    <td className="px-6 py-3 font-mono text-xs text-stone-900">
                      {del.event_key || del.event_type}
                    </td>
                    <td className="px-6 py-3 text-xs">{del.category}</td>
                    <td className="px-6 py-3 text-xs">{del.recipient_email}</td>
                    <td className="px-6 py-3 text-xs font-medium uppercase">
                      {del.selected_provider || 'Pending'}
                    </td>
                    <td className="px-6 py-3">
                      <span
                        className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold ${
                          del.status === 'delivered' ||
                          del.status === 'accepted'
                            ? 'bg-emerald-50 text-emerald-800'
                            : del.status === 'failed' ||
                                del.status === 'bounced'
                              ? 'bg-red-50 text-red-800'
                              : 'bg-amber-50 text-amber-800'
                        }`}
                      >
                        {del.status}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-stone-400">
                      {new Date(del.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-8 text-center text-xs text-stone-400"
                  >
                    No recent deliveries recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
