import React from 'react';
import type { Metadata } from 'next';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Ring & Bangle Size Guide | Ruhvi Fine Jewellery',
  description:
    'Find your perfect fit with our jewellery size guide. Ring size chart (Indian standard), bangle sizing, and how to measure at home.',
  alternates: { canonical: '/size-guide' },
  openGraph: {
    title: 'Ring & Bangle Size Guide | Ruhvi',
    description:
      'Find your perfect fit with our jewellery size guide. Ring and bangle sizing with at-home measurement tips.',
    url: '/size-guide',
    siteName: 'Ruhvi Fine Jewellery',
    type: 'website',
  },
};

export default function SizeGuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-12 sm:px-6 lg:px-8">
      <Breadcrumbs
        items={[
          { label: 'Home', url: '/' },
          { label: 'Size Guide', url: '/size-guide' },
        ]}
      />

      <div className="mx-auto max-w-xl text-center">
        <h1 className="font-serif text-3xl font-bold text-stone-900 sm:text-4xl">
          Ring & Bangle Size Guide
        </h1>
        <p className="mt-2 text-xs text-stone-500">
          Accurately measure your size at home to ensure a perfect, comfortable
          fit for your Ruhvi jewellery.
        </p>
      </div>

      <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="border-b border-stone-100 pb-3 font-serif text-xl font-bold text-stone-900">
          Ring Size Chart (Indian Standard)
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-cream-50 text-[10px] font-bold uppercase text-charcoal-900">
              <tr>
                <th className="p-3">Ring Size (India)</th>
                <th className="p-3">Inside Diameter (mm)</th>
                <th className="p-3">Inside Circumference (mm)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-3 font-semibold">6</td>
                <td className="p-3">14.3 mm</td>
                <td className="p-3">44.9 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">8</td>
                <td className="p-3">15.0 mm</td>
                <td className="p-3">47.1 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">10</td>
                <td className="p-3">15.7 mm</td>
                <td className="p-3">49.3 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">12</td>
                <td className="p-3">16.3 mm</td>
                <td className="p-3">51.2 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">14</td>
                <td className="p-3">17.0 mm</td>
                <td className="p-3">53.4 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">16</td>
                <td className="p-3">17.7 mm</td>
                <td className="p-3">55.6 mm</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">18</td>
                <td className="p-3">18.3 mm</td>
                <td className="p-3">57.5 mm</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-6 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="border-b border-stone-100 pb-3 font-serif text-xl font-bold text-stone-900">
          Bangle Size Chart
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-cream-50 text-[10px] font-bold uppercase text-charcoal-900">
              <tr>
                <th className="p-3">Size</th>
                <th className="p-3">Inner Diameter (mm)</th>
                <th className="p-3">Inner Diameter (inches)</th>
                <th className="p-3">Standard Indian Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              <tr>
                <td className="p-3 font-semibold">Small</td>
                <td className="p-3">53 mm</td>
                <td className="p-3">2.1"</td>
                <td className="p-3">1-3</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Medium</td>
                <td className="p-3">57 mm</td>
                <td className="p-3">2.2"</td>
                <td className="p-3">4-6</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Large</td>
                <td className="p-3">61 mm</td>
                <td className="p-3">2.4"</td>
                <td className="p-3">7-8</td>
              </tr>
              <tr>
                <td className="p-3 font-semibold">Extra Large</td>
                <td className="p-3">64 mm</td>
                <td className="p-3">2.5"</td>
                <td className="p-3">9-10</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border border-gold-200 bg-champagne-100 p-6 sm:p-8">
        <h2 className="font-serif text-xl font-bold text-charcoal-900">
          How to Measure at Home
        </h2>
        <div className="grid grid-cols-1 gap-6 text-xs text-stone-700 sm:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-bold text-charcoal-900">For Bangles</h3>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>Close your hand as if putting on a bangle.</li>
              <li>
                Wrap a thread or thin paper strip around the widest part of your
                hand (over the thumb knuckle).
              </li>
              <li>
                Mark where the thread meets and measure its length with a ruler.
              </li>
              <li>
                Divide the length by 3.14 to get the inner diameter. Compare
                with the chart above.
              </li>
            </ol>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold text-charcoal-900">For Rings</h3>
            <ol className="list-decimal space-y-1.5 pl-4">
              <li>
                Wrap a thread or paper strip around the base of your finger.
              </li>
              <li>
                Mark where the thread meets and measure its length with a ruler.
              </li>
              <li>
                This is your finger circumference. Compare with the ring chart
                above.
              </li>
              <li>
                For best results, measure at the end of the day when fingers are
                slightly larger.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
