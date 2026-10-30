import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getServiceClient } from '@/lib/supabase/service';
import { getSkuDemandMetrics } from '@/lib/intelligence/inventory-demand-service';
import { getSkuStockoutRisk } from '@/lib/intelligence/stockout-risk-service';
import { getSkuAgingAnalysis } from '@/lib/intelligence/dead-stock-service';
import { getSkuRestockRecommendation } from '@/lib/intelligence/restock-recommendation-service';

export const dynamic = 'force-dynamic';

export const ADVISORY_NOTICE =
  'READ-ONLY ALGORITHMIC RECOMMENDATIONS: For human inventory manager review only. Zero automated stock modifications, purchase order writes, or supplier dispatches occur without explicit human approval.';

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const targetProductId = searchParams.get('productId');
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get('limit') || '15', 10))
    );
    const evaluatedAt = new Date().toISOString();

    // 1. Single product detailed analysis mode
    if (targetProductId) {
      const [demandRes, stockoutRes, agingRes, restockRes] =
        await Promise.allSettled([
          getSkuDemandMetrics(targetProductId),
          getSkuStockoutRisk(targetProductId),
          getSkuAgingAnalysis(targetProductId),
          getSkuRestockRecommendation(targetProductId),
        ]);

      return NextResponse.json({
        success: true,
        productId: targetProductId,
        demand: demandRes.status === 'fulfilled' ? demandRes.value : null,
        stockoutRisk:
          stockoutRes.status === 'fulfilled' ? stockoutRes.value : null,
        agingFinding: agingRes.status === 'fulfilled' ? agingRes.value : null,
        restockRecommendation:
          restockRes.status === 'fulfilled' ? restockRes.value : null,
        advisoryNotice: ADVISORY_NOTICE,
        requiresHumanReview: true,
        evaluatedAt,
      });
    }

    // 2. Batch catalog scan mode for operations dashboard
    const supabase = getServiceClient();
    const { data: products, error: prodErr } = await supabase
      .from('products')
      .select('id, name, sku, stock_quantity, low_stock_threshold, price')
      .order('stock_quantity', { ascending: true })
      .limit(limit);

    if (prodErr || !products) {
      return NextResponse.json(
        {
          success: false,
          error: prodErr?.message || 'Failed to fetch catalog products',
        },
        { status: 500 }
      );
    }

    const stockoutAlerts: any[] = [];
    const restockDrafts: any[] = [];
    const deadStockFindings: any[] = [];

    // Parallel intelligence processing across products
    await Promise.allSettled(
      products.map(async (prod) => {
        try {
          const [stockoutResult, restockResult, agingResult] =
            await Promise.allSettled([
              getSkuStockoutRisk(prod.id),
              getSkuRestockRecommendation(prod.id),
              getSkuAgingAnalysis(prod.id),
            ]);

          if (stockoutResult.status === 'fulfilled') {
            const risk = stockoutResult.value as any;
            if (
              risk.riskLevel === 'imminent' ||
              risk.riskLevel === 'high' ||
              risk.riskLevel === 'CRITICAL' ||
              risk.riskLevel === 'HIGH'
            ) {
              stockoutAlerts.push({
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                onHandStock: prod.stock_quantity,
                daysOfInventory:
                  risk.estimatedRunoutDays ??
                  risk.daysOfInventoryRemaining ??
                  0,
                riskLevel: risk.riskLevel,
                dataSufficiency: risk.confidence ?? risk.dataSufficiency,
                explanation: risk.assumptions?.formula ?? risk.explanation,
                stockoutProbability:
                  risk.confidenceScore ??
                  risk.stockoutProbabilityWithinLeadTime ??
                  0,
              });
            }
          }

          if (restockResult.status === 'fulfilled') {
            const restock = restockResult.value as any;
            if (
              restock.recommendationAction === 'reorder_now' ||
              restock.recommendationAction === 'review_supplier' ||
              (restock.recommendedReorderQuantity ||
                restock.recommendedUnits ||
                0) > 0
            ) {
              restockDrafts.push({
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                recommendedUnits:
                  restock.recommendedReorderQuantity ??
                  restock.recommendedUnits ??
                  0,
                recommendationAction: restock.recommendationAction || 'review',
                urgency: restock.urgency || 'medium',
                confidenceScore: restock.confidenceScore ?? 0.8,
                supplierLeadTimeDays: restock.supplierLeadTimeDays ?? 10,
                explanation:
                  restock.explanation || 'Inventory replenishment required',
                requiresHumanReview: true,
              });
            }
          }

          if (agingResult.status === 'fulfilled') {
            const aging = agingResult.value as any;
            if (
              aging.agingCategory === 'dead_stock' ||
              aging.agingCategory === 'aging' ||
              aging.status === 'dead_stock'
            ) {
              deadStockFindings.push({
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                agingCategory: aging.agingCategory || aging.status,
                daysSinceLastSale: aging.daysSinceLastSale ?? 0,
                estimatedTiedCapital:
                  aging.estimatedTiedCapital ?? aging.tiedCapital ?? 0,
                liquidationGuidance:
                  aging.liquidationGuidance || aging.guidance || '',
                actionLabel: aging.actionLabel || 'Inspect Product',
              });
            }
          }
        } catch {
          // Handled per product gracefully
        }
      })
    );

    return NextResponse.json({
      success: true,
      summary: {
        scannedSkusCount: products.length,
        stockoutAlertsCount: stockoutAlerts.length,
        restockDraftsCount: restockDrafts.length,
        deadStockFindingsCount: deadStockFindings.length,
      },
      stockoutAlerts,
      restockDrafts,
      deadStockFindings,
      advisoryNotice: ADVISORY_NOTICE,
      requiresHumanReview: true,
      evaluatedAt,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
