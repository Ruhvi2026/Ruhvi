export type UserRole = 'customer' | 'staff' | 'manager' | 'admin';
export type ProductStatus = 'active' | 'hidden' | 'out_of_stock';
export type ImageType = 'model' | 'still' | 'zoom' | '360';
export type OrderStatus =
  'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'phonepe' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type CoinLedgerType = 'earned' | 'redeemed' | 'expired' | 'cashback';
export type WalletLedgerType = 'credit' | 'debit' | 'cashback';
export type ReferralStatus = 'pending' | 'completed' | 'expired';
export type ReturnStatus = 'requested' | 'approved' | 'rejected' | 'completed';

export interface User {
  id: string;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: UserRole;
  wallet_balance: number;
  reward_coins: number;
  referral_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface Collection {
  id: string;
  title: string;
  slug: string;
  subtitle?: string | null;
  image_url?: string | null;
  created_at?: string;
}

export interface ProductCollection {
  product_id: string;
  collection_id: string;
  created_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  type: ImageType;
  sort_order: number;
  alt?: string | null;
  created_at?: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  slug: string;
  description?: string | null;
  category_id?: string | null;
  price: number;
  mrp: number;
  gst_rate: number;
  stock_quantity: number;
  low_stock_threshold: number;
  status: ProductStatus;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  created_at?: string;
  updated_at?: string;
  seo_metadata?: Record<string, any> | null;
  ai_content?: Record<string, any> | null;
  category?: Category | null;
  images?: ProductImage[];
  viewer360?: Product360Set | null;
}

export interface StockNotification {
  id: string;
  product_id: string;
  email: string;
  created_at?: string;
}

export interface Address {
  id: string;
  user_id: string;
  label?: string;
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  is_default: boolean;
  created_at?: string;
}

export interface Cart {
  id: string;
  user_id: string;
  created_at?: string;
  updated_at?: string;
}

export interface CartItem {
  id: string;
  cart_id: string;
  product_id: string;
  quantity: number;
  price_at_add: number;
  created_at?: string;
  product?: Product;
}

export interface Order {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal: number;
  shipping_charge: number;
  cod_charge: number;
  coupon_discount: number;
  wallet_used: number;
  coins_redeemed: number;
  gst_amount: number;
  total: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  gift_wrap: boolean;
  gift_message?: string | null;
  shipping_address_id?: string | null;
  phonepe_merchant_transaction_id?: string | null;
  phonepe_transaction_id?: string | null;
  phonepe_payment_state?: string | null;
  prepaid_amount?: number;
  cod_balance?: number;
  created_at?: string;
  updated_at?: string;
  shipping_address?: Address | null;
  order_items?: OrderItem[];
  shiprocket_order_id?: string | null;
  shiprocket_shipment_id?: string | null;
  awb_code?: string | null;
  courier_name?: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id?: string | null;
  sku: string;
  quantity: number;
  price_at_purchase: number;
  created_at?: string;
  product?: Product;
}

export interface AppNotification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  link?: string;
  created_at: string;
}

export interface ReturnRequest {
  id: string;
  order_id: string;
  order_number?: string;
  reason: string;
  item_condition?: string;
  status: ReturnStatus;
  refund_method: string;
  comments?: string;
  requested_at: string;
  resolved_at?: string;
  order?: Order | null;
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'flat' | 'percentage';
  discount_value: number;
  min_order_value: number;
  usage_limit_total: number | null;
  usage_limit_per_user: number | null;
  applicable_to: string;
  expiry_date: string | null;
  cod_charge_waiver: boolean;
  active: boolean;
  created_at?: string;
}

export interface WalletLedger {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  type: WalletLedgerType;
  created_at?: string;
}

export interface RewardCoinLedger {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  type: CoinLedgerType;
  expiry_date: string | null;
  created_at?: string;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  status: ReferralStatus;
  coins_awarded: number;
  created_at?: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content: string;
  cover_image?: string | null;
  is_published: boolean;
  published_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Testimonial {
  id: string;
  user_id?: string | null;
  customer_name: string;
  rating: number;
  review_text: string;
  video_url?: string | null;
  is_verified_purchase: boolean;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Subscriber {
  id: string;
  email?: string | null;
  phone?: string | null;
  opted_in_whatsapp: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  ip_address?: string | null;
  details?: Record<string, any> | null;
  created_at: string;
}

export interface Setting {
  id: string;
  key: string;
  value: Record<string, any> | any[];
  updated_at: string;
}

export interface AILog {
  id: string;
  provider: string;
  model: string;
  feature: string;
  tokens_used: number;
  estimated_cost: number;
  status: 'success' | 'failed';
  error_message?: string;
  created_at: string;
}

export interface AIPromptVersion {
  id: string;
  feature_key: string;
  prompt_text: string;
  created_at: string;
}

export interface Product360Frame {
  index: number;
  url: string;
  publicId?: string;
  alt?: string;
}

export interface Product360Config {
  enabled: boolean;
  frames: Product360Frame[];
  stepDegrees?: number;
}

export interface Product360Set {
  id: string;
  product_id: string;
  enabled: boolean;
  frame_count: number;
  step_degrees?: number | null;
  frames: Product360Frame[];
  created_at?: string;
  updated_at?: string;
}
