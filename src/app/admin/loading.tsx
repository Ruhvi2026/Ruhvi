export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6 p-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 rounded-md bg-gray-200 dark:bg-gray-700" />
        <div className="h-10 w-32 rounded-lg bg-gray-200 dark:bg-gray-700" />
      </div>

      {/* Stats cards skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-200 p-5 dark:border-gray-700"
          >
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-3 h-8 w-28 rounded bg-gray-200 dark:bg-gray-700" />
            <div className="mt-2 h-3 w-16 rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 p-4 dark:border-gray-700">
          <div className="h-5 w-36 rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div className="h-6 w-20 rounded-full bg-gray-200 dark:bg-gray-700" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
