import React from 'react';
import Script from 'next/script';

interface ProductSchemaProps {
  product: {
    id: string;
    name: string;
    description: string;
    images: string[];
    price: number;
    currency?: string;
    stock?: number;
  };
}

export default function ProductSchema({ product }: ProductSchemaProps) {
  const schema = {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description,
    sku: product.id,
    brand: {
      '@type': 'Brand',
      name: 'RUHVI',
    },
    offers: {
      '@type': 'Offer',
      url: `https://ruhvi.in/products/${product.id}`,
      priceCurrency: product.currency || 'INR',
      price: product.price,
      availability:
        (product.stock ?? 1) > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is RUHVI gold plated jewellery anti-tarnish?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, all RUHVI pieces use an advanced e-coating that protects against water, sweat, and tarnish, backed by a 6-month color guarantee.',
        },
      },
      {
        '@type': 'Question',
        name: 'Is RUHVI jewellery suitable for sensitive skin?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, our pieces are crafted on nickel-free and lead-free brass bases, making them 100% hypoallergenic.',
        },
      },
    ],
  };

  return (
    <>
      <Script
        id={`product-schema-${product.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <Script
        id={`faq-schema-${product.id}`}
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
    </>
  );
}
