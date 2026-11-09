import 'server-only';
import { createHash } from 'crypto';
import { EvidenceClaim, EvidencePack, ResearchSource } from './types';

/**
 * Determines domain trust tier:
 * Tier 1: Primary/Official (.gov, .gov.in, standards, canonical brand domains)
 * Tier 2: Reputable news & financial publishers
 * Tier 3: Competitors & e-commerce marketplaces
 * Tier 4: Community forums, social media, unverified blogs
 */
export function determineTrustTier(domain: string, url: string): 1 | 2 | 3 | 4 {
  const d = domain.toLowerCase();

  // Tier 1: Official government, regulatory, standard, and canonical brand domains
  if (
    d.endsWith('.gov.in') ||
    d.endsWith('.gov') ||
    d.endsWith('.nic.in') ||
    d === 'bis.gov.in' ||
    d === 'gst.gov.in' ||
    d === 'incometax.gov.in' ||
    d === 'rbi.org.in' ||
    d === 'ruhvi.in' ||
    d.endsWith('.ruhvi.in') ||
    d === 'w3.org' ||
    d === 'ietf.org' ||
    d === 'developer.mozilla.org'
  ) {
    return 1;
  }

  // Tier 2: Reputable business and news publishers
  if (
    d.includes('economictimes.indiatimes.com') ||
    d.includes('livemint.com') ||
    d.includes('business-standard.com') ||
    d.includes('reuters.com') ||
    d.includes('bloomberg.com') ||
    d.includes('financialexpress.com') ||
    d.includes('thehindu.com') ||
    d.includes('ndtv.com') ||
    d.includes('timesofindia.indiatimes.com')
  ) {
    return 2;
  }

  // Tier 3: E-commerce competitors and marketplaces
  if (
    d.includes('caratlane.com') ||
    d.includes('giva.co') ||
    d.includes('bluestone.com') ||
    d.includes('tanishq.co.in') ||
    d.includes('palmonas.com') ||
    d.includes('amazon.in') ||
    d.includes('flipkart.com') ||
    d.includes('myntra.com') ||
    d.includes('ajio.com')
  ) {
    return 3;
  }

  // Tier 4: Community, forums, social media, unverified blogs
  return 4;
}

/**
 * Categorizes source type from domain and metadata
 */
export function determineSourceType(
  domain: string,
  trustTier: 1 | 2 | 3 | 4
):
  | 'official'
  | 'publisher'
  | 'competitor'
  | 'community'
  | 'documentation'
  | 'other' {
  const d = domain.toLowerCase();
  if (trustTier === 1) {
    return d.includes('developer.') || d.includes('docs.')
      ? 'documentation'
      : 'official';
  }
  if (trustTier === 2) {
    return 'publisher';
  }
  if (trustTier === 3) {
    return 'competitor';
  }
  if (
    d.includes('reddit.com') ||
    d.includes('twitter.com') ||
    d.includes('x.com') ||
    d.includes('quora.com') ||
    d.includes('facebook.com')
  ) {
    return 'community';
  }
  return 'other';
}

/**
 * Evaluates publication freshness
 */
export function determineFreshness(
  publishedAt?: string,
  category: 'pricing' | 'policy' | 'general' = 'general'
): 'fresh' | 'possibly_stale' | 'undated' {
  if (!publishedAt) {
    return 'undated';
  }

  try {
    const pubDate = new Date(publishedAt).getTime();
    if (isNaN(pubDate)) {
      return 'undated';
    }

    const ageDays = (Date.now() - pubDate) / (1000 * 60 * 60 * 24);
    const staleThresholdDays = category === 'pricing' ? 30 : 180;

    return ageDays <= staleThresholdDays ? 'fresh' : 'possibly_stale';
  } catch {
    return 'undated';
  }
}

/**
 * Normalizes canonical URLs by stripping query tracking artifacts and trailing slashes
 */
