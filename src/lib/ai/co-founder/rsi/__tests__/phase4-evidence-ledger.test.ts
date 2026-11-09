jest.mock('server-only', () => ({}));

import {
  EvidenceLedger,
  determineTrustTier,
  determineFreshness,
  cleanCanonicalUrl,
} from '../evidence-ledger';
import { RsiResearchEngine } from '../research-engine';

describe('Phase 4: Evidence Ledger, Citations & Source Ranking', () => {
  let ledger: EvidenceLedger;

  beforeEach(() => {
    ledger = new EvidenceLedger();
    process.env.RSI_ENABLED = 'true';
  });

  describe('Domain Trust Tier Classification', () => {
    it('classifies official and standards domains as Tier 1', () => {
      expect(
        determineTrustTier('bis.gov.in', 'https://bis.gov.in/hallmarking')
      ).toBe(1);
      expect(determineTrustTier('gst.gov.in', 'https://gst.gov.in/rules')).toBe(
        1
      );
      expect(
        determineTrustTier('incometax.gov.in', 'https://incometax.gov.in')
      ).toBe(1);
      expect(determineTrustTier('ruhvi.in', 'https://ruhvi.in/policy')).toBe(1);
      expect(
        determineTrustTier(
          'developer.mozilla.org',
          'https://developer.mozilla.org'
        )
      ).toBe(1);
      expect(determineTrustTier('w3.org', 'https://w3.org/TR')).toBe(1);
    });

    it('classifies major news and business publications as Tier 2', () => {
      expect(
        determineTrustTier(
          'economictimes.indiatimes.com',
          'https://economictimes.indiatimes.com/gold'
        )
      ).toBe(2);
      expect(
        determineTrustTier('livemint.com', 'https://livemint.com/market')
      ).toBe(2);
      expect(
        determineTrustTier('reuters.com', 'https://reuters.com/business')
      ).toBe(2);
    });

    it('classifies e-commerce competitors and marketplaces as Tier 3', () => {
      expect(
        determineTrustTier('caratlane.com', 'https://caratlane.com/rings')
      ).toBe(3);
      expect(determineTrustTier('giva.co', 'https://giva.co/bracelets')).toBe(
        3
      );
      expect(determineTrustTier('amazon.in', 'https://amazon.in/jewelry')).toBe(
        3
      );
    });

    it('classifies community forums, social, and unverified blogs as Tier 4', () => {
      expect(
        determineTrustTier('reddit.com', 'https://reddit.com/r/jewelry')
      ).toBe(4);
      expect(
        determineTrustTier('quora.com', 'https://quora.com/question')
      ).toBe(4);
      expect(
        determineTrustTier('medium.com', 'https://medium.com/@user/gold')
      ).toBe(4);
    });
  });

  describe('Freshness Classification & Canonical URLs', () => {
    it('labels sources without published dates as undated', () => {
      expect(determineFreshness(undefined)).toBe('undated');
      expect(determineFreshness('')).toBe('undated');
      expect(determineFreshness('invalid-date')).toBe('undated');
    });

    it('classifies recent publications within threshold as fresh', () => {
      const tenDaysAgo = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(determineFreshness(tenDaysAgo)).toBe('fresh');

      // Pricing category has a stricter 30-day threshold
      expect(determineFreshness(tenDaysAgo, 'pricing')).toBe('fresh');
    });

    it('classifies older publications beyond threshold as possibly_stale', () => {
      const fortyDaysAgo = new Date(
        Date.now() - 40 * 24 * 60 * 60 * 1000
      ).toISOString();
      // 40 days is stale for fast-moving pricing
      expect(determineFreshness(fortyDaysAgo, 'pricing')).toBe(
        'possibly_stale'
      );

      const twoYearsAgo = new Date(
        Date.now() - 730 * 24 * 60 * 60 * 1000
      ).toISOString();
      expect(determineFreshness(twoYearsAgo, 'general')).toBe('possibly_stale');
    });

    it('cleans tracking parameters and trailing slashes from canonical URLs', () => {
      const dirtyUrl =
        'https://example.com/guide/?utm_source=fb&utm_medium=cpc&ref=affiliate';
      expect(cleanCanonicalUrl(dirtyUrl)).toBe('https://example.com/guide');
    });
  });

  describe('Source Registration & Ranking Order', () => {
    it('registers a source with contentHash, domain, trustTier, and excerpt', () => {
      const source = ledger.registerSource({
        title: 'BIS Hallmark Regulations',
        url: 'https://bis.gov.in/hallmarking/rules?utm_source=test',
        excerpt: 'All 22k gold jewelry must bear 6-digit HUID code.',
        publishedAt: '2026-01-15T00:00:00Z',
      });

      expect(source.sourceId).toMatch(/^src_[a-f0-9]{10}$/);
      expect(source.domain).toBe('bis.gov.in');
      expect(source.trustTier).toBe(1);
      expect(source.sourceType).toBe('official');
      expect(source.canonicalUrl).toBe('https://bis.gov.in/hallmarking/rules');
      expect(source.contentHash).toBeDefined();
    });

    it('ranks Tier 1 official sources ahead of Tier 2 publishers and Tier 4 community', () => {
      const s1 = ledger.registerSource({
        title: 'Reddit Rumor',
        url: 'https://reddit.com/r/gold/comments/123',
        excerpt: 'Someone said duty dropped.',
        publishedAt: '2026-03-01T00:00:00Z',
      });

      const s2 = ledger.registerSource({
        title: 'Economic Times News',
        url: 'https://economictimes.indiatimes.com/news/123',
        excerpt: 'Finance ministry reports bullion imports.',
        publishedAt: '2026-02-01T00:00:00Z',
      });

      const s3 = ledger.registerSource({
        title: 'Ministry Official Notification',
        url: 'https://gst.gov.in/notifications/2026-01',
        excerpt: 'Official circular on precious metal GST rates.',
        publishedAt: '2026-01-01T00:00:00Z',
      });

      const ranked = ledger.rankSources([s1, s2, s3]);
      expect(ranked[0].domain).toBe('gst.gov.in'); // Tier 1
      expect(ranked[1].domain).toBe('economictimes.indiatimes.com'); // Tier 2
      expect(ranked[2].domain).toBe('reddit.com'); // Tier 4
    });
  });

  describe('Corroboration Logic & Single-Source vs Corroborated States', () => {
    it('marks claim backed by 1 Tier 1 official source as corroborated with high confidence', () => {
      const src = ledger.registerSource({
        title: 'Bureau of Indian Standards',
        url: 'https://bis.gov.in/rules',
        excerpt: 'HUID is mandatory across India.',
      });

      const claim = ledger.corroborateClaim('HUID is mandatory for gold', [
        src.sourceId,
      ]);

      expect(claim.status).toBe('corroborated');
      expect(claim.confidence).toBeGreaterThanOrEqual(0.95);
      expect(claim.sourceIds).toContain(src.sourceId);
    });

    it('marks claim backed by 2 independent Tier 2/3 domains as corroborated', () => {
      const src1 = ledger.registerSource({
        title: 'ET Report',
        url: 'https://economictimes.indiatimes.com/article-1',
        excerpt: 'Imitation jewellery demand jumped 25%.',
      });
      const src2 = ledger.registerSource({
        title: 'Mint Report',
        url: 'https://livemint.com/article-2',
        excerpt: 'Demand for brass and copper gold plating is up 25%.',
      });

      const claim = ledger.corroborateClaim('Plated jewelry demand grew 25%', [
        src1.sourceId,
        src2.sourceId,
      ]);

      expect(claim.status).toBe('corroborated');
      expect(claim.confidence).toBeGreaterThanOrEqual(0.85);
      expect(claim.sourceIds.length).toBe(2);
    });

    it('marks claim backed by only 1 source domain as single_source without claiming verification', () => {
      const src = ledger.registerSource({
        title: 'Competitor Blog',
        url: 'https://caratlane.com/blog/trends',
        excerpt: 'Rose gold is 60% of all ring sales this season.',
      });

      const claim = ledger.corroborateClaim('Rose gold is 60% of ring sales', [
        src.sourceId,
      ]);

      expect(claim.status).toBe('single_source');
      expect(claim.confidence).toBeLessThanOrEqual(0.65);
      expect(claim.notes).toContain('One source reports this');
    });

    it('marks claim with 0 sources as unverified', () => {
      const claim = ledger.corroborateClaim(
        'Gold prices will drop 50% tomorrow',
        []
      );
      expect(claim.status).toBe('unverified');
      expect(claim.confidence).toBe(0);
      expect(claim.notes).toContain('could not verify');
    });

    it('detects conflicting statements and marks claim as conflicting', () => {
      const src = ledger.registerSource({
        title: 'Forum debate',
        url: 'https://reddit.com/r/jewelry/test',
        excerpt: 'GIVA has no warranty vs GIVA has lifetime warranty.',
      });

      const claim = ledger.corroborateClaim(
        'Warranty duration is lifetime',
        [src.sourceId],
        ['Warranty duration is lifetime vs 6 months']
      );

      expect(claim.status).toBe('conflicting');
      expect(claim.notes).toContain('Conflicting statements detected');
    });
  });

  describe('Evidence Pack Compilation & Output Formatting', () => {
    it('builds a complete Evidence Pack with ranked sources, citations, and voice summary', () => {
      const pack = ledger.buildEvidencePack({
        topic: 'Indian Gold Plating Standards 2026',
        rawSources: [
          {
            title: 'BIS Hallmarking Guidelines',
            url: 'https://bis.gov.in/standards/gold',
            excerpt:
              '1 Micron electroplating thickness standards for brass alloys.',
            publishedAt: '2026-02-10T00:00:00Z',
          },
          {
            title: 'Economic Times Industry Review',
            url: 'https://economictimes.indiatimes.com/gold-plating-2026',
            excerpt:
              'Demand for 1-micron gold electroplated jewellery is growing.',
            publishedAt: '2026-02-15T00:00:00Z',
          },
        ],
        rawClaims: [
          {
            claim:
              '1 micron plating is the standard for durable imitation jewellery',
            sourceUrls: [
              'https://bis.gov.in/standards/gold',
              'https://economictimes.indiatimes.com/gold-plating-2026',
            ],
          },
        ],
      });

      expect(pack.topic).toBe('Indian Gold Plating Standards 2026');
      expect(pack.sources.length).toBe(2);
      expect(pack.sources[0].domain).toBe('bis.gov.in'); // Ranked first (Tier 1)
      expect(pack.claims[0].status).toBe('corroborated');
      expect(pack.overallStatus).toBe('corroborated');
      expect(pack.confidence).toBeGreaterThanOrEqual(0.9);

      // Verify formatted citations
      expect(pack.formattedCitations).toContain(
        '### Sources & Evidence Ledger'
      );
      expect(pack.formattedCitations).toContain('🏛️ Official / Primary');
      expect(pack.formattedCitations).toContain('📰 Reputable Publisher');

      // Verify voice summary
      expect(pack.voiceSummary).toContain('Research verified');
      expect(pack.voiceSummary).toContain('1 official source');
    });

    it('generates single-source warning in voice summary when only one source exists', () => {
      const pack = ledger.buildEvidencePack({
        topic: 'Unverified Competitor Price Move',
        rawSources: [
          {
            title: 'Competitor Press Note',
            url: 'https://giva.co/press',
            excerpt: 'GIVA plans 200 new offline kiosks.',
          },
        ],
        rawClaims: [
          {
            claim: 'Competitor expanding by 200 kiosks',
            sourceUrls: ['https://giva.co/press'],
          },
        ],
      });

      expect(pack.overallStatus).toBe('single_source');
      expect(pack.voiceSummary).toContain(
        'Notice: Information on Unverified Competitor Price Move is based on a single source (giva.co)'
      );
      expect(pack.voiceSummary).not.toContain('Research verified');
    });
  });

  describe('Integration with RsiResearchEngine', () => {
    it('allows RsiResearchEngine to research a topic and build evidence pack', async () => {
      const engine = new RsiResearchEngine();

      // Mock searchWeb to return 2 sample results
      jest.spyOn(engine, 'searchWeb').mockResolvedValue({
        success: true,
        query: '22k gold rate Kolkata',
        results: [
          {
            title: 'WB Bullion Merchants Official Rate',
            url: 'https://wb-bullion.gov.in/rates',
            snippet: '22 Karat gold traded at ₹74,500 per 10 grams.',
            domain: 'wb-bullion.gov.in',
            publishedAt: '2026-03-01T00:00:00Z',
            retrievedAt: new Date().toISOString(),
            provider: 'crawl4ai',
          },
          {
            title: 'ET Kolkata Gold Update',
            url: 'https://economictimes.indiatimes.com/kolkata-rates',
            snippet: 'Kolkata 22k gold rates held steady at ₹74,500.',
            domain: 'economictimes.indiatimes.com',
            publishedAt: '2026-03-01T00:00:00Z',
            retrievedAt: new Date().toISOString(),
            provider: 'tavily',
          },
        ],
        attemptedProviders: ['crawl4ai'],
        sourceMode: 'live',
        providerStatuses: { crawl4ai: 'healthy' },
        totalResults: 2,
        retrievedAt: new Date().toISOString(),
      });

      const pack = await engine.researchTopic('22k gold rate Kolkata');

      expect(pack.sources.length).toBe(2);
      expect(pack.sources[0].trustTier).toBe(1); // Tier 1 ranked first
      expect(pack.overallStatus).toBe('corroborated');
      expect(pack.formattedCitations).toContain('🏛️ Official / Primary');
    });
  });
});
