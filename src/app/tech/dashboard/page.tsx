'use client';

import React from 'react';
import {
  Activity,
  Server,
  Globe,
  Database,
  Cpu,
  AlertTriangle,
  CheckCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import Link from 'next/link';

export default function TechDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-white">
            <Activity className="h-6 w-6 text-cyan-400" />
            System Control Center
          </h1>
          <p className="mt-1 text-slate-400">
            Overview of infrastructure health and active services.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-400">
          <Clock className="h-4 w-4" />
          <span>Last updated: Just now</span>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#131726] p-5 shadow-sm">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-emerald-500/5 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">
              System Health
            </h3>
            <CheckCircle className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="text-3xl font-bold text-slate-100">Optimal</p>
          <div className="mt-2 inline-flex rounded-full bg-emerald-400/10 px-2 py-0.5 text-xs font-medium text-emerald-400">
            All systems operational
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#131726] p-5 shadow-sm">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-cyan-500/5 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">API Latency</h3>
            <Activity className="h-5 w-5 text-cyan-400" />
          </div>
          <p className="text-3xl font-bold text-slate-100">42ms</p>
          <div className="mt-2 text-xs font-medium text-slate-500">
            Average response time
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#131726] p-5 shadow-sm">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-amber-500/5 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">
              Active Errors
            </h3>
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <p className="text-3xl font-bold text-slate-100">3</p>
          <div className="mt-2 inline-flex rounded-full bg-amber-400/10 px-2 py-0.5 text-xs font-medium text-amber-400">
            Via Sentry
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-white/5 bg-[#131726] p-5 shadow-sm">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-purple-500/5 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-400">AI Requests</h3>
            <Cpu className="h-5 w-5 text-purple-400" />
          </div>
          <p className="text-3xl font-bold text-slate-100">1.2k</p>
          <div className="mt-2 inline-flex rounded-full bg-purple-400/10 px-2 py-0.5 text-xs font-medium text-purple-400">
            Past 24 hours
          </div>
        </div>
      </div>

      {/* Secondary Service Modules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vercel & Posthog Quick Glance */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Globe className="h-5 w-5 text-blue-400" />
              Web Analytics & Performance
            </h2>
            <Link
              href="/tech/analytics"
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Full View <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <svg
                    viewBox="0 0 76 65"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-white"
                  >
                    <path
                      d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Vercel Speed Insights
                  </p>
                  <p className="text-xs text-slate-500">
                    Core Web Vitals Status
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-emerald-400">98</p>
                <p className="text-xs text-slate-500">Performance Score</p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <Activity className="h-5 w-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    PostHog Events
                  </p>
                  <p className="text-xs text-slate-500">Active users (30m)</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-200">42</p>
                <p className="flex items-center justify-end gap-1 text-xs text-emerald-500">
                  <ArrowUpRight className="h-3 w-3" /> 12%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Security Quick Glance */}
        <div className="rounded-xl border border-white/5 bg-[#131726] p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-200">
              <Database className="h-5 w-5 text-emerald-400" />
              Database & Security
            </h2>
            <Link
              href="/tech/audit-logs"
              className="flex items-center gap-1 text-sm text-cyan-400 transition-colors hover:text-cyan-300"
            >
              Audit Logs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <Database className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Supabase Connection
                  </p>
                  <p className="text-xs text-slate-500">Primary Database</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Connected
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <Server className="h-5 w-5 text-rose-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-200">
                    Sentry Error Log
                  </p>
                  <p className="text-xs text-slate-500">Unhandled exceptions</p>
                </div>
              </div>
              <div className="text-right">
                <Link
                  href="/tech/sentry"
                  className="text-sm font-medium text-amber-400 hover:text-amber-300"
                >
                  3 Issues
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
