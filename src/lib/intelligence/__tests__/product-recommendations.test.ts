jest.mock('server-only', () => ({}));

import {
  rankProductRecommendations,
  type CandidateProduct,
  type CustomerRecommendationSignals,
} from '../product-recommendations';

describe('Privacy-Safe Product Recommendations (Track F - Phase 34)', () => {
  const sampleCatalog: CandidateProduct[] = [
    {
      id: 'prod_necklace_01',
      sku: 'NK-GLD-001',
      name: '22K Royal Temple Gold Necklace',
      slug: 'royal-temple-gold-necklace',
      categoryId: 'cat_necklaces',
      categoryName: 'Necklaces',
      price: 85000,
      mrp: 92000,
      stockQuantity: 12,
      lowStockThreshold: 2,
      status: 'active',
      isBestSeller: true,
      isNewArrival: false,
    },
    {
      id: 'prod_ring_01',
      sku: 'RG-DIA-001',
      name: 'Solitaire Diamond Engagement Ring',
      slug: 'solitaire-diamond-ring',
      categoryId: 'cat_rings',
      categoryName: 'Rings',
      price: 45000,
      mrp: 50000,
      stockQuantity: 5,
      lowStockThreshold: 2,
      status: 'active',
      isBestSeller: true,
      isNewArrival: true,
    },
    {
      id: 'prod_earrings_01',
      sku: 'ER-POL-001',
      name: 'Polki Chandbali Earrings',
      slug: 'polki-chandbali-earrings',
      categoryId: 'cat_earrings',
      categoryName: 'Earrings',
      price: 32000,
      mrp: 35000,
      stockQuantity: 8,
      lowStockThreshold: 2,
      status: 'active',
      isBestSeller: false,
      isNewArrival: true,
    },
    {
      id: 'prod_bangle_01',
      sku: 'BG-GLD-001',
      name: 'Traditional Filigree Gold Kada',
      slug: 'filigree-gold-kada',
      categoryId: 'cat_bangles',
      categoryName: 'Bangles',
      price: 65000,
      mrp: 70000,
      stockQuantity: 3,
      lowStockThreshold: 2,
      status: 'active',
      isBestSeller: false,
      isNewArrival: false,
    },
    {
      id: 'prod_pendant_01',
      sku: 'PD-LAK-001',
      name: 'Lakshmi Coin Gold Pendant',
      slug: 'lakshmi-coin-gold-pendant',
      categoryId: 'cat_pendants',
      categoryName: 'Pendants',
      price: 15000,
      mrp: 18000,
      stockQuantity: 20,
      lowStockThreshold: 3,
      status: 'active',
      isBestSeller: false,
      isNewArrival: false,
    },
    {
      id: 'prod_chain_01',
      sku: 'CH-SLV-001',
      name: 'Silver Rope Chain',
      slug: 'silver-rope-chain',
      categoryId: 'cat_chains',
      categoryName: 'Chains',
      price: 4000,
      mrp: 4500,
      stockQuantity: 15,
      lowStockThreshold: 2,
      status: 'active',
      isBestSeller: false,
      isNewArrival: false,
    },
    // Out of stock product
    {
      id: 'prod_out_of_stock_01',
      sku: 'RG-OOS-001',
      name: 'Out of Stock Diamond Band',
      slug: 'out-of-stock-diamond-band',
      categoryId: 'cat_rings',
      price: 25000,
      mrp: 28000,
      stockQuantity: 0,
      lowStockThreshold: 2,
      status: 'active',
    },
    // Inactive product
    {
      id: 'prod_inactive_01',
      sku: 'NK-INA-001',
      name: 'Draft Antique Choker',
      slug: 'draft-antique-choker',
      categoryId: 'cat_necklaces',
      price: 120000,
      mrp: 130000,
      stockQuantity: 4,
      lowStockThreshold: 1,
      status: 'inactive',
    },
  ];

  describe('Hard Constraints & Disqualifications', () => {
    it('strictly disqualifies products with zero or negative stock', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals);

      const foundOos = res.recommendations.some(
        (r) => r.product.id === 'prod_out_of_stock_01'
      );
      expect(foundOos).toBe(false);
      expect(res.metadata.disqualificationReasons.out_of_stock).toBe(1);
    });

    it('strictly disqualifies non-active products', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals);

      const foundInactive = res.recommendations.some(
        (r) => r.product.id === 'prod_inactive_01'
      );
      expect(foundInactive).toBe(false);
      expect(res.metadata.disqualificationReasons.inactive_status).toBe(1);
    });

    it('suppresses past purchased products when personalized with consent', () => {
      const signals: CustomerRecommendationSignals = {
        customerId: 'usr_priya_01',
        consented: true,
        pastPurchasedProductIds: ['prod_necklace_01'], // Customer already owns the Royal Temple Necklace
      };

      const res = rankProductRecommendations(sampleCatalog, signals);

      const foundPurchased = res.recommendations.some(
        (r) => r.product.id === 'prod_necklace_01'
      );
      expect(foundPurchased).toBe(false);
      expect(res.metadata.disqualificationReasons.already_purchased).toBe(1);
    });

    it('filters by category when targetCategoryId is specified', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals, {
        targetCategoryId: 'cat_rings',
      });

      expect(res.recommendations.length).toBe(1);
      expect(res.recommendations[0].product.id).toBe('prod_ring_01');
      expect(
        res.metadata.disqualificationReasons.category_mismatch
      ).toBeGreaterThan(0);
    });

    it('filters by price bounds when minPrice or maxPrice are provided', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals, {
        minPrice: 30000,
        maxPrice: 50000,
      });

      // Eligible: prod_ring_01 (45000), prod_earrings_01 (32000)
      const ids = res.recommendations.map((r) => r.product.id);
      expect(ids).toContain('prod_ring_01');
      expect(ids).toContain('prod_earrings_01');
      expect(ids).not.toContain('prod_necklace_01'); // 85000 > 50000
      expect(ids).not.toContain('prod_pendant_01'); // 15000 < 30000
      expect(
        res.metadata.disqualificationReasons.price_out_of_bounds
      ).toBeGreaterThan(0);
    });
  });

  describe('DPDP Privacy & Non-Consented Fallbacks', () => {
    it('falls back to non_consented_catalog_baseline when consent is false', () => {
      const signals: CustomerRecommendationSignals = {
        customerId: 'usr_guest_01',
        consented: false,
        pastPurchasedProductIds: ['prod_ring_01'], // Must be ignored
        categoryAffinities: { cat_chains: 1.0 }, // Must be ignored
      };

      const res = rankProductRecommendations(sampleCatalog, signals);

      expect(res.metadata.fallbackMode).toBe('non_consented_catalog_baseline');
      // Past purchased product is NOT suppressed when non-consented (strictly non-personalized catalog view)
      const hasRing = res.recommendations.some(
        (r) => r.product.id === 'prod_ring_01'
      );
      expect(hasRing).toBe(true);

      // Verify reasons do not leak private signals
      for (const rec of res.recommendations) {
        expect(rec.reasons).toContain('Catalog baseline merchandising');
        expect(rec.reasons).toContain('Balanced price tier');
      }
    });

    it('falls back to non_consented_catalog_baseline if customerId is missing even if consented is true', () => {
      const signals: CustomerRecommendationSignals = {
        consented: true, // No customer ID
      };

      const res = rankProductRecommendations(sampleCatalog, signals);
      expect(res.metadata.fallbackMode).toBe('non_consented_catalog_baseline');
    });
  });

  describe('Personalized Factor Scoring & Explainability', () => {
    it('calculates reproducible scores with transparent breakdown and reasons', () => {
      const signals: CustomerRecommendationSignals = {
        customerId: 'usr_alice_01',
        consented: true,
        categoryAffinities: {
          cat_rings: 0.9, // High affinity for rings
          cat_earrings: 0.5, // Medium affinity for earrings
        },
        averageOrderValue: 48000,
        wishlistProductIds: ['prod_bangle_01'],
      };

      const res = rankProductRecommendations(sampleCatalog, signals);
      expect(res.metadata.fallbackMode).toBe('personalized');
      expect(res.recommendations.length).toBeGreaterThan(0);

      // Top recommendation should be the ring:
      // Category affinity: 0.9 * 40 = 36
      // Merchandising: Best Seller (+15) + New Arrival (+10) = 25
      // Price Proximity: 45000 / 48000 = 0.9375 (within 0.7-1.3) = 20
      // Stock Health: stock 5 > threshold 2 = 10
      // Expected total: 36 + 25 + 20 + 10 = 91
      const ringRec = res.recommendations.find(
        (r) => r.product.id === 'prod_ring_01'
      );
      expect(ringRec).toBeDefined();
      expect(ringRec!.scoreBreakdown.categoryAffinity).toBe(36);
      expect(ringRec!.scoreBreakdown.merchandisingVelocity).toBe(25);
      expect(ringRec!.scoreBreakdown.priceProximity).toBe(20);
      expect(ringRec!.scoreBreakdown.stockHealthBuffer).toBe(10);
      expect(ringRec!.totalScore).toBe(91);

      // Verify reasons contain explainability strings
      expect(ringRec!.reasons).toEqual(
        expect.arrayContaining([
          'High affinity for Rings',
          'Bestselling customer favorite',
          'Fresh new collection arrival',
          expect.stringContaining('Matches customer typical price point'),
          'Healthy inventory buffer',
        ])
      );
    });

    it('gives wishlist items elevated category affinity when no specific affinity weight exists', () => {
      const signals: CustomerRecommendationSignals = {
        customerId: 'usr_bob_02',
        consented: true,
        categoryAffinities: {}, // No category preferences
        wishlistProductIds: ['prod_bangle_01'],
      };

      const res = rankProductRecommendations(sampleCatalog, signals);
      const bangleRec = res.recommendations.find(
        (r) => r.product.id === 'prod_bangle_01'
      );

      expect(bangleRec).toBeDefined();
      expect(bangleRec!.scoreBreakdown.categoryAffinity).toBe(35);
      expect(bangleRec!.reasons).toContain('Saved in customer wishlist');
    });

    it('awards strong stock availability score (15 pts) when stock >= threshold * 3', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals);

      // prod_necklace_01: stock 12, threshold 2 (12 >= 6) -> 15 pts
      const necklaceRec = res.recommendations.find(
        (r) => r.product.id === 'prod_necklace_01'
      );
      expect(necklaceRec).toBeDefined();
      expect(necklaceRec!.scoreBreakdown.stockHealthBuffer).toBe(15);
      expect(necklaceRec!.reasons).toContain('Strong stock availability');
    });

    it('sorts recommendations in strictly descending order of totalScore', () => {
      const signals: CustomerRecommendationSignals = {
        customerId: 'usr_carol_03',
        consented: true,
        categoryAffinities: { cat_necklaces: 1.0 },
        averageOrderValue: 80000,
      };

      const res = rankProductRecommendations(sampleCatalog, signals);
      const scores = res.recommendations.map((r) => r.totalScore);

      for (let i = 0; i < scores.length - 1; i++) {
        expect(scores[i]).toBeGreaterThanOrEqual(scores[i + 1]);
      }
    });

    it('respects the limit option', () => {
      const signals: CustomerRecommendationSignals = { consented: false };
      const res = rankProductRecommendations(sampleCatalog, signals, {
        limit: 2,
      });
      expect(res.recommendations.length).toBe(2);
    });
  });
});
