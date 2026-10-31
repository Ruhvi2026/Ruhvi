import {
  CANONICAL_BUSINESS_IDENTITY,
  getCanonicalBusinessAddress,
  getOrganizationSchemaJsonLd,
} from '../business-identity';

describe('Canonical Business Identity & SEO Metadata (Phase 55)', () => {
  describe('CANONICAL_BUSINESS_IDENTITY Constants', () => {
    it('enforces verified canonical brand, legal, and store identities', () => {
      expect(CANONICAL_BUSINESS_IDENTITY.brandName).toBe('Ruhvi');
      expect(CANONICAL_BUSINESS_IDENTITY.storeName).toBe(
        'Ruhvi Fine Jewellery'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.legalEntityName).toBe('Ruhvi Jewels');
      expect(CANONICAL_BUSINESS_IDENTITY.businessType).toBe(
        'Sole Proprietorship'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.canonicalUrl).toBe('https://ruhvi.in');
      expect(CANONICAL_BUSINESS_IDENTITY.logoUrl).toBe(
        'https://ruhvi.in/logo.png'
      );
    });

    it('enforces canonical verified support email and marketing channels', () => {
      expect(CANONICAL_BUSINESS_IDENTITY.supportEmail).toBe('support@ruhvi.in');
      expect(CANONICAL_BUSINESS_IDENTITY.marketingEmail).toBe(
        'marketing@ruhvi.in'
      );
    });

    it('enforces canonical customer concierge phone and strictly excludes dummy phone numbers', () => {
      expect(CANONICAL_BUSINESS_IDENTITY.supportPhoneDisplay).toBe(
        '+91 91535 77651'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.supportPhoneTel).toBe(
        '+91-9153577651'
      );

      // Zero dummy/placeholder phone numbers permitted
      expect(CANONICAL_BUSINESS_IDENTITY.supportPhoneDisplay).not.toContain(
        '98765'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.supportPhoneTel).not.toContain(
        '98765'
      );
    });

    it('defines official operating hours and social channels', () => {
      expect(CANONICAL_BUSINESS_IDENTITY.supportHours).toBe(
        'Monday – Saturday: 10:00 AM – 7:00 PM IST'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.socialLinks.instagram).toBe(
        'https://instagram.com/ruhvi.in'
      );
      expect(CANONICAL_BUSINESS_IDENTITY.socialLinks.facebook).toBe(
        'https://facebook.com/ruhvi.in'
      );
    });
  });

  describe('getCanonicalBusinessAddress', () => {
    const originalEnv = process.env.NEXT_PUBLIC_STORE_ADDRESS;

    afterEach(() => {
      process.env.NEXT_PUBLIC_STORE_ADDRESS = originalEnv;
    });

    it('returns canonical verified atelier location without fictitious street numbers', () => {
      delete process.env.NEXT_PUBLIC_STORE_ADDRESS;
      const address = getCanonicalBusinessAddress();

      expect(address.city).toBe('Mumbai');
      expect(address.state).toBe('Maharashtra');
      expect(address.country).toBe('India');
      expect(address.formatted).toBe(
        'Ruhvi Jewels, Mumbai, Maharashtra, India'
      );
      expect(address.isCustomConfigured).toBe(false);

      // Verify absence of arbitrary leftover mock addresses
      expect(address.formatted).not.toContain('Jubilee Hills');
      expect(address.formatted).not.toContain('Plot 12');
      expect(address.formatted).not.toContain('Road No. 36');
    });

    it('dynamically respects custom NEXT_PUBLIC_STORE_ADDRESS when configured', () => {
      process.env.NEXT_PUBLIC_STORE_ADDRESS =
        '101 Heritage Atelier, Bandra West, Mumbai 400050';
      const address = getCanonicalBusinessAddress();

      expect(address.formatted).toBe(
        '101 Heritage Atelier, Bandra West, Mumbai 400050'
      );
      expect(address.isCustomConfigured).toBe(true);
    });
  });

  describe('getOrganizationSchemaJsonLd', () => {
    it('produces Schema.org compliant Organization JSON-LD with verified properties', () => {
      const schema = getOrganizationSchemaJsonLd();

      expect(schema['@context']).toBe('https://schema.org');
      expect(schema['@type']).toBe('Organization');
      expect(schema.name).toBe('Ruhvi Fine Jewellery');
      expect(schema.legalName).toBe('Ruhvi Jewels');
      expect(schema.url).toBe('https://ruhvi.in');
      expect(schema.logo).toBe('https://ruhvi.in/logo.png');
      expect(schema.sameAs).toEqual([
        'https://instagram.com/ruhvi.in',
        'https://facebook.com/ruhvi.in',
      ]);
    });

    it('embeds accurate ContactPoint without dummy phone number', () => {
      const schema = getOrganizationSchemaJsonLd();
      const contact = schema.contactPoint;

      expect(contact['@type']).toBe('ContactPoint');
      expect(contact.telephone).toBe('+91-9153577651');
      expect(contact.telephone).not.toContain('98765');
      expect(contact.email).toBe('support@ruhvi.in');
      expect(contact.contactType).toBe('customer service');
      expect(contact.areaServed).toBe('IN');
      expect(contact.availableLanguage).toEqual(['en', 'bn', 'hi']);
      expect(contact.hoursAvailable['@type']).toBe('OpeningHoursSpecification');
      expect(contact.hoursAvailable.opens).toBe('10:00');
      expect(contact.hoursAvailable.closes).toBe('19:00');
    });

    it('embeds structured PostalAddress compliant with Google Structured Data requirements', () => {
      const schema = getOrganizationSchemaJsonLd();
      const address = schema.address;

      expect(address['@type']).toBe('PostalAddress');
      expect(address.addressLocality).toBe('Mumbai');
      expect(address.addressRegion).toBe('Maharashtra');
      expect(address.addressCountry).toBe('India');
      expect(address.streetAddress).toBeDefined();
    });
  });
});
