export default function CheckoutLoading() {
  return (
    <div className="mx-auto max-w-4xl animate-pulse px-4 py-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-8 h-4 w-48 rounded bg-gray-200" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
        {/* Checkout form skeleton */}
        <div className="space-y-6 lg:col-span-3">
          {/* Section title */}
          <div className="h-6 w-40 rounded bg-gray-200" />

          {/* Address fields */}
          <div className="space-y-4 rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-28 rounded bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-11 rounded-lg bg-gray-200" />
              <div className="h-11 rounded-lg bg-gray-200" />
            </div>
            <div className="h-11 rounded-lg bg-gray-200" />
            <div className="grid grid-cols-2 gap-4">
              <div className="h-11 rounded-lg bg-gray-200" />
              <div className="h-11 rounded-lg bg-gray-200" />
            </div>
          </div>

          {/* Payment section */}
          <div className="space-y-4 rounded-xl border border-gray-200 p-5">
            <div className="h-4 w-36 rounded bg-gray-200" />
            <div className="h-12 rounded-lg bg-gray-200" />
            <div className="h-12 rounded-lg bg-gray-200" />
          </div>
        </div>

        {/* Order summary skeleton */}
        <div className="lg:col-span-2">
          <div className="space-y-4 rounded-xl border border-gray-200 p-5">
            <div className="h-5 w-32 rounded bg-gray-200" />
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <div className="h-16 w-16 rounded-lg bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-gray-200" />
                  <div className="h-3 w-1/2 rounded bg-gray-200" />
                </div>
              </div>
            ))}
            <hr className="border-gray-200" />
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 w-20 rounded bg-gray-200" />
                <div className="h-4 w-16 rounded bg-gray-200" />
              </div>
              <div className="flex justify-between">
                <div className="h-5 w-16 rounded bg-gray-200" />
                <div className="h-5 w-20 rounded bg-gray-200" />
              </div>
            </div>
            <div className="h-12 rounded-lg bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
