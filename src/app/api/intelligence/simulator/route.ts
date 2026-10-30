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

/**
 * Safely parses and clamps numeric parameters, preventing NaN propagation.
 */
export function parseNumeric(
  value: any,
  fallback: number,
  min?: number,
  max?: number
): number {
  if (
    value === null ||
    value === undefined ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    let result = fallback;
    if (min !== undefined && result < min) result = min;
    if (max !== undefined && result > max) result = max;
    return result;
  }
  const num = typeof value === 'number' ? value : Number(value);
  let parsed = Number.isFinite(num) ? num : fallback;
  if (min !== undefined && parsed < min) parsed = min;
  if (max !== undefined && parsed > max) parsed = max;
  return parsed;
}

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
        const skuCount = parseNumeric(parameters.skuCount, 25, 1, 1000);
        const averageUnitCost = parseNumeric(
          parameters.averageUnitCost,
          35000,
          100
        );
        const bufferDeltaUnitsPerSku = parseNumeric(
          parameters.bufferDeltaUnitsPerSku,
          3,
          -20,
          50
        );
        const baselineStockoutLossMonthly = parseNumeric(
          parameters.baselineStockoutLossMonthly,
          150000,
          0
        );
        const costOfCapitalAnnualPercent = parseNumeric(
          parameters.costOfCapitalAnnualPercent,
          12,
          1,
          50
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
        const priceAdjustmentPercent = parseNumeric(
          parameters.priceAdjustmentPercent,
          5,
          -50,
          50
        );
        const baselineRevenueMonthly = parseNumeric(
          parameters.baselineRevenueMonthly,
          1500000,
          10000
        );
        const baselineGrossMarginPercent = parseNumeric(
          parameters.baselineGrossMarginPercent,
          40,
          5,
          85
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
        const baselineMonthlyOrders = parseNumeric(
          parameters.baselineMonthlyOrders,
          350,
          1
        );
        const baselineAov = parseNumeric(parameters.baselineAov, 38500, 500);
        const baselineGrossMarginPercent = parseNumeric(
          parameters.baselineGrossMarginPercent,
          38,
          5,
          85
        );
        const discountPercent = parseNumeric(
          parameters.discountPercent,
          10,
          0,
          50
        );
        const expectedConversionLiftPercent = parseNumeric(
          parameters.expectedConversionLiftPercent,
          20,
          0,
          150
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
        const monthlyShipmentVolume = parseNumeric(
          parameters.monthlyShipmentVolume,
          400,
          1
        );
        const baselineCheckoutConversionRate = parseNumeric(
          parameters.baselineCheckoutConversionRate,
          2.5,
          0.1,
          25
        );
        const expressCourierSurchargePerShipment = parseNumeric(
          parameters.expressCourierSurchargePerShipment,
          150,
          0,
          2000
        );
        const averageOrderGrossProfit = parseNumeric(
          parameters.averageOrderGrossProfit,
          6500,
          100
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
