export default function OrdersPortalLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-44 rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="flex gap-3">
          <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="h-10 w-28 rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-7 w-12 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Filter bar skeleton */}
      <div className="flex gap-3">
        <div className="h-10 w-64 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Orders list skeleton */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 dark:border-gray-700"
          >
            <div className="h-5 w-24 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="flex-1" />
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="h-6 w-24 rounded-full bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
