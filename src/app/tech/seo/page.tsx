'use client';

import React, { useEffect, useState } from 'react';
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
  ShieldCheck,
} from 'lucide-react';
import { Product, ProductImage } from '@/types/database';
import { createClient } from '@/lib/supabase/client';

const DEFAULT_META = {
  siteTitle: 'Ruhvi — Exquisite Fine Jewellery & Gold-Plated Luxury',
  titleTemplate: '%s | Ruhvi Fine Jewellery',
  metaDescription:
    'Discover handcrafted premium gold-plated jewellery at Ruhvi. Anti-tarnish 22K gold plating with a 6-month color guarantee, and free insured shipping across India.',
  ogImageUrl: '',
  robotsIndex: true,
  robotsFollow: true,
};

type Message = { type: 'success' | 'error'; text: string } | null;

export default function AdminSEOPage() {
  const [activeTab, setActiveTab] = useState<
    'health' | 'meta' | 'alts' | 'sitemap'
  >('health');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [metaSettings, setMetaSettings] = useState(DEFAULT_META);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Message>(null);
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('products')
          .select('*, images:product_images(*), category:categories(*)')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Failed to load products for SEO audit', error);
          setLoadError(error.message || 'Failed to load products.');
          setProducts([]);
          return;
        }

        setProducts(data ?? []);
      } catch (err: any) {
        console.error('Failed to load products for SEO audit', err);
        setLoadError(err?.message || 'Failed to load products.');
        setProducts([]);
      } finally {
        setLoadingProducts(false);
      }
    };

    const loadMetaSettings = async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from('settings')
          .select('value')
          .eq('key', 'seo_meta')
          .maybeSingle();

        if (data?.value) {
          setMetaSettings((prev) => ({ ...prev, ...data.value }));
        }
      } catch (err) {
        console.error('Failed to load SEO meta settings', err);
      }
    };

    loadProducts();
    loadMetaSettings();
  }, [reloadKey]);

  // Initialize alt text drafts once real/demo products are available
  useEffect(() => {
    if (loadingProducts) return;
    setAltDrafts((prev) => {
      const next = { ...prev };
      products.forEach((p) => {
        (p.images || []).forEach((img) => {
          if (!(img.id in next)) {
            next[img.id] =
              img.alt || `${p.name} - Premium Gold Plated Jewellery by Ruhvi`;
          }
        });
      });
      return next;
    });
  }, [loadingProducts, products]);

  // Compute product SEO health
  const productAudits = products.map((product) => {
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

  const avgScore =
    productAudits.length > 0
      ? Math.round(
          productAudits.reduce((acc, p) => acc + p.score, 0) /
            productAudits.length
        )
      : 0;

  const showMessage = (msg: Message) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 4000);
  };

  const handleSaveMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.from('settings').upsert(
        {
          key: 'seo_meta',
          value: metaSettings,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'key' }
      );

      if (error) throw error;
      showMessage({
        type: 'success',
        text: 'SEO Meta settings saved successfully!',
      });
    } catch (err: any) {
      showMessage({
        type: 'error',
        text:
          'Failed to save meta settings: ' + (err?.message || 'unknown error'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAlt = async (image: ProductImage) => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('product_images')
        .update({ alt: altDrafts[image.id]?.trim() || null })
        .eq('id', image.id);

      if (error) throw error;
      showMessage({ type: 'success', text: 'Alt text updated successfully!' });
    } catch (err: any) {
      showMessage({
        type: 'error',
        text: 'Failed to save alt text: ' + (err?.message || 'unknown error'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAllAlts = async () => {
    const allImages = products.flatMap((p) => p.images || []);
    if (allImages.length === 0) return;

    setSaving(true);
    try {
      const supabase = createClient();
      for (const img of allImages) {
        const { error } = await supabase
          .from('product_images')
          .update({ alt: altDrafts[img.id]?.trim() || null })
          .eq('id', img.id);
        if (error) throw error;
      }
      showMessage({ type: 'success', text: 'All alt text updates saved!' });
    } catch (err: any) {
      showMessage({
        type: 'error',
        text: 'Failed to save alt text: ' + (err?.message || 'unknown error'),
      });
    } finally {
      setSaving(false);
    }
  };

  const productsWithImages = products.filter(
    (p) => (p.images?.length ?? 0) > 0
  );
  const totalImages = products.reduce(
    (acc, p) => acc + (p.images?.length ?? 0),
    0
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-xl dark:border-tech-border dark:bg-tech-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-400">
            <Globe className="h-4 w-4" />
            <span>Search Engine Optimization</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            SEO Control Suite
          </h1>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Manage meta tags, dynamic sitemaps, image alt text, and product
            search engine health.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/sitemap.xml"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:bg-white/5"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>View sitemap.xml</span>
          </a>
          <a
            href="/robots.txt"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white dark:border-white/10 dark:bg-white/10 dark:bg-white/5"
          >
            <FileText className="h-3.5 w-3.5" />
            <span>View robots.txt</span>
          </a>
        </div>
      </div>

      {message && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-xs ${
            message.type === 'success'
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-rose-500/30 bg-rose-500/10 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Load Error Alert */}
      {loadError && (
        <div className="flex items-center justify-between rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs font-medium text-rose-300">
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            Failed to load the live catalog for SEO audit: {loadError}
          </span>
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            className="ml-4 flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold text-rose-300 transition-colors hover:bg-rose-500/20"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-gray-200 dark:border-white/10">
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'health'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400'
          }`}
        >
          <BarChart2 className="h-4 w-4" />
          <span>SEO Health Audit ({avgScore}%)</span>
        </button>

        <button
          onClick={() => setActiveTab('meta')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'meta'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>Global Meta Tags</span>
        </button>

        <button
          onClick={() => setActiveTab('alts')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'alts'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400'
          }`}
        >
          <ImageIcon className="h-4 w-4" />
          <span>Image Alt Text</span>
        </button>

        <button
          onClick={() => setActiveTab('sitemap')}
          className={`flex items-center gap-2 border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
            activeTab === 'sitemap'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-200 dark:text-slate-400'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>Sitemap & Indexing</span>
        </button>
      </div>

      {/* TAB CONTENT: SEO HEALTH */}
      {activeTab === 'health' && (
        <div className="space-y-6">
          {/* Health Stats */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Catalog SEO Health Score
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-emerald-400">
                  {avgScore}%
                </span>
                <span className="text-xs font-medium text-emerald-500/80">
                  Optimized
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Total Audited Products
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-slate-900 dark:text-white">
                  {loadingProducts ? '…' : productAudits.length}
                </span>
                <span className="text-xs text-slate-600 dark:text-slate-400">
                  Products
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-5 dark:border-tech-border dark:bg-tech-card">
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
                Items Needing Optimization
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-3xl font-bold text-amber-400">
                  {productAudits.filter((p) => p.issues.length > 0).length}
                </span>
                <span className="text-xs text-amber-500">
                  Action recommended
                </span>
              </div>
            </div>
          </div>

          {/* Product Audit Table */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-tech-border dark:bg-tech-card">
            <div className="flex items-center justify-between border-b border-gray-200 p-4 dark:border-tech-border">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Product Technical SEO Breakdown
              </h3>
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {loadingProducts
                  ? 'Loading live catalog…'
                  : `Showing ${productAudits.length} items`}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-gray-50 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/5 dark:text-slate-400">
                  <tr>
                    <th className="px-4 py-3">Product Name</th>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">SEO Health</th>
                    <th className="px-4 py-3">Detected Issues</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {productAudits.map((p) => (
                    <tr
                      key={p.id}
                      className="transition-colors hover:bg-gray-50 dark:bg-white/5"
                    >
                      <td className="flex items-center gap-3 px-4 py-3 font-medium text-slate-900 dark:text-white">
                        {p.images?.[0]?.url ? (
                          <img
                            src={p.images?.[0]?.url}
                            alt={p.name}
                            className="h-8 w-8 rounded border border-gray-200 object-cover dark:border-white/10"
                          />
                        ) : (
                          <div className="h-8 w-8 rounded border border-gray-200 bg-slate-800 dark:border-white/10" />
                        )}
                        <span>{p.name}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600 dark:text-slate-400">
                        {p.sku}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                            p.score >= 90
                              ? 'border border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                              : 'dark:bg-tech-bgmber-500/10 border border-amber-500/20 bg-gray-50 text-amber-400'
                          }`}
                        >
                          {p.score >= 90 ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <AlertTriangle className="h-3 w-3" />
                          )}
                          {p.score}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.issues.length === 0 ? (
                          <span className="text-[11px] text-emerald-400/80">
                            No issues found
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {p.issues.map((iss) => (
                              <span
                                key={iss}
                                className="dark:bg-tech-bgmber-500/10 rounded bg-gray-50 px-2 py-0.5 text-[10px] text-amber-300"
                              >
                                {iss}
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={`/admin/products/${p.id}/edit`}
                          className="font-semibold text-emerald-400 hover:text-emerald-300"
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
        <form
          onSubmit={handleSaveMeta}
          className="space-y-5 rounded-xl border border-gray-200 bg-white p-6 dark:border-tech-border dark:bg-tech-card"
        >
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Default Site Meta Title
            </label>
            <input
              type="text"
              value={metaSettings.siteTitle}
              onChange={(e) =>
                setMetaSettings({ ...metaSettings, siteTitle: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Recommended length: 50-60 characters.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Title Template Format
            </label>
            <input
              type="text"
              value={metaSettings.titleTemplate}
              onChange={(e) =>
                setMetaSettings({
                  ...metaSettings,
                  titleTemplate: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 font-mono text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Used across inner pages (e.g. %s | Ruhvi Fine Jewellery).
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Global Meta Description
            </label>
            <textarea
              rows={3}
              value={metaSettings.metaDescription}
              onChange={(e) =>
                setMetaSettings({
                  ...metaSettings,
                  metaDescription: e.target.value,
                })
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-500">
              Recommended length: 140-160 characters.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-300">
              Default OpenGraph Social Share Image URL
            </label>
            <input
              type="url"
              value={metaSettings.ogImageUrl}
              onChange={(e) =>
                setMetaSettings({ ...metaSettings, ogImageUrl: e.target.value })
              }
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-white/10 dark:bg-white/5 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-semibold text-slate-900 shadow-lg shadow-emerald-600/20 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
            >
              <Save className="h-4 w-4" />
              <span>{saving ? 'Saving…' : 'Save Meta Settings'}</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB CONTENT: IMAGE ALTS */}
      {activeTab === 'alts' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-tech-border dark:bg-tech-card">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Product Image Alt Text Manager
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Ensure every product image has descriptive accessibility alt
                text for Google Image Search.
              </p>
            </div>
            {productsWithImages.length > 0 && (
              <button
                onClick={handleSaveAllAlts}
                disabled={saving}
                className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-slate-900 transition-colors hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 dark:text-white"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{saving ? 'Saving…' : `Save All (${totalImages})`}</span>
              </button>
            )}
          </div>

          {loadingProducts ? (
            <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-600 dark:text-slate-400">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Loading product images…</span>
            </div>
          ) : productsWithImages.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-600 dark:text-slate-400">
              No products with images found in the catalog.
            </div>
          ) : (
            <div className="space-y-3 pt-2">
              {productsWithImages.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-tech-border dark:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {p.images?.[0]?.url ? (
                        <img
                          src={p.images?.[0]?.url}
                          alt={p.name}
                          className="h-10 w-10 rounded border border-gray-200 object-cover dark:border-white/10"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded border border-gray-200 bg-slate-800 dark:border-white/10" />
                      )}
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-400">
                          SKU: {p.sku}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-500">
                      {p.images?.length ?? 0} image
                      {(p.images?.length ?? 0) === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(p.images || []).map((img) => (
                      <div key={img.id} className="flex items-center gap-3">
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.alt || p.name}
                            className="h-12 w-12 flex-shrink-0 rounded border border-gray-200 object-cover dark:border-white/10"
                          />
                        ) : (
                          <div className="h-12 w-12 flex-shrink-0 rounded border border-gray-200 bg-slate-800 dark:border-white/10" />
                        )}
                        <input
                          type="text"
                          value={altDrafts[img.id] ?? ''}
                          onChange={(e) =>
                            setAltDrafts((drafts) => ({
                              ...drafts,
                              [img.id]: e.target.value,
                            }))
                          }
                          placeholder="Descriptive alt text for this image…"
                          className="w-full min-w-0 flex-1 rounded border border-gray-200 bg-black/20 px-3 py-1.5 text-xs text-slate-300 focus:border-emerald-500 focus:outline-none dark:border-white/10"
                        />
                        <button
                          onClick={() => handleSaveAlt(img)}
                          disabled={saving}
                          className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition-colors hover:bg-emerald-600 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white"
                        >
                          <Save className="h-3 w-3" />
                          Save
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: SITEMAP */}
      {activeTab === 'sitemap' && (
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 dark:border-tech-border dark:bg-tech-card">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
            Sitemap & Indexing Engine
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400">
            Your website sitemap is dynamically generated at{' '}
            <code className="font-mono text-emerald-400">/sitemap.xml</code> and
            includes all live product pages, categories, and static policies.
          </p>

          <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Sitemap URL:</span>
              <a
                href="https://ruhvi.in/sitemap.xml"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-400 hover:underline"
              >
                https://ruhvi.in/sitemap.xml
              </a>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">
                Robots.txt URL:
              </span>
              <a
                href="https://ruhvi.in/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-emerald-400 hover:underline"
              >
                https://ruhvi.in/robots.txt
              </a>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">Status:</span>
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" /> Dynamic Indexing Active
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