export function cleanCanonicalUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const trackingParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'fbclid',
      'gclid',
    ];
    trackingParams.forEach((param) => url.searchParams.delete(param));
    let cleaned = url.toString();
    if (cleaned.endsWith('/')) {
      cleaned = cleaned.slice(0, -1);
    }
    return cleaned;
  } catch {
    return rawUrl.trim();
  }
}

/**
 * Evidence Ledger & Citation Engine
 * Enforces:
 * 1. Source Ranking: Tier 1 > Tier 2 > Tier 3 > Tier 4; Fresh > Undated > Stale.
 * 2. Corroboration Gate: Claims require 2 independent source domains or 1 Tier 1 official source.
 * 3. Never says "verified" on single_source, conflicting, or unverified claims.
 * 4. Text citations and voice-friendly summaries.
 */
export class EvidenceLedger {
  private sourcesMap = new Map<string, ResearchSource>();

  /**
   * Registers a source into the evidence ledger with normalized metadata and content hash
   */
  registerSource(input: {
    title: string;
    url: string;
    excerpt: string;
    publishedAt?: string;
    domain?: string;
    httpStatus?: number;
    category?: 'pricing' | 'policy' | 'general';
  }): ResearchSource {
    const canonicalUrl = cleanCanonicalUrl(input.url);

    let domain = input.domain || '';
    if (!domain) {
      try {
        domain = new URL(input.url).hostname.replace(/^www\./, '');
      } catch {
        domain = 'unknown';
      }
    }

    const excerpt = (input.excerpt || '').slice(0, 300).trim();
    const contentHash = createHash('sha256')
      .update(`${canonicalUrl}::${excerpt}`)
      .digest('hex');

    const sourceId = `src_${contentHash.slice(0, 10)}`;
    const trustTier = determineTrustTier(domain, input.url);
    const sourceType = determineSourceType(domain, trustTier);
    const freshness = determineFreshness(input.publishedAt, input.category);

    const source: ResearchSource = {
      sourceId,
      title: (input.title || domain).trim(),
      url: input.url.trim(),
      canonicalUrl,
      canonical_url: canonicalUrl,
      domain,
      sourceType,
      source_type: sourceType,
      publishedAt: input.publishedAt,
      retrievedAt: new Date().toISOString(),
      retrieved_at: new Date().toISOString(),
      httpStatus: input.httpStatus || 200,
      contentHash,
      excerpt,
      trustTier,
      freshness,
      is_verified: trustTier === 1,
      reliability_score:
        trustTier === 1
          ? 0.95
          : trustTier === 2
            ? 0.85
            : trustTier === 3
              ? 0.7
              : 0.4,
    };

    this.sourcesMap.set(sourceId, source);
    return source;
  }

  /**
   * Ranks sources according to trust tier, freshness, and authority
   */
  rankSources(sources: ResearchSource[]): ResearchSource[] {
    return [...sources].sort((a, b) => {
      // 1. Trust Tier (Tier 1 is highest priority)
      if (a.trustTier !== b.trustTier) {
        return a.trustTier - b.trustTier;
      }

      // 2. Freshness: fresh > undated > possibly_stale
      const freshnessOrder = { fresh: 0, undated: 1, possibly_stale: 2 };
      const freshDiff =
        freshnessOrder[a.freshness] - freshnessOrder[b.freshness];
      if (freshDiff !== 0) {
        return freshDiff;
      }

      // 3. Published date presence (dated ahead of undated)
      if (a.publishedAt && !b.publishedAt) return -1;
      if (!a.publishedAt && b.publishedAt) return 1;

      return 0;
    });
  }

