'use client';

import React, { useState } from 'react';
import {
  MessageCircle,
  Send,
  Loader2,
  AlertTriangle,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function WhatsappChannelsPage() {
  const [formData, setFormData] = useState({
    templateName: '',
    audience: 'All Users',
    specificNumbers: '', // comma separated
  });
  const [sending, setSending] = useState(false);

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.templateName) {
      toast.error('Template name is required.');
      return;
    }

    setSending(true);
    try {
      const phoneNumbers =
        formData.audience === 'Specific Users'
          ? formData.specificNumbers
              .split(',')
              .map((n) => n.trim())
              .filter(Boolean)
          : undefined; // Let backend handle audience

      const res = await fetch('/api/admin/whatsapp/campaign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateName: formData.templateName,
          audience: formData.audience,
          phoneNumbers: phoneNumbers,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success(
          data.message || 'WhatsApp broadcast queued successfully!'
        );
        setFormData({
          templateName: '',
          audience: 'All Users',
          specificNumbers: '',
        });
      } else {
        toast.error(data.error || 'Failed to send broadcast');
      }
    } catch (e) {
      toast.error('Network error while sending broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">WhatsApp Broadcast</h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Send approved WhatsApp template messages to your audience.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex gap-3 border-b border-white/5 bg-white/[0.02] p-4">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-500" />
          <p className="text-xs leading-relaxed text-slate-300">
            WhatsApp requires messages to be pre-approved templates. Meta's
            24-hour cooldown per user is automatically enforced to prevent spam.
          </p>
        </div>

        <form onSubmit={handleSendBroadcast} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Target Audience *
                </label>
                <select
                  value={formData.audience}
                  onChange={(e) =>
                    setFormData({ ...formData, audience: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                >
                  <option value="All Users">All Users</option>
                  <option value="Active Buyers">
                    Active Buyers (Ordered in last 30 days)
                  </option>
                  <option value="Abandoned Carts">
                    Abandoned Carts (Unchecked items)
                  </option>
                  <option value="Specific Users">Specific Phone Numbers</option>
                </select>
              </div>

              {formData.audience === 'Specific Users' && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Phone Numbers (Comma separated)
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="e.g. 919876543210, 919876543211"
                    value={formData.specificNumbers}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        specificNumbers: e.target.value,
                      })
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Template Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. flash_sale_promo"
                  value={formData.templateName}
                  onChange={(e) =>
                    setFormData({ ...formData, templateName: e.target.value })
                  }
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-green-500 focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-slate-500">
                  The exact name of the template approved in your Meta
                  dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-white/5 pt-5">
            <button
              type="submit"
              disabled={
                sending ||
                !formData.templateName ||
                (formData.audience === 'Specific Users' &&
                  !formData.specificNumbers)
              }
              className="flex items-center gap-2 rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Broadcast
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
