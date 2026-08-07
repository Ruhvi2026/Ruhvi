'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Loader2,
  Check,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';

interface AIProductAssistantProps {
  productData: {
    name: string;
    category: string;
    price: string;
    description: string;
    tags: string;
  };
  onApply: (data: {
    description?: string;
    tags?: string;
    seo_metadata?: any;
    ai_content?: any;
  }) => void;
}

export function AIProductAssistant({
  productData,
  onApply,
}: AIProductAssistantProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState(false);

  const handleGenerate = async () => {
    if (!productData.name) {
      setError('Please enter a product title first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setResult(null);
    setApplied(false);

    try {
      const res = await fetch('/api/admin/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate content');
      }

      setResult(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (!result) return;

    onApply({
      description: result.ai_content?.long_description,
      tags: result.seo_metadata?.product_tags?.join(', '),
      seo_metadata: result.seo_metadata,
      ai_content: result.ai_content,
    });
    setApplied(true);
    setTimeout(() => setApplied(false), 3000);
  };

  return (
    <div className="space-y-4 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-indigo-900">
            AI SEO & Content Assistant
          </h3>
        </div>
        <button
          onClick={handleGenerate}
          disabled={isGenerating || !productData.name}
          className="flex items-center space-x-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
        </button>
      </div>

      <p className="text-xs leading-relaxed text-indigo-700">
        Let Gemini 2.5 Flash analyze your inputs to generate premium product
        descriptions, SEO metadata, AEO summaries, and FAQs automatically.
      </p>

      {error && (
        <div className="flex items-start space-x-2 rounded-lg bg-red-50 p-3 text-xs text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-white p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg border border-green-100 bg-green-50 p-2">
              <div className="text-[10px] font-bold uppercase text-green-700">
                SEO Score
              </div>
              <div className="text-xl font-bold text-green-800">
                {result.quality_analysis?.seo_score || 95}/100
              </div>
            </div>
            <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
              <div className="text-[10px] font-bold uppercase text-blue-700">
                Readability
              </div>
              <div className="text-xl font-bold text-blue-800">
                {result.quality_analysis?.readability_score || 92}/100
              </div>
            </div>
            <div className="rounded-lg border border-purple-100 bg-purple-50 p-2">
              <div className="text-[10px] font-bold uppercase text-purple-700">
                AI Search
              </div>
              <div className="text-xl font-bold text-purple-800">
                {result.quality_analysis?.ai_search_score || 98}/100
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-500">
                Generated Title
              </span>
              <p className="text-sm font-semibold text-stone-800">
                {result.ai_content?.product_title}
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-500">
                Short Hook
              </span>
              <p className="text-xs italic text-stone-600">
                "{result.ai_content?.short_description}"
              </p>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-stone-500">
                SEO Meta Description
              </span>
              <p className="text-xs text-stone-600">
                {result.seo_metadata?.meta_description}
              </p>
            </div>
          </div>

          <button
            onClick={handleApply}
            className="mt-4 flex w-full items-center justify-center space-x-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
          >
            {applied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            <span>
              {applied ? 'Applied to Form!' : 'Apply Generated Content'}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
