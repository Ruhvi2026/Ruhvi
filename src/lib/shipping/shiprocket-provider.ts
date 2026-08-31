import {
  ShippingProvider,
  CreateShipmentInput,
  CreateShipmentResult,
  TrackingStatus,
} from './provider';
import { createCustomOrder, generateAWB, getShiprocketToken } from '@/lib/shiprocket';

// ---------------------------------------------------------------------------
// ShiprocketProvider — wraps the existing Shiprocket client
// (src/lib/shiprocket.ts) behind the ShippingProvider interface. The original
// client functions are untouched; this adapter only adapts the payload shape.
//
// Tracking link format used by the existing live code:
// https://shiprocket.co/tracking/{awb} — preserved.
// ---------------------------------------------------------------------------

export class ShiprocketProvider implements ShippingProvider {
  readonly name = 'shiprocket';

  async createShipment(input: CreateShipmentInput): Promise<CreateShipmentResult> {
    const srOrder = await createCustomOrder({
      order_id: input.orderNumber,
      order_date: new Date(input.orderDate).toISOString().split('T')[0],
      pickup_location: 'Primary',
      billing_customer_name: input.address.full_name,
      billing_last_name: '',
      billing_address: input.address.line1,
      billing_address_2: input.address.line2 || '',
      billing_city: input.address.city,
      billing_pincode: input.address.pincode,
      billing_state: input.address.state,
      billing_country: input.address.country || 'India',
      billing_email: input.address.email || 'customer@example.com',
      billing_phone: input.address.phone || '9999999999',
      shipping_is_billing: true,
      order_items: input.items.map((item) => ({
        name: item.name,
        sku: item.sku,
        units: item.quantity,
        selling_price: item.unit_price,
        discount: 0,
        tax: 0,
        hsn: 71131930,
      })),
      payment_method: input.paymentMethod === 'cod' ? 'COD' : 'Prepaid',
      sub_total: input.subtotal,
      length: 15,
      breadth: 15,
      height: 10,
      weight: 0.5,
    });

    if (!srOrder || !srOrder.shipment_id) {
      return { ok: false, error: 'Shiprocket returned no shipment_id' };
    }

    const awbResult = await generateAWB(srOrder.shipment_id);
    const awbData = awbResult?.response?.data;
    if (!awbData || !awbData.awb_code) {
      return { ok: false, error: 'Failed to obtain AWB code from Shiprocket' };
    }

    return {
      ok: true,
      awb_number: awbData.awb_code,
      courier_name: awbData.courier_name,
      tracking_url: `https://shiprocket.co/tracking/${awbData.awb_code}`,
      provider: this.name,
    };
  }

  async getTrackingStatus(awbNumber: string): Promise<TrackingStatus> {
    // The existing live integration stores tracking via the Shiprocket webhook
    // (src/app/api/webhooks/shiprocket) + tracking_updates table. Polling the
    // Shiprocket tracking API requires additional API surface not configured in
    // the current account setup; return pending so the webhook remains the
    // source of truth, matching current production behaviour.
    void getShiprocketToken;
    void awbNumber;
    return { status: 'pending' };
  }

  async cancelShipment(awbNumber: string): Promise<{ ok: boolean; error?: string }> {
    // The live codebase has no Shiprocket cancellation call today; keeping this
    // a no-op stub until a cancellation endpoint is confirmed in the account.
    void awbNumber;
    return { ok: false, error: 'Shiprocket cancellation is not configured in this integration' };
  }
}
