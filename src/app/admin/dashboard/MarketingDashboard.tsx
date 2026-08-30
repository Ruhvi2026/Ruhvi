import React from 'react';
import {
  Target,
  Megaphone,
  Mail,
  MousePointerClick,
  CheckCircle2,
  AlertTriangle,
  Globe,
  Settings,
} from 'lucide-react';
import { getCampaignStats } from '@/lib/brevo';
import { getMarketingSettings } from '@/app/admin/actions/settings';
import Link from 'next/link';
import PostHogHealthBadge from '@/components/dashboard/posthog/PostHogHealthBadge';
import EventCountsBar from '@/components/dashboard/posthog/EventCountsBar';
import SignupMethodDonut from '@/components/dashboard/posthog/SignupMethodDonut';
import ProductPerformanceTable from '@/components/dashboard/posthog/ProductPerformanceTable';
import SessionReplayList from '@/components/dashboard/posthog/SessionReplayList';
import TrafficSourcesPanel from '@/components/dashboard/posthog/TrafficSourcesPanel';
import {
  getEventCounts,
  getMarketingKpis,
  getProductPerformance,
  getRecentSessionRecordings,
  getSignupBreakdown,
  getTrafficSources,
} from '@/services/posthog-analytics.service';

const POSTHOG_CONFIGURED = !!process.env.POSTHOG_PERSONAL_API_KEY;

