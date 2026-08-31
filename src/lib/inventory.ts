/**
 * Inventory helpers: configurable thresholds + stock status classification.
 * Thresholds are stored in the `settings` table under key
 * `operations_thresholds` (seeded in migration 0073) and fall back to these
 * defaults if the row is missing.
 */

export interface InventoryThresholds {
  low_stock_multiplier: number;
  high_stock_multiplier: number;
  dead_stock_days: number;
  rto_rate_warning_pct: number;
  cost_variance_flag_pct: number;
}

export const DEFAULT_INVENTORY_THRESHOLDS: InventoryThresholds = {
  low_stock_multiplier: 1.0,
  high_stock_multiplier: 5.0,
  dead_stock_days: 60,
  rto_rate_warning_pct: 15,
  cost_variance_flag_pct: 10,
};

export async function getInventoryThresholds(
  supabase: any
): Promise<InventoryThresholds> {
  try {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'operations_thresholds')
      .single();
    const value = data?.value || {};
    return {
      low_stock_multiplier:
        Number(value.low_stock_multiplier) ||
        DEFAULT_INVENTORY_THRESHOLDS.low_stock_multiplier,
      high_stock_multiplier:
        Number(value.high_stock_multiplier) ||
        DEFAULT_INVENTORY_THRESHOLDS.high_stock_multiplier,
      dead_stock_days:
        Number(value.dead_stock_days) ||
        DEFAULT_INVENTORY_THRESHOLDS.dead_stock_days,
      rto_rate_warning_pct:
        Number(value.rto_rate_warning_pct) ||
        DEFAULT_INVENTORY_THRESHOLDS.rto_rate_warning_pct,
      cost_variance_flag_pct:
        Number(value.cost_variance_flag_pct) ||
        DEFAULT_INVENTORY_THRESHOLDS.cost_variance_flag_pct,
    };
  } catch {
    return { ...DEFAULT_INVENTORY_THRESHOLDS };
  }
}

export type StockStatus =
  'in_stock' | 'low_stock' | 'dead_stock' | 'high_stock' | 'out_of_stock';

export interface StockStatusInput {
  stock_quantity: number;
  reorder_point: number;
  recent_stock_out?: boolean;
}

export function computeStockStatus(
  variant: StockStatusInput,
  thresholds: InventoryThresholds
): StockStatus {
  const qty = variant.stock_quantity ?? 0;
  const reorder = variant.reorder_point ?? 5;

  if (qty <= 0) return 'out_of_stock';
  if (qty <= reorder * thresholds.low_stock_multiplier) return 'low_stock';
  if (qty > reorder * thresholds.high_stock_multiplier) return 'high_stock';
  if (variant.recent_stock_out === false) return 'dead_stock';
  return 'in_stock';
}

export const STOCK_STATUS_META: Record<
  StockStatus,
  { label: string; badge: string; dot: string }
> = {
  in_stock: {
    label: 'In Stock',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    dot: 'bg-emerald-500',
  },
  low_stock: {
    label: 'Low Stock',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    dot: 'bg-amber-500',
  },
  dead_stock: {
    label: 'Dead Stock',
    badge: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
    dot: 'bg-slate-500',
  },
  high_stock: {
    label: 'High Stock',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    dot: 'bg-blue-500',
  },
  out_of_stock: {
    label: 'Out of Stock',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    dot: 'bg-rose-500',
  },
};

export const MOVEMENT_TYPE_META: Record<
  string,
  { label: string; badge: string; signed: number }
> = {
  stock_in: {
    label: 'Stock In',
    badge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    signed: 1,
  },
  stock_out: {
    label: 'Stock Out',
    badge: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    signed: -1,
  },
  adjustment: {
    label: 'Adjustment',
    badge: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    signed: 0,
  },
  return: {
    label: 'Return',
    badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    signed: 1,
  },
};
