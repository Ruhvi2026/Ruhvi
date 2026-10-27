import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  modelInventoryBufferOptimization,
  modelTieredPricingElasticity,
  modelPromotionalCampaignStructure,
  modelExpeditedDeliveryPromise,
  SIMULATION_SANDBOX_DISCLAIMER,
  type CounterfactualDecisionType,
  type CounterfactualEvaluationResult,
} from '@/lib/intelligence/counterfactual-models';

export const dynamic = 'force-dynamic';

export interface SimulatorExecutionRequest {
  decisionType: CounterfactualDecisionType;
  parameters: Record<string, any>;
}

export interface SimulatorExecutionResponse {
  success: boolean;
  data?: CounterfactualEvaluationResult & {
    disclaimer: string;
    executedBy: string;
    isReadOnlySandbox: true;
  };
  error?: string;
}

export async function POST(req: NextRequest) {
  try {
    // 1. RBAC Guard: Admin or staff authorization required
    const auth = await requireAdmin();
    if (!auth.ok || !auth.role) {
      return NextResponse.json(
        { success: false, error: auth.error || 'Unauthorized' },
        { status: auth.status || 401 }
      );
    }

    const body = (await req.json()) as SimulatorExecutionRequest;
    if (!body || !body.decisionType) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: decisionType' },
        { status: 400 }
      );
    }

    const { decisionType, parameters = {} } = body;
    let result: CounterfactualEvaluationResult;

    // 2. Dispatch to deterministic counterfactual model with input validation
    switch (decisionType) {
      case 'inventory_buffer_optimization': {
        const skuCount = Math.max(
          1,
          Math.min(1000, Number(parameters.skuCount) || 25)
        );
        const averageUnitCost = Math.max(
          100,
          Number(parameters.averageUnitCost) || 35000
        );
        const bufferDeltaUnitsPerSku = Math.max(
          -20,
          Math.min(50, Number(parameters.bufferDeltaUnitsPerSku) ?? 3)
        );
        const baselineStockoutLossMonthly = Math.max(
          0,
          Number(parameters.baselineStockoutLossMonthly) || 150000
        );
        const costOfCapitalAnnualPercent = Math.max(
          1,
          Math.min(50, Number(parameters.costOfCapitalAnnualPercent) || 12)
        );

        result = modelInventoryBufferOptimization({
          skuCount,
          averageUnitCost,
          bufferDeltaUnitsPerSku,
          baselineStockoutLossMonthly,
          costOfCapitalAnnualPercent,
        });
        break;
      }

      case 'tiered_pricing_elasticity': {
        const priceTier = [
          'entry_level',
          'mid_tier',
          'luxury_high_ticket',
        ].includes(parameters.priceTier)
          ? (parameters.priceTier as
              'entry_level' | 'mid_tier' | 'luxury_high_ticket')
          : 'luxury_high_ticket';
        const priceAdjustmentPercent = Math.max(
          -50,
          Math.min(50, Number(parameters.priceAdjustmentPercent) ?? 5)
        );
        const baselineRevenueMonthly = Math.max(
          10000,
          Number(parameters.baselineRevenueMonthly) || 1500000
        );
        const baselineGrossMarginPercent = Math.max(
          5,
          Math.min(85, Number(parameters.baselineGrossMarginPercent) || 40)
        );

        result = modelTieredPricingElasticity({
          priceTier,
          priceAdjustmentPercent,
          baselineRevenueMonthly,
          baselineGrossMarginPercent,
        });
        break;
      }

      case 'promotional_campaign_structure': {
        const baselineMonthlyOrders = Math.max(
          1,
          Number(parameters.baselineMonthlyOrders) || 350
        );
        const baselineAov = Math.max(
          500,
          Number(parameters.baselineAov) || 38500
        );
        const baselineGrossMarginPercent = Math.max(
          5,
          Math.min(85, Number(parameters.baselineGrossMarginPercent) || 38)
        );
        const discountPercent = Math.max(
          0,
          Math.min(50, Number(parameters.discountPercent) ?? 10)
        );
        const expectedConversionLiftPercent = Math.max(
          0,
          Math.min(150, Number(parameters.expectedConversionLiftPercent) ?? 20)
        );

        result = modelPromotionalCampaignStructure({
          baselineMonthlyOrders,
          baselineAov,
          baselineGrossMarginPercent,
          discountPercent,
          expectedConversionLiftPercent,
        });
        break;
      }

      case 'expedited_delivery_promise': {
        const monthlyShipmentVolume = Math.max(
          1,
          Number(parameters.monthlyShipmentVolume) || 400
        );
        const baselineCheckoutConversionRate = Math.max(
          0.1,
          Math.min(25, Number(parameters.baselineCheckoutConversionRate) || 2.5)
        );
        const expressCourierSurchargePerShipment = Math.max(
          0,
          Math.min(
            2000,
            Number(parameters.expressCourierSurchargePerShipment) ?? 150
          )
        );
        const averageOrderGrossProfit = Math.max(
          100,
          Number(parameters.averageOrderGrossProfit) || 6500
        );

        result = modelExpeditedDeliveryPromise({
          monthlyShipmentVolume,
          baselineCheckoutConversionRate,
          expressCourierSurchargePerShipment,
          averageOrderGrossProfit,
        });
        break;
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unsupported decision simulation type: ${decisionType}`,
          },
          { status: 400 }
        );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          ...result,
          disclaimer: SIMULATION_SANDBOX_DISCLAIMER,
          executedBy: auth.role,
          isReadOnlySandbox: true,
        },
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || 'Internal simulator execution error',
      },
      { status: 500 }
    );
  }
}
