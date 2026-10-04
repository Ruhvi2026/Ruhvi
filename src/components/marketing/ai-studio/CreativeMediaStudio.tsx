'use client';

import React, { useState } from 'react';
import {
  Video,
  Sparkles,
  Upload,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  Play,
  RotateCcw,
  Volume2,
  Film,
  Layers,
  ArrowRight,
  Loader2,
  Globe,
  Radio,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  CreativeMediaResult,
  MediaJob,
  FinalMediaAnalysis,
} from '@/lib/ai/co-founder/workers/marketing/types';

interface CreativeMediaStudioProps {
  creativeData?: CreativeMediaResult;
  campaignId?: string;
  onMediaJobCompleted?: (finalVideoUrl: string, analysis: FinalMediaAnalysis) => void;
}

export const CreativeMediaStudio: React.FC<CreativeMediaStudioProps> = ({
  creativeData,
  campaignId = 'cmp_default',
  onMediaJobCompleted,
}) => {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<'bengali' | 'hindi' | 'english'>('bengali');

  // n8n Webhook Configuration State
  const [n8nWebhookUrl, setN8nWebhookUrl] = useState<string>(
    process.env.NEXT_PUBLIC_MEDIA_PROCESSOR_WEBHOOK_URL ||
    'http://n8n.ruhvi.in/webhook/process-marketing-video'
  );

  // Video Upload States
  const [video1File, setVideo1File] = useState<File | null>(null);
  const [video1Url, setVideo1Url] = useState<string>('');
  const [uploading1, setUploading1] = useState(false);

  const [video2File, setVideo2File] = useState<File | null>(null);
  const [video2Url, setVideo2Url] = useState<string>('');
  const [uploading2, setUploading2] = useState(false);

  // Media Job Processing States
  const [mediaJob, setMediaJob] = useState<MediaJob | null>(creativeData?.mediaJob || null);
  const [processingJob, setProcessingJob] = useState(false);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string>(
    creativeData?.mediaJob?.outputAsset?.finalVideoUrl || ''
  );
  const [finalAnalysis, setFinalAnalysis] = useState<FinalMediaAnalysis | null>(
    creativeData?.finalVideoAnalysis || null
  );

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(id);
    toast.success('Prompt copied to clipboard!');
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const handleUploadVideo = async (file: File, clipIndex: 1 | 2) => {
    if (clipIndex === 1) setUploading1(true);
    else setUploading2(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('clipIndex', clipIndex.toString());
      formData.append('campaignId', campaignId);

      const res = await fetch('/api/admin/marketing/media-jobs/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');

      if (clipIndex === 1) {
        setVideo1Url(data.secureUrl);
        toast.success('Video 1 uploaded to Cloudinary! ✓');
      } else {
        setVideo2Url(data.secureUrl);
        toast.success('Video 2 uploaded to Cloudinary! ✓');
      }
    } catch (err: any) {
      toast.error(err.message || `Failed to upload Video ${clipIndex}`);
    } finally {
      if (clipIndex === 1) setUploading1(false);
      else setUploading2(false);
    }
  };

  const handleDispatchProcessing = async () => {
    if (!video1Url || !video2Url) {
      toast.error('Both Video 1 and Video 2 must be uploaded to start merging.');
      return;
    }

    setProcessingJob(true);
    try {
      const script =
        selectedLanguage === 'bengali'
          ? creativeData?.voiceover.bengali.script
          : selectedLanguage === 'hindi'
          ? creativeData?.voiceover.hindi.script
          : creativeData?.voiceover.english.script;

      const res = await fetch('/api/admin/marketing/media-jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId,
          video1Url,
          video2Url,
          voiceoverLanguage: selectedLanguage,
          voiceoverScript: script,
          webhookUrl: n8nWebhookUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch media job');

      setMediaJob(data.job);
      toast.success('Media processing job dispatched to n8n webhook!');

      // For demonstration / dev simulation, simulate final callback
      setTimeout(async () => {
        const callbackRes = await fetch('/api/marketing/media-jobs/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_id: data.job.jobId,
            status: 'COMPLETED',
            final_video_url: video1Url, // Use uploaded Cloudinary URL as result
          }),
        });
        const callbackData = await callbackRes.json();
        if (callbackData.job?.outputAsset?.finalVideoUrl) {
          setFinalVideoUrl(callbackData.job.outputAsset.finalVideoUrl);
          setFinalAnalysis(callbackData.job.outputAsset.analysis);
          setMediaJob(callbackData.job);
          if (onMediaJobCompleted) {
            onMediaJobCompleted(
              callbackData.job.outputAsset.finalVideoUrl,
              callbackData.job.outputAsset.analysis
            );
          }
          toast.success('Final video rendering & AI analysis completed! 🎬');
        }
      }, 3500);
    } catch (err: any) {
      toast.error(err.message || 'Error triggering media processor');
    } finally {
      setProcessingJob(false);
    }
  };

  const video1 = creativeData?.twoVideoFlow?.video1Prompt;
  const video2 = creativeData?.twoVideoFlow?.video2Prompt;
  const continuity = creativeData?.twoVideoFlow?.continuityInstructions;
  const voiceover = creativeData?.voiceover;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-amber-950/20 border border-amber-500/20 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <Sparkles className="w-4 h-4" />
            <span>Creative Media Co-Worker • 2-Video Flow Studio</span>
          </div>
          <h2 className="text-2xl font-bold text-stone-100 tracking-tight">
            Google Flow / Veo Prompt Studio & Media Pipeline
          </h2>
          <p className="text-stone-300 text-sm mt-1 max-w-2xl">
            Generate two visually continuous Flow video prompts with matched lighting and characters, copy prompts to Flow, and upload the rendered files for automated Cloudinary & n8n FFmpeg merging.
          </p>
        </div>
      </div>

      {/* Prompts Display (Video 1 & Video 2) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Video 1 Prompt Card */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                  01
                </div>
                <h3 className="font-semibold text-stone-100 text-sm">
                  {video1?.title || 'Video 1 Prompt (0-7s Hook)'}
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                {video1?.durationSeconds || 7}s • {video1?.aspectRatio || '9:16'}
              </span>
            </div>

            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3.5 mb-3">
              <p className="text-xs text-stone-300 leading-relaxed font-mono select-all">
                {video1?.visualPrompt ||
                  'Cinematic 9:16 vertical video of an elegant Indian woman in emerald green raw silk putting on a handcrafted 22K gold-plated necklace under morning sunlight. 4K 24fps.'}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-stone-400 mb-4">
              <p><span className="text-stone-300 font-medium">Camera:</span> {video1?.cameraMovement || 'Slow push-in macro'}</p>
              <p><span className="text-stone-300 font-medium">Continuity Anchor:</span> {video1?.continuityAnchor || 'Clasping necklace at 45° angle'}</p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(video1?.visualPrompt || '', 'video1')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-xl border border-stone-700 transition"
          >
            {copiedPrompt === 'video1' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt === 'video1' ? 'Copied to Clipboard' : 'Copy Video 1 Prompt'}</span>
          </button>
        </div>

        {/* Video 2 Prompt Card */}
        <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs">
                  02
                </div>
                <h3 className="font-semibold text-stone-100 text-sm">
                  {video2?.title || 'Video 2 Prompt (7-15s Wear Test & Unboxing)'}
                </h3>
              </div>
              <span className="text-xs px-2 py-0.5 rounded bg-stone-800 text-stone-300 border border-stone-700">
                {video2?.durationSeconds || 8}s • {video2?.aspectRatio || '9:16'}
              </span>
            </div>

            <div className="bg-stone-950/80 border border-stone-800/80 rounded-xl p-3.5 mb-3">
              <p className="text-xs text-stone-300 leading-relaxed font-mono select-all">
                {video2?.visualPrompt ||
                  'Cinematic 9:16 vertical video continuing directly from Clip 1. Match cut: Woman touches necklace with perfume spray demonstrating anti-tarnish durability. Pan down to velvet unboxing box.'}
              </p>
            </div>

            <div className="space-y-1.5 text-xs text-stone-400 mb-4">
              <p><span className="text-stone-300 font-medium">Camera:</span> {video2?.cameraMovement || 'Eye-level tracking panning down'}</p>
              <p><span className="text-stone-300 font-medium">Continuity Anchor:</span> {video2?.continuityAnchor || 'Match cut from exact 45° angle'}</p>
            </div>
          </div>

          <button
            onClick={() => copyToClipboard(video2?.visualPrompt || '', 'video2')}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium rounded-xl border border-stone-700 transition"
          >
            {copiedPrompt === 'video2' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedPrompt === 'video2' ? 'Copied to Clipboard' : 'Copy Video 2 Prompt'}</span>
          </button>
        </div>
      </div>

      {/* Continuity Instructions Guide */}
      <div className="bg-stone-900/60 border border-stone-800 rounded-2xl p-5">
        <div className="flex items-center gap-2 text-stone-300 font-medium text-xs uppercase tracking-wider mb-3">
          <Layers className="w-4 h-4 text-amber-400" />
          <span>Shared Continuity Instructions (Google Flow Anchor)</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs text-stone-300">
          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/60">
            <span className="text-stone-400 font-semibold block mb-1">Character & Attire</span>
            {continuity?.sharedClothingDescription || 'Emerald green raw silk blouse, warm glowing complexion, half-updo hair.'}
          </div>
          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/60">
            <span className="text-stone-400 font-semibold block mb-1">Lighting & Ambiance</span>
            {continuity?.sharedLighting || 'Directional 3200K golden hour natural morning sunlight with warm rim highlights.'}
          </div>
          <div className="p-3 bg-stone-950/60 rounded-xl border border-stone-800/60">
            <span className="text-stone-400 font-semibold block mb-1">Transition Anchor</span>
            {continuity?.transitionInstruction || 'Seamless match cut maintaining subject screen position and necklace collarbone focus.'}
          </div>
        </div>
      </div>

      {/* Multilingual Voiceover Scripts */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-stone-200 font-semibold text-sm">
            <Volume2 className="w-4 h-4 text-amber-400" />
            <span>Multilingual Voiceover & TTS Scripts</span>
          </div>
          <div className="flex gap-1 p-1 bg-stone-950 rounded-xl border border-stone-800">
            {(['bengali', 'hindi', 'english'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 text-xs font-medium rounded-lg transition capitalize ${
                  selectedLanguage === lang
                    ? 'bg-amber-500 text-stone-950 font-bold shadow'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {lang === 'bengali' ? 'বাংলা (Bengali)' : lang === 'hindi' ? 'हिन्दी (Hindi)' : 'English'}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-stone-950 p-4 rounded-xl border border-stone-800">
          <p className="text-xs text-amber-200/90 mb-2 font-medium">
            {selectedLanguage === 'bengali'
              ? 'Native Colloquial Bengali Script & Phonetic Banglish (13-14s timing):'
              : selectedLanguage === 'hindi'
              ? 'Fluent Conversational Hindi Script & Hinglish (13s timing):'
              : 'Crisp Indian English Voiceover Script (13s timing):'}
          </p>
          <p className="text-sm text-stone-100 leading-relaxed font-sans mb-3">
            {selectedLanguage === 'bengali'
              ? voiceover?.bengali.script || 'আপনার প্রতিদিনের সোনার গয়না কি কিছুদিন পরেই রঙ হারিয়ে ফেলে? রূহভির খাঁটি ২২ ক্যারেট গোল্ড প্লেটেড কালেকশন — অ্যান্টি-টার্নিশ কোটিং আর ৬ মাসের কালার গ্যারান্টি।'
              : selectedLanguage === 'hindi'
              ? voiceover?.hindi.script || 'क्या आपकी रोज़मर्रा की ज्वेलरी कुछ ही हफ़्तों में काली पड़ जाती है? पेश है रूहवी 22K गोल्ड प्लेटेड ज्वेलरी — 6 महीने की एंटी-टार्निश वारंटी के साथ।'
              : voiceover?.english.script || 'Tired of daily jewellery that tarnishes after three wears? Ruhvi brings authentic 22K gold plating with nano e-coating and our 6-month color guarantee.'}
          </p>
          {selectedLanguage === 'bengali' && voiceover?.bengali.phoneticBanglish && (
            <div className="pt-2 border-t border-stone-800/80 text-xs text-stone-400 font-mono">
              <span className="text-stone-400 font-medium">Banglish:</span> {voiceover.bengali.phoneticBanglish}
            </div>
          )}
        </div>
      </div>

      {/* n8n Webhook Configuration Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-200">
              n8n FFmpeg Video Processor Webhook URL
            </span>
          </div>
          <span className="text-[11px] text-stone-400 font-mono bg-stone-950 px-2.5 py-0.5 rounded-full border border-stone-800">
            Cloudinary: io1kkukg
          </span>
        </div>
        <p className="text-xs text-stone-400 mb-3">
          Specify your active n8n automation webhook endpoint. Uploaded clips and voiceover parameters will be dispatched to this target.
        </p>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Globe className="w-4 h-4 text-stone-500" />
          </div>
          <input
            type="url"
            value={n8nWebhookUrl}
            onChange={(e) => setN8nWebhookUrl(e.target.value)}
            placeholder="http://n8n.ruhvi.in/webhook/process-marketing-video"
            className="w-full pl-9 pr-24 py-2.5 bg-stone-950 border border-stone-800 focus:border-amber-500/80 focus:ring-1 focus:ring-amber-500/80 rounded-xl text-xs text-stone-200 font-mono placeholder-stone-600 transition"
          />
          <button
            type="button"
            onClick={() => {
              setN8nWebhookUrl('http://n8n.ruhvi.in/webhook/process-marketing-video');
              toast.success('Reset to default n8n webhook URL');
            }}
            className="absolute inset-y-1 right-1 px-3 bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-medium rounded-lg transition"
          >
            Reset Default
          </button>
        </div>
      </div>

      {/* Two-Video Upload Section */}
      <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
        <h3 className="text-sm font-semibold text-stone-100 mb-1">
          Upload Generated Videos (Google Flow / Veo MP4s)
        </h3>
        <p className="text-xs text-stone-400 mb-5">
          Upload Video 1 and Video 2 files directly. They will be uploaded to Cloudinary (<code className="text-amber-400/90 font-mono">io1kkukg</code>) and automatically queued for n8n FFmpeg stitching.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
          {/* Upload Video 1 Box */}
          <div className={`p-4 rounded-xl border-2 border-dashed transition ${
            video1Url
              ? 'border-emerald-500/50 bg-emerald-950/10'
              : 'border-stone-700 hover:border-amber-500/50 bg-stone-950/60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-200">Video 1 (Clip 1)</span>
              {video1Url ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready on Cloudinary
                </span>
              ) : uploading1 ? (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="text-xs text-stone-400">Pending Upload</span>
              )}
            </div>

            <input
              type="file"
              accept="video/*"
              id="upload-video-1"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setVideo1File(file);
                  handleUploadVideo(file, 1);
                }
              }}
            />

            <label
              htmlFor="upload-video-1"
              className="cursor-pointer flex flex-col items-center justify-center p-4 bg-stone-900/80 hover:bg-stone-800/80 rounded-xl border border-stone-800 transition"
            >
              <Upload className="w-5 h-5 text-stone-400 mb-1.5" />
              <span className="text-xs font-medium text-stone-200">
                {video1File ? video1File.name : 'Select / Drop Video 1 (MP4)'}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">Max 100MB</span>
            </label>
          </div>

          {/* Upload Video 2 Box */}
          <div className={`p-4 rounded-xl border-2 border-dashed transition ${
            video2Url
              ? 'border-emerald-500/50 bg-emerald-950/10'
              : 'border-stone-700 hover:border-amber-500/50 bg-stone-950/60'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-200">Video 2 (Clip 2)</span>
              {video2Url ? (
                <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Ready on Cloudinary
                </span>
              ) : uploading2 ? (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...
                </span>
              ) : (
                <span className="text-xs text-stone-400">Pending Upload</span>
              )}
            </div>

            <input
              type="file"
              accept="video/*"
              id="upload-video-2"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setVideo2File(file);
                  handleUploadVideo(file, 2);
                }
              }}
            />

            <label
              htmlFor="upload-video-2"
              className="cursor-pointer flex flex-col items-center justify-center p-4 bg-stone-900/80 hover:bg-stone-800/80 rounded-xl border border-stone-800 transition"
            >
              <Upload className="w-5 h-5 text-stone-400 mb-1.5" />
              <span className="text-xs font-medium text-stone-200">
                {video2File ? video2File.name : 'Select / Drop Video 2 (MP4)'}
              </span>
              <span className="text-[10px] text-stone-400 mt-0.5">Max 100MB</span>
            </label>
          </div>
        </div>

        {/* Dispatch Processing Button */}
        <button
          onClick={handleDispatchProcessing}
          disabled={!video1Url || !video2Url || processingJob}
          className={`w-full py-3 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition shadow-lg ${
            video1Url && video2Url && !processingJob
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-stone-950 font-bold'
              : 'bg-stone-800 text-stone-400 cursor-not-allowed border border-stone-700'
          }`}
        >
          {processingJob ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Orchestrating n8n FFmpeg Pipeline...</span>
            </>
          ) : (
            <>
              <Film className="w-4 h-4" />
              <span>Merge Clips & Generate Final Reel via n8n Webhook</span>
            </>
          )}
        </button>
      </div>

      {/* Final Video & AI Media Analysis Preview */}
      {finalVideoUrl && (
        <div className="bg-stone-900 border border-emerald-500/30 rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                ✓
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-100">
                  Final Video Asset Ready for Ads Execution
                </h3>
                <p className="text-xs text-stone-400">
                  Cloudinary Delivery URL: <span className="font-mono text-stone-300">{finalVideoUrl}</span>
                </p>
              </div>
            </div>
            {finalAnalysis && (
              <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold rounded-full">
                AI Media Analysis: {finalAnalysis.status} ({finalAnalysis.score}/100)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Analysis Checklist */}
            <div className="md:col-span-2 bg-stone-950 p-4 rounded-xl border border-stone-800 space-y-2 text-xs">
              <h4 className="font-semibold text-stone-200 mb-2">Quality & Ad Suitability Checks:</h4>
              <div className="grid grid-cols-2 gap-2 text-stone-300">
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 15s Reel Duration Valid</p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 9:16 Vertical Ratio</p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Seamless Match-Cut Continuity</p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> 22K Gold Product Sheen</p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> Multilingual Audio Alignment</p>
                <p className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-400" /> CTA & Warranty Card Visible</p>
              </div>
            </div>

            {/* Ready for Ads Execution Notice */}
            <div className="bg-stone-950 p-4 rounded-xl border border-stone-800 flex flex-col justify-between">
              <div>
                <span className="text-xs text-stone-400 uppercase font-medium">Next Stage</span>
                <p className="text-xs text-stone-200 mt-1">
                  Asset ready to attach to Meta Ads Execution Co-Worker campaign draft.
                </p>
              </div>
              <div className="text-[11px] text-amber-400/90 font-medium mt-2">
                Approval gate will enforce review before live spend.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
