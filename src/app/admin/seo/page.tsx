'use client';

import React, { useState } from 'react';
import {
  Globe,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Save,
  RefreshCw,
  BarChart2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { DEMO_PRODUCTS } from '@/lib/products';

export default function AdminSEOPage() {
  const [activeTab, setActiveTab] = useState<'health' | 'meta' | 'alts' | 'sitemap'>('health');
  const [metaSettings, setMetaSettings] = useState({
    siteTitle: 'Ruhvi — Exquisite Fine Jewellery & Certified Gold',
    titleTemplate: '%s | Ruhvi Fine Jewellery',
    metaDescription:
      'Discover handcrafted gold, diamond, and gemstone jewellery at Ruhvi. BIS hallmarked purity, lifetime warranty, and free insured shipping across India.',
    ogImageUrl:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?q=80&w=1200&auto=format&fit=crop',
    robotsIndex: true,
    robotsFollow: true,
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Compute product SEO health
  const productAudits = DEMO_PRODUCTS.map((product) => {
    const issues: string[] = [];
    if (!product.description || product.description.length < 30) {
      issues.push('Short description');
    }
    if (!product.images || product.images.length === 0) {
      issues.push('No product images');
    }
    if (!product.category) {
      issues.push('Missing category');
    }

    const score = Math.max(10, 100 - issues.length * 30);
    return {
      ...product,
      issues,
      score,
    };
  });

  const avgScore = Math.round(
    productAudits.reduce((acc, p) => acc + p.score, 0) / productAudits.length
  );

  const handleSaveMeta = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#131726] p-6 rounded-2xl border border-white/5 shadow-xl">
        <div>
          <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <Globe className="w-4 h-4" />
            <span>Search Engine Optimization</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">SEO Control Suite</h1>
          <p className="text-slate-400 text-xs mt-1">
            Manage meta tags, dynamic sitemaps, image alt text, and product search engine health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg border border-white/10 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>View sitemap.xml</span>
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3.5 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-lg border border-white/10 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>View robots.txt</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/10 space-x-2">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'health'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-4 h-4" />
          <span>SEO Health Audit ({avgScore}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'meta'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Global Meta Tags</span>
        </button>

        <button
          onClick={() => setActiveTab('alts')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'alts'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Image Alt Text</span>
        </button>

        <button
          onClick={() => setActiveTab('sitemap')}
          className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'sitemap'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Sitemap & Indexing</span>
        </button>
      </div>

      {/* TAB CONTENT: SEO HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#131726] p-5 rounded-xl border border-white/5">
              <p className="text-slate-400 text-xs font-medium">Catalog SEO Health Score</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">{avgScore}%</span>
                <span className="text-xs text-emerald-500/80 font-medium">Optimized</span>
              </div>
            </div>

            <div className="bg-[#131726] p-5 rounded-xl border border-white/5">
              <p className="text-slate-400 text-xs font-medium">Total Audited Products</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">{productAudits.length}</span>
                <span className="text-xs text-slate-400">Products</span>
              </div>
            </div>

            <div className="bg-[#131726] p-5 rounded-xl border border-white/5">
              <p className="text-slate-400 text-xs font-medium">Items Needing Optimization</p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-400">
                  {productAudits.filter((p) => p.issues.length > 0).length}
                </span>
                <span className="text-xs text-amber-500">Action recommended</span>
              </div>
            </div>
          </div>

          {/* Product Audit Table */}
          <div className="bg-[#131726] rounded-xl border border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Product Technical SEO Breakdown</h3>
              <span className="text-xs text-slate-400">Showing {productAudits.length} items</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-white/5 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4">SKU</th>
                    <th className="py-3 px-4">SEO Health</th>
                    <th className="py-3 px-4">Detected Issues</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productAudits.map((p) => (
                    <tr key={p.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4 font-medium text-white flex items-center gap-3">
                        <img
                          src={p.images?.[0]?.url || 'https://via.placeholder.com/40'}
                          alt={p.name}
                          className="w-8 h-8 rounded object-cover border border-white/10"
                        />
                        <span>{p.name}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{p.sku}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.score >= 90
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {p.score >= 90 ? (
                            <CheckCircle2 className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {p.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {p.issues.length === 0 ? (
                          <span className="text-emerald-400/80 text-[11px]">No issues found</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.issues.map((iss) => (
                              <span
                                key={iss}
                                className="px-2 py-0.5 bg-amber-500/10 text-amber-300 text-[10px] rounded"
                              >
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <a
                          href={`/admin/products/${p.id}/edit`}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold"
                        >
                          Edit Meta
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: GLOBAL META */}
      {activeTab === 'meta' && (
        <form onSubmit={handleSaveMeta} className="bg-[#131726] p-6 rounded-xl border border-white/5 space-y-5">
          {savedSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 p-3 rounded-lg text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>SEO Meta settings saved successfully!</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Default Site Meta Title
            </label>
            <input
              type="text"
              value={metaSettings.siteTitle}
              onChange={(e) => setMetaSettings({ ...metaSettings, siteTitle: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Recommended length: 50-60 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Title Template Format
            </label>
            <input
              type="text"
              value={metaSettings.titleTemplate}
              onChange={(e) => setMetaSettings({ ...metaSettings, titleTemplate: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Used across inner pages (e.g. %s | Ruhvi Fine Jewellery).
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Global Meta Description
            </label>
            <textarea
              rows={3}
              value={metaSettings.metaDescription}
              onChange={(e) => setMetaSettings({ ...metaSettings, metaDescription: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">Recommended length: 140-160 characters.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Default OpenGraph Social Share Image URL
            </label>
            <input
              type="url"
              value={metaSettings.ogImageUrl}
              onChange={(e) => setMetaSettings({ ...metaSettings, ogImageUrl: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Meta Settings</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: IMAGE ALTS */}
      {activeTab === 'alts' && (
        <div className="bg-[#131726] p-6 rounded-xl border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Product Image Alt Text Manager</h3>
              <p className="text-slate-400 text-xs">
                Ensure every product image has descriptive accessibility alt text for Google Image Search.
              </p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {DEMO_PRODUCTS.map((p) => (
              <div
                key={p.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 bg-white/5 rounded-lg border border-white/5"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={p.images?.[0]?.url || 'https://via.placeholder.com/50'}
                    alt={p.name}
                    className="w-10 h-10 rounded object-cover border border-white/10"
                  />
                  <div>
                    <p className="text-xs font-semibold text-white">{p.name}</p>
                    <p className="text-[10px] text-slate-400">SKU: {p.sku}</p>
                  </div>
                </div>

                <div className="flex-1 max-w-md">
                  <input
                    type="text"
                    defaultValue={`${p.name} - BIS Hallmarked Gold Jewellery by Ruhvi`}
                    className="w-full bg-black/20 border border-white/10 rounded px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: SITEMAP */}
      {activeTab === 'sitemap' && (
        <div className="bg-[#131726] p-6 rounded-xl border border-white/5 space-y-4">
          <h3 className="text-sm font-semibold text-white">Sitemap & Indexing Engine</h3>
          <p className="text-slate-400 text-xs">
            Your website sitemap is dynamically generated at <code className="text-emerald-400 font-mono">/sitemap.xml</code> and includes all live product pages, categories, and static policies.
          </p>

          <div className="p-4 bg-white/5 rounded-lg border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Sitemap URL:</span>
              <a
                href="https://ruhvi.in/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-mono hover:underline"
              >
                https://ruhvi.in/sitemap.xml
              </a>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Robots.txt URL:</span>
              <a
                href="https://ruhvi.in/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 font-mono hover:underline"
              >
                https://ruhvi.in/robots.txt
              </a>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">Status:</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> Dynamic Indexing Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
