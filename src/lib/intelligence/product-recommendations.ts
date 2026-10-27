import 'server-only';

/**
 * ============================================================================
 * PRIVACY-SAFE PRODUCT RECOMMENDATION RANKING ENGINE (TRACK F - PHASE 34)
 * ============================================================================
 * Deterministic, testable product recommendation ranking method using approved
 * catalog and customer signals.
 *
 * Guarantees:
 * 1. Hard Stock & Availability Constraints:
 *    - Products with stock <= 0 or status != 'active' are strictly disqualified.
 * 2. Privacy & Consent Compliance:
 *    - If consented === false, personal interaction history is omitted and ranking
 *      falls back gracefully to non-personalized catalog popularity and stock health.
 *    - Prohibits unsupported sensitive inferences (marital, religious, health, or income assumptions).
 * 3. Anti-Repetition Suppression:
 *    - Automatically suppresses products the customer has already purchased.
 * 4. Transparent Traceability:
 *    - Emits reproducible total scores (0-100), full score breakdowns, and human-readable
 *      trace reasons for every ranked candidate.
 */

export interface CandidateProduct {
  id: string;
  sku: string;
  name: string;
  slug: string;
  categoryId: string;
  categoryName?: string;
  price: number;
  mrp: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: 'active' | 'inactive' | 'draft' | 'archived' | string;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  tags?: string[];
}

export interface CustomerRecommendationSignals {
  customerId?: string;
  consented: boolean; // DPDP / GDPR consent flag
  pastPurchasedProductIds?: string[];
  categoryAffinities?: Record<string, number>; // CategoryId -> weight (0.0 to 1.0)
  averageOrderValue?: number;
  wishlistProductIds?: string[];
}

export interface ProductRecommendationOptions {
  limit?: number; // default: 6
  targetCategoryId?: string; // optional category filter
  minPrice?: number;
  maxPrice?: number;
}

export interface RankedProductRecommendation {
  product: CandidateProduct;
  totalScore: number; // 0.00 to 100.00
  scoreBreakdown: {
    categoryAffinity: number; // 0 - 40 pts
    merchandisingVelocity: number; // 0 - 25 pts
    priceProximity: number; // 0 - 20 pts
    stockHealthBuffer: number; // 0 - 15 pts
  };
  reasons: string[];
  disqualified?: false;
}

export interface RecommendationResult {
  recommendations: RankedProductRecommendation[];
  metadata: {
    totalCandidatesEvaluated: number;
    disqualifiedCount: number;
    disqualificationReasons: Record<string, number>;
    fallbackMode: 'personalized' | 'non_consented_catalog_baseline';
    generatedAt: string;
  };
}

/**
 * Calculates price proximity score (0 to 20 points).
 * Maximized when candidate price is within [0.7 * AOV, 1.3 * AOV].
 */
function calculatePriceProximityScore(
  price: number,
  averageOrderValue: number | undefined
): { score: number; reason?: string } {
  if (!averageOrderValue || averageOrderValue <= 0) {
    return { score: 10, reason: 'Standard baseline price tier' };
  }

  const ratio = price / averageOrderValue;

  if (ratio >= 0.7 && ratio <= 1.3) {
    return {
      score: 20,
      reason: `Matches customer typical price point (~₹${averageOrderValue.toLocaleString('en-IN')})`,
    };
  }

  if (ratio >= 0.4 && ratio <= 1.8) {
    return { score: 14, reason: 'Within comfortable price band' };
  }

  if (ratio < 0.4) {
    return { score: 8, reason: 'Entry-level price point' };
  }

  return { score: 5, reason: 'Premium luxury tier' };
}

/**
 * Calculates stock health score (0 to 15 points).
 * Encourages recommending products with reliable inventory buffers.
 */
function calculateStockHealthScore(
  stockQuantity: number,
  lowStockThreshold: number
): { score: number; reason: string } {
  const threshold = Math.max(1, lowStockThreshold);

  if (stockQuantity >= threshold * 3) {
    return { score: 15, reason: 'Strong stock availability' };
  }

  if (stockQuantity > threshold) {
    return { score: 10, reason: 'Healthy inventory buffer' };
  }

  return { score: 5, reason: 'Limited stock remaining' };
}

/**
 * Ranks candidate products against approved customer signals.
 */
