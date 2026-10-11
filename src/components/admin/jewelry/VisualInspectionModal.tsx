'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Sparkles,
  ZoomIn,
  ZoomOut,
  Check,
  Copy,
  Volume2,
  VolumeX,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Camera,
  Gem,
  Award,
  RefreshCw,
  Layers,
  ArrowUpRight,
  Info,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Types mirror src/lib/ai/co-founder/vision.ts
export type JewelryProductCategory =
  | 'ring'
  | 'necklace'
  | 'earrings'
  | 'bracelet'
  | 'pendant'
  | 'bangle'
  | 'anklet'
  | 'choker'
  | 'other';

export type MetalType =
  | 'yellow_gold'
  | 'white_gold'
  | 'rose_gold'
  | 'platinum'
  | 'sterling_silver'
  | 'mixed'
  | 'unidentified';

export interface GemstoneAnalysis {
  type: string;
  color?: string;
  cut?: string;
  settingType?: string;
  apparentClarityGrade?: string;
  count?: number;
}

export interface VisualFlaw {
  category:
    | 'metal_finish'
    | 'stone_setting'
    | 'symmetry'
    | 'surface'
    | 'photo_artifact';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PhotoQualityAssessment {
  lightingScore: number;
  sharpnessScore: number;
  backgroundContrastScore: number;
  ecommerceComplianceScore: number;
  overallScore: number;
  issues: string[];
}

export interface JewelryVisualAnalysisResult {
  success: boolean;
  productCategory: JewelryProductCategory;
  metalType: MetalType;
  estimatedKarat?: string;
  metalFinish?: string;
  gemstones: GemstoneAnalysis[];
  craftsmanshipScore: number;
  photoQuality: PhotoQualityAssessment;
  detectedFlaws: VisualFlaw[];
  visualTags: string[];
  marketDifferentiators: string[];
  recommendations: string[];
  summary: string;
  summaryForVoice: string;
  error?: string;
}

export interface VisualInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl?: string;
  imageBase64?: string;
  productName?: string;
  category?: string;
  initialAnalysis?: JewelryVisualAnalysisResult | null;
  onApplyPDPData?: (data: {
    tags: string[];
    summary: string;
    recommendations: string[];
  }) => void;
  className?: string;
}

export interface QualityBenchmark {
  grade: 'A+' | 'B' | 'REJECT';
  label: string;
  score: number;
  color: 'emerald' | 'amber' | 'rose';
  description: string;
}

/**
 * Calculates standardized quality benchmark based on craftsmanship and photo scores.
 */
export function calculateQualityBenchmark(
  craftsmanshipScore: number,
  photoScore: number,
  flaws: VisualFlaw[] = []
): QualityBenchmark {
  const combined = Math.round(craftsmanshipScore * 0.5 + photoScore * 0.5);
  const hasHighSeverityFlaw = flaws.some((f) => f.severity === 'high');

  if (combined >= 85 && !hasHighSeverityFlaw) {
    return {
      grade: 'A+',
      label: 'Grade A+ • E-Commerce Ready',
      score: combined,
      color: 'emerald',
      description:
        'Meets luxury jewelry catalog standards. Flawless craftsmanship & studio lighting.',
    };
  }

  if (combined >= 70 && !hasHighSeverityFlaw) {
    return {
      grade: 'B',
      label: 'Grade B • Minor Review Recommended',
      score: combined,
      color: 'amber',
      description:
        'Good quality presentation with minor surface or lighting imperfections.',
    };
  }

  return {
    grade: 'REJECT',
    label: 'Needs Attention • Retake / Reject',
    score: combined,
    color: 'rose',
    description:
      'Significant defect detected or lighting non-compliance. Studio retake strongly advised.',
  };
}

/**
 * Formats metal display with karat and finish notes.
 */
