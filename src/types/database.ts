export type UserRole = 'customer' | 'staff' | 'manager' | 'admin';
export type ProductStatus = 'active' | 'hidden' | 'out_of_stock';
export type ImageType = 'model' | 'still' | 'zoom' | '360';
export type OrderStatus = 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' | 'returned';
export type PaymentMethod = 'razorpay' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string | null;
  created_at?: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  type: ImageType;
  sort_order: number;
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
  // Included relations
  category?: Category | null;
  images?: ProductImage[];
}

export interface StockNotification {
  id: string;
  product_id: string;
  email: string;
  created_at?: string;
}