export function rankProductRecommendations(
  candidates: CandidateProduct[],
  signals: CustomerRecommendationSignals,
  options?: ProductRecommendationOptions
): RecommendationResult {
  const limit = Math.max(1, Math.min(50, options?.limit ?? 6));
  const generatedAt = new Date().toISOString();

  let disqualifiedCount = 0;
  const disqualificationReasons: Record<string, number> = {
    out_of_stock: 0,
    inactive_status: 0,
    already_purchased: 0,
    category_mismatch: 0,
    price_out_of_bounds: 0,
  };

  const isPersonalized = signals.consented && Boolean(signals.customerId);
  const purchasedSet = new Set(signals.pastPurchasedProductIds || []);
  const wishlistSet = new Set(signals.wishlistProductIds || []);
  const affinities = signals.categoryAffinities || {};

  const scoredRecommendations: RankedProductRecommendation[] = [];

  for (const candidate of candidates) {
    // ─── 1. Hard Disqualifications ──────────────────────────────────────────
    if (candidate.status !== 'active') {
      disqualifiedCount++;
      disqualificationReasons.inactive_status++;
      continue;
    }

    if (!candidate.stockQuantity || candidate.stockQuantity <= 0) {
      disqualifiedCount++;
      disqualificationReasons.out_of_stock++;
      continue;
    }

    // Suppress products already bought (only when personalized)
    if (isPersonalized && purchasedSet.has(candidate.id)) {
      disqualifiedCount++;
      disqualificationReasons.already_purchased++;
      continue;
    }

    // Target category filter
    if (
      options?.targetCategoryId &&
      candidate.categoryId !== options.targetCategoryId
    ) {
      disqualifiedCount++;
      disqualificationReasons.category_mismatch++;
      continue;
    }

    // Price bounds
    if (options?.minPrice !== undefined && candidate.price < options.minPrice) {
      disqualifiedCount++;
      disqualificationReasons.price_out_of_bounds++;
      continue;
    }

    if (options?.maxPrice !== undefined && candidate.price > options.maxPrice) {
      disqualifiedCount++;
      disqualificationReasons.price_out_of_bounds++;
      continue;
    }

    // ─── 2. Deterministic Factor Scoring (0 - 100 points) ───────────────────
    const reasons: string[] = [];

    // Factor 1: Category Affinity (0 - 40 pts)
    let categoryAffinityScore = 10; // Baseline
    if (isPersonalized) {
      const affinityWeight = affinities[candidate.categoryId] ?? 0;
      if (affinityWeight > 0) {
        categoryAffinityScore = Math.min(40, Math.round(affinityWeight * 40));
        reasons.push(
          `High affinity for ${candidate.categoryName || 'category'}`
        );
      } else if (wishlistSet.has(candidate.id)) {
        categoryAffinityScore = 35;
        reasons.push('Saved in customer wishlist');
      }
    } else {
      reasons.push('Catalog baseline merchandising');
    }

    // Factor 2: Merchandising Velocity (0 - 25 pts)
    let merchandisingScore = 0;
    if (candidate.isBestSeller) {
      merchandisingScore += 15;
      reasons.push('Bestselling customer favorite');
    }
    if (candidate.isNewArrival) {
      merchandisingScore += 10;
      reasons.push('Fresh new collection arrival');
    }
    if (merchandisingScore === 0) {
      merchandisingScore = 5; // Baseline curated item
    }

    // Factor 3: Price Proximity (0 - 20 pts)
    const priceRes = isPersonalized
      ? calculatePriceProximityScore(candidate.price, signals.averageOrderValue)
      : { score: 10, reason: 'Balanced price tier' };
    if (priceRes.reason) reasons.push(priceRes.reason);

    // Factor 4: Stock Health Buffer (0 - 15 pts)
    const stockRes = calculateStockHealthScore(
      candidate.stockQuantity,
      candidate.lowStockThreshold
    );
    if (stockRes.reason) reasons.push(stockRes.reason);

    const totalScore = Math.min(
      100,
      categoryAffinityScore +
        merchandisingScore +
        priceRes.score +
        stockRes.score
    );

    scoredRecommendations.push({
      product: candidate,
      totalScore,
      scoreBreakdown: {
        categoryAffinity: categoryAffinityScore,
        merchandisingVelocity: merchandisingScore,
        priceProximity: priceRes.score,
        stockHealthBuffer: stockRes.score,
      },
      reasons,
    });
  }

  // ─── 3. Sort Descending by Total Score ────────────────────────────────────
  scoredRecommendations.sort((a, b) => b.totalScore - a.totalScore);

  return {
    recommendations: scoredRecommendations.slice(0, limit),
    metadata: {
      totalCandidatesEvaluated: candidates.length,
      disqualifiedCount,
      disqualificationReasons,
      fallbackMode: isPersonalized
        ? 'personalized'
        : 'non_consented_catalog_baseline',
      generatedAt,
    },
  };
}
