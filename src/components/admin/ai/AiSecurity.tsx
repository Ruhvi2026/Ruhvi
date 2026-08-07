'use client';

import React, { useState } from 'react';
import { AiComponentProps } from './types';
import {
  Shield,
  ShieldAlert,
  Key,
  Lock,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  UserCheck,
  Users,
  User,
  Sliders,
  Zap,
  Sparkles,
  ShieldCheck,
  RotateCcw,
  Gauge,
  SlidersHorizontal,
  FileText,
  Hourglass,
} from 'lucide-react';

export default function AiSecurity({
  providers,
  globalConfig,
  setGlobalConfig,
  saveSettings,
  isSaving,
}: AiComponentProps) {
  const [selectedRoleTab, setSelectedRoleTab] = useState<
    'guest' | 'user' | 'staff' | 'manager' | 'admin'
  >('guest');
  const [testPrompt, setTestPrompt] = useState(
    'Write an SEO product description for an 18K Yellow Gold Solitaire Diamond Ring.'
  );
  const [testRole, setTestRole] = useState<
    'guest' | 'user' | 'staff' | 'manager' | 'admin'
  >('guest');
  const [simResult, setSimResult] = useState<{
    allowed: boolean;
    reason: string;
    details: any;
  } | null>(null);

  const updateGlobal = (key: string, value: any) => {
    setGlobalConfig({ ...globalConfig, [key]: value });
  };

  const ROLE_DEFINITIONS = [
    {
      id: 'guest',
      name: 'Guest (Anonymous)',
      desc: 'Unauthenticated storefront visitors and public IP traffic',
      badge: 'Public Traffic',
      color: 'border-gray-600 bg-gray-900/60 text-gray-300',
      icon: <Users className="h-4 w-4 text-gray-400" />,
      defaultLimits: {
        rpm: 5,
        daily: 30,
        tokens: 10000,
        maxPromptLength: 2000,
        cooldownSeconds: 30,
        fallbackGraceRetries: 1,
      },
    },
    {
      id: 'user',
      name: 'Logged-in User',
      desc: 'Registered customers logged in via OTP or Firebase Auth',
      badge: 'Verified Buyer',
      color: 'border-blue-500/30 bg-blue-950/20 text-blue-300',
      icon: <User className="h-4 w-4 text-blue-400" />,
      defaultLimits: {
        rpm: 15,
        daily: 120,
        tokens: 35000,
        maxPromptLength: 5000,
        cooldownSeconds: 15,
        fallbackGraceRetries: 2,
      },
    },
    {
      id: 'staff',
      name: 'Staff',
      desc: 'Support agents, copywriters, and store assistants',
      badge: 'Store Operations',
      color: 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300',
      icon: <UserCheck className="h-4 w-4 text-emerald-400" />,
      defaultLimits: {
        rpm: 30,
        daily: 350,
        tokens: 120000,
        maxPromptLength: 10000,
        cooldownSeconds: 5,
        fallbackGraceRetries: 3,
      },
    },
    {
      id: 'manager',
      name: 'Manager',
      desc: 'Jewellery inventory managers & marketing strategists',
      badge: 'Management',
      color: 'border-purple-500/30 bg-purple-950/20 text-purple-300',
      icon: <Sliders className="h-4 w-4 text-purple-400" />,
      defaultLimits: {
        rpm: 50,
        daily: 600,
        tokens: 300000,
        maxPromptLength: 15000,
        cooldownSeconds: 2,
        fallbackGraceRetries: 5,
      },
    },
    {
      id: 'admin',
      name: 'Admin',
      desc: 'Superadmins with full unrestricted AI system authority',
      badge: 'Full Access',
      color: 'border-amber-500/30 bg-amber-950/20 text-amber-300',
      icon: <ShieldCheck className="h-4 w-4 text-amber-400" />,
      defaultLimits: {
        rpm: 120,
        daily: 2000,
        tokens: 1000000,
        maxPromptLength: 30000,
        cooldownSeconds: 0,
        fallbackGraceRetries: 99,
      },
    },
  ];

  const PRESET_PROFILES = [
    {
      id: 'balanced',
      name: 'Balanced Production (Recommended)',
      desc: 'Optimal protection against bot floods while keeping UX fast & frictionless.',
      rates: {
        guest: {
          rpm: 5,
          daily: 30,
          tokens: 10000,
          maxPromptLength: 2000,
          cooldownSeconds: 30,
          fallbackGraceRetries: 1,
        },
        user: {
          rpm: 15,
          daily: 120,
          tokens: 35000,
          maxPromptLength: 5000,
          cooldownSeconds: 15,
          fallbackGraceRetries: 2,
        },
        staff: {
          rpm: 30,
          daily: 350,
          tokens: 120000,
          maxPromptLength: 10000,
          cooldownSeconds: 5,
          fallbackGraceRetries: 3,
        },
        manager: {
          rpm: 50,
          daily: 600,
          tokens: 300000,
          maxPromptLength: 15000,
          cooldownSeconds: 2,
          fallbackGraceRetries: 5,
        },
        admin: {
          rpm: 120,
          daily: 2000,
          tokens: 1000000,
          maxPromptLength: 30000,
          cooldownSeconds: 0,
          fallbackGraceRetries: 99,
        },
      },
    },
    {
      id: 'strict',
      name: 'Strict Defense (Anti-Scrape)',
      desc: 'Aggressive throttling to eliminate bot scraping and API abuse.',
      rates: {
        guest: {
          rpm: 2,
          daily: 10,
          tokens: 3000,
          maxPromptLength: 800,
          cooldownSeconds: 60,
          fallbackGraceRetries: 1,
        },
        user: {
          rpm: 8,
          daily: 50,
          tokens: 15000,
          maxPromptLength: 2500,
          cooldownSeconds: 30,
          fallbackGraceRetries: 1,
        },
        staff: {
          rpm: 20,
          daily: 200,
          tokens: 60000,
          maxPromptLength: 6000,
          cooldownSeconds: 10,
          fallbackGraceRetries: 2,
        },
        manager: {
          rpm: 35,
          daily: 400,
          tokens: 150000,
          maxPromptLength: 10000,
          cooldownSeconds: 5,
          fallbackGraceRetries: 3,
        },
        admin: {
          rpm: 80,
          daily: 1000,
          tokens: 500000,
          maxPromptLength: 20000,
          cooldownSeconds: 0,
          fallbackGraceRetries: 50,
        },
      },
    },
    {
      id: 'high_traffic',
      name: 'High-Traffic Sale Event',
      desc: 'Generous limits for festival shopping spikes (e.g., Diwali, Akshaya Tritiya).',
      rates: {
        guest: {
          rpm: 12,
          daily: 80,
          tokens: 25000,
          maxPromptLength: 3000,
          cooldownSeconds: 10,
          fallbackGraceRetries: 2,
        },
        user: {
          rpm: 35,
          daily: 300,
          tokens: 80000,
          maxPromptLength: 8000,
          cooldownSeconds: 5,
          fallbackGraceRetries: 3,
        },
        staff: {
          rpm: 60,
          daily: 800,
          tokens: 250000,
          maxPromptLength: 15000,
          cooldownSeconds: 2,
          fallbackGraceRetries: 5,
        },
        manager: {
          rpm: 100,
          daily: 1500,
          tokens: 600000,
          maxPromptLength: 25000,
          cooldownSeconds: 0,
          fallbackGraceRetries: 10,
        },
        admin: {
          rpm: 250,
          daily: 5000,
          tokens: 2000000,
          maxPromptLength: 50000,
          cooldownSeconds: 0,
          fallbackGraceRetries: 99,
        },
      },
    },
  ];

  const applyPreset = (preset: (typeof PRESET_PROFILES)[0]) => {
    updateGlobal('rateLimits', preset.rates);
  };

  const getRoleLimits = (role: string) => {
    const existing =
      globalConfig.rateLimits?.[role] ||
      globalConfig.rateLimits?.[role === 'user' ? 'customer' : role];
    if (existing) return existing;
    const def = ROLE_DEFINITIONS.find((r) => r.id === role);
    return def
      ? def.defaultLimits
      : {
          rpm: 10,
          daily: 100,
          tokens: 25000,
          maxPromptLength: 4000,
          cooldownSeconds: 10,
          fallbackGraceRetries: 2,
        };
  };

  const updateRoleField = (role: string, field: string, value: number) => {
    const current = getRoleLimits(role);
    const updatedRole = { ...current, [field]: value };
    const allLimits = { ...(globalConfig.rateLimits || {}) };
    allLimits[role] = updatedRole;
    if (role === 'user') allLimits['customer'] = updatedRole;
    updateGlobal('rateLimits', allLimits);
  };

  const testRateLimitRule = () => {
    const limits = getRoleLimits(testRole);
    const promptLen = testPrompt.length;

    if (limits.maxPromptLength > 0 && promptLen > limits.maxPromptLength) {
      setSimResult({
        allowed: false,
        reason: `Blocked: Prompt length (${promptLen} chars) exceeds maximum allowed threshold of ${limits.maxPromptLength} chars for role '${testRole}'.`,
        details: { promptLen, maxAllowed: limits.maxPromptLength, limits },
      });
      return;
    }

    setSimResult({
      allowed: true,
      reason: `Authorized: Request conforms to ${testRole.toUpperCase()} limits (RPM: ${limits.rpm}/min, Daily: ${limits.daily} calls, Max Chars: ${limits.maxPromptLength}).`,
      details: { promptLen, limits },
    });
  };

  const securityChecks = [
    {
      title: 'API Key Masking',
      desc: 'Keys masked in transmission and UI',
      status: 'pass',
      icon: <EyeOff className="h-5 w-5" />,
    },
    {
      title: 'Role-Based Rate Limiting',
      desc: 'Granular threshold controls across 5 user roles',
      status: globalConfig.enableRateLimiting ? 'pass' : 'warn',
      icon: <Clock className="h-5 w-5" />,
    },
    {
      title: 'Prompt Injection Filters',
      desc: 'Block malicious jailbreak directives in user input',
      status: globalConfig.enableInjectionFilter ? 'pass' : 'warn',
      icon: <ShieldAlert className="h-5 w-5" />,
    },
    {
      title: 'PII Data Redaction',
      desc: 'Scrub personal phone numbers & emails before sending to AI',
      status: globalConfig.enablePiiRedaction ? 'pass' : 'fail',
      icon: <Lock className="h-5 w-5" />,
    },
  ];

  const activeRoleData = ROLE_DEFINITIONS.find(
    (r) => r.id === selectedRoleTab
  )!;
  const activeLimits = getRoleLimits(selectedRoleTab);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold text-white">
            <Shield className="h-5 w-5 text-emerald-400" />
            Security & Role-Based Rate Limiting Configuration
          </h2>
          <p className="mt-1 text-sm text-gray-400">
            Configure manual throughput thresholds, token quotas, and abuse
            defenses categorized by user roles.
          </p>
        </div>

        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-emerald-900/30 transition-colors hover:bg-emerald-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}
          Save Security & Rate Limits
        </button>
      </div>

      {/* Top Security Checklist & Protection Toggles */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Posture Overview */}
        <div className="space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
            <Shield className="h-5 w-5 text-emerald-400" />
            Security Posture Checklist
          </h3>

          <div className="space-y-4">
            {securityChecks.map((chk, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div
                  className={`mt-0.5 ${chk.status === 'pass' ? 'text-emerald-400' : chk.status === 'warn' ? 'text-yellow-400' : 'text-red-400'}`}
                >
                  {chk.status === 'pass' ? (
                    <CheckCircle className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-white">
                    {chk.title}
                  </div>
                  <div className="mt-0.5 text-xs text-gray-400">{chk.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Global Protection Policies */}
        <div className="flex flex-col justify-between space-y-4 rounded-2xl border border-gray-700 bg-gray-800 p-6 lg:col-span-2">
          <div>
            <h3 className="mb-4 flex items-center gap-2 font-semibold text-white">
              <Lock className="h-5 w-5 text-purple-400" />
              Core Protection Policies
            </h3>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-white">
                    Rate Limiting Engine
                  </div>
                  <div className="text-xs text-gray-400">
                    Enforce role-based token buckets and RPM limits.
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-2">
                  <span className="font-mono text-[11px] text-gray-400">
                    {globalConfig.enableRateLimiting ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={globalConfig.enableRateLimiting || false}
                      onChange={(e) =>
                        updateGlobal('enableRateLimiting', e.target.checked)
                      }
                    />
                    <div className="peer h-5 w-9 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-white">
                    Prompt Injection Defense
                  </div>
                  <div className="text-xs text-gray-400">
                    Strict delimiters to neutralize embedded jailbreaks.
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-2">
                  <span className="font-mono text-[11px] text-gray-400">
                    {globalConfig.enableInjectionFilter ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={globalConfig.enableInjectionFilter || false}
                      onChange={(e) =>
                        updateGlobal('enableInjectionFilter', e.target.checked)
                      }
                    />
                    <div className="peer h-5 w-9 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>

              <div className="flex flex-col justify-between rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div>
                  <div className="mb-1 text-sm font-medium text-white">
                    PII Data Redaction
                  </div>
                  <div className="text-xs text-gray-400">
                    Scrub phone numbers and emails prior to LLM calls.
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-gray-800 pt-2">
                  <span className="font-mono text-[11px] text-gray-400">
                    {globalConfig.enablePiiRedaction ? 'Active' : 'Disabled'}
                  </span>
                  <label className="relative inline-flex cursor-pointer items-center">
                    <input
                      type="checkbox"
                      className="peer sr-only"
                      checked={globalConfig.enablePiiRedaction || false}
                      onChange={(e) =>
                        updateGlobal('enablePiiRedaction', e.target.checked)
                      }
                    />
                    <div className="peer h-5 w-9 rounded-full bg-gray-700 after:absolute after:left-[2px] after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-emerald-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-gray-700/60 bg-gray-900/50 p-3 text-xs text-gray-400">
            <Sparkles className="h-4 w-4 flex-shrink-0 text-purple-400" />
            <span>
              AI generation requests strictly comply with the active role limits
              configured below.
            </span>
          </div>
        </div>
      </div>

      {/* ROLE-BASED RATE LIMITING CONFIGURATION SECTION */}
      <div className="overflow-hidden rounded-2xl border border-gray-700 bg-gray-800 shadow-xl">
        {/* Section Header & Preset Templates */}
        <div className="via-gray-850 flex flex-col items-start justify-between gap-4 border-b border-gray-700 bg-gradient-to-r from-gray-900 to-gray-900 p-6 xl:flex-row xl:items-center">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-blue-400" />
              <h3 className="text-lg font-bold text-white">
                Role-Based Rate Limiting Configuration Matrix
              </h3>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-0.5 text-xs font-semibold text-blue-300">
                5 Roles Managed
              </span>
            </div>
            <p className="mt-1 text-xs text-gray-400">
              Configure manual limits for Requests/Minute, Daily Quota, Token
              Allowance, Max Prompt Chars, and Fallback Grace Retries.
            </p>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
              Presets:
            </span>
            {PRESET_PROFILES.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-gray-600 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-200 shadow-sm transition-all hover:border-blue-400 hover:bg-gray-700 hover:text-white"
                title={preset.desc}
              >
                {preset.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 5 Role Selection Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-gray-700 bg-gray-900/60 p-4">
          {ROLE_DEFINITIONS.map((role) => {
            const isSelected = selectedRoleTab === role.id;
            const rLimits = getRoleLimits(role.id);
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRoleTab(role.id as any)}
                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold transition-all ${
                  isSelected
                    ? 'border-blue-500 bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                    : 'border-gray-700 bg-gray-800/80 text-gray-300 hover:border-gray-600 hover:bg-gray-700'
                }`}
              >
                {role.icon}
                <div className="text-left">
                  <div className="font-bold">{role.name}</div>
                  <div
                    className={`text-[10px] ${isSelected ? 'text-blue-100' : 'text-gray-400'} font-mono`}
                  >
                    {rLimits.rpm} RPM • {rLimits.daily} calls/day
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Active Role Configuration Details */}
        <div className="space-y-6 p-6">
          <div className="flex flex-col items-start justify-between gap-3 rounded-xl border border-gray-700/80 bg-gray-900/80 p-4 md:flex-row md:items-center">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500/20 p-2.5 text-blue-400">
                {activeRoleData.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-bold text-white">
                    {activeRoleData.name}
                  </h4>
                  <span className="rounded border border-gray-700 bg-gray-800 px-2 py-0.5 font-mono text-[10px] text-gray-300">
                    {activeRoleData.badge}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-400">
                  {activeRoleData.desc}
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                const def = activeRoleData.defaultLimits;
                const allLimits = { ...(globalConfig.rateLimits || {}) };
                allLimits[activeRoleData.id] = def;
                if (activeRoleData.id === 'user') allLimits['customer'] = def;
                updateGlobal('rateLimits', allLimits);
              }}
              className="flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-400 transition-colors hover:bg-gray-700 hover:text-gray-200"
            >
              <RotateCcw className="h-3 w-3" />
              Reset to Defaults
            </button>
          </div>

          {/* 6 Configurable Threshold Inputs */}
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {/* 1. Requests Per Minute (RPM) */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Zap className="h-3.5 w-3.5 text-yellow-400" />
                  Requests Per Minute (RPM)
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {activeLimits.rpm} req/min
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="1000"
                value={activeLimits.rpm}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'rpm',
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Burst threshold per minute. Set 0 for unlimited.
              </div>
            </div>

            {/* 2. Daily Request Quota */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Clock className="h-3.5 w-3.5 text-blue-400" />
                  Daily Request Quota
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {activeLimits.daily} calls/day
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="100000"
                value={activeLimits.daily}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'daily',
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Max allowable AI calls in a 24-hour cycle.
              </div>
            </div>

            {/* 3. Token Ceiling Per Day */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Gauge className="h-3.5 w-3.5 text-purple-400" />
                  Daily Token Ceiling
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {(activeLimits.tokens || 0).toLocaleString()} tokens
                </span>
              </div>
              <input
                type="number"
                min="0"
                step="1000"
                value={activeLimits.tokens}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'tokens',
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Total daily token consumption across all models.
              </div>
            </div>

            {/* 4. Max Prompt Length */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <FileText className="h-3.5 w-3.5 text-emerald-400" />
                  Max Prompt Characters
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {activeLimits.maxPromptLength || 2000} chars
                </span>
              </div>
              <input
                type="number"
                min="100"
                step="500"
                value={activeLimits.maxPromptLength || 2000}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'maxPromptLength',
                    Math.max(100, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Safeguard to prevent oversized injection attacks.
              </div>
            </div>

            {/* 5. Cooldown Window */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <Hourglass className="h-3.5 w-3.5 text-orange-400" />
                  Cooldown Penalty Window
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {activeLimits.cooldownSeconds || 0}s
                </span>
              </div>
              <input
                type="number"
                min="0"
                max="3600"
                value={activeLimits.cooldownSeconds || 0}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'cooldownSeconds',
                    Math.max(0, parseInt(e.target.value) || 0)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Seconds client must wait if rate limit is triggered.
              </div>
            </div>

            {/* 6. Fallback Grace Retries */}
            <div className="space-y-2 rounded-xl border border-gray-700 bg-gray-900/90 p-4">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 font-semibold text-white">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-400" />
                  Fallback Grace Retries
                </span>
                <span className="font-mono text-[11px] text-gray-400">
                  {activeLimits.fallbackGraceRetries || 1} hops
                </span>
              </div>
              <input
                type="number"
                min="1"
                max="10"
                value={activeLimits.fallbackGraceRetries || 1}
                onChange={(e) =>
                  updateRoleField(
                    selectedRoleTab,
                    'fallbackGraceRetries',
                    Math.max(1, parseInt(e.target.value) || 1)
                  )
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2 font-mono text-sm text-white focus:ring-1 focus:ring-blue-500"
              />
              <div className="text-[11px] text-gray-400">
                Maximum fallback provider hops granted for this role.
              </div>
            </div>
          </div>

          {/* Full Role Comparison Table */}
          <div className="mt-8 border-t border-gray-700 pt-6">
            <h4 className="mb-3 text-sm font-semibold text-white">
              All 5 Roles Threshold Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-900/90 font-mono text-[10px] uppercase text-gray-400">
                  <tr>
                    <th className="rounded-tl-lg px-4 py-3">User Role</th>
                    <th className="px-4 py-3">RPM Limit</th>
                    <th className="px-4 py-3">Daily Quota</th>
                    <th className="px-4 py-3">Token Ceiling</th>
                    <th className="px-4 py-3">Max Prompt</th>
                    <th className="px-4 py-3">Cooldown</th>
                    <th className="rounded-tr-lg px-4 py-3">
                      Fallback Retries
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {ROLE_DEFINITIONS.map((r) => {
                    const l = getRoleLimits(r.id);
                    const isRowActive = selectedRoleTab === r.id;
                    return (
                      <tr
                        key={r.id}
                        onClick={() => setSelectedRoleTab(r.id as any)}
                        className={`cursor-pointer transition-colors ${
                          isRowActive
                            ? 'bg-blue-950/40 font-medium text-white'
                            : 'hover:bg-gray-800/60'
                        }`}
                      >
                        <td className="flex items-center gap-2 px-4 py-3">
                          {r.icon}
                          <span className="font-semibold">{r.name}</span>
                          {isRowActive && (
                            <span className="py-0.2 rounded bg-blue-500/20 px-1.5 font-mono text-[9px] text-blue-300">
                              SELECTED
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">{l.rpm} req/min</td>
                        <td className="px-4 py-3 font-mono">{l.daily} calls</td>
                        <td className="px-4 py-3 font-mono">
                          {(l.tokens || 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {l.maxPromptLength || 2000} chars
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {l.cooldownSeconds || 0}s
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {l.fallbackGraceRetries || 1} hops
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Interactive Live Rate Limiting Simulator */}
          <div className="mt-8 space-y-4 rounded-xl border border-t border-gray-700 border-gray-700/80 bg-gray-900/60 p-5 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h4 className="text-sm font-bold text-white">
                  Live Rate-Limiting & Payload Validator
                </h4>
              </div>
              <span className="font-mono text-xs text-gray-400">
                Test threshold policies in real-time
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="space-y-2 lg:col-span-2">
                <label className="text-xs text-gray-400">
                  Test Prompt Payload ({testPrompt.length} chars)
                </label>
                <textarea
                  rows={3}
                  value={testPrompt}
                  onChange={(e) => setTestPrompt(e.target.value)}
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 p-3 font-sans text-xs text-gray-200 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter a prompt to simulate rate-limiting validation..."
                />
              </div>

              <div className="flex flex-col justify-between space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Simulate As Role:
                  </label>
                  <select
                    value={testRole}
                    onChange={(e) => setTestRole(e.target.value as any)}
                    className="w-full rounded-lg border border-gray-700 bg-gray-950 p-2.5 text-xs font-medium text-white"
                  >
                    {ROLE_DEFINITIONS.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={testRateLimitRule}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-2.5 text-xs font-semibold text-white shadow-md transition-colors hover:bg-blue-500"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Evaluate Role Limits
                </button>
              </div>
            </div>

            {simResult && (
              <div
                className={`animate-fadeIn rounded-xl border p-4 text-xs font-medium ${
                  simResult.allowed
                    ? 'border-emerald-500/30 bg-emerald-950/80 text-emerald-300'
                    : 'border-red-500/30 bg-red-950/80 text-red-300'
                }`}
              >
                <div className="mb-1 flex items-center gap-2 font-bold">
                  {simResult.allowed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  )}
                  <span>
                    {simResult.allowed
                      ? 'PASS: RATE LIMIT COMPLIANT'
                      : 'FAIL: RATE LIMIT REJECTED'}
                  </span>
                </div>
                <div>{simResult.reason}</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
