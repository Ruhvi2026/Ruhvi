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
  Plus,
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

  // Phase 2: Extended fields
  const [collection, setCollection] = useState(initialData?.collection || '');
  const [skuPrefix, setSkuPrefix] = useState(initialData?.sku_prefix || '');
  const [costPrice, setCostPrice] = useState(initialData?.cost_price || '');
  const [baseSellingPrice, setBaseSellingPrice] = useState(
    initialData?.base_selling_price || ''
  );
  const [packagingCost, setPackagingCost] = useState(
    initialData?.packaging_cost || ''
  );
  const [baseMetal, setBaseMetal] = useState(initialData?.base_metal || '');
  const [platingType, setPlatingType] = useState(
    initialData?.plating_type || ''
  );
  const [platingThickness, setPlatingThickness] = useState(
    initialData?.plating_thickness_microns || ''
  );
  const [metalWeight, setMetalWeight] = useState(
    initialData?.metal_weight_grams || ''
  );
  const [durabilityClaim, setDurabilityClaim] = useState(
    initialData?.durability_claim || ''
  );
  const [careInstructions, setCareInstructions] = useState(
    initialData?.care_instructions || ''
  );
  const [stoneType, setStoneType] = useState(initialData?.stone_type || '');
  const [stoneWeightCarats, setStoneWeightCarats] = useState(
    initialData?.stone_weight_carats || ''
  );
  const [stoneCount, setStoneCount] = useState(initialData?.stone_count || '');
  const [designPattern, setDesignPattern] = useState(
    initialData?.design_pattern || ''
  );
  const [finishType, setFinishType] = useState(initialData?.finish_type || '');
  const [color, setColor] = useState(initialData?.color || '');
  const [weightGrams, setWeightGrams] = useState(
    initialData?.weight_grams || ''
  );
  const [lengthCm, setLengthCm] = useState(initialData?.length_cm || '');
  const [widthCm, setWidthCm] = useState(initialData?.width_cm || '');
  const [heightCm, setHeightCm] = useState(initialData?.height_cm || '');
  const [metaTitle, setMetaTitle] = useState(initialData?.meta_title || '');
  const [metaDescription2, setMetaDescription2] = useState(
    initialData?.meta_description || ''
  );
  const [seoKeywords, setSeoKeywords] = useState(
    initialData?.seo_keywords?.join(', ') || ''
  );
  const [imageAltText, setImageAltText] = useState(
    initialData?.image_alt_text || ''
  );
  const [warrantyInfo, setWarrantyInfo] = useState(
    initialData?.warranty_info || ''
  );
  const [returnWindowDays, setReturnWindowDays] = useState(
    initialData?.return_window_days ?? '7'
  );
  const [giftWrapAvailable, setGiftWrapAvailable] = useState(
    initialData?.gift_wrap_available ?? false
  );

  // Variants state
  const [variants, setVariants] = useState<any[]>(
    (initialData?.product_variants || []).map((v: any) => ({
      id: v.id,
      size: v.size || '',
      metal_type: v.metal_type || '',
      sku: v.sku || '',
      stock_quantity: v.stock_quantity ?? 0,
      reorder_point: v.reorder_point ?? 5,
      cost_price_override: v.cost_price_override ?? '',
      selling_price_override: v.selling_price_override ?? '',
    }))
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

  // ---- Variant management ----
  const generateVariantSku = (size: string, metalType: string) => {
    const prefix = (skuPrefix || sku || 'JWL').toUpperCase();
    const sizePart = size ? size.replace(/\s+/g, '-').toUpperCase() : 'OS';
    const metalPart = metalType
      ? metalType.replace(/\s+/g, '-').toUpperCase()
      : 'GEN';
    return `${prefix}-${metalPart}-${sizePart}`;
  };

  const addVariant = () => {
    const newVariant = {
      size: '',
      metal_type: '',
      sku: '',
      stock_quantity: 0,
      reorder_point: 5,
      cost_price_override: '',
      selling_price_override: '',
    };
    setVariants((prev) => [...prev, newVariant]);
  };

  const updateVariant = (index: number, field: string, value: any) => {
    setVariants((prev) => {
      const updated = prev.map((v, i) => {
        if (i !== index) return v;
        const next = { ...v, [field]: value };
        if (
          (field === 'size' ||
            field === 'metal_type' ||
            field === 'sku_prefix') &&
          !v.sku
        ) {
          next.sku = generateVariantSku(
            field === 'size' ? value : v.size,
            field === 'metal_type' ? value : v.metal_type
          );
        }
        return next;
      });
      return updated;
    });
  };

  const removeVariant = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const regenerateVariantSku = (index: number) => {
    setVariants((prev) => {
      const updated = prev.map((v, i) => {
        if (i !== index) return v;
        return { ...v, sku: generateVariantSku(v.size, v.metal_type) };
      });
      return updated;
    });
  };

  // ---- AI content generation (operations route) ----
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);

  const handleGenerateContent = async () => {
    setIsGeneratingContent(true);
    try {
      const categoryName =
        categories.find((c) => c.id === categoryId)?.name || '';
      const specs = {
        category: categoryName,
        base_metal: baseMetal,
        plating_type: platingType,
        stone_type: stoneType,
        design_pattern: designPattern,
        finish_type: finishType,
        color: color,
        weight_grams: weightGrams || weight,
      };

      const res = await fetch('/api/operations/generate-product-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ specs }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      const gen = data.data || {};
      if (gen.product_name) setName(gen.product_name);
      if (gen.description) setDescription(gen.description);
      if (gen.meta_title) {
        setMetaTitle(gen.meta_title);
        setSeoTitle(gen.meta_title);
      }
      if (gen.meta_description) {
        setMetaDescription2(gen.meta_description);
        setMetaDescription(gen.meta_description);
      }
      if (gen.seo_keywords && Array.isArray(gen.seo_keywords)) {
        setSeoKeywords(gen.seo_keywords.join(', '));
        setTags(gen.seo_keywords.join(', '));
      }

      toast.success('AI content generated — review before saving.');
    } catch (err: any) {
      toast.error(err.message || 'AI Generation failed');
    } finally {
      setIsGeneratingContent(false);
    }
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

    // Phase 2 extended fields
    formData.append('collection', collection);
    formData.append('sku_prefix', skuPrefix);
    formData.append('cost_price', costPrice.toString());
    formData.append('base_selling_price', baseSellingPrice.toString());
    formData.append('packaging_cost', packagingCost.toString());
    formData.append('base_metal', baseMetal);
    formData.append('plating_type', platingType);
    formData.append('plating_thickness_microns', platingThickness.toString());
    formData.append('metal_weight_grams', metalWeight.toString());
    formData.append('durability_claim', durabilityClaim);
    formData.append('care_instructions', careInstructions);
    formData.append('stone_type', stoneType);
    formData.append('stone_weight_carats', stoneWeightCarats.toString());
    formData.append('stone_count', stoneCount.toString());
    formData.append('design_pattern', designPattern);
    formData.append('finish_type', finishType);
    formData.append('color', color);
    formData.append('weight_grams', weightGrams.toString());
    formData.append('length_cm', lengthCm.toString());
    formData.append('width_cm', widthCm.toString());
    formData.append('height_cm', heightCm.toString());
    formData.append('meta_title', metaTitle);
    formData.append('meta_description', metaDescription2);
    formData.append('seo_keywords', seoKeywords);
    formData.append('image_alt_text', imageAltText);
    formData.append('warranty_info', warrantyInfo);
    formData.append('return_window_days', returnWindowDays.toString());
    formData.append(
      'gift_wrap_available',
      giftWrapAvailable ? 'true' : 'false'
    );

    const cleanedVariants = variants.map((v: any) => ({
      sku: v.sku,
      size: v.size || null,
      metal_type: v.metal_type || null,
      stock_quantity: parseInt(v.stock_quantity, 10) || 0,
      reorder_point: parseInt(v.reorder_point, 10) || 5,
      cost_price_override: v.cost_price_override || null,
      selling_price_override: v.selling_price_override || null,
    }));
    formData.append('variants', JSON.stringify(cleanedVariants));

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
            onClick={handleGenerateContent}
            disabled={isGeneratingContent}
            className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-400 transition-all hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {isGeneratingContent ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Generate Content
          </button>
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Collection
                  </label>
                  <input
                    type="text"
                    value={collection}
                    onChange={(e) => setCollection(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., Signature Collection"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    SKU Prefix
                  </label>
                  <input
                    type="text"
                    value={skuPrefix}
                    onChange={(e) => setSkuPrefix(e.target.value.toUpperCase())}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g., RNG (used for variant SKUs)"
                  />
                  <p className="mt-1 text-xs text-slate-500">
                    Used to auto-generate variant SKUs as{' '}
                    <code>{skuPrefix || 'PREFIX'}-METAL-SIZE</code>
                  </p>
                </div>
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Base Selling Price (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={baseSellingPrice}
                  onChange={(e) => setBaseSellingPrice(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Packaging Cost (₹)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={packagingCost}
                  onChange={(e) => setPackagingCost(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Gold-Plated Details */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Gold-Plated Details
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Base Metal
                </label>
                <select
                  value={baseMetal}
                  onChange={(e) => setBaseMetal(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Brass">Brass</option>
                  <option value="Copper">Copper</option>
                  <option value="Alloy">Alloy</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Plating Type
                </label>
                <select
                  value={platingType}
                  onChange={(e) => setPlatingType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="24K Gold Plated">24K Gold Plated</option>
                  <option value="18K Gold Plated">18K Gold Plated</option>
                  <option value="Rose Gold Plated">Rose Gold Plated</option>
                  <option value="Rhodium Plated">Rhodium Plated</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Plating Thickness (microns)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={platingThickness}
                  onChange={(e) => setPlatingThickness(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 2.5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Metal Weight (g)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={metalWeight}
                  onChange={(e) => setMetalWeight(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 1.8"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Durability Claim
                </label>
                <input
                  type="text"
                  value={durabilityClaim}
                  onChange={(e) => setDurabilityClaim(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 12 months with proper care"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Care Instructions
                </label>
                <textarea
                  rows={2}
                  value={careInstructions}
                  onChange={(e) => setCareInstructions(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Avoid contact with water, perfumes, and chemicals..."
                />
              </div>
            </div>
          </div>

          {/* Physical Specs */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Physical Specs
            </h2>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Weight (g)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={weightGrams}
                  onChange={(e) => setWeightGrams(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 4.5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Length (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={lengthCm}
                  onChange={(e) => setLengthCm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 2.0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Width (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 2.0"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Height (cm)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 0.5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Finish Type
                </label>
                <select
                  value={finishType}
                  onChange={(e) => setFinishType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Select...</option>
                  <option value="Matte">Matte</option>
                  <option value="Shiny">Shiny</option>
                  <option value="Antique">Antique</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Color
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Gold, Rose Gold"
                />
              </div>
            </div>
          </div>

          {/* Stone / Design */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Stone / Design
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Stone Type
                </label>
                <input
                  type="text"
                  value={stoneType}
                  onChange={(e) => setStoneType(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Cubic Zirconia, Freshwater Pearl"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Stone Weight (carats)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={stoneWeightCarats}
                  onChange={(e) => setStoneWeightCarats(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 0.5"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Stone Count
                </label>
                <input
                  type="number"
                  value={stoneCount}
                  onChange={(e) => setStoneCount(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 1"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Design Pattern
                </label>
                <input
                  type="text"
                  value={designPattern}
                  onChange={(e) => setDesignPattern(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., Solitaire, Floral drop, Cable chain"
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
                    onChange={(e) => {
                      setSeoTitle(e.target.value);
                      setMetaTitle(e.target.value);
                    }}
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
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-400">
                    SEO Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={seoKeywords}
                    onChange={(e) => setSeoKeywords(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="gold ring, solitaire, cubic zirconia"
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
                  onChange={(e) => {
                    setMetaDescription(e.target.value);
                    setMetaDescription2(e.target.value);
                  }}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Crafted in premium 22k gold-plated finish, our diamond solitaire ring is the epitome of elegance. Shop premium gold plated jewellery at Ruhvi today."
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

          {/* Variants */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-bold text-white">Variants</h2>
              <button
                type="button"
                onClick={addVariant}
                className="flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" /> Add Variant
              </button>
            </div>

            {variants.length === 0 ? (
              <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
                No variants defined. Add size/metal combinations for this
                product.
              </div>
            ) : (
              <div className="space-y-4">
                {variants.map((v: any, i: number) => (
                  <div
                    key={i}
                    className="rounded-lg border border-white/10 bg-black/20 p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-400">
                        Variant #{i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeVariant(i)}
                        className="text-rose-400 transition-colors hover:text-rose-300"
                      >
                        <Trash className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Size
                        </label>
                        <input
                          type="text"
                          value={v.size}
                          onChange={(e) =>
                            updateVariant(i, 'size', e.target.value)
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                          placeholder="e.g., 7, 40cm"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Metal Type
                        </label>
                        <input
                          type="text"
                          value={v.metal_type}
                          onChange={(e) =>
                            updateVariant(i, 'metal_type', e.target.value)
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                          placeholder="e.g., Gold, Rose Gold"
                        />
                      </div>
                      <div className="col-span-2">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="mb-1 block text-[10px] font-medium text-slate-400">
                              Variant SKU
                            </label>
                            <input
                              type="text"
                              value={v.sku}
                              onChange={(e) =>
                                updateVariant(i, 'sku', e.target.value)
                              }
                              className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                              placeholder="auto-generated"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => regenerateVariantSku(i)}
                            className="mt-4 flex items-center gap-1 rounded bg-white/5 px-2 py-1.5 text-[10px] text-slate-400 transition-colors hover:bg-white/10"
                          >
                            <RefreshCw className="h-3 w-3" /> Regenerate
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Stock
                        </label>
                        <input
                          type="number"
                          value={v.stock_quantity}
                          onChange={(e) =>
                            updateVariant(i, 'stock_quantity', e.target.value)
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Reorder Point
                        </label>
                        <input
                          type="number"
                          value={v.reorder_point}
                          onChange={(e) =>
                            updateVariant(i, 'reorder_point', e.target.value)
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Cost Override (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={v.cost_price_override}
                          onChange={(e) =>
                            updateVariant(
                              i,
                              'cost_price_override',
                              e.target.value
                            )
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-medium text-slate-400">
                          Price Override (₹)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={v.selling_price_override}
                          onChange={(e) =>
                            updateVariant(
                              i,
                              'selling_price_override',
                              e.target.value
                            )
                          }
                          className="w-full rounded border border-white/10 bg-black/30 px-2 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Additional Settings */}
          <div className="space-y-6 rounded-xl border border-white/5 bg-[#151520] p-6 shadow-xl">
            <h2 className="border-b border-white/10 pb-4 text-lg font-bold text-white">
              Additional Settings
            </h2>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Warranty Info
                </label>
                <input
                  type="text"
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="e.g., 6 months warranty against plating wear"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-300">
                    Return Window (days)
                  </label>
                  <input
                    type="number"
                    value={returnWindowDays}
                    onChange={(e) => setReturnWindowDays(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    placeholder="7"
                  />
                </div>
                <div className="flex items-end pb-2.5">
                  <label className="flex cursor-pointer select-none items-center gap-3">
                    <input
                      type="checkbox"
                      checked={giftWrapAvailable}
                      onChange={(e) => setGiftWrapAvailable(e.target.checked)}
                      className="rounded border-white/10 bg-black/40 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                    />
                    <span className="text-sm text-slate-300">
                      Gift Wrap Available
                    </span>
                  </label>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-300">
                  Image Alt Text
                </label>
                <input
                  type="text"
                  value={imageAltText}
                  onChange={(e) => setImageAltText(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Descriptive text for product images"
                />
              </div>
            </div>
          </div>
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
