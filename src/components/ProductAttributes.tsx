import React from 'react';

export default function ProductAttributes() {
  return (
    <div className="product-attributes my-4 rounded-lg border bg-gray-50 p-4 text-sm text-gray-800">
      <h3 className="mb-2 text-lg font-bold">Product Specifications</h3>
      <ul className="list-disc space-y-1 pl-5">
        <li>
          <strong>Base Metal:</strong> High-grade solid brass
        </li>
        <li>
          <strong>Plating Options:</strong> 24K Gold Plated & 22K Gold Plated
        </li>
        <li>
          <strong>Plating Protection:</strong> Electronic anti-tarnish coating
          (e-coating), 100% waterproof and sweat-proof
        </li>
        <li>
          <strong>Skin Safety:</strong> Nickel-free, lead-free, 100%
          hypoallergenic safe for sensitive skin
        </li>
        <li>
          <strong>Guarantee:</strong> 6-month color and shine replacement
          guarantee
        </li>
        <li>
          <strong>Pricing & Currency:</strong> Indian Rupee (INR ₹)
        </li>
        <li>
          <strong>Shipping Region:</strong> All-India delivery
        </li>
      </ul>
      <h3 className="mb-2 mt-4 text-lg font-bold">
        Frequently Asked Questions
      </h3>
      <div className="space-y-2">
        <div>
          <p className="font-semibold">
            Is RUHVI gold plated jewellery anti-tarnish?
          </p>
          <p>
            Yes, all RUHVI pieces use an advanced e-coating that protects
            against water, sweat, and tarnish, backed by a 6-month color
            guarantee.
          </p>
        </div>
        <div>
          <p className="font-semibold">
            Is RUHVI jewellery suitable for sensitive skin?
          </p>
          <p>
            Yes, our pieces are crafted on nickel-free and lead-free brass
            bases, making them 100% hypoallergenic.
          </p>
        </div>
      </div>
    </div>
  );
}
