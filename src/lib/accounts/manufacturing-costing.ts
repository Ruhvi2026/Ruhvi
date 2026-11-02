import type { SkuCogsBreakdown } from './types';

export interface SkuCostingInput {
  sku: string;
  metalPurity: '22K' | '18K' | '14K' | '925 Silver';
  grossWeightGrams: number;
  netWeightGrams?: number;
  stoneWeightGrams?: number;
  stoneCost?: number;
  liveGold24kRatePerGram?: number; // Base 24K gold rate (defaults to market ~7800)
  liveSilverRatePerGram?: number; // Base silver rate (defaults to market ~95)
  makingChargeType?: 'percentage' | 'per_gram' | 'fixed';
  makingChargeValue?: number; // e.g. 12% or 450/gram
  wastagePercentage?: number; // e.g. 2.5%
  packagingCost?: number; // defaults to luxury packaging ~300
  targetSellingPrice: number;
}

export const PURITY_FACTORS: Record<string, number> = {
  '22K': 0.916,
  '18K': 0.75,
  '14K': 0.585,
  '925 Silver': 0.925,
};

export const STANDARD_BIS_HALLMARKING_FEE = 45; // INR per article

/**
 * Computes granular manufacturing COGS and margin for a fine jewelry SKU
 */
export function computeSkuCogs(input: SkuCostingInput): SkuCogsBreakdown {
  const netWeight =
    input.netWeightGrams ??
    input.grossWeightGrams - (input.stoneWeightGrams || 0);

  // 1. Determine effective metal rate per gram
  const isSilver = input.metalPurity === '925 Silver';
  const baseRate = isSilver
    ? input.liveSilverRatePerGram || 95
    : input.liveGold24kRatePerGram || 7800;

  const purityFactor = PURITY_FACTORS[input.metalPurity] || 0.916;
  const effectiveMetalRate = Math.round(baseRate * purityFactor * 100) / 100;

  // 2. Raw metal cost + wastage
  const baseMetalCost = Math.round(netWeight * effectiveMetalRate * 100) / 100;
  const wastagePct = input.wastagePercentage ?? 2.5;
  const wastageCost =
    Math.round(((baseMetalCost * wastagePct) / 100) * 100) / 100;
  const totalMetalCost = Math.round((baseMetalCost + wastageCost) * 100) / 100;

  // 3. Making charges
  const makingType = input.makingChargeType || 'percentage';
  const makingVal = input.makingChargeValue ?? 12; // default 12%

  let makingCharges = 0;
  let makingChargesPercentage = 0;

  if (makingType === 'percentage') {
    makingCharges = Math.round(((baseMetalCost * makingVal) / 100) * 100) / 100;
    makingChargesPercentage = makingVal;
  } else if (makingType === 'per_gram') {
    makingCharges = Math.round(netWeight * makingVal * 100) / 100;
    makingChargesPercentage =
      baseMetalCost > 0
        ? Math.round((makingCharges / baseMetalCost) * 1000) / 10
        : 0;
  } else {
    makingCharges = makingVal;
    makingChargesPercentage =
      baseMetalCost > 0
        ? Math.round((makingCharges / baseMetalCost) * 1000) / 10
        : 0;
  }

  // 4. Hallmarking & Packaging
  const hallmarkingCost = STANDARD_BIS_HALLMARKING_FEE;
  const packagingCost = input.packagingCost ?? 300; // Luxury box + velvet pouch + warranty card
  const stoneCost = input.stoneCost || 0;

  // 5. Total COGS
  const totalCogs =
    Math.round(
      (totalMetalCost +
        makingCharges +
        hallmarkingCost +
        packagingCost +
        stoneCost) *
        100
    ) / 100;

  // 6. Gross margin against target selling price
  const grossMarginAmount =
    Math.round((input.targetSellingPrice - totalCogs) * 100) / 100;
  const grossMarginPercentage =
    input.targetSellingPrice > 0
      ? Math.round((grossMarginAmount / input.targetSellingPrice) * 1000) / 10
      : 0;

  return {
    sku: input.sku,
    metalPurity: input.metalPurity,
    grossWeightGrams: input.grossWeightGrams,
    netWeightGrams: netWeight,
    liveGoldRatePerGram: effectiveMetalRate,
    metalCost: totalMetalCost,
    makingCharges,
    makingChargesPercentage,
    hallmarkingCost,
    packagingCost,
    totalCogs,
    targetSellingPrice: input.targetSellingPrice,
    grossMarginAmount,
    grossMarginPercentage,
  };
}

/**
 * Calculates aggregate order COGS and total production margin
 */
export function calculateOrderBatchCogs(items: SkuCostingInput[]): {
  totalOrderCogs: number;
  totalSellingPrice: number;
  totalGrossMargin: number;
  overallMarginPercentage: number;
  skuBreakdowns: SkuCogsBreakdown[];
} {
  const breakdowns = items.map(computeSkuCogs);

  const totalOrderCogs =
    Math.round(breakdowns.reduce((sum, b) => sum + b.totalCogs, 0) * 100) / 100;
  const totalSellingPrice =
    Math.round(
      breakdowns.reduce((sum, b) => sum + b.targetSellingPrice, 0) * 100
    ) / 100;
  const totalGrossMargin =
    Math.round((totalSellingPrice - totalOrderCogs) * 100) / 100;
  const overallMarginPercentage =
    totalSellingPrice > 0
      ? Math.round((totalGrossMargin / totalSellingPrice) * 1000) / 10
      : 0;

  return {
    totalOrderCogs,
    totalSellingPrice,
    totalGrossMargin,
    overallMarginPercentage,
    skuBreakdowns: breakdowns,
  };
}