  /**
   * Corroborates a single claim against registered source evidence.
   * Invariant: Requires >= 2 independent source domains or 1 Tier 1 official source.
   */
  corroborateClaim(
    claimText: string,
    citedSourceIds: string[],
    knownConflicts: string[] = []
  ): EvidenceClaim {
    const claimId = `claim_${createHash('sha256').update(claimText).digest('hex').slice(0, 10)}`;

    const matchingSources = citedSourceIds
      .map((id) => this.sourcesMap.get(id))
      .filter((s): s is ResearchSource => s !== undefined);

    if (matchingSources.length === 0) {
      return {
        claimId,
        claim: claimText,
        sourceIds: [],
        confidence: 0,
        status: 'unverified',
        notes: 'I could not verify this claim; no supporting sources cited.',
      };
    }

    // Check if any conflicting claims were detected
    const hasConflict = knownConflicts.some((c) =>
      c.toLowerCase().includes(claimText.toLowerCase().slice(0, 30))
    );

    if (hasConflict) {
      return {
        claimId,
        claim: claimText,
        sourceIds: matchingSources.map((s) => s.sourceId),
        confidence: 0.4,
        status: 'conflicting',
        notes: 'Conflicting statements detected across cited sources.',
      };
    }

    // Check distinct domains
    const uniqueDomains = new Set(matchingSources.map((s) => s.domain));
    const hasTier1Official = matchingSources.some((s) => s.trustTier === 1);

    if (hasTier1Official) {
      return {
        claimId,
        claim: claimText,
        sourceIds: matchingSources.map((s) => s.sourceId),
        confidence: 0.95,
        status: 'corroborated',
        notes: 'Corroborated by authoritative official primary source.',
      };
    }

    if (uniqueDomains.size >= 2) {
      const bestTier = Math.min(...matchingSources.map((s) => s.trustTier));
      const confidence = bestTier === 2 ? 0.9 : 0.8;
      return {
        claimId,
        claim: claimText,
        sourceIds: matchingSources.map((s) => s.sourceId),
        confidence,
        status: 'corroborated',
        notes: `Corroborated across ${uniqueDomains.size} independent source domains.`,
      };
    }

    // Exactly 1 source domain
    const soleSource = matchingSources[0];
    const soleConfidence =
      soleSource.trustTier === 2
        ? 0.65
        : soleSource.trustTier === 3
          ? 0.5
          : 0.35;

    return {
      claimId,
      claim: claimText,
      sourceIds: [soleSource.sourceId],
      confidence: soleConfidence,
      status: 'single_source',
      notes: `One source reports this (${soleSource.domain}); not corroborated by independent sources.`,
    };
  }

  /**
   * Compiles an Evidence Pack from raw claims and research sources
   */
  buildEvidencePack(params: {
    topic: string;
    rawClaims: Array<{
      claim: string;
      sourceUrls?: string[];
      sourceIds?: string[];
    }>;
    rawSources: Array<{
      title: string;
      url: string;
      excerpt: string;
      publishedAt?: string;
      domain?: string;
      category?: 'pricing' | 'policy' | 'general';
    }>;
    knownConflicts?: string[];
  }): EvidencePack {
    // 1. Register and deduplicate all sources
    const registeredSources: ResearchSource[] = [];
    for (const rawSrc of params.rawSources) {
      const src = this.registerSource(rawSrc);
      registeredSources.push(src);
    }

    const rankedSources = this.rankSources(registeredSources);
    const conflicts = params.knownConflicts || [];
    const unknowns: string[] = [];

    // 2. Corroborate each claim
    const evaluatedClaims: EvidenceClaim[] = [];
    for (const rawClaim of params.rawClaims) {
      const citedIds = rawClaim.sourceIds || [];
      if (rawClaim.sourceUrls && rawClaim.sourceUrls.length > 0) {
        for (const url of rawClaim.sourceUrls) {
          const canonical = cleanCanonicalUrl(url);
          const found = rankedSources.find(
            (s) => s.canonicalUrl === canonical || s.url === url
          );
          if (found && !citedIds.includes(found.sourceId)) {
            citedIds.push(found.sourceId);
          }
        }
      }

      const claim = this.corroborateClaim(rawClaim.claim, citedIds, conflicts);
      evaluatedClaims.push(claim);

      if (claim.status === 'unverified') {
        unknowns.push(claim.claim);
      }
    }

    // 3. Overall status derivation
    let overallStatus:
      'corroborated' | 'single_source' | 'conflicting' | 'unverified' =
      'unverified';
    if (evaluatedClaims.some((c) => c.status === 'conflicting')) {
      overallStatus = 'conflicting';
    } else if (
      evaluatedClaims.length > 0 &&
      evaluatedClaims.every((c) => c.status === 'corroborated')
    ) {
      overallStatus = 'corroborated';
    } else if (evaluatedClaims.some((c) => c.status === 'single_source')) {
      overallStatus = 'single_source';
    }

    const avgConfidence =
      evaluatedClaims.length > 0
        ? evaluatedClaims.reduce((acc, c) => acc + c.confidence, 0) /
          evaluatedClaims.length
        : 0;

    const formattedCitations = this.formatCitations(rankedSources);
    const voiceSummary = this.formatVoiceSummary({
      topic: params.topic,
      claims: evaluatedClaims,
      sources: rankedSources,
      overallStatus,
    });

    return {
      topic: params.topic,
      claims: evaluatedClaims,
      sources: rankedSources,
      conflicts,
      unknowns,
      confidence: Math.round(avgConfidence * 100) / 100,
      overallStatus,
      generatedAt: new Date().toISOString(),
      voiceSummary,
      formattedCitations,
    };
  }

