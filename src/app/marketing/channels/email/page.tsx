'use client';

import React, { useEffect, useState } from 'react';
import { Mail, Save, Loader2, Key } from 'lucide-react';
import toast from 'react-hot-toast';

export default function EmailChannelsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    apiKey: '',
    senderName: '',
    senderEmail: '',
  });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/admin/marketing/settings/email');
        if (res.ok) {
          const json = await res.json();
          setFormData(
            json.settings || { apiKey: '', senderName: '', senderEmail: '' }
          );
        }
      } catch (e) {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/marketing/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success('Brevo configuration saved successfully');
      } else {
        toast.error('Failed to save configuration');
      }
    } catch (e) {
      toast.error('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-fuchsia-400" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            Email (Brevo) Configuration
          </h1>
          <p className="mt-0.5 text-xs text-slate-500">
            Configure your Brevo API keys and default sender settings.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5 bg-[#131726]">
        <div className="flex gap-3 border-b border-white/5 bg-white/[0.02] p-4">
          <Mail className="h-5 w-5 shrink-0 text-fuchsia-400" />
          <div>
            <p className="text-sm font-medium text-white">
              Brevo API Integration
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Provide your v3 API key from your Brevo dashboard to enable
              transactional and marketing email blasts.
            </p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-6 p-6">
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 flex items-center gap-2 text-xs font-medium text-slate-400">
                <Key className="h-3.5 w-3.5" /> API Key (v3) *
              </label>
              <input
                type="password"
                required
                value={formData.apiKey}
                onChange={(e) =>
                  setFormData({ ...formData, apiKey: e.target.value })
                }
                placeholder="xkeysib-..."
                className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Default Sender Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.senderName}
                  onChange={(e) =>
                    setFormData({ ...formData, senderName: e.target.value })
                  }
                  placeholder="e.g. Ruhvi Jewels"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Default Sender Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.senderEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, senderEmail: e.target.value })
                  }
                  placeholder="e.g. hello@ruhvi.in"
                  className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white focus:border-fuchsia-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-white/5 pt-5">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-fuchsia-700 disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Configuration
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
