export interface DailyTrafficPoint {
  date: string;
  views: number;
  visitors: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  conversion: number;
}

export interface EventCount {
  event: string;
  count: number;
}

export interface SignupMethodCount {
  method: string;
  count: number;
}

export interface TopPage {
  path: string;
  views: number;
  unique: number;
}

export interface ProductPerformance {
  product_id: string;
  name: string;
  viewed: number;
  added_to_cart: number;
  view_to_cart_pct: number;
}

export interface SessionRecording {
  id: string;
  url: string;
  duration: number;
  recorded_at: string;
}

export interface TrafficSource {
  source: string;
  count: number;
}

export interface MarketingKpis {
  conversionRate: number;
  addToCartRate: number;
  checkoutRate: number;
}
