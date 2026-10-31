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
      .select(
        'id, name, sku, stock_quantity, low_stock_threshold, price, created_at'
      )
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
    const demandSignals: any[] = [];

    // Parallel intelligence processing across products
    await Promise.allSettled(
      products.map(async (prod) => {
        try {
          const [stockoutResult, restockResult, agingResult, demandResult] =
            await Promise.allSettled([
              getSkuStockoutRisk(prod.id),
              getSkuRestockRecommendation(prod.id),
              getSkuAgingAnalysis(prod.id),
              getSkuDemandMetrics(prod.id),
            ]);

          if (demandResult.status === 'fulfilled' && demandResult.value) {
            const demand = demandResult.value as any;
            demandSignals.push({
              productId: prod.id,
              productName: prod.name,
              sku: prod.sku,
              netUnitsSold: demand.netUnitsSold,
              grossUnitsSold: demand.grossUnitsSold,
              cancelledUnitsOmitted: demand.cancelledUnitsOmitted,
              returnedUnitsSubtracted: demand.returnedUnitsSubtracted,
              rawDailySales: demand.rawDailySales,
              inStockDailySales: demand.inStockDailySales,
              classification: demand.classification,
              classificationReason: demand.classificationReason,
              trend: demand.trend,
              confidenceScore: demand.confidenceScore,
            });
          }

          if (stockoutResult.status === 'fulfilled') {
            const risk = stockoutResult.value as any;
            if (
              risk.riskLevel === 'CRITICAL_STOCKOUT' ||
              risk.riskLevel === 'IMMINENT_RISK' ||
              risk.riskLevel === 'ELEVATED_RISK' ||
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
                sellableStock: risk.sellableStock ?? prod.stock_quantity,
                reservedStock: risk.reservedStock ?? 0,
                daysOfInventory:
                  risk.estimatedRunoutDays ??
                  risk.daysOfInventoryRemaining ??
                  0,
                estimatedRunoutDays: risk.estimatedRunoutDays ?? 0,
                estimatedStockoutDate: risk.estimatedStockoutDate ?? null,
                riskLevel: risk.riskLevel,
                confidence: risk.confidence ?? 'MEDIUM',
                confidenceScore: risk.confidenceScore ?? 0.8,
                dataSufficiency:
                  risk.confidence ?? risk.dataSufficiency ?? 'SUFFICIENT',
                explanation:
                  risk.assumptions?.formula ??
                  risk.confidenceLimitations?.join('; ') ??
                  risk.explanation ??
                  'Risk of inventory exhaustion',
                confidenceLimitations: risk.confidenceLimitations ?? [],
                assumptions: risk.assumptions,
                stockoutProbability:
                  risk.confidenceScore ??
                  risk.stockoutProbabilityWithinLeadTime ??
                  0,
              });
            }
          }

          if (restockResult.status === 'fulfilled') {
            const restock = restockResult.value as any;
            const isRestockRecommended =
              restock.status === 'RESTOCK_RECOMMENDED' ||
              restock.recommendationAction === 'reorder_now' ||
              restock.recommendationAction === 'review_supplier' ||
              (restock.suggestedQuantity ??
                restock.recommendedReorderQuantity ??
                restock.recommendedUnits ??
                0) > 0;

            if (isRestockRecommended) {
              const suggestedUnits =
                restock.suggestedQuantity ??
                restock.recommendedReorderQuantity ??
                restock.recommendedUnits ??
                0;
              restockDrafts.push({
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                status: restock.status || 'RESTOCK_RECOMMENDED',
                recommendedUnits: suggestedUnits,
                suggestedQuantity: suggestedUnits,
                urgency: (restock.urgency || 'medium').toLowerCase(),
                sellableStock: restock.sellableStock ?? prod.stock_quantity,
                reorderPoint: restock.reorderPoint ?? 0,
                targetStockLevel: restock.targetStockLevel ?? 0,
                safetyStockUnits:
                  restock.safetyStockUnits ?? prod.low_stock_threshold,
                supplierLeadTimeDays:
                  restock.leadTimeDays ?? restock.supplierLeadTimeDays ?? 10,
                reviewPeriodDays: restock.reviewPeriodDays ?? 30,
                moqApplied: restock.moqApplied ?? false,
                batchRoundingApplied: restock.batchRoundingApplied ?? false,
                estimatedProcurementCost: restock.estimatedProcurementCost ?? 0,
                confidenceScore: restock.confidenceScore ?? 0.85,
                recommendationAction:
                  restock.recommendationAction || 'reorder_now',
                explanation:
                  restock.rationale ||
                  restock.explanation ||
                  'Inventory replenishment required',
                rationale:
                  restock.rationale ||
                  restock.explanation ||
                  'Replenishment suggested',
                formulaDetails: restock.formulaDetails,
                caveats: restock.caveats ?? [],
                isDraftReviewOnly: true,
                requiresHumanReview: true,
              });
            }
          }

          if (agingResult.status === 'fulfilled') {
            const aging = agingResult.value as any;
            const isDeadStock =
              aging.classification === 'DEAD_STOCK' ||
              aging.agingCategory === 'dead_stock' ||
              aging.status === 'dead_stock';
            const isSlowMoving =
              aging.classification === 'SLOW_MOVING' ||
              aging.agingCategory === 'aging';
            const isAtRisk = aging.classification === 'AT_RISK';

            if (isDeadStock || isSlowMoving || isAtRisk) {
              const capitalTied =
                aging.capitalTiedUp ??
                aging.estimatedTiedCapital ??
                aging.tiedCapital ??
                0;
              deadStockFindings.push({
                productId: prod.id,
                productName: prod.name,
                sku: prod.sku,
                classification:
                  aging.classification || aging.agingCategory || aging.status,
                agingCategory:
                  aging.agingCategory || aging.classification || aging.status,
                severity:
                  aging.severity ??
                  (isDeadStock ? 'CRITICAL' : isSlowMoving ? 'HIGH' : 'MEDIUM'),
                daysSinceLastSale: aging.daysSinceLastSale ?? null,
                neverSold: aging.neverSold ?? aging.daysSinceLastSale === null,
                daysSinceCatalogued: aging.daysSinceCatalogued ?? 0,
                capitalTiedUp: capitalTied,
                estimatedTiedCapital: capitalTied,
                rulesTriggered: aging.rulesTriggered ?? [],
                evidence: aging.evidence ?? {
                  lastSaleDate: aging.evidence?.lastSaleDate ?? null,
                  productCreatedAt: prod.created_at,
                  unitsSoldIn30Days: 0,
                  dailyVelocity: 0,
                  projectedMonthsToClear: null,
                  isSeasonal: false,
                },
                recommendedReviewActions:
                  aging.recommendedReviewActions ??
                  (aging.liquidationGuidance
                    ? [aging.liquidationGuidance]
                    : []),
                liquidationGuidance:
                  aging.liquidationGuidance ||
                  aging.recommendedReviewActions?.[0] ||
                  'Review merchandising and placement',
                actionLabel:
                  aging.actionLabel ||
                  (isDeadStock
                    ? 'Clearance Review'
                    : isSlowMoving
                      ? 'Promotional Review'
                      : 'Monitor Velocity'),
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
        criticalStockoutsCount: stockoutAlerts.filter(
          (a) =>
            a.riskLevel === 'CRITICAL_STOCKOUT' || a.riskLevel === 'CRITICAL'
        ).length,
        imminentRisksCount: stockoutAlerts.filter(
          (a) => a.riskLevel === 'IMMINENT_RISK' || a.riskLevel === 'imminent'
        ).length,
        elevatedRisksCount: stockoutAlerts.filter(
          (a) =>
            a.riskLevel === 'ELEVATED_RISK' ||
            a.riskLevel === 'high' ||
            a.riskLevel === 'HIGH'
        ).length,
        restockDraftsCount: restockDrafts.length,
        criticalRestockCount: restockDrafts.filter(
          (r) => r.urgency === 'critical' || r.urgency === 'CRITICAL'
        ).length,
        highRestockCount: restockDrafts.filter(
          (r) => r.urgency === 'high' || r.urgency === 'HIGH'
        ).length,
        totalEstimatedProcurementCost: restockDrafts.reduce(
          (sum, r) => sum + (r.estimatedProcurementCost || 0),
          0
        ),
        deadStockFindingsCount: deadStockFindings.length,
        deadStockCount: deadStockFindings.filter(
          (f) =>
            f.classification === 'DEAD_STOCK' ||
            f.agingCategory === 'dead_stock' ||
            f.status === 'dead_stock'
        ).length,
        slowMovingCount: deadStockFindings.filter(
          (f) =>
            f.classification === 'SLOW_MOVING' || f.agingCategory === 'aging'
        ).length,
        atRiskStockCount: deadStockFindings.filter(
          (f) => f.classification === 'AT_RISK'
        ).length,
        totalTiedCapital: deadStockFindings.reduce(
          (sum, f) => sum + (f.capitalTiedUp || f.estimatedTiedCapital || 0),
          0
        ),
        activeDemandSkusCount: demandSignals.filter(
          (d) => d.classification === 'ACTIVE_DEMAND'
        ).length,
        zeroDemandSkusCount: demandSignals.filter(
          (d) => d.classification === 'ZERO_DEMAND'
        ).length,
        demandSignalsCount: demandSignals.length,
      },
      stockoutAlerts,
      restockDrafts,
      deadStockFindings,
      demandSignals,
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
