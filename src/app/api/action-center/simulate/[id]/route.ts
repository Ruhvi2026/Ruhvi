import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getServiceClient } from '@/lib/supabase/service';
import { getAnomalyLifecycleRegistry } from '@/lib/intelligence/anomaly-lifecycle';
import { createActionProposal } from '@/lib/intelligence/approval-policy';
import {
  generateSimulationForProposal,
  DEFAULT_CATALOG_FIXTURE,
  type SimulationFixture,
  type ProposalSimulationReview,
} from '@/lib/intelligence/simulator-review-service';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Enforce admin auth
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { id: rawId } = await params;
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Optional query overrides for interactive counterfactual experimentation
    const queryThreshold =
      searchParams.get('lowStockThreshold') || searchParams.get('newThreshold');
    const queryProductId = searchParams.get('productId');

    // 2. Identify entity / proposal details
    let resolvedTitle = `Simulated Proposal for ${rawId}`;
    let targetProductId = queryProductId || '';
    let category: 'inventory' | 'financial' | 'operations' | 'security' =
      'inventory';
    const actionType = 'update_inventory_safety_buffer';
    let previousThreshold = 2;
    let targetProductData: any = null;
    let isAuthoritativeProduct = false;

    // A. Check Anomaly Registry / Records
    const registry = getAnomalyLifecycleRegistry();
    const anomalyId = rawId.startsWith('act_anom_')
      ? `anom_${rawId.replace(/^act_anom_/, '')}`
      : rawId;
    const anomaly =
      registry.getRecordById(anomalyId) || registry.getRecordById(rawId);

    if (anomaly) {
      resolvedTitle = anomaly.title;
      category = (anomaly.recommendation?.category as any) || 'inventory';
      if (anomaly.affectedEntities && anomaly.affectedEntities.length > 0) {
        const prodEntity = anomaly.affectedEntities.find(
          (e: any) => e.type === 'product'
        );
        if (prodEntity) {
          targetProductId = prodEntity.id;
        }
      }
      if (!targetProductId && anomaly.metadata?.productId) {
        targetProductId = String(anomaly.metadata.productId);
      }
    }

    // B. Check if rawId itself is a product ID
    if (!targetProductId) {
      if (rawId.startsWith('prod_')) {
        targetProductId = rawId;
      }
    }

    // C. Lookup Product Authoritatively from Supabase DB
    if (targetProductId) {
      try {
        const supabase = getServiceClient();
        const { data: prod } = await supabase
          .from('products')
          .select(
            'id, name, sku, price, cost_price, stock_quantity, low_stock_threshold'
          )
          .eq('id', targetProductId)
          .single();

        if (prod) {
          targetProductData = prod;
          isAuthoritativeProduct = true;
          resolvedTitle = `Adjust Safety Buffer for ${prod.name}`;
          if (prod.low_stock_threshold != null) {
            previousThreshold = Number(prod.low_stock_threshold);
          }
        }
      } catch (dbErr) {
        // Fall back gracefully if Supabase client or table is unavailable in tests
        console.warn(
          '[ActionCenterSimulate] DB product lookup fallback:',
          dbErr
        );
      }
    }

    // D. Check catalog fixture if still no DB product
    if (!targetProductData) {
      const fixtureMatch = DEFAULT_CATALOG_FIXTURE.products.find(
        (p) => p.id === targetProductId || p.id === rawId
      );
      if (fixtureMatch) {
        targetProductData = fixtureMatch;
        targetProductId = fixtureMatch.id;
        resolvedTitle = `Adjust Safety Buffer for ${fixtureMatch.name}`;
        previousThreshold = fixtureMatch.lowStockThreshold;
      }
    }

    // E. Default to representative baseline product if not matched
    if (!targetProductData) {
      const fallbackProd = DEFAULT_CATALOG_FIXTURE.products[0];
      targetProductId = fallbackProd.id;
      previousThreshold = fallbackProd.lowStockThreshold;
    }

    // F. Resolve new threshold (must be valid integer between 1 and 100)
    let newThreshold = previousThreshold < 5 ? 5 : previousThreshold + 3;
    if (queryThreshold) {
      const parsed = parseInt(queryThreshold, 10);
      if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 100) {
        newThreshold = parsed;
      }
    }

    // G. Prepare simulation fixture with live authoritative product snapshot if available
    let activeFixture: SimulationFixture = DEFAULT_CATALOG_FIXTURE;
    if (isAuthoritativeProduct && targetProductData) {
      const authoritativeSnapshot = {
        id: targetProductData.id,
        sku: targetProductData.sku || targetProductData.id,
        name: targetProductData.name || 'Catalog Product',
        currentPrice: Number(targetProductData.price) || 50000,
        costPrice:
          Number(targetProductData.cost_price) ||
          Math.round((Number(targetProductData.price) || 50000) * 0.6),
        stockQuantity: Number(targetProductData.stock_quantity ?? 10),
        lowStockThreshold: previousThreshold,
        historical30DaySalesUnits: 15,
        supplierLeadTimeDays: 14,
      };

      activeFixture = {
        ...DEFAULT_CATALOG_FIXTURE,
        products: [
          ...DEFAULT_CATALOG_FIXTURE.products.filter(
            (p) => p.id !== authoritativeSnapshot.id
          ),
          authoritativeSnapshot,
        ],
      };
    }

    // H. Build canonical proposal matching action-executor parameters schema
    const proposal = createActionProposal({
      recommendationId: `rec_${rawId}`,
      title: resolvedTitle,
      category,
      impactTier: 'inventory_operational',
      actionType,
      targetEntity: { type: 'product', id: targetProductId },
      parameters: {
        productId: targetProductId,
        lowStockThreshold: newThreshold, // Canonical executor parameter
        newThreshold, // Backward compatibility
        previousThreshold,
        targetField: 'low_stock_threshold',
        reason: `Counterfactual simulation review for ${rawId}`,
      },
    });

    // I. Run simulation
    const review: ProposalSimulationReview = generateSimulationForProposal(
      proposal,
      activeFixture
    );

    // Append transparency note on authoritative vs baseline fixture
    if (isAuthoritativeProduct) {
      review.reviewGuidance.unshift(
        `Simulation bound to live authoritative catalog item: ${targetProductData.name} (SKU: ${targetProductData.sku || targetProductId}).`
      );
    } else {
      review.reviewGuidance.unshift(
        `Action ID '${rawId}' simulated against catalog snapshot baseline for product: ${targetProductId}.`
      );
    }

    return NextResponse.json(review, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || 'Failed to simulate proposal outcome' },
      { status: 500 }
    );
  }
}
