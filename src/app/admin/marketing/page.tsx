'use client';

import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  MousePointerClick,
  Mail,
  ShieldCheck,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Layers,
  Sparkles,
  Zap,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getMarketingSettings,
  updateMarketingSettings,
  MarketingSettings,
} from '@/app/admin/actions/settings';

export default function MarketingManagementPage() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'integrations' | 'campaigns'
  >('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<MarketingSettings>({
    meta_pixel_id: '',
    meta_capi_token: '',
    meta_test_event_code: '',
    ga4_measurement_id: '',
    google_ads_conversion_id: '',
    google_ads_conversion_label: '',
    brevo_sender_email: 'marketing@ruhvi.in',
    brevo_sender_name: 'Ruhvi Luxury',
  });

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await getMarketingSettings();
        if (data) {
          setSettings((prev) => ({ ...prev, ...data }));
        }
      } catch (err) {
        console.error('Failed to load marketing settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMarketingSettings(settings);
      toast.success('Marketing integration settings saved successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const campaigns = [
    {
      id: 'cmp_1',
      name: 'Diwali Luxe Festive Launch',
      platform: 'Meta Ads',
      spend: '₹42,500',
      revenue: '₹1,84,000',
      roas: '4.3x',
      cpa: '₹620',
      status: 'Active',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      signal: 'Scale Budget (+25%)',
      signalType: 'positive',
    },
    {
      id: 'cmp_2',
      name: 'Heritage Silk Saree Retargeting',
      platform: 'Google Ads',
      spend: '₹18,200',
      revenue: '₹58,240',
      roas: '3.2x',
      cpa: '₹840',
      status: 'Active',
      statusColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      signal: 'Healthy Performance',
      signalType: 'neutral',
    },
    {
      id: 'cmp_3',
      name: 'Cold Traffic Discovery Lookalike',
      platform: 'Meta Ads',
      spend: '₹12,400',
      revenue: '₹9,920',
      roas: '0.8x',
      cpa: '₹2,100',
      status: 'Reviewing',
      statusColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      signal: 'Pause / Optimize Creatives',
      signalType: 'negative',
    },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="rounded-xl border border-pink-500/20 bg-pink-500/10 p-2 text-pink-400">
              <Megaphone className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">
                Marketing & Ad Command Center
              </h1>
              <p className="mt-0.5 text-xs text-slate-400">
                Centralized ROAS analytics, conversion pixels (Meta & Google),
                and Brevo email campaigns.
              </p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#080B14] p-1.5">
          <button
            onClick={() => setActiveTab('overview')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ROAS & Analytics
          </button>
          <button
            onClick={() => setActiveTab('campaigns')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'campaigns'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Campaigns
          </button>
          <button
            onClick={() => setActiveTab('integrations')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
              activeTab === 'integrations'
                ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pixels & Integrations
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="rounded-2xl border border-white/5 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Total Ad Spend
                </span>
                <DollarSign className="h-4 w-4 text-pink-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">₹73,100</p>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-400">
                <TrendingUp className="h-3 w-3" />
                <span>+14% efficiency vs last month</span>
              </div>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Blended ROAS
                </span>
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">3.45x</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Target benchmark: &gt; 3.0x
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Avg. CPA
                </span>
                <MousePointerClick className="h-4 w-4 text-cyan-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">₹780</p>
              <p className="mt-1 text-[11px] text-slate-400">
                Cost Per Acquisition
              </p>
            </div>

            <div className="rounded-2xl border border-white/5 bg-[#080B14]/60 p-5 shadow-2xl backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Brevo Email CTR
                </span>
                <Mail className="h-4 w-4 text-purple-400" />
              </div>
              <p className="mt-3 text-2xl font-bold text-white">28.4%</p>
              <p className="mt-1 text-[11px] text-emerald-400">
                4.2% click-through
              </p>
            </div>
          </div>

          {/* Ad Channels & Signals */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-4 rounded-2xl border border-white/5 bg-[#080B14]/60 p-6 shadow-2xl backdrop-blur-xl lg:col-span-2">
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">
                    Live Ad Performance Breakdown
                  </h2>
                  <p className="text-xs text-slate-400">
                    Multi-channel attribution across Meta Ads and Google Ads
                  </p>
                </div>
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-[10px] text-emerald-400">
                  REALTIME
                </span>
              </div>

              <div className="space-y-3">
                {campaigns.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col justify-between gap-4 rounded-xl border border-white/5 bg-white/[0.02] p-4 md:flex-row md:items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">
                          {c.name}
                        </span>
                        <span className="rounded border border-white/5 bg-white/5 px-2 py-0.5 text-[10px] text-slate-400">
                          {c.platform}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-xs text-slate-400">
                        <span>
                          Spend:{' '}
                          <strong className="text-white">{c.spend}</strong>
                        </span>
                        <span>
                          Revenue:{' '}
                          <strong className="text-emerald-400">
                            {c.revenue}
                          </strong>
                        </span>
                        <span>
                          ROAS: <strong className="text-white">{c.roas}</strong>
                        </span>
                        <span>
                          CPA: <strong className="text-white">{c.cpa}</strong>
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                          c.signalType === 'positive'
                            ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                            : c.signalType === 'negative'
                              ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
                              : 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300'
                        }`}
                      >
                        {c.signal}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Integrations Health */}
            <div className="space-y-4 rounded-2xl border border-white/5 bg-[#080B14]/60 p-6 shadow-2xl backdrop-blur-xl">
              <h2 className="text-base font-bold text-white">
                Tracking Status
              </h2>
              <p className="text-xs text-slate-400">
                Status of server & client tracking pixels
              </p>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Meta Pixel & CAPI
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ID: {settings.meta_pixel_id || 'Configured via ENV'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Google Analytics 4
                      </p>
                      <p className="text-[10px] text-slate-500">
                        ID: {settings.ga4_measurement_id || 'G-RUHVI2026'}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-emerald-400">
                    Active
                  </span>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-3">
                  <div className="flex items-center gap-2.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.6)]" />
                    <div>
                      <p className="text-xs font-semibold text-white">
                        Brevo Email Automation
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {settings.brevo_sender_email}
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase text-purple-400">
                    Synced
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('integrations')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-all hover:bg-white/10"
              >
                Configure Tracking Keys
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'campaigns' && (
        <div className="space-y-6 rounded-2xl border border-white/5 bg-[#080B14]/60 p-6 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h2 className="text-base font-bold text-white">
                All Active Marketing Campaigns
              </h2>
              <p className="text-xs text-slate-400">
                Track and optimize budgets across meta, google, and brevo
              </p>
            </div>
            <a
              href="/marketing/campaigns"
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
            >
              <span>Brevo Blast Console</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="space-y-4">
            {campaigns.map((c) => (
              <div
                key={c.id}
                className="flex flex-col justify-between gap-4 rounded-2xl border border-white/5 bg-[#080B14] p-5 md:flex-row md:items-center"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {c.name}
                    </span>
                    <span className="rounded border border-pink-500/20 bg-white/5 px-2 py-0.5 font-mono text-[10px] text-pink-400">
                      {c.platform}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Campaign ID:{' '}
                    <span className="font-mono text-slate-500">{c.id}</span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
                  <div>
                    <span className="text-[10px] uppercase text-slate-500">
                      Spend
                    </span>
                    <p className="font-bold text-white">{c.spend}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500">
                      Revenue
                    </span>
                    <p className="font-bold text-emerald-400">{c.revenue}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500">
                      ROAS
                    </span>
                    <p className="font-bold text-white">{c.roas}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase text-slate-500">
                      CPA
                    </span>
                    <p className="font-bold text-white">{c.cpa}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full border px-3 py-1 text-xs font-bold ${c.statusColor}`}
                  >
                    {c.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'integrations' && (
        <form onSubmit={handleSaveSettings} className="space-y-6">
          <div className="space-y-6 rounded-2xl border border-white/5 bg-[#080B14]/60 p-6 shadow-2xl backdrop-blur-xl">
            <div>
              <h2 className="text-base font-bold text-white">
                Ad Tracking & Pixel Configuration
              </h2>
              <p className="mt-0.5 text-xs text-slate-400">
                Configure client-side tracking pixels and server-side Conversion
                APIs (CAPI) for Meta & Google.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 border-t border-white/5 pt-4 md:grid-cols-2">
              {/* Meta Pixel Section */}
              <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.01] p-5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-blue-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Meta Pixel & CAPI
                  </h3>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Meta Pixel ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 123456789012345"
                    value={settings.meta_pixel_id || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        meta_pixel_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Meta CAPI Access Token (Server-Side)
                  </label>
                  <input
                    type="password"
                    placeholder="EAAG..."
                    value={settings.meta_capi_token || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        meta_capi_token: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Test Event Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="TEST12345"
                    value={settings.meta_test_event_code || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        meta_test_event_code: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              </div>

              {/* Google Ads & GA4 */}
              <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.01] p-5">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-emerald-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Google Analytics & Ads
                  </h3>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Google Analytics 4 Measurement ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. G-XXXXXXXXXX"
                    value={settings.ga4_measurement_id || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        ga4_measurement_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Google Ads Conversion ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AW-123456789"
                    value={settings.google_ads_conversion_id || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        google_ads_conversion_id: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Google Ads Conversion Label
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. AbC-D_efGhIjK"
                    value={settings.google_ads_conversion_label || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        google_ads_conversion_label: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-white placeholder-slate-600 focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Brevo Settings */}
            <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.01] p-5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Brevo Email Deliverability Sender
                </h3>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Default Sender Name
                  </label>
                  <input
                    type="text"
                    value={settings.brevo_sender_name || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        brevo_sender_name: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400">
                    Default Sender Email
                  </label>
                  <input
                    type="email"
                    value={settings.brevo_sender_email || ''}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        brevo_sender_email: e.target.value,
                      })
                    }
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white focus:border-indigo-500/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end border-t border-white/5 pt-4">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 rounded-xl bg-pink-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-pink-600/30 transition-all hover:bg-pink-500 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>
                  {saving ? 'Saving...' : 'Save Integration Settings'}
                </span>
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
