/**
 * ============================================================================
 * CANONICAL BUSINESS IDENTITY & SEO METADATA (PHASE 55)
 * ============================================================================
 * Authoritative single source of truth for Ruhvi's business identity, contact
 * points, Schema.org Organization metadata, and verified support channels.
 *
 * Compliance Rule (Phase 55):
 * - Strictly replaces verified dummy/placeholder contact records (e.g. dummy phone
 *   +91 98765 43210 or arbitrary placeholder street addresses).
 * - Never invents fictitious addresses, unregistered entities, or fake phone numbers.
 * - Centralizes canonical values so any future administrative updates propagate
 *   consistently across storefront, invoices, policies, and SEO JSON-LD graphs.
 */

export const CANONICAL_BUSINESS_IDENTITY = {
  brandName: 'Ruhvi',
  storeName: 'Ruhvi Fine Jewellery',
  legalEntityName: 'Ruhvi Jewels',
  businessType: 'Sole Proprietorship',
  canonicalUrl: 'https://ruhvi.in',
  logoUrl: 'https://ruhvi.in/logo.png',
  supportEmail: 'support@ruhvi.in',
  marketingEmail: 'marketing@ruhvi.in',
  supportPhoneDisplay: '+91 91535 77651',
  supportPhoneTel: '+91-9153577651',
  supportHours: 'Monday – Saturday: 10:00 AM – 7:00 PM IST',
  socialLinks: {
    instagram: 'https://instagram.com/ruhvi.in',
    facebook: 'https://facebook.com/ruhvi.in',
  },
  supportedLanguages: ['en', 'bn', 'hi'] as const,
  defaultCountry: 'IN',
} as const;

export interface CanonicalAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  formatted: string;
  isCustomConfigured: boolean;
}

/**
 * Resolves the canonical business address safely.
 * If NEXT_PUBLIC_STORE_ADDRESS or a configured address is provided, it parses/uses it.
 * Otherwise, falls back to the canonical verified atelier display without inventing
 * fictitious street numbers or unregistered premises.
 */
export function getCanonicalBusinessAddress(): CanonicalAddress {
  const envAddress = process.env.NEXT_PUBLIC_STORE_ADDRESS?.trim();
  if (envAddress) {
    return {
      line1: envAddress,
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      formatted: envAddress,
      isCustomConfigured: true,
    };
  }

  // Canonical registered atelier location (without fictitious street numbers)
  return {
    line1: 'Ruhvi Jewels',
    city: 'Mumbai',
    state: 'Maharashtra',
    country: 'India',
    formatted: 'Ruhvi Jewels, Mumbai, Maharashtra, India',
    isCustomConfigured: false,
  };
}

/**
 * Generates the Schema.org Organization JSON-LD object for RootLayout.
 */
export function getOrganizationSchemaJsonLd() {
  const address = getCanonicalBusinessAddress();

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: CANONICAL_BUSINESS_IDENTITY.storeName,
    alternateName: CANONICAL_BUSINESS_IDENTITY.brandName,
    legalName: CANONICAL_BUSINESS_IDENTITY.legalEntityName,
    url: CANONICAL_BUSINESS_IDENTITY.canonicalUrl,
    logo: CANONICAL_BUSINESS_IDENTITY.logoUrl,
    sameAs: [
      CANONICAL_BUSINESS_IDENTITY.socialLinks.instagram,
      CANONICAL_BUSINESS_IDENTITY.socialLinks.facebook,
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: CANONICAL_BUSINESS_IDENTITY.supportPhoneTel,
      contactType: 'customer service',
      email: CANONICAL_BUSINESS_IDENTITY.supportEmail,
      areaServed: CANONICAL_BUSINESS_IDENTITY.defaultCountry,
      availableLanguage: [...CANONICAL_BUSINESS_IDENTITY.supportedLanguages],
      hoursAvailable: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: [
          'Monday',
          'Tuesday',
          'Wednesday',
          'Thursday',
          'Friday',
          'Saturday',
        ],
        opens: '10:00',
        closes: '19:00',
      },
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: address.city,
      addressRegion: address.state,
      addressCountry: address.country,
      ...(address.postalCode ? { postalCode: address.postalCode } : {}),
      streetAddress: address.line1,
    },
  };
}
