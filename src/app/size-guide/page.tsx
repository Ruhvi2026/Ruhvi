import React from 'react';

export default function SizeGuidePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-8">
      <div className="text-center max-w-xl mx-auto">
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-stone-900">Ring & Bangle Size Guide</h1>
        <p className="text-xs text-stone-500 mt-2">
          Accurately measure your size at home to ensure a perfect, comfortable fit for your Ruhvi jewellery.
        </p>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
        <h2 className="font-serif text-xl font-bold text-stone-900 border-b border-stone-100 pb-3">
          Ring Size Chart (Indian Standard)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-amber-50 uppercase text-[10px] text-amber-950 font-bold">
              <tr>
                <th className="p-3">Ring Size (India)</th>
                <th className="p-3">Inside Diameter (mm)</th>
                <th className="p-3">Inside Circumference (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr><td className="p-3 font-semibold">6</td><td className="p-3">14.3 mm</td><td className="p-3">44.9 mm</td></tr>
              <tr><td className="p-3 font-semibold">8</td><td className="p-3">15.0 mm</td><td className="p-3">47.1 mm</td></tr>
              <tr><td className="p-3 font-semibold">10</td><td className="p-3">15.7 mm</td><td className="p-3">49.3 mm</td></tr>
              <tr><td className="p-3 font-semibold">12</td><td className="p-3">16.3 mm</td><td className="p-3">51.2 mm</td></tr>
              <tr><td className="p-3 font-semibold">14</td><td className="p-3">17.0 mm</td><td className="p-3">53.4 mm</td></tr>
              <tr><td className="p-3 font-semibold">16</td><td className="p-3">17.7 mm</td><td className="p-3">55.6 mm</td></tr>
              <tr><td className="p-3 font-semibold">18</td><td className="p-3">18.3 mm</td><td className="p-3">57.5 mm</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
