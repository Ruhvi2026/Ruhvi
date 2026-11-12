'use client';

import React, { useState } from 'react';
import {
  ArrowLeft,
  Reply,
  Star,
  Sparkles,
  ClipboardList,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react';
import type { EmailMessage, AISummaryResponse } from '@/types/mailbox';

interface MailboxThreadViewProps {
  message: EmailMessage;
  onBack: () => void;
  onReply: (draftBody?: string, subject?: string) => void;
  onConvertToTask: (msg: EmailMessage) => void;
  onToggleStar: (msg: EmailMessage) => void;
}

export function MailboxThreadView({
  message,
  onBack,
  onReply,
  onConvertToTask,
  onToggleStar,
}: MailboxThreadViewProps) {
  const [aiSummary, setAiSummary] = useState<AISummaryResponse | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [showSummaryCard, setShowSummaryCard] = useState(false);

  const [generatingTone, setGeneratingTone] = useState<string | null>(null);

  // Calendar Event extraction state
  const [extractedEvent, setExtractedEvent] = useState<any>(null);
  const [extractingEvent, setExtractingEvent] = useState(false);
  const [showEventCard, setShowEventCard] = useState(false);

  const handleExtractEvent = async () => {
    if (extractedEvent) {
      setShowEventCard((prev) => !prev);
      return;
    }

    setExtractingEvent(true);
    setShowEventCard(true);
    try {
      const res = await fetch('/api/mailbox/ai/extract-event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: message.subject,
          body: message.bodyText || message.snippet,
          from: message.from.name || message.from.email,
          date: message.date,
        }),
      });
      const data = await res.json();
      if (data.success && data.event) {
        setExtractedEvent(data.event);
      }
    } catch (err) {
      console.error('Failed to extract calendar event:', err);
    } finally {
      setExtractingEvent(false);
    }
  };

  const handleGenerateSummary = async () => {
    if (aiSummary) {
      setShowSummaryCard((prev) => !prev);
      return;
    }

    setLoadingSummary(true);
    setShowSummaryCard(true);
    try {
      const res = await fetch('/api/mailbox/ai/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: message.subject,
          body: message.bodyText || message.snippet,
          from: message.from.name || message.from.email,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAiSummary({
          summary: data.summary,
          keyPoints: data.keyPoints || [],
          actionItems: data.actionItems || [],
          sentiment: data.sentiment,
        });
      }
    } catch (err) {
      console.error('Failed to generate AI summary:', err);
    } finally {
      setLoadingSummary(false);
    }
  };

  const handle1ClickReply = async (
    tone: 'professional' | 'quick' | 'clarify'
  ) => {
    setGeneratingTone(tone);
    try {
      const res = await fetch('/api/mailbox/ai/suggest-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: message.subject,
          body: message.bodyText || message.snippet,
          from: message.from.name || message.from.email,
          tone,
        }),
      });
      const data = await res.json();
      if (data.success && data.suggestion?.body) {
        const replySubject = message.subject.startsWith('Re:')
          ? message.subject
          : `Re: ${message.subject}`;
        onReply(data.suggestion.body, replySubject);
      } else {
        onReply('', `Re: ${message.subject}`);
      }
    } catch (err) {
      console.error('1-Click AI reply error:', err);
      onReply('', `Re: ${message.subject}`);
    } finally {
      setGeneratingTone(null);
    }
  };

  const formattedDate = new Date(message.date).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#0D111E]">
      {/* Top Action Header */}
      <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#161D31] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-white/10 hover:text-white"
            title="Back to email list"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          <span className="text-xs font-semibold text-slate-300">
            {message.direction === 'outbound'
              ? 'Sent Message'
              : 'Received Message'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick Star */}
          <button
            onClick={() => onToggleStar(message)}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-amber-400"
            title={message.starred ? 'Starred' : 'Add star'}
          >
            <Star
              className={`h-3.5 w-3.5 ${
                message.starred ? 'fill-amber-400 text-amber-400' : ''
              }`}
            />
          </button>

          {/* Convert to Task CTA */}
          <button
            onClick={() => onConvertToTask(message)}
            className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#1E2742] px-2.5 py-1 text-[11px] font-semibold text-slate-200 transition hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-400"
            title="Convert email into a Task Manager card"
          >
            <ClipboardList className="h-3 w-3 text-emerald-400" />
            <span>Task</span>
          </button>

          {/* Standard Reply CTA */}
          <button
            onClick={() =>
              onReply(
                '',
                message.subject.startsWith('Re:')
                  ? message.subject
                  : `Re: ${message.subject}`
              )
            }
            className="flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow transition hover:bg-emerald-500"
          >
            <Reply className="h-3 w-3" />
            <span>Reply</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {/* Subject & Metadata Banner */}
        <div className="border-b border-white/10 pb-3">
          <h3 className="text-sm font-bold leading-snug text-white">
            {message.subject || '(No Subject)'}
          </h3>

          <div className="mt-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-200">
                {message.from.name || message.from.email}
                {message.from.name && (
                  <span className="ml-1 text-[11px] font-normal text-slate-500">
                    &lt;{message.from.email}&gt;
                  </span>
                )}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-500">
                To:{' '}
                {message.to.map((t) => t.email).join(', ') ||
                  'undisclosed-recipients'}
              </p>
            </div>

            <span className="flex-shrink-0 pt-0.5 text-[10px] text-slate-500">
              {formattedDate}
            </span>
          </div>
        </div>

        {/* AI Action Trigger Strip */}
        <div className="flex items-center justify-between rounded-xl border border-violet-500/30 bg-gradient-to-r from-violet-950/40 via-purple-900/20 to-indigo-950/30 p-2 text-xs">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-violet-300">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
            <span>AI Executive Suite</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={handleExtractEvent}
              disabled={extractingEvent}
              className="flex items-center gap-1 rounded-lg bg-teal-600/30 px-2 py-0.5 text-[10px] font-bold text-teal-200 transition hover:bg-teal-600/50"
            >
              {extractingEvent ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : showEventCard ? (
                <>
                  <span>Hide Event</span>
                  <ChevronUp className="h-2.5 w-2.5" />
                </>
              ) : (
                <>
                  <Calendar className="h-2.5 w-2.5" />
                  <span>📅 Smart Event</span>
                  <ChevronDown className="h-2.5 w-2.5" />
                </>
              )}
            </button>

            <button
              onClick={handleGenerateSummary}
              disabled={loadingSummary}
              className="flex items-center gap-1 rounded-lg bg-violet-600/30 px-2 py-0.5 text-[10px] font-bold text-violet-200 transition hover:bg-violet-600/50"
            >
              {loadingSummary ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : showSummaryCard ? (
                <>
                  <span>Hide Summary</span>
                  <ChevronUp className="h-2.5 w-2.5" />
                </>
              ) : (
                <>
                  <span>✨ AI Summary</span>
                  <ChevronDown className="h-2.5 w-2.5" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Smart Calendar Event Card (Expandable) */}
        {showEventCard && (
          <div className="animate-in fade-in space-y-2 rounded-xl border border-teal-500/30 bg-[#0f1d24] p-3 text-xs shadow-lg duration-200">
            {extractingEvent ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-teal-300">
                <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                <span>
                  AI Calendar Scanner analyzing schedule & meeting details...
                </span>
              </div>
            ) : extractedEvent ? (
              extractedEvent.hasEvent ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-teal-300">
                      <Calendar className="h-3.5 w-3.5" />
                      {extractedEvent.title}
                    </span>
                    <span className="rounded-full border border-teal-500/30 bg-teal-500/20 px-2 py-0.5 text-[10px] text-teal-300">
                      {extractedEvent.isMeeting
                        ? 'Meeting Detected'
                        : 'Schedule'}
                    </span>
                  </div>

                  <p className="text-[11px] leading-snug text-slate-300">
                    {extractedEvent.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="rounded-lg border border-white/5 bg-black/30 p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400">
                        Suggested Slot:
                      </span>
                      <span className="font-mono text-emerald-400">
                        {extractedEvent.suggestedDate} (
                        {extractedEvent.suggestedStartTime} -{' '}
                        {extractedEvent.suggestedEndTime})
                      </span>
                    </div>
                    <div className="rounded-lg border border-white/5 bg-black/30 p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-slate-400">
                        Location:
                      </span>
                      <span className="text-slate-300">
                        {extractedEvent.location || 'Online Meet'}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="py-1 text-xs text-slate-400">
                  No explicit meeting, schedule, or deadline found in this
                  email.
                </p>
              )
            ) : (
              <p className="text-xs text-slate-400">
                Could not extract calendar event.
              </p>
            )}
          </div>
        )}

        {/* AI Summary Card (Expandable) */}
        {showSummaryCard && (
          <div className="animate-in fade-in space-y-2 rounded-xl border border-violet-500/30 bg-[#16132b] p-3 text-xs shadow-lg duration-200">
            {loadingSummary ? (
              <div className="flex items-center justify-center gap-2 py-4 text-xs text-violet-300">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                <span>Executive AI is distilling key points...</span>
              </div>
            ) : aiSummary ? (
              <>
                <p className="font-semibold leading-snug text-violet-200">
                  📌 {aiSummary.summary}
                </p>

                {aiSummary.keyPoints.length > 0 && (
                  <div className="space-y-1 pt-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Key Takeaways:
                    </span>
                    <ul className="space-y-0.5 text-[11px] text-slate-300">
                      {aiSummary.keyPoints.map((pt, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <CheckCircle2 className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-400" />
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.actionItems.length > 0 && (
                  <div className="mt-1 flex items-start gap-1.5 rounded-lg border border-amber-500/20 bg-amber-500/10 p-2 text-[10px] text-amber-300">
                    <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0 text-amber-400" />
                    <div>
                      <span className="font-bold">Action Item: </span>
                      {aiSummary.actionItems.join(' | ')}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-slate-400">
                Could not generate summary.
              </p>
            )}
          </div>
        )}

        {/* Email Body Content */}
        <div className="min-h-[140px] rounded-xl border border-white/5 bg-[#141A2D] p-3.5 text-xs leading-relaxed text-slate-200">
          {message.bodyHtml ? (
            <div
              className="prose-xs prose prose-invert max-w-none text-slate-200"
              dangerouslySetInnerHTML={{ __html: message.bodyHtml }}
            />
          ) : (
            <p className="whitespace-pre-wrap font-sans text-slate-200">
              {message.bodyText || message.snippet || '(Empty body)'}
            </p>
          )}
        </div>

        {/* 1-Click AI Reply Bar */}
        <div className="border-t border-white/10 pt-3">
          <div className="mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-emerald-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              1-Click AI Reply Draft:
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handle1ClickReply('professional')}
              disabled={Boolean(generatingTone)}
              className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#161D31] px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
            >
              {generatingTone === 'professional' ? (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              ) : (
                '🤝 Professional'
              )}
            </button>

            <button
              onClick={() => handle1ClickReply('quick')}
              disabled={Boolean(generatingTone)}
              className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#161D31] px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
            >
              {generatingTone === 'quick' ? (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              ) : (
                '⚡ Quick Ack'
              )}
            </button>

            <button
              onClick={() => handle1ClickReply('clarify')}
              disabled={Boolean(generatingTone)}
              className="flex items-center justify-center gap-1 rounded-lg border border-white/10 bg-[#161D31] px-2 py-1.5 text-[10px] font-semibold text-slate-300 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 hover:text-emerald-400 disabled:opacity-50"
            >
              {generatingTone === 'clarify' ? (
                <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
              ) : (
                '❓ Request Info'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
