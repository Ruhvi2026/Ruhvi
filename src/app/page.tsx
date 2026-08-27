import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import { Category, Collection, Product } from '@/types/database';
import { getHomepageSettings } from '@/app/admin/actions/settings';

const FALLBACK_HOME_COLLECTIONS: Collection[] = [
  {
    id: 'col-1',
    title: 'Gifts For Her',
    slug: 'for-her',
    subtitle: 'Timeless pieces designed to make her feel extraordinary.',
    image_url: '/images/categories/necklaces.jpg',
  },
  {
    id: 'col-2',
    title: 'Gifts Under ₹15,000',
    slug: 'under-15000',
    subtitle: 'Beautiful 22K Gold jewellery that fits perfectly within budget.',
    image_url:
      'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&q=80',
  },
  {
    id: 'col-3',
    title: 'Anniversary Specials',
    slug: 'anniversary',
    subtitle: 'Celebrate your journey with gold and solitaire diamonds.',
    image_url: '/images/categories/rings.jpg',
  },
  {
    id: 'col-4',
    title: 'Royal Bridal Collection',
    slug: 'bridal',
    subtitle: 'Handcrafted Kundan and Emerald sets for grand celebrations.',
    image_url:
      'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&q=80',
  },
];

export const metadata: Metadata = {
  title: 'Ruhvi Fine Jewellery: Everyday Elegance, Crafted for You',
  description:
    "Explore Ruhvi's signature collections of premium 22K gold-plated jewellery, VVS Solitaires, and modern designs crafted for life's beautiful moments.",
  alternates: {
    canonical: '/',
  },
};

/** Per-category taglines displayed on the homepage category cards */
const CATEGORY_TAGLINES: Record<string, string> = {
  rings: 'Solitaires & Stacking Rings',
  necklaces: 'Pendants & Statement Chains',
  earrings: 'Studs, Hoops & Drops',
  bangles: 'Kadas, Bangles & Bracelets',
  bracelets: 'Charm & Tennis Bracelets',
  pendants: 'Everyday Gold Pendants',
  anklets: 'Delicate & Bold Anklets',
  'nose-pins': 'Pins, Rings & Studs',
};

