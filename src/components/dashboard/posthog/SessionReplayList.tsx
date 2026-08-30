'use client';

import React from 'react';
import { PlayCircle, ExternalLink } from 'lucide-react';
import type { SessionRecording } from '@/types/posthog-analytics';

interface SessionReplayListProps {
  recordings: SessionRecording[];
  projectId?: string;
  uiHost?: string;
}

const formatDuration = (seconds: number) => {
  const s = Math.round(seconds);
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return m > 0 ? `${m}m ${rem}s` : `${rem}s`;
};

export default function SessionReplayList({
  recordings,
  projectId = '256363',
  uiHost = process.env.NEXT_PUBLIC_POSTHOG_UI_HOST || 'https://eu.posthog.com',
}: SessionReplayListProps) {
  const hasData = recordings.length > 0;

  return (
    <div className="rounded-xl border border-white/5 bg-[#131726] p-5">
      <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-3">
        <div className="flex items-center gap-2">
          <PlayCircle className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Recent Sessions</h3>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-slate-500">
          Replay · PostHog
        </span>
      </div>

      {hasData ? (
        <div className="space-y-2">
          {recordings.map((r) => (
            <a
              key={r.id}
              href={`${uiHost}/project/${projectId}/replay/${r.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.01] p-3 text-xs transition-colors hover:border-cyan-500/20 hover:bg-white/[0.04]"
            >
              <div className="flex min-w-0 items-center gap-3">
                <PlayCircle className="h-4 w-4 flex-shrink-0 text-cyan-400" />
                <div className="min-w-0">
                  <p className="line-clamp-1 font-medium text-slate-200">
                    {r.url || 'Homepage session'}
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {r.duration > 0 ? formatDuration(r.duration) : 'Live'} ·{' '}
                    {r.recorded_at
                      ? new Date(r.recorded_at).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : 'recently'}
                  </p>
                </div>
              </div>
              <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-slate-600 group-hover:text-cyan-400" />
            </a>
          ))}
        </div>
      ) : (
        <div className="flex h-[180px] items-center justify-center text-xs text-slate-500">
          No session recordings available yet.
        </div>
      )}
    </div>
  );
}
