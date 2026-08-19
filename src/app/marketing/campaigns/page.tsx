'use client';

import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  X,
  Loader2,
  Send,
  AlertTriangle,
  BarChart3,
  Users,
  MousePointerClick,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BrevoCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  type: string;
  scheduledAt: string;
  statistics: {
    globalStats: {
      sent: number;
      delivered: number;
      trackableViews: number; // Opens
      trackableViewsRate: number;
      clickers: number;
      clickersRate: number;
    };
  };
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<BrevoCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    to: '',
    subject: '',
    htmlContent: '',
    template: 'blank', // 'blank' | 'winback' | 'promo'
  });

  const fetchCampaigns = async () => {
    try {
      const res = await fetch('/api/admin/marketing/campaigns');
      if (res.ok) {
        const data = await res.json();
        setCampaigns(data.campaigns || []);
      } else {
        toast.error('Failed to load campaigns from Brevo');
      }
    } catch (e) {
      toast.error('Network error loading campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  const handleTemplateChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    let html = '';
    let subj = '';

    if (val === 'winback') {
      subj = "We miss you! Here's a special gift 🎁";
      html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
  <h1 style="color: #C29831; text-align: center;">It's been a while!</h1>
  <p>To welcome you back, we've prepared a special discount just for you.</p>
  <div style="background-color: #FAF7ED; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
    <p>Use code at checkout:</p>
    <h2 style="letter-spacing: 2px;">WELCOMEBACK20</h2>
  </div>
</div>
      `;
    } else if (val === 'promo') {
      subj = 'Flash Sale! 24 Hours Only ⚡';
      html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110;">
  <h1 style="color: #C29831; text-align: center;">Flash Sale Is LIVE!</h1>
  <p>Shop our exclusive collection before it's gone.</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="https://ruhvi.in" style="background-color: #1C1B1A; color: #FAF6ED; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Shop Now</a>
  </div>
</div>
      `;
    }

    setFormData({
      ...formData,
      template: val,
      subject: subj,
      htmlContent: html,
    });
  };

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/admin/marketing/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: formData.to,
          subject: formData.subject,
          htmlContent: formData.htmlContent,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success('Test Email Sent Successfully!');
        setShowModal(false);
      } else {
        toast.error(data.error || 'Failed to send email');
      }
    } catch (e) {
      toast.error('Network error while sending email');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Email Campaigns</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Track and manage your Brevo email blasts.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700"
        >
          <Mail className="h-4 w-4" />
          Send Test Blast
        </button>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-fuchsia-400" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-[#131726] p-10 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10">
            <BarChart3 className="h-6 w-6 text-blue-400" />
          </div>
          <h3 className="mb-2 text-sm font-medium text-white">
            No active campaigns
          </h3>
          <p className="mx-auto max-w-md text-xs text-slate-500">
            Your recent campaigns sent via Brevo will appear here with live
            statistics on opens and clicks.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
          <table className="w-full text-left text-xs text-slate-400">
            <thead className="border-b border-white/5 bg-white/[0.02] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 font-medium">Campaign Name</th>
                <th className="p-4 font-medium">Subject</th>
                <th className="p-4 text-right font-medium">Sent</th>
                <th className="p-4 text-right font-medium">Opens</th>
                <th className="p-4 text-right font-medium">Clicks</th>
                <th className="p-4 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {campaigns.map((camp) => (
                <tr
                  key={camp.id}
                  className="transition-colors hover:bg-white/[0.02]"
                >
                  <td className="p-4 font-medium text-white">{camp.name}</td>
                  <td
                    className="max-w-[200px] truncate p-4"
                    title={camp.subject}
                  >
                    {camp.subject}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Users className="h-3.5 w-3.5 text-slate-500" />
                      {camp.statistics?.globalStats?.delivered || 0}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span className="font-medium text-blue-400">
                        {camp.statistics?.globalStats?.trackableViewsRate || 0}%
                      </span>
                      <span className="text-slate-600">
                        ({camp.statistics?.globalStats?.trackableViews || 0})
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MousePointerClick className="h-3.5 w-3.5 text-slate-500" />
                      <span className="font-medium text-emerald-400">
                        {camp.statistics?.globalStats?.clickersRate || 0}%
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium capitalize text-emerald-400">
                      {camp.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Send Email Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 overflow-y-auto bg-black/60 backdrop-blur-sm"
            onClick={() => setShowModal(false)}
          />
          <div className="relative my-8 w-full max-w-xl rounded-xl border border-white/10 bg-[#131726] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 p-4">
              <h2 className="text-sm font-semibold text-white">
                Send Test Campaign
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-3 border-b border-amber-500/20 bg-amber-500/10 p-4">
              <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
              <p className="text-xs leading-relaxed text-amber-500/90">
                <strong>Safety Lock Active:</strong> To prevent spamming real
                customers during testing, this will only deliver to authorized
                test emails (e.g., dev@ruhvi.in).
              </p>
            </div>

            <form onSubmit={handleSendTest} className="space-y-4 p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  To (Email Address)
                </label>
                <input
                  type="email"
                  required
                  value={formData.to}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      to: e.target.value.toLowerCase(),
                    })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  placeholder="test@ruhvi.in"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Load Template
                </label>
                <select
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  value={formData.template}
                  onChange={handleTemplateChange}
                >
                  <option value="blank">Blank Email</option>
                  <option value="winback">
                    Win-back Campaign (Welcome Back)
                  </option>
                  <option value="promo">Flash Sale Promo</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  Subject Line
                </label>
                <input
                  type="text"
                  required
                  value={formData.subject}
                  onChange={(e) =>
                    setFormData({ ...formData, subject: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  placeholder="Subject"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-400">
                  HTML Content
                </label>
                <textarea
                  required
                  rows={6}
                  value={formData.htmlContent}
                  onChange={(e) =>
                    setFormData({ ...formData, htmlContent: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 font-mono text-[10px] text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                  placeholder="<h1>Hello World</h1>"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !formData.to}
                  className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  Fire Email Blast
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