  /**
   * Formats text citations as markdown footnotes
   */
  formatCitations(sources: ResearchSource[]): string {
    if (sources.length === 0) return 'No sources cited.';

    const lines = ['### Sources & Evidence Ledger'];
    sources.forEach((src, idx) => {
      const tierLabel =
        src.trustTier === 1
          ? '🏛️ Official / Primary'
          : src.trustTier === 2
            ? '📰 Reputable Publisher'
            : src.trustTier === 3
              ? '🏬 Competitor / Marketplace'
              : '💬 Community / Forum';

      const dateLabel = src.publishedAt
        ? `Published: ${src.publishedAt.slice(0, 10)} (${src.freshness})`
        : 'Date: Undated';

      lines.push(
        `[${idx + 1}] **[${src.title}](${src.url})**  \n    ` +
          `Domain: \`${src.domain}\` | ${tierLabel} | ${dateLabel}  \n    ` +
          `*Excerpt:* "${src.excerpt}"`
      );
    });

    return lines.join('\n\n');
  }

  /**
   * Formats a concise voice summary suitable for TTS
   */
  formatVoiceSummary(pack: Partial<EvidencePack>): string {
    const claims = pack.claims || [];
    const sources = pack.sources || [];
    const status = pack.overallStatus || 'unverified';

    const officialCount = sources.filter((s) => s.trustTier === 1).length;
    const publisherCount = sources.filter((s) => s.trustTier === 2).length;
    const competitorCount = sources.filter((s) => s.trustTier === 3).length;

    if (status === 'conflicting') {
      return `Attention: Contradictory information detected across ${sources.length} sources regarding ${pack.topic || 'this topic'}. Review conflicting citations before deciding.`;
    }

    if (status === 'single_source') {
      const domain = sources[0]?.domain || 'a single source';
      return `Notice: Information on ${pack.topic || 'this topic'} is based on a single source (${domain}) and has not been corroborated independently.`;
    }

    if (status === 'unverified') {
      return `Notice: I could not verify claims regarding ${pack.topic || 'this topic'}. Live research data was inconclusive.`;
    }

    // Corroborated summary
    const sourceBreakdown: string[] = [];
    if (officialCount > 0)
      sourceBreakdown.push(`${officialCount} official source`);
    if (publisherCount > 0)
      sourceBreakdown.push(`${publisherCount} independent publisher report`);
    if (competitorCount > 0)
      sourceBreakdown.push(`${competitorCount} market price check`);

    const sourcesDesc =
      sourceBreakdown.length > 0
        ? sourceBreakdown.join(', ')
        : `${sources.length} independent sources`;
    return `Research verified across ${sourcesDesc}. ${claims.length} claims corroborated with high confidence.`;
  }
}

export const evidenceLedger = new EvidenceLedger();
