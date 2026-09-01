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
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-900 dark:text-white">
            <Activity className="h-6 w-6 text-tech-primary" />
            System Control Center
          </h1>
          <p className="mt-1 text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
            Overview of infrastructure health and active services.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-slate-500 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-400 dark:text-slate-500 dark:text-slate-600">
          <Clock className="h-4 w-4" />
          <span>Last updated: —</span>
        </div>
      </div>

      {/* Primary Metrics */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-tech-border dark:bg-tech-card">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-tech-success/10 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
              System Health
            </h3>
            <CheckCircle className="h-5 w-5 text-tech-success" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-tech-text">
            —
          </p>
          <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-400 dark:text-slate-600">
            No data available
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-tech-border dark:bg-tech-card">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-tech-cyan/10 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
              API Latency
            </h3>
            <Activity className="h-5 w-5 text-tech-cyan" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-tech-text">
            —
          </p>
          <div className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-500">
            Average response time
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-tech-border dark:bg-tech-card">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-tech-warning/10 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
              Active Errors
            </h3>
            <AlertTriangle className="h-5 w-5 text-tech-warning" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-tech-text">
            —
          </p>
          <div className="mt-2 inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-gray-50 dark:bg-white/5 dark:text-slate-400 dark:text-slate-600">
            No data available
          </div>
        </div>

        <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-tech-border dark:bg-tech-card">
          <div className="absolute right-0 top-0 -mr-8 -mt-8 h-32 w-32 rounded-bl-full bg-tech-primary/10 transition-transform group-hover:scale-110"></div>
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-500 dark:text-slate-500 dark:text-tech-textSecondary">
              AI Requests
            </h3>
            <Cpu className="h-5 w-5 text-tech-primary" />
          </div>
          <p className="text-3xl font-bold text-slate-900 dark:text-tech-text">
            —
          </p>
          <div className="mt-2 inline-flex rounded-full bg-tech-primary/10 px-2 py-0.5 text-xs font-medium text-tech-primary">
            Past 24 hours
          </div>
        </div>
      </div>

      {/* Secondary Service Modules */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Vercel & Posthog Quick Glance */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-tech-border dark:bg-tech-card">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-200 dark:text-slate-900">
              <Globe className="h-5 w-5 text-tech-cyan" />
              Web Analytics & Performance
            </h2>
            <Link
              href="/tech/analytics"
              className="flex items-center gap-1 text-sm text-tech-primary transition-colors hover:text-tech-primary/80"
            >
              Full View <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
                  <svg
                    viewBox="0 0 76 65"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5 text-slate-900 dark:text-slate-900 dark:text-white"
                  >
                    <path
                      d="M37.5274 0L75.0548 65H0L37.5274 0Z"
                      fill="currentColor"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200 dark:text-slate-900">
                    Vercel Speed Insights
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Core Web Vitals Status
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-600 dark:text-slate-500">
                  —
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-500">
                  Performance Score
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
                  <Activity className="h-5 w-5 text-tech-warning" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200 dark:text-slate-900">
                    PostHog Events
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Active users (30m)
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-slate-600 dark:text-slate-500">
                  —
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-500">
                  No data available
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Database & Security Quick Glance */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-tech-border dark:bg-tech-card">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-200 dark:text-slate-900">
              <Database className="h-5 w-5 text-tech-success" />
              Database & Security
            </h2>
            <Link
              href="/tech/audit-logs"
              className="flex items-center gap-1 text-sm text-tech-primary transition-colors hover:text-tech-primary/80"
            >
              Audit Logs <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
                  <Database className="h-5 w-5 text-tech-success" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200 dark:text-slate-900">
                    Supabase Connection
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Primary Database
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-tech-success/20 bg-tech-success/10 px-2.5 py-1 text-xs font-medium text-tech-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-tech-success"></span>
                  Connected
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
              <div className="flex items-center gap-3">
                <div className="rounded-lg border border-gray-200 bg-white p-2 dark:border-gray-200 dark:border-white/10 dark:bg-gray-50 dark:bg-white/5">
                  <Server className="h-5 w-5 text-tech-alert" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-200 dark:text-slate-900">
                    Sentry Error Log
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-500">
                    Unhandled exceptions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <Link
                  href="/tech/sentry"
                  className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:text-slate-900"
                >
                  No data available
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
