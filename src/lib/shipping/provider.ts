import { getServiceClient } from '@/lib/supabase/service';

// ---------------------------------------------------------------------------
// Courier / shipping provider abstraction (Phase 3).
//
// The live integration is Shiprocket. This layer defines a common interface so
// Delhivery, ExpressBees, etc. can be added later by writing one adapter and
// flipping `courier_providers.is_active` — no order-logic rewrite.
//
// The existing Shiprocket client (`src/lib/shiprocket.ts`) is preserved and
// wrapped, not replaced. Provider credentials stay in env vars exactly as today.
// ---------------------------------------------------------------------------

export interface ShipmentAddress {
  full_name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pincode: string;
  email?: string;
  country?: string;
}

export interface ShipmentLineItem {
  product_id?: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
}

export interface CreateShipmentInput {
  orderId: string;
  orderNumber: string;
  orderDate: string;
  address: ShipmentAddress;
  items: ShipmentLineItem[];
  paymentMethod: string;
  subtotal: number;
  provider?: string; // optional; defaults to active provider
}

export interface CreateShipmentResult {
  ok: boolean;
  awb_number?: string;
  tracking_url?: string;
  courier_name?: string;
  provider?: string;
  error?: string;
}

export interface TrackingStatus {
  status: string; // normalized: pending | shipped | in_transit | out_for_delivery | delivered | delivery_failed | rto
  last_attempt_result?: string;
  location?: string;
}

export interface ShippingProvider {
  name: string;
  createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult>;
  getTrackingStatus(awbNumber: string): Promise<TrackingStatus>;
  cancelShipment(awbNumber: string): Promise<{ ok: boolean; error?: string }>;
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  return createJSClient(url, key);
}

/**
 * Return the active courier provider name (from courier_providers.is_active),
 * falling back to 'shiprocket' if the table is not reachable (pre-migration).
 */
export async function getActiveCourierProvider(): Promise<string> {
  try {
    const supabase = getServiceClient();
    const { data } = await supabase
      .from('courier_providers')
      .select('name')
      .eq('is_active', true)
      .order('priority', { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.name || 'shiprocket';
  } catch {
    return 'shiprocket';
  }
}

const providerRegistry: Record<string, () => Promise<ShippingProvider>> = {};

export function registerProvider(name: string, factory: () => Promise<ShippingProvider>) {
  providerRegistry[name.toLowerCase()] = factory;
}

/** Get the provider instance for the given (or active) provider name. */
export async function getShippingProvider(provider?: string): Promise<ShippingProvider> {
  const name = (provider || (await getActiveCourierProvider())).toLowerCase();
  const factory = providerRegistry[name];
  if (!factory) {
    throw new Error(`No shipping provider registered for: ${name}`);
  }
  return factory();
}