export default async function HomePage() {
  const supabase = await createClient();
  const hp = await getHomepageSettings();

  const { data: catData } = await supabase
    .from('categories')
    .select('*')
    .neq('is_hidden', true)
    .order('name');
  const categories: Category[] = catData || [];

  const { data: colData } = await supabase
    .from('collections')
    .select('*')
    .order('title');
  const collections: Collection[] =
    colData && colData.length > 0 ? colData : FALLBACK_HOME_COLLECTIONS;

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Ruhvi Fine Jewellery',
    url: 'https://ruhvi.in',
    potentialAction: {
      '@type': 'SearchAction',
      target: 'https://ruhvi.in/products?search={search_term_string}',
      'query-input': 'required name=search_term_string',
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <main className="pt-6 lg:pt-10">
        <div className="wrap">
          {/* HERO */}
          <section className="hero">
            <div className="hero-img">
              <Image
                src={
                  hp.hero_image_url ||
                  'https://res.cloudinary.com/tfelmupe/image/upload/v1787781771/timeless_elegance_efj5j3.jpg'
                }
                alt={hp.hero_title || 'Woman wearing gold-plated jewellery'}
                fill
                className="object-cover"
                style={{ objectPosition: '78% 30%' }}
                priority
              />
            </div>
            <div className="hero-content">
              <div className="eyebrow">
                <span>✦</span> FEATURED COLLECTION
              </div>
              <h1 className="display">
                {hp.hero_title ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: hp.hero_title.replace('\n', '<br>'),
                    }}
                  />
                ) : (
                  <>
                    Timeless Elegance,
                    <br />
                    Crafted for You
                  </>
                )}
              </h1>
              <p>
                Discover our finest gold-plated jewellery, designed to celebrate
                your every moment.
              </p>
              <Link
                href={hp.hero_cta1_link || '/products'}
                className="pill-btn"
              >
                EXPLORE COLLECTION
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </section>

          {/* NEW ARRIVALS / BEST SELLERS */}
          <section className="promo-row">
            <div className="promo-card card-lift">
              <div className="promo-img">
                <Image
                  src="https://res.cloudinary.com/tfelmupe/image/upload/v1787781631/earings_h9z62v.jpg"
                  alt="New Arrivals"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="promo-body">
                <div className="eyebrow">NEW ARRIVALS</div>
                <h3 className="serif">
                  Fresh designs,
                  <br />
                  just for you
                </h3>
                <Link
                  href="/collections/new-arrivals"
                  className="shop-now before:absolute before:inset-0 before:z-10"
                >
                  SHOP NOW
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </div>

            <div className="promo-card card-lift">
              <div className="promo-img">
                <Image
                  src="https://res.cloudinary.com/tfelmupe/image/upload/v1787776431/oomy99pe62ani5lne1g8.jpg"
                  alt="Best Sellers"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="promo-body">
                <div className="eyebrow">BEST SELLERS</div>
                <h3 className="serif">
                  Loved by
                  <br />
                  thousands
                </h3>
                <Link
                  href="/collections/best-sellers"
                  className="shop-now before:absolute before:inset-0 before:z-10"
                >
                  SHOP NOW
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 12h14M13 6l6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </Link>
              </div>
            </div>
          </section>

          {/* CATEGORY GRID */}
          <section className="cat-grid" id="categories">
            {categories.slice(0, 4).map((cat) => (
              <div className="cat-card" key={cat.slug}>
                <div className="cat-img">
                  <Image
                    src={
                      cat.image_url ||
                      'https://res.cloudinary.com/tfelmupe/image/upload/vuz7w55c3jyu5u4hljk3.jpg'
                    }
                    alt={cat.name}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 340px"
                    className="object-cover"
                  />
                </div>
                <div className="cat-body">
                  <div className="cat-label">{cat.name}</div>
                  <h4>{CATEGORY_TAGLINES[cat.slug] || 'Elegant & Timeless'}</h4>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="shop-now on-dark before:absolute before:inset-0 before:z-10"
                  >
                    SHOP NOW
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path
                        d="M5 12h14M13 6l6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </Link>
                </div>
              </div>
            ))}
          </section>

          {/* OCCASION SPLIT */}
          <section className="split card-lift">
            <div className="split-body">
              <div className="eyebrow">CRAFTED FOR EVERY OCCASION</div>
              <h2 className="display">
                {hp.lifestyle_title ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: hp.lifestyle_title.replace('\n', '<br>'),
                    }}
                  />
                ) : (
                  <>
                    For every you,
                    <br />
                    for every moment.
                  </>
                )}
              </h2>
              <p>
                {hp.lifestyle_text ||
                  "From everyday beauty to life's most special celebrations, Ruhvi is with you."}
              </p>
              <Link
                href={hp.lifestyle_cta_link || '/products'}
                className="shop-now"
              >
                {hp.lifestyle_cta_text || 'EXPLORE NOW'}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
            <div className="split-img">
              <Image
                src={
                  hp.lifestyle_image_url ||
                  'https://res.cloudinary.com/tfelmupe/image/upload/v1787781770/explor_collections_etp3bp.jpg'
                }
                alt="Occasion Split"
                fill
                className="object-cover"
                style={{ objectPosition: '50% 22%' }}
              />
            </div>
          </section>

          {/* LIMITED COLLECTION */}
          <section className="limited">
            <div className="limited-img">
              <Image
                src="https://res.cloudinary.com/tfelmupe/image/upload/v1787781769/exclusive_dropslimited_times_vsstgx.jpg"
                alt="Limited Collection"
                fill
                className="object-cover"
              />
            </div>
            <div className="limited-body">
              <div className="eyebrow dark">LIMITED COLLECTION</div>
              <h2 className="display">
                Exclusive Drops.
                <br />
                Limited Time.
              </h2>
              <p>Unique designs in limited quantities.</p>
              <Link href="/collections/limited" className="shop-now on-dark">
                SHOP NOW
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </Link>
            </div>
          </section>

          {/* CTA STRIP */}
          <section className="cta-strip">
            <div className="cta-img">
              <Image
                src="https://res.cloudinary.com/tfelmupe/image/upload/v1787781771/full_model_yfat2m.jpg"
                alt="Explore Collection"
                fill
                className="object-cover"
                style={{ objectPosition: '50% 18%' }}
              />
            </div>
            <div className="cta-text">
              <div className="eyebrow dark" style={{ marginBottom: '8px' }}>
                YOUR STORY, YOUR SPARKLE
              </div>
              <h2 className="serif">Explore the Collection</h2>
              <div className="rule"></div>
            </div>
            <Link href="/products" className="pill-btn">
              EXPLORE ALL
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </section>

          {/* TRUST STRIP */}
          <section className="trust">
            <div className="trust-item">
              <div className="trust-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M20 12v7a1 1 0 01-1 1H5a1 1 0 01-1-1v-7" />
                  <rect x="2" y="7" width="20" height="5" rx="1" />
                  <path d="M12 7V20M12 7c-1.5-3.5-6-3.5-6-1s3 1 6 1zm0 0c1.5-3.5 6-3.5 6-1s-3 1-6 1z" />
                </svg>
              </div>
              <div>
                <h5>FREE SHIPPING</h5>
                <p>On orders above ₹999</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3z" />
                </svg>
              </div>
              <div>
                <h5>SECURE PAYMENT</h5>
                <p>100% safe &amp; secure</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <circle cx="12" cy="12" r="3.4" />
                  <path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.1 5.9l-1.5 1.5M7.4 16.6l-1.5 1.5M18.1 18.1l-1.5-1.5M7.4 7.4L5.9 5.9" />
                </svg>
              </div>
              <div>
                <h5>PREMIUM QUALITY</h5>
                <p>Crafted with care</p>
              </div>
            </div>
            <div className="trust-item">
              <div className="trust-icon">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                >
                  <path
                    d="M4 12a8 8 0 1114.9 4M4 12V7M4 12H9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <h5>EASY RETURNS</h5>
                <p>Hassle-free returns</p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
