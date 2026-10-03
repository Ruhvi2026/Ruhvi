'use client';

import React, { useState } from 'react';
import {
  Globe,
  Lock,
  RefreshCw,
  ExternalLink,
  Minus,
  Maximize2,
  Minimize2,
  X,
  Layers,
  FileText,
  DollarSign,
  Tag,
  ArrowRight,
  ShieldCheck,
  Eye,
  Sparkles,
} from 'lucide-react';
import type { BrowseResult } from '@/lib/ai/browser/playwright';

export interface PlaywrightBrowserWindowProps {
  data: BrowseResult | null;
  isLoading?: boolean;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  onBrowseUrl?: (url: string) => void;
}

export function PlaywrightBrowserWindow({
  data,
  isLoading = false,
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onRestore,
  onBrowseUrl,
}: PlaywrightBrowserWindowProps) {
  const [activeTab, setActiveTab] = useState<
    'screenshot' | 'insights' | 'headings' | 'text'
  >('screenshot');
  const [inputUrl, setInputUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isOpen) return null;

  // Minimized Floating Pill Mode
  if (isMinimized) {
    return (
      <aside
        aria-label="Playwright browser session"
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full border border-amber-500/40 bg-neutral-950/90 px-4 py-2.5 shadow-2xl shadow-amber-500/20 backdrop-blur-xl transition-all duration-300 hover:scale-105 hover:border-amber-500"
      >
        <button
          type="button"
          onClick={onRestore}
          className="flex items-center gap-2.5 text-left focus:outline-none"
        >
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
          </span>
          <Globe className="h-4 w-4 text-amber-400" />
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-white">
              {isLoading ? 'Browsing live...' : data?.title || 'Browser Window'}
            </span>
            <span className="line-clamp-1 max-w-[160px] font-mono text-[9px] text-neutral-400">
              {data?.url
                ? data.url.replace(/^https?:\/\//, '')
                : 'Active Playwright Session'}
            </span>
          </div>
        </button>
        <button
          type="button"
          onClick={onRestore}
          title="Restore window"
          className="ml-1 rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
          <Maximize2 className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Close browser"
          className="rounded-full p-1 text-neutral-400 hover:bg-neutral-800 hover:text-rose-400"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </aside>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUrl.trim() && onBrowseUrl) {
      onBrowseUrl(inputUrl.trim());
    }
  };

  const currentUrl = data?.url || inputUrl || 'https://ruhvi.in';

  return (
    <div
      className={
        isExpanded
          ? 'fixed inset-4 z-50 flex flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-neutral-950/95 shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all duration-300'
          : 'relative flex h-full min-h-[420px] w-full flex-col overflow-hidden rounded-2xl border border-amber-500/30 bg-neutral-950/95 shadow-2xl shadow-black/80 backdrop-blur-2xl transition-all duration-300'
      }
    >
      {/* Modern Browser Chrome Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 bg-neutral-900/90 px-3.5 py-2.5">
        {/* Window Controls (Red, Yellow/Amber, Green) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            title="Close browser window"
            className="flex h-3 w-3 items-center justify-center rounded-full bg-rose-500/80 transition-colors hover:bg-rose-500"
          >
            <span className="sr-only">Close</span>
          </button>
          <button
            type="button"
            onClick={onMinimize}
            title="Minimise to floating button"
            className="flex h-3 w-3 items-center justify-center rounded-full bg-amber-500/80 transition-colors hover:bg-amber-500"
          >
            <span className="sr-only">Minimise</span>
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Restore size' : 'Expand full window'}
            className="flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500/80 transition-colors hover:bg-emerald-500"
          >
            <span className="sr-only">Expand</span>
          </button>

          <span className="ml-2 hidden font-mono text-[10px] font-semibold text-neutral-400 sm:inline-block">
            Playwright Chromium
          </span>
        </div>

        {/* Address Bar Form */}
        <form
          onSubmit={handleSubmit}
          className="mx-3 flex flex-1 items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-950 px-2.5 py-1 text-xs transition-colors focus-within:border-amber-500/60"
        >
          <Lock className="h-3 w-3 shrink-0 text-emerald-400" />
          <input
            type="text"
            value={inputUrl || data?.url || ''}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL to browse (e.g. caratlane.com or giva.co)..."
            className="w-full bg-transparent font-mono text-[11px] text-neutral-200 placeholder-neutral-500 focus:outline-none"
          />
          {onBrowseUrl && (
            <button
              type="submit"
              disabled={isLoading || !(inputUrl.trim() || data?.url)}
              className="rounded p-0.5 text-neutral-400 hover:text-amber-400 disabled:opacity-30"
              title="Navigate to URL"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          )}
        </form>

        {/* Action Icons */}
        <div className="flex items-center gap-1">
          {onBrowseUrl && data?.url && (
            <button
              type="button"
              onClick={() => onBrowseUrl(data.url)}
              disabled={isLoading}
              title="Reload page"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
            >
              <RefreshCw
                className={
                  isLoading
                    ? 'h-3.5 w-3.5 animate-spin text-amber-400'
                    : 'h-3.5 w-3.5'
                }
              />
            </button>
          )}
          {data?.url && (
            <a
              href={
                data.url.startsWith('http') ? data.url : 'https://' + data.url
              }
              target="_blank"
              rel="noreferrer"
              title="Open in external tab"
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-amber-400"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <button
            type="button"
            onClick={onMinimize}
            title="Minimise"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            title={isExpanded ? 'Contract' : 'Expand'}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-white"
          >
            {isExpanded ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-rose-400"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Subheader Status & Tab Bar */}
      <div className="flex flex-wrap items-center justify-between border-b border-neutral-800 bg-neutral-900/40 px-3.5 py-1.5 text-[11px]">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveTab('screenshot')}
            className={
              activeTab === 'screenshot'
                ? 'flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 transition-all'
                : 'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-neutral-400 transition-all hover:text-white'
            }
          >
            <Eye className="h-3 w-3" />
            <span>Rendered View</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('insights')}
            className={
              activeTab === 'insights'
                ? 'flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 transition-all'
                : 'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-neutral-400 transition-all hover:text-white'
            }
          >
            <Sparkles className="h-3 w-3" />
            <span>Insights & Pricing</span>
            {data?.detectedPrices && data.detectedPrices.length > 0 && (
              <span className="rounded-full bg-emerald-500/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">
                {data.detectedPrices.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('headings')}
            className={
              activeTab === 'headings'
                ? 'flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 transition-all'
                : 'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-neutral-400 transition-all hover:text-white'
            }
          >
            <Layers className="h-3 w-3" />
            <span>DOM Headings ({data?.headings?.length || 0})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={
              activeTab === 'text'
                ? 'flex items-center gap-1.5 rounded-md bg-amber-500/20 px-2.5 py-1 font-semibold text-amber-300 transition-all'
                : 'flex items-center gap-1.5 rounded-md px-2.5 py-1 font-medium text-neutral-400 transition-all hover:text-white'
            }
          >
            <FileText className="h-3 w-3" />
            <span>Extracted Text</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {isLoading ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-amber-400">
              <RefreshCw className="h-3 w-3 animate-spin" />
              <span>Rendering DOM...</span>
            </span>
          ) : data ? (
            <span className="flex items-center gap-1 font-mono text-[10px] text-emerald-400">
              <ShieldCheck className="h-3 w-3" />
              <span>HTTP {data.status || 200} OK</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Main Viewport Body */}
      <div className="flex-1 overflow-y-auto bg-neutral-950 p-4">
        {isLoading ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center space-y-3">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute h-full w-full animate-spin rounded-full border-2 border-amber-500/20 border-t-amber-500" />
              <Globe className="h-6 w-6 text-amber-400" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold text-white">
                Playwright is browsing...
              </p>
              <p className="font-mono text-[11px] text-neutral-400">
                {currentUrl}
              </p>
              <p className="mt-1 text-[10px] text-neutral-500">
                Executing scripts, bypassing heavy media, and taking viewport
                snapshot.
              </p>
            </div>
          </div>
        ) : !data ? (
          <div className="flex h-full min-h-[260px] flex-col items-center justify-center space-y-2 text-center">
            <Globe className="h-8 w-8 text-neutral-600" />
            <p className="text-xs font-semibold text-neutral-300">
              No active browser page
            </p>
            <p className="max-w-xs text-[11px] text-neutral-500">
              Enter any website URL in the address bar above or ask your AI
              Co-Founder to browse a page live.
            </p>
          </div>
        ) : (
          <div>
            {/* TAB 1: RENDERED SCREENSHOT VIEW */}
            {activeTab === 'screenshot' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/70 p-3">
                  <h3 className="text-sm font-bold text-white">{data.title}</h3>
                  {data.metaDescription && (
                    <p className="mt-1 text-xs text-neutral-300">
                      {data.metaDescription}
                    </p>
                  )}
                </div>
                {data.screenshotBase64 ? (
                  <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900 shadow-inner">
                    <img
                      src={'data:image/jpeg;base64,' + data.screenshotBase64}
                      alt={'Rendered screenshot of ' + data.title}
                      className="w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-xl border border-neutral-800/80 bg-neutral-900/50 p-6 text-center">
                    <p className="text-xs text-neutral-400">
                      Live DOM extracted successfully without visual image
                      overhead.
                    </p>
                    {onBrowseUrl && (
                      <button
                        type="button"
                        onClick={() => onBrowseUrl(data.url)}
                        className="mt-2 text-xs font-semibold text-amber-400 underline hover:text-amber-300"
                      >
                        Reload with Visual Screenshot
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INSIGHTS & PRICING */}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5 text-amber-400" />
                    <span>AI Co-Founder Spoken Briefing</span>
                  </div>
                  <p className="mt-1.5 text-xs leading-relaxed text-neutral-200">
                    {data.executiveVoiceSummary}
                  </p>
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Observed Prices & Discount Hooks</span>
                  </div>
                  {data.detectedPrices && data.detectedPrices.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {data.detectedPrices.map((price, idx) => (
                        <span
                          key={idx}
                          className="flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-mono text-xs font-bold text-emerald-300"
                        >
                          <Tag className="h-3 w-3" />
                          {price}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500">
                      No specific currency patterns parsed.
                    </p>
                  )}
                </div>
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-xs font-bold text-white">
                    <Layers className="h-3.5 w-3.5 text-amber-400" />
                    <span>Key Sections & Headlines</span>
                  </div>
                  <div className="space-y-1.5">
                    {data.keyHighlights?.map((hl, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-neutral-800 bg-neutral-900/60 px-3 py-1.5 text-xs text-neutral-300"
                      >
                        {hl}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: DOM HEADINGS */}
            {activeTab === 'headings' && (
              <div className="space-y-2">
                <p className="text-[11px] text-neutral-400">
                  Extracted {data.headings?.length || 0} headings from the live
                  rendered DOM:
                </p>
                {data.headings && data.headings.length > 0 ? (
                  data.headings.map((h, idx) => (
                    <div
                      key={idx}
                      className="flex items-start gap-2 rounded-lg border border-neutral-800 bg-neutral-900/70 p-2 text-xs text-neutral-200"
                    >
                      <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-400">
                        H
                      </span>
                      <span>{h}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-neutral-500">No headings found.</p>
                )}
              </div>
            )}

            {/* TAB 4: RAW EXTRACTED TEXT */}
            {activeTab === 'text' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Sanitized Body Text</span>
                  <span className="font-mono">
                    {data.textContent?.length || 0} characters
                  </span>
                </div>
                <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap rounded-xl border border-neutral-800 bg-neutral-900/90 p-3 font-mono text-xs leading-relaxed text-neutral-300">
                  {data.textContent || 'No text extracted.'}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Status Footer */}
      <footer className="flex items-center justify-between border-t border-neutral-800 bg-neutral-900/90 px-3.5 py-1.5 text-[10px] text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          <span>Playwright Engine Ready</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMinimize}
            className="text-neutral-400 hover:text-amber-400"
          >
            − Minimise to Floating Pill
          </button>
        </div>
      </footer>
    </div>
  );
}
