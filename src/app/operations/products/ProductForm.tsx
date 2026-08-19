'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { createProduct, updateProduct } from './actions';
import {
  Save,
  ArrowLeft,
  Loader2,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  Check,
  ShieldCheck,
  Upload,
  Trash,
} from 'lucide-react';
import { generateSKU } from '@/lib/sku';
import Link from 'next/link';
import toast from 'react-hot-toast';

interface ProductFormProps {
  initialData?: any;
  isEdit?: boolean;
}

export default function ProductForm({ initialData, isEdit }: ProductFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [categories, setCategories] = useState<any[]>([]);

  // Form State
  const [name, setName] = useState(initialData?.name || '');
  const [sku, setSku] = useState(initialData?.sku || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [categoryId, setCategoryId] = useState(initialData?.category_id || '');
  const [price, setPrice] = useState(initialData?.price || '');
  const [mrp, setMrp] = useState(initialData?.mrp || '');
  const [stockQuantity, setStockQuantity] = useState(
    initialData?.stock_quantity || '0'
  );
  const [status, setStatus] = useState(initialData?.status || 'active');
  const [description, setDescription] = useState(
    initialData?.description || ''
  );
  const [imagesList, setImagesList] = useState<{ url: string }[]>(
    initialData?.product_images?.map((img: any) => ({ url: img.url })) || []
  );
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // New Fields (SEO & Dimensions)
  const [aiContent, setAiContent] = useState<any>(
    initialData?.ai_content || {}
  );
  const [height, setHeight] = useState(initialData?.seo_metadata?.height || '');
  const [width, setWidth] = useState(initialData?.seo_metadata?.width || '');
  const [length, setLength] = useState(initialData?.seo_metadata?.length || '');
  const [weight, setWeight] = useState(initialData?.seo_metadata?.weight || '');
  const [seoTitle, setSeoTitle] = useState(
    initialData?.seo_metadata?.seo_title || ''
  );
  const [metaDescription, setMetaDescription] = useState(
    initialData?.seo_metadata?.meta_description || ''
  );
  const [focusKeyword, setFocusKeyword] = useState(
    initialData?.seo_metadata?.focus_keyword || ''
  );
  const [tags, setTags] = useState(
    initialData?.seo_metadata?.product_tags?.join(', ') || ''
  );

  // Other Fields
  const [gstRate, setGstRate] = useState(initialData?.gst_rate || '3.00');
  const [lowStockThreshold, setLowStockThreshold] = useState(
    initialData?.low_stock_threshold || '5'
  );
  const [isNewArrival, setIsNewArrival] = useState(
    initialData?.is_new_arrival ?? false
  );
  const [isBestSeller, setIsBestSeller] = useState(
    initialData?.is_best_seller ?? false
  );

  // SKU generation state
  const [isSkuEdited, setIsSkuEdited] = useState(isEdit ? true : false);

  // AI Description & Audit States
  const [showAiDescPrompt, setShowAiDescPrompt] = useState(false);
  const [aiPromptNotes, setAiPromptNotes] = useState('');
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);

  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResult, setAuditResult] = useState<any>(null);
  const [showAuditModal, setShowAuditModal] = useState(false);

  useEffect(() => {
    const fetchCategories = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');
      if (data) setCategories(data);
    };
    fetchCategories();
  }, []);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEdit && name && !slug) {
      setSlug(
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, '')
      );
    }
  }, [name, isEdit, slug]);

  // SKU Auto-generation on category selection
  useEffect(() => {
    if (categoryId && !isSkuEdited && !isEdit) {
      const selectedCat = categories.find((c) => c.id === categoryId);
      if (selectedCat) {
        const randomSeq = Math.floor(1000 + Math.random() * 9000);
        const generated = generateSKU(selectedCat.slug, randomSeq);
        setSku(generated);
      }
    }
  }, [categoryId, categories, isSkuEdited, isEdit]);

  const handleManualSkuGenerate = () => {
    const selectedCat = categories.find((c) => c.id === categoryId);
    if (!selectedCat) {
      toast.error('Please select a category first.');
      return;
    }
    const randomSeq = Math.floor(1000 + Math.random() * 9000);
    const generated = generateSKU(selectedCat.slug, randomSeq);
    setSku(generated);
    toast.success('New SKU generated!');
  };

  const handleGenerateDescription = async () => {
    if (!name) {
      toast.error('Please enter a product name first.');
      return;
    }
    if (!aiPromptNotes.trim()) {
      toast.error('Please enter some product notes first.');
      return;
    }

    setIsGeneratingDescription(true);
    try {
      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || '';
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData: {
            name,
            category: categoryName,
            price,
            description: aiPromptNotes,
            tags,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      if (data.data?.ai_content?.long_description) {
        setDescription(data.data.ai_content.long_description);
      }
      if (data.data?.seo_metadata?.meta_description) {
        setMetaDescription(data.data.seo_metadata.meta_description);
      }
      if (data.data?.seo_metadata?.focus_keyword) {
        setFocusKeyword(data.data.seo_metadata.focus_keyword);
      }
      if (data.data?.seo_metadata?.product_tags) {
        setTags(data.data.seo_metadata.product_tags.join(', '));
      }
      if (data.data?.seo_metadata?.seo_title) {
        setSeoTitle(data.data.seo_metadata.seo_title);
      }
      if (data.data?.ai_content) {
        setAiContent(data.data.ai_content);
      }

      toast.success('Description & SEO tags successfully generated!');
      setShowAiDescPrompt(false);
    } catch (err: any) {
      toast.error(err.message || 'AI Generation failed');
    } finally {
      setIsGeneratingDescription(false);
    }
  };

  const handleAuditSEO = async () => {
    setIsAuditing(true);
    try {
      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || '';
      const res = await fetch('/api/admin/ai/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productData: {
            name,
            description,
            seo_title: seoTitle,
            meta_description: metaDescription,
            product_tags: tags,
            height,
            width,
            length,
            weight,
            category: categoryName,
            price,
            mrp,
            slug,
            focus_keyword: focusKeyword,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'SEO Audit failed');
      }

      setAuditResult(data.data);
      setShowAuditModal(true);
      toast.success('SEO Audit completed!');
    } catch (err: any) {
      toast.error(err.message || 'Audit failed');
    } finally {
      setIsAuditing(false);
    }
  };

  const handleApplyAuditSuggestions = () => {
    if (!auditResult?.updated_fields) return;
    const {
      name: newName,
      description: newDesc,
      seo_title,
      meta_description,
      product_tags,
    } = auditResult.updated_fields;

    if (newName) setName(newName);
    if (newDesc) setDescription(newDesc);
    if (seo_title) setSeoTitle(seo_title);
    if (meta_description) setMetaDescription(meta_description);
    if (product_tags && Array.isArray(product_tags)) {
      setTags(product_tags.join(', '));
    }

    toast.success('AI SEO recommendations successfully applied!');
    setShowAuditModal(false);
  };

  const handleLocalImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    const loadingToast = toast.loading(`Uploading ${files.length} image(s)...`);

    try {
      const { uploadProductImage } =
        await import('@/services/cloudinaryService');
      const uploadedUrls: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadProductImage(file);
        if (res?.secure_url) {
          uploadedUrls.push(res.secure_url);
        }
      }

      setImagesList((prev) => [
        ...prev,
        ...uploadedUrls.map((url) => ({ url })),
      ]);
      toast.success('Images uploaded successfully!', { id: loadingToast });
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`, { id: loadingToast });
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    setImagesList((prev) => prev.filter((_, idx) => idx !== index));
    toast.success('Image removed from listing');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const finalSeoMetadata = {
      ...(initialData?.seo_metadata || {}),
      height: height ? parseFloat(height.toString()) : null,
      width: width ? parseFloat(width.toString()) : null,
      length: length ? parseFloat(length.toString()) : null,
      weight: weight ? parseFloat(weight.toString()) : null,
      seo_title: seoTitle || undefined,
      meta_description: metaDescription || undefined,
      focus_keyword: focusKeyword || undefined,
      product_tags: tags
        ? tags
            .split(',')
            .map((t: string) => t.trim())
            .filter(Boolean)
        : [],
    };

    const formData = new FormData();
    formData.append('name', name);
    formData.append('sku', sku);
    formData.append('slug', slug);
    formData.append('category_id', categoryId);
    formData.append('price', price.toString());
    formData.append('mrp', mrp.toString());
    formData.append('stock_quantity', stockQuantity.toString());
    formData.append('status', status);
    formData.append('description', description);
    formData.append('image_urls', imagesList.map((img) => img.url).join('\n'));
    formData.append('seo_metadata', JSON.stringify(finalSeoMetadata));
    formData.append('ai_content', JSON.stringify(aiContent));
    formData.append('gst_rate', gstRate.toString());
    formData.append('low_stock_threshold', lowStockThreshold.toString());
    formData.append('is_new_arrival', isNewArrival ? 'true' : 'false');
    formData.append('is_best_seller', isBestSeller ? 'true' : 'false');

    startTransition(async () => {
      try {
        let result;
        if (isEdit && initialData?.id) {
          result = await updateProduct(initialData.id, formData);
        } else {
          result = await createProduct(formData);
        }

        if (result.error) {
          toast.error(result.error);
        } else {
          toast.success(
            `Product successfully ${isEdit ? 'updated' : 'created'}!`
          );
          router.push('/operations/products');
        }
      } catch (err: any) {
        toast.error('An unexpected error occurred');
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Top action bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/operations/products"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {isEdit ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              {isEdit
                ? 'Update product details and variations.'
                : 'Create a new product in the catalog.'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleAuditSEO}
            disabled={isAuditing}
            className="flex items-center justify-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-4 py-2.5 text-sm font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
          >
            {isAuditing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Audit SEO
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isEdit ? 'Save Changes' : 'Create Product'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Main Column */}
        <div className="space-y-6 lg:col-span-2">
          {/* General Information */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              General Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Diamond Solitaire Ring"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-300">
                      SKU (Stock Keeping Unit) *
                    </label>
                    <button
                      type="button"
                      onClick={handleManualSkuGenerate}
                      className="flex items-center gap-1 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                    >
                      <RefreshCw className="h-3 w-3" /> Auto-Generate
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => {
                      setSku(e.target.value.toUpperCase());
                      setIsSkuEdited(true);
                    }}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., RNG-DMD-001"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    URL Slug *
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) =>
                      setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))
                    }
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., diamond-solitaire-ring"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-sm font-medium text-slate-300">
                    Description
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAiDescPrompt(!showAiDescPrompt)}
                    className="flex items-center gap-1 text-xs font-semibold text-indigo-400 transition-colors hover:text-indigo-300"
                  >
                    <Sparkles className="h-3 w-3" /> Generate with AI
                  </button>
                </div>

                {showAiDescPrompt && (
                  <div className="mb-4 space-y-3 rounded-lg border border-indigo-500/10 bg-indigo-500/5 p-4">
                    <p className="text-xs text-indigo-300">
                      Enter brief notes/specifications about the product, and
                      Gemini will generate a luxurious, SEO-friendly
                      description.
                    </p>
                    <textarea
                      rows={3}
                      value={aiPromptNotes}
                      onChange={(e) => setAiPromptNotes(e.target.value)}
                      placeholder="e.g. 18K solid gold nose pin, classic floral design, ideal for festive wear, lightweight"
                      className="w-full rounded-lg border border-indigo-500/20 bg-black/40 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowAiDescPrompt(false)}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isGeneratingDescription}
                        onClick={handleGenerateDescription}
                        className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {isGeneratingDescription ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />{' '}
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5" /> Generate
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                <textarea
                  rows={6}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Enter detailed product description..."
                />
              </div>
            </div>
          </div>

          {/* Pricing & Inventory */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Pricing & Inventory
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  MRP (Original Price) (₹) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={mrp}
                  onChange={(e) => setMrp(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Available Stock Quantity *
                </label>
                <input
                  type="number"
                  required
                  value={stockQuantity}
                  onChange={(e) => setStockQuantity(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Specifications & SEO */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white">
                SEO & Physical Dimensions
              </h2>
              <button
                type="button"
                onClick={handleAuditSEO}
                disabled={isAuditing}
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-400 transition-all hover:bg-indigo-500/20 disabled:opacity-50"
              >
                {isAuditing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Audit SEO
              </button>
            </div>

            <div className="space-y-4">
              {/* Dimensions Grid */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Height (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 1.2"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Width (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={width}
                    onChange={(e) => setWidth(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 0.8"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Length (cm)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={length}
                    onChange={(e) => setLength(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 1.5"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Weight (g)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. 4.5"
                  />
                </div>
              </div>

              {/* Keywords Grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    SEO Meta Title
                  </label>
                  <input
                    type="text"
                    value={seoTitle}
                    onChange={(e) => setSeoTitle(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="Engagement Solitaire Ring - Ruhvi"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    Focus Keyword
                  </label>
                  <input
                    type="text"
                    value={focusKeyword}
                    onChange={(e) => setFocusKeyword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="solitaire diamond ring"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  SEO Meta Description
                </label>
                <textarea
                  rows={2}
                  value={metaDescription}
                  onChange={(e) => setMetaDescription(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Crafted in 18k white gold, our diamond solitaire ring is the epitome of elegance. Shop certified hallmarked jewelry at Ruhvi today."
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Product Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Diamond, 18K Gold, Wedding, Solitaire"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Organization */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Organization
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Product Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="active">Active (Visible)</option>
                  <option value="hidden">Hidden (Draft)</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Category
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select Category...</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Display Badging */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Badging & Display
                </label>
                <label className="flex cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isNewArrival}
                    onChange={(e) => setIsNewArrival(e.target.checked)}
                    className="rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">
                    Mark as New Arrival
                  </span>
                </label>
                <label className="flex cursor-pointer select-none items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isBestSeller}
                    onChange={(e) => setIsBestSeller(e.target.checked)}
                    className="rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                  />
                  <span className="text-sm text-slate-300">
                    Mark as Best Seller
                  </span>
                </label>
              </div>

              {/* GST & Limits */}
              <div className="space-y-3 border-t border-white/10 pt-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Taxation & Alerts
                </label>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    GST Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={gstRate}
                    onChange={(e) => setGstRate(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-slate-400">
                    Low Stock Alert Limit
                  </label>
                  <input
                    type="number"
                    value={lowStockThreshold}
                    onChange={(e) => setLowStockThreshold(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center gap-2 border-b border-white/10 pb-4">
              <ImageIcon className="h-5 w-5 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Product Images</h2>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                Upload product photos. The first image will be used as the main
                search listing thumbnail.
              </p>

              <div className="flex flex-wrap gap-4">
                {imagesList.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative h-24 w-24 overflow-hidden rounded-lg border border-white/10 bg-black/40"
                  >
                    <img
                      src={img.url}
                      alt="Product"
                      className="h-full w-full object-cover"
                    />
                    {idx === 0 && (
                      <span className="absolute left-1 top-1 rounded bg-indigo-600 px-1.5 py-0.5 text-[9px] font-bold text-white shadow">
                        Main
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(idx)}
                      className="absolute right-1 top-1 rounded bg-black/60 p-1 text-rose-400 opacity-0 transition-colors hover:text-rose-300 group-hover:opacity-100"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}

                <label className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-white/10 bg-white/5 transition-all hover:border-indigo-500/50 hover:bg-white/10">
                  {isUploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                  <span className="mt-1 text-[10px] font-semibold text-slate-400">
                    Upload
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={isUploadingImage}
                    onChange={handleLocalImageUpload}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Result Modal */}
      {showAuditModal && auditResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="animate-fade-in relative w-full max-w-2xl space-y-6 rounded-2xl border border-white/10 bg-[#12121c] p-6 shadow-2xl">
            {/* Title */}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-400" />
                <h3 className="font-sans text-lg font-bold text-white">
                  AI SEO Readiness Audit
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-2 text-lg font-bold text-slate-400 transition-colors hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Score Indicator */}
            <div className="flex items-center gap-4 rounded-xl border border-indigo-500/10 bg-indigo-500/5 p-4">
              <div
                className={`flex h-16 w-16 items-center justify-center rounded-full border-4 text-xl font-bold ${
                  auditResult.score >= 90
                    ? 'border-emerald-500 text-emerald-400'
                    : auditResult.score >= 70
                      ? 'border-yellow-500 text-yellow-400'
                      : 'border-rose-500 text-rose-400'
                }`}
              >
                {auditResult.score}
              </div>
              <div>
                <h4 className="font-sans font-semibold text-white">
                  {auditResult.seo_ready
                    ? 'SEO Ready'
                    : 'Requires Optimizations'}
                </h4>
                <p className="mt-0.5 text-xs text-slate-400">
                  Gemini analyzed your listings against SEO and compliance
                  rules.
                </p>
              </div>
            </div>

            {/* Feedback Bullets */}
            <div className="space-y-2">
              <h5 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Key Findings & Recommendations
              </h5>
              <ul className="max-h-48 list-inside list-disc space-y-1.5 overflow-y-auto pr-1 text-xs text-slate-300">
                {auditResult.feedback?.map((item: string, idx: number) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 border-t border-white/5 pt-4">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                Close Report
              </button>
              <button
                type="button"
                onClick={handleApplyAuditSuggestions}
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <ShieldCheck className="h-4 w-4" /> Apply AI Corrections
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
