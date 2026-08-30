interface PostHogHealthBadgeProps {
  configured: boolean;
  hasData?: boolean;
}

export default function PostHogHealthBadge({
  configured,
  hasData = false,
}: PostHogHealthBadgeProps) {
  const live = configured && hasData;
  const styles = live
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
    : configured
      ? 'border-amber-500/20 bg-amber-500/10 text-amber-400'
      : 'border-rose-500/20 bg-rose-500/10 text-rose-400';

  const label = live
    ? 'PostHog Live'
    : configured
      ? 'Awaiting data'
      : 'API key missing';

  return (
    <span
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${styles}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          live
            ? 'animate-pulse bg-emerald-400'
            : configured
              ? 'bg-amber-400'
              : 'bg-rose-400'
        }`}
      />
      {label}
    </span>
  );
}