export default async function MarketingDashboard() {
  const settings = (await getMarketingSettings().catch(() => ({}))) as any;
  let campaigns: any[] = [];
  let errorMsg = '';

  try {
    const data = await getCampaignStats();
    if (data && data.campaigns) {
      campaigns = data.campaigns.slice(0, 5);
    }
  } catch (err: any) {
    console.error('Failed to load campaigns from Brevo:', err);
    errorMsg = 'Brevo API credentials missing or invalid';
  }

  const [
    posthogKpis,
    posthogEventCounts,
    posthogSignups,
    posthogProducts,
    posthogSessions,
    posthogSources,
  ] = await Promise.all([
    getMarketingKpis().catch(() => null),
    getEventCounts().catch(() => []),
    getSignupBreakdown().catch(() => []),
    getProductPerformance().catch(() => []),
    getRecentSessionRecordings().catch(() => []),
    getTrafficSources().catch(() => []),
  ]);

  // Count active integrations
  const isMetaConfigured = !!settings.meta_pixel_id;
  const isGa4Configured = !!settings.ga4_measurement_id;
  const isGoogleAdsConfigured = !!settings.google_ads_conversion_id;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* Card 1: Meta Pixel Status */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Globe className="h-5 w-5 text-pink-400" />
            <h3 className="text-sm font-medium text-slate-400">Meta Pixel</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {isMetaConfigured ? 'Active' : 'Inactive'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {isMetaConfigured
              ? `ID: ${settings.meta_pixel_id}`
              : 'Pixel ID not configured'}
          </p>
        </div>

        {/* Card 2: GA4 Status */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Target className="h-5 w-5 text-emerald-400" />
            <h3 className="text-sm font-medium text-slate-400">Google GA4</h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {isGa4Configured ? 'Connected' : 'Disconnected'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {isGa4Configured
              ? `ID: ${settings.ga4_measurement_id}`
              : 'GA4 ID not configured'}
          </p>
        </div>

        {/* Card 3: Google Ads Status */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <MousePointerClick className="h-5 w-5 text-blue-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Google Ads Conversion
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {isGoogleAdsConfigured ? 'Active' : 'Inactive'}
          </p>
          <p className="mt-1 truncate text-xs text-slate-500">
            {isGoogleAdsConfigured
              ? `ID: ${settings.google_ads_conversion_id}`
              : 'Conversion ID not set'}
          </p>
        </div>

        {/* Card 4: Brevo Status */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-purple-400" />
            <h3 className="text-sm font-medium text-slate-400">
              Brevo Campaigns
            </h3>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">
            {campaigns.length > 0 ? 'Connected' : 'No Campaigns'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {campaigns.length} sent campaigns loaded
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Live Brevo Campaigns */}
        <div className="space-y-4 rounded-xl border border-white/5 bg-[#131726] p-5 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h3 className="text-sm font-semibold text-white">
              Live Campaigns from Brevo
            </h3>
            <Link
              href="/marketing/campaigns"
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Email Console →
            </Link>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 text-xs font-semibold text-rose-400">
              <AlertTriangle className="h-4 w-4" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-3">
            {campaigns.map((c: any, i) => (
              <div
                key={i}
                className="flex flex-col justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3.5 text-xs md:flex-row md:items-center"
              >
                <div>
                  <p className="font-bold text-white">{c.name || 'Campaign'}</p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    Subject: {c.subject || 'N/A'}
                  </p>
                </div>
                <div className="flex items-center gap-4 text-slate-400">
                  <span>
                    Sent: <strong className="text-white">{c.sent || 0}</strong>
                  </span>
                  {c.statistics && (
                    <>
                      <span>
                        Opens:{' '}
                        <strong className="text-indigo-400">
                          {c.statistics.uniqueOpens || 0}
                        </strong>
                      </span>
                      <span>
                        Clicks:{' '}
                        <strong className="text-emerald-400">
                          {c.statistics.uniqueClicks || 0}
                        </strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
            {!errorMsg && campaigns.length === 0 && (
              <p className="py-8 text-center text-slate-600">
                No campaigns found in Brevo archive
              </p>
            )}
          </div>
        </div>

        {/* Integration Status Panel */}
        <div className="flex flex-col justify-between rounded-xl border border-white/5 bg-[#131726] p-5">
          <div className="space-y-4">
            <h3 className="border-b border-white/5 pb-3 text-sm font-semibold text-white">
              Tracking & Analytics Status
            </h3>
            <div className="space-y-3 text-xs text-slate-300">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isMetaConfigured ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  ></span>
                  Meta Pixel Tracker
                </span>
                <span
                  className={
                    isMetaConfigured ? 'text-emerald-400' : 'text-slate-500'
                  }
                >
                  {isMetaConfigured ? 'Connected' : 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isGa4Configured ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  ></span>
                  Google Analytics 4
                </span>
                <span
                  className={
                    isGa4Configured ? 'text-emerald-400' : 'text-slate-500'
                  }
                >
                  {isGa4Configured ? 'Connected' : 'Not Set'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${isGoogleAdsConfigured ? 'bg-emerald-500' : 'bg-slate-700'}`}
                  ></span>
                  Google Ads Conversion
                </span>
                <span
                  className={
                    isGoogleAdsConfigured
                      ? 'text-emerald-400'
                      : 'text-slate-500'
                  }
                >
                  {isGoogleAdsConfigured ? 'Connected' : 'Not Set'}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-white/5 pt-4">
            <a
              href="/admin/settings?tab=marketing"
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/5 bg-white/5 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10"
            >
              <Settings className="h-3.5 w-3.5" />
              Configure Pixels
            </a>
          </div>
        </div>
      </div>

      {/* PostHog Behavioral Analytics */}
      <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
        <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-sm font-semibold text-white">
            PostHog Behavioral Analytics
          </h2>
          <PostHogHealthBadge
            configured={POSTHOG_CONFIGURED}
            hasData={(posthogEventCounts?.length ?? 0) > 0}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              View → Purchase
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {posthogKpis?.conversionRate ?? 0}%
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              purchase_completed ÷ product_viewed
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              View → Cart
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {posthogKpis?.addToCartRate ?? 0}%
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              product_added_to_cart ÷ product_viewed
            </p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.01] p-4">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">
              Cart → Checkout
            </p>
            <p className="mt-1 text-2xl font-bold text-white">
              {posthogKpis?.checkoutRate ?? 0}%
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              checkout_started ÷ product_added_to_cart
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ProductPerformanceTable products={posthogProducts ?? []} />
          </div>
          <SignupMethodDonut data={posthogSignups ?? []} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <EventCountsBar events={posthogEventCounts ?? []} />
          <TrafficSourcesPanel sources={posthogSources ?? []} />
          <SessionReplayList recordings={posthogSessions ?? []} />
        </div>
      </div>
    </div>
  );
}