export function formatMetalDisplay(
  metalType: string,
  estimatedKarat?: string,
  metalFinish?: string
): string {
  const metalLabels: Record<string, string> = {
    yellow_gold: 'Yellow Gold',
    white_gold: 'White Gold',
    rose_gold: 'Rose Gold',
    platinum: 'Platinum',
    sterling_silver: '925 Sterling Silver',
    mixed: 'Mixed Precious Metal',
    unidentified: 'Precious Alloy',
  };

  const name = metalLabels[metalType] || metalType.replace('_', ' ');
  const karatPart = estimatedKarat ? `${estimatedKarat} ` : '';
  const finishPart = metalFinish
    ? ` (${metalFinish.replace('_', ' ')})`
    : '';

  return `${karatPart}${name}${finishPart}`.trim();
}

/**
 * Get CSS badge styling for flaw severity.
 */
export function getSeverityBadgeClass(severity: 'low' | 'medium' | 'high'): string {
  switch (severity) {
    case 'high':
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    case 'medium':
      return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
    case 'low':
    default:
      return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
  }
}

/**
 * Get category badge label and icon color.
 */
export function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function VisualInspectionModal({
  isOpen,
  onClose,
  imageUrl,
  imageBase64,
  productName,
  category,
  initialAnalysis,
  onApplyPDPData,
  className = '',
}: VisualInspectionModalProps) {
  const [analysis, setAnalysis] = useState<JewelryVisualAnalysisResult | null>(
    initialAnalysis || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isSpeakingVoice, setIsSpeakingVoice] = useState(false);
  const [copiedTags, setCopiedTags] = useState(false);
  const [selectedFlawIndex, setSelectedFlawIndex] = useState<number | null>(null);

  // Sync initial analysis prop changes
  useEffect(() => {
    if (initialAnalysis) {
      setAnalysis(initialAnalysis);
    }
  }, [initialAnalysis]);

  // Execute inspection API call
  const runInspection = useCallback(async () => {
    if (!imageUrl && !imageBase64) return;

    setIsLoading(true);
    setError(null);

    try {
      const resp = await fetch('/api/admin/co-founder/vision/inspect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          imageBase64,
          productNameHint: productName,
          categoryHint: category,
        }),
      });

      if (!resp.ok) {
        const errorJson = await resp.json().catch(() => ({}));
        throw new Error(
          errorJson?.error || `Inspection request failed with status ${resp.status}`
        );
      }

      const data: JewelryVisualAnalysisResult = await resp.json();
      setAnalysis(data);
      toast.success('Jewelry visual appraisal complete!');
    } catch (err: any) {
      const msg = err?.message || 'Failed to analyze product image';
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [imageUrl, imageBase64, productName, category]);

  // Run automatically if open and no analysis is present
  useEffect(() => {
    if (isOpen && !analysis && !isLoading && !error && (imageUrl || imageBase64)) {
      runInspection();
    }
  }, [isOpen, analysis, isLoading, error, imageUrl, imageBase64, runInspection]);

  // Handle Voice Audio Playback via SpeechSynthesis
  const handleToggleVoice = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (isSpeakingVoice) {
      window.speechSynthesis.cancel();
      setIsSpeakingVoice(false);
      return;
    }

    const textToSpeak =
      analysis?.summaryForVoice ||
      analysis?.summary ||
      'No appraisal summary available to read aloud.';

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    utterance.rate = 0.95;

    // Try finding Bengali or Indian English voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((v) => v.lang.includes('bn')) ||
      voices.find((v) => v.lang.includes('IN')) ||
      null;
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }

    utterance.onstart = () => setIsSpeakingVoice(true);
    utterance.onend = () => setIsSpeakingVoice(false);
    utterance.onerror = () => setIsSpeakingVoice(false);

    window.speechSynthesis.speak(utterance);
  };

  // Copy all visual tags
  const handleCopyTags = () => {
    if (!analysis?.visualTags?.length) return;
    const tagsString = analysis.visualTags.join(', ');
    navigator.clipboard?.writeText(tagsString);
    setCopiedTags(true);
    toast.success('Visual tags copied to clipboard!');
    setTimeout(() => setCopiedTags(false), 2500);
  };

  // Apply to PDP
  const handleApplyToPDP = () => {
    if (!analysis) return;
    if (onApplyPDPData) {
      onApplyPDPData({
        tags: analysis.visualTags || [],
        summary: analysis.summary || '',
        recommendations: analysis.recommendations || [],
      });
      toast.success('PDP metadata updated from visual appraisal!');
    }
  };

  // Zoom toggles
  const handleZoomIn = () => setZoomLevel((prev) => Math.min(2.5, prev + 0.5));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(1, prev - 0.5));

  if (!isOpen) return null;

  const benchmark = analysis
    ? calculateQualityBenchmark(
        analysis.craftsmanshipScore,
        analysis.photoQuality.overallScore,
        analysis.detectedFlaws
      )
    : null;

  const displayImageSrc = imageUrl || imageBase64 || '';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-headline"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        className={`relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-zinc-950 border border-zinc-800/80 rounded-2xl shadow-2xl shadow-black/60 overflow-hidden ${className}`}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/60 bg-zinc-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-emerald-500/10 border border-amber-500/30 text-amber-400">
              <Gem className="w-5 h-5" />
            </div>
            <div>
              <h2
                id="modal-headline"
                className="text-lg font-semibold text-zinc-100 flex items-center gap-2"
              >
                AI Co-Founder Visual Appraisal & Photo Quality Canvas
                <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/50">
                  Multimodal Vision
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                {productName || 'Jewelry Piece'} • Gemini Vision Appraisal Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={runInspection}
              disabled={isLoading}
              title="Re-run Visual Inspection"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-lg transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Re-Scan
            </button>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Image Canvas (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col gap-4">
            <div className="relative aspect-square w-full rounded-xl bg-zinc-900/90 border border-zinc-800/80 overflow-hidden flex items-center justify-center group shadow-inner">
              {displayImageSrc ? (
                <div
                  className="w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-200 cursor-grab active:cursor-grabbing"
                  style={{ transform: `scale(${zoomLevel})` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={displayImageSrc}
                    alt={productName || 'Inspected Jewelry Piece'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-500 gap-2 p-6 text-center">
                  <Camera className="w-12 h-12 stroke-[1.5] text-zinc-600" />
                  <p className="text-sm font-medium">No Image Provided</p>
                  <p className="text-xs text-zinc-600">
                    Provide a valid image URL or base64 data to inspect.
                  </p>
                </div>
              )}

              {/* Scanning Animation Beam while loading */}
              {isLoading && (
                <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] flex flex-col items-center justify-center z-20">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-amber-400 to-emerald-500 animate-pulse" />
                  <div className="p-4 rounded-xl bg-zinc-900/90 border border-zinc-700/80 shadow-2xl flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 text-amber-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-sm font-semibold text-zinc-100">
                        Analyzing Gemological Details...
                      </p>
                      <p className="text-xs text-zinc-400">
                        Evaluating metal karat, gemstone clarity & photo compliance
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Zoom Controls Overlay */}
              {displayImageSrc && !isLoading && (
                <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-zinc-900/90 backdrop-blur-md border border-zinc-700/70 p-1 rounded-lg z-10 shadow-lg">
                  <button
                    onClick={handleZoomOut}
                    disabled={zoomLevel <= 1}
                    className="p-1 hover:bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-mono text-zinc-400 px-1">
                    {zoomLevel}x
                  </span>
                  <button
                    onClick={handleZoomIn}
                    disabled={zoomLevel >= 2.5}
                    className="p-1 hover:bg-zinc-800 text-zinc-300 rounded disabled:opacity-40"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Benchmark Badge Pill on Top Left */}
              {benchmark && !isLoading && (
                <div className="absolute top-3 left-3 z-10">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border shadow-lg ${
                      benchmark.color === 'emerald'
                        ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                        : benchmark.color === 'amber'
                          ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                          : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    {benchmark.color === 'emerald' ? (
                      <ShieldCheck className="w-3.5 h-3.5" />
                    ) : (
                      <ShieldAlert className="w-3.5 h-3.5" />
                    )}
                    <span>{benchmark.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Voice Appraisal Audio Briefing Bar */}
            {analysis && (
              <div className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="truncate">
                    <p className="text-xs font-medium text-zinc-200">
                      Co-Founder Voice Appraisal Briefing
                    </p>
                    <p className="text-[11px] text-zinc-400 truncate">
                      {analysis.summaryForVoice}
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleToggleVoice}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors shrink-0 ${
                    isSpeakingVoice
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                      : 'bg-zinc-800 text-zinc-200 border-zinc-700 hover:bg-zinc-700'
                  }`}
                >
                  {isSpeakingVoice ? (
                    <>
                      <VolumeX className="w-3.5 h-3.5" />
                      Stop
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5" />
                      Listen
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Right Column: Appraisal Details & Metrics (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col gap-5">
            {error ? (
              <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex flex-col gap-2">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                  Visual Appraisal Error
                </div>
                <p className="text-xs text-rose-200/90">{error}</p>
                <button
                  onClick={runInspection}
                  className="self-start mt-2 px-3 py-1.5 bg-rose-950 border border-rose-500/40 text-xs font-medium text-rose-200 rounded-lg hover:bg-rose-900 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : analysis ? (
              <>
                {/* 1. Appraisal Summary Card */}
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-amber-400/90 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5" />
                      Executive Appraisal Verdict
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-zinc-400">
                        Craftsmanship:
                      </span>
                      <span className="text-xs font-bold text-emerald-400 font-mono">
                        {analysis.craftsmanshipScore}/100
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-300 leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>

                {/* 2. Metal & Gemstones Specifications Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Metal Card */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-400" />
                      Precious Metal Composition
                    </div>
                    <p className="text-sm font-semibold text-zinc-100">
                      {formatMetalDisplay(
                        analysis.metalType,
                        analysis.estimatedKarat,
                        analysis.metalFinish
                      )}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        Type: {formatCategoryLabel(analysis.productCategory)}
                      </span>
                      {analysis.metalFinish && (
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                          Finish: {formatCategoryLabel(analysis.metalFinish)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Gemstones Card */}
                  <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 flex flex-col gap-2">
                    <div className="text-[11px] font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1">
                      <Gem className="w-3 h-3 text-emerald-400" />
                      Gemstones & Setting
                    </div>
                    {analysis.gemstones && analysis.gemstones.length > 0 ? (
                      <div className="flex flex-col gap-1.5">
                        {analysis.gemstones.map((gem, idx) => (
                          <div key={idx} className="flex flex-col">
                            <span className="text-xs font-semibold text-zinc-200">
                              {gem.count ? `${gem.count}x ` : ''}
                              {formatCategoryLabel(gem.type)}
                              {gem.cut ? ` (${formatCategoryLabel(gem.cut)})` : ''}
                            </span>
                            <span className="text-[11px] text-zinc-400">
                              Clarity: {gem.apparentClarityGrade || 'Grade A'} • Setting:{' '}
                              {gem.settingType
                                ? formatCategoryLabel(gem.settingType)
                                : 'Prong'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-zinc-400 italic">
                        Plain precious metal piece (no prominent stones detected)
                      </p>
                    )}
                  </div>
                </div>

                {/* 3. Studio Photography Compliance Metrics */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-400" />
                      E-Commerce Photography Compliance
                    </span>
                    <span className="text-xs font-bold text-zinc-200 font-mono">
                      Overall: {analysis.photoQuality.overallScore}%
                    </span>
                  </div>

                  {/* 4 Score Progress Bars */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Lighting</span>
                        <span className="font-mono text-zinc-200">
                          {analysis.photoQuality.lightingScore}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${analysis.photoQuality.lightingScore}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Sharpness</span>
                        <span className="font-mono text-zinc-200">
                          {analysis.photoQuality.sharpnessScore}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full"
                          style={{
                            width: `${analysis.photoQuality.sharpnessScore}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>Contrast</span>
                        <span className="font-mono text-zinc-200">
                          {analysis.photoQuality.backgroundContrastScore}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{
                            width: `${analysis.photoQuality.backgroundContrastScore}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-zinc-400 mb-1">
                        <span>PDP Standard</span>
                        <span className="font-mono text-zinc-200">
                          {analysis.photoQuality.ecommerceComplianceScore}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{
                            width: `${analysis.photoQuality.ecommerceComplianceScore}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {analysis.photoQuality.issues &&
                    analysis.photoQuality.issues.length > 0 && (
                      <div className="flex flex-col gap-1 pt-1 border-t border-zinc-800/60">
                        {analysis.photoQuality.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="text-[11px] text-amber-300/90 flex items-center gap-1.5"
                          >
                            <Info className="w-3 h-3 text-amber-400 shrink-0" />
                            <span>{issue}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>

                {/* 4. Detected Craftsmanship & Surface Flaws */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                      Detected Craftsmanship & Surface Flaws (
                      {analysis.detectedFlaws?.length || 0})
                    </span>
                  </div>

                  {analysis.detectedFlaws && analysis.detectedFlaws.length > 0 ? (
                    <div className="flex flex-col gap-1.5">
                      {analysis.detectedFlaws.map((flaw, idx) => (
                        <div
                          key={idx}
                          onClick={() => setSelectedFlawIndex(idx)}
                          className={`p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            selectedFlawIndex === idx
                              ? 'bg-zinc-800/80 border-amber-500/50'
                              : 'bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-800/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase border ${getSeverityBadgeClass(
                                flaw.severity
                              )}`}
                            >
                              {flaw.severity}
                            </span>
                            <span className="text-zinc-200 font-medium">
                              {flaw.description}
                            </span>
                          </div>
                          <span className="text-[10px] text-zinc-400">
                            {formatCategoryLabel(flaw.category)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                      No craftsmanship or surface defects detected. High-precision build.
                    </div>
                  )}
                </div>

                {/* 5. Visual Tags & One-Click PDP Optimization */}
                <div className="p-4 rounded-xl bg-zinc-900/50 border border-zinc-800/80 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Visual SEO Tags & Selling Points
                    </span>
                    <button
                      onClick={handleCopyTags}
                      className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-zinc-200 transition-colors"
                    >
                      {copiedTags ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copy Tags
                        </>
                      )}
                    </button>
                  </div>

                  {analysis.visualTags && (
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.visualTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-full text-[11px] bg-zinc-800/80 border border-zinc-700/60 text-zinc-300 hover:text-white transition-colors cursor-default"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Market Differentiators */}
                  {analysis.marketDifferentiators &&
                    analysis.marketDifferentiators.length > 0 && (
                      <div className="flex flex-col gap-1 pt-2 border-t border-zinc-800/60">
                        <span className="text-[11px] font-medium text-zinc-400">
                          Key Selling Points:
                        </span>
                        {analysis.marketDifferentiators.map((diff, idx) => (
                          <div
                            key={idx}
                            className="text-xs text-zinc-300 flex items-center gap-1.5"
                          >
                            <ArrowUpRight className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span>{diff}</span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </>
            ) : (
              <div className="p-10 rounded-xl bg-zinc-900/30 border border-zinc-800/60 flex flex-col items-center justify-center text-center gap-3">
                <Gem className="w-10 h-10 text-zinc-600 animate-pulse" />
                <p className="text-sm font-medium text-zinc-300">
                  Ready to Inspect Jewelry
                </p>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Click &apos;Re-Scan&apos; or provide an image to perform deep
                  multimodal gemological evaluation.
                </p>
                <button
                  onClick={runInspection}
                  disabled={isLoading || (!imageUrl && !imageBase64)}
                  className="mt-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 text-zinc-950 font-semibold text-xs rounded-xl shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-amber-500 transition-all disabled:opacity-50"
                >
                  Start Visual Appraisal
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/90 backdrop-blur-sm flex items-center justify-between gap-4">
          <div className="text-xs text-zinc-500 flex items-center gap-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            AI Co-Founder Vision Model v8.0 Connected
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white bg-zinc-800/80 hover:bg-zinc-700/80 border border-zinc-700/60 rounded-xl transition-colors"
            >
              Close
            </button>
            {onApplyPDPData && analysis && (
              <button
                onClick={handleApplyToPDP}
                className="px-4 py-2 text-xs font-semibold text-zinc-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-md shadow-amber-500/20 transition-all flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Apply Metadata to PDP
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
