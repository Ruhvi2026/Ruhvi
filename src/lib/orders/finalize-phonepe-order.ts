import { createClient as createJSClient } from '@supabase/supabase-js';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { debitWalletForOrder } from '@/lib/wallet/debit';

export interface FinalizePhonePeResult {
  status: 'paid' | 'failed' | 'pending' | 'not_found';
  order?: any;
  error?: string;
}

export interface FinalizePhonePeDetails {
  phonepeTransactionId?: string;
  phonepePaymentState?: string;
}

export const PAYED_STATES = [
  'COMPLETED',
  'SUCCESS',
  'PAYMENT_SUCCESS',
  'AUTHORIZATION_SUCCESSFUL',
];
export const FAILED_STATES = [
  'FAILED',
  'REJECTED',
  'TIMED_OUT',
  'PAYMENT_ERROR',
  'PAYMENT_FAILED',
  'CANCELLED',
];

export async function finalizePhonePeOrder(
  merchantTransactionId: string,
  details: FinalizePhonePeDetails = {}
): Promise<FinalizePhonePeResult> {
  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: order, error: lookupError } = await supabase
    .from('orders')
    .select('*')
    .eq('phonepe_merchant_transaction_id', merchantTransactionId)
    .maybeSingle();

  if (lookupError) {
    console.error('Failed to look up PhonePe order:', lookupError);
    return { status: 'pending', error: 'Failed to look up order' };
  }

  if (!order) {
    return { status: 'not_found' };
  }

  // Idempotency guard — don't re-process an already finalized order
  if (order.payment_status === 'paid') {
    return { status: 'paid', order };
  }

  const state = (
    details.phonepePaymentState ||
    order.phonepe_payment_state ||
    ''
  ).toUpperCase();

  if (PAYED_STATES.includes(state)) {
    const update: Record<string, any> = {
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    };
    if (details.phonepeTransactionId) {
      update.phonepe_transaction_id = details.phonepeTransactionId;
    }
    if (details.phonepePaymentState) {
      update.phonepe_payment_state = details.phonepePaymentState;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to mark PhonePe order as paid:', updateError);
      return { status: 'pending', error: 'Failed to update order' };
    }

    // Redeem wallet balance used on this order (PhonePe & partial-COD orders
    // that were pre-created as pending). Idempotent per order_id.
    const walletUsed = Number(order.wallet_used) || 0;
    if (walletUsed > 0) {
      try {
        await debitWalletForOrder(order.user_id, walletUsed, order.id);
      } catch (walletErr: any) {
        console.error(
          `Failed to redeem wallet for order ${order.order_number}:`,
          walletErr
        );
      }
    }

    // Fire confirmation notifications (WhatsApp + email) asynchronously
    sendOrderNotifications(supabase, { ...order, ...update }).catch((err) =>
      console.error('Failed to send order notifications:', err)
    );

    return { status: 'paid', order: { ...order, ...update } };
  }

  if (FAILED_STATES.includes(state)) {
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status: 'failed',
        phonepe_payment_state: details.phonepePaymentState || state,
        phonepe_transaction_id: details.phonepeTransactionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to mark PhonePe order as failed:', updateError);
    }

    return { status: 'failed', order };
  }

  // PENDING / unknown — leave the order as pending; webhook or status check will complete it
  return { status: 'pending', order };
}

async function sendOrderNotifications(supabase: any, order: any) {
  const [userResult, addressResult, itemsResult] = await Promise.all([
    supabase
      .from('users')
      .select('email, phone, full_name')
      .eq('id', order.user_id)
      .maybeSingle(),
    order.shipping_address_id
      ? supabase
          .from('addresses')
          .select('*')
          .eq('id', order.shipping_address_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from('order_items')
      .select(
        'quantity, price_at_purchase, sku, product_id, product:products(id, name, sku, images:product_images(url, type, sort_order))'
      )
      .eq('order_id', order.id),
  ]);

  const user = userResult.data || {};
  const address = addressResult?.data || null;
  const items = itemsResult.data || [];

  const orderNumber = order.order_number;
  const total = Number(order.total) || 0;
  const customerName =
    address?.full_name || user.full_name || 'Valued Customer';

  if (address?.phone) {
    sendOrderConfirmation(
      orderNumber,
      address.phone,
      customerName,
      total
    ).catch((err) =>
      console.error('Failed to send WhatsApp confirmation:', err)
    );
  }

  if (user.email) {
    const gstAmount = Math.round((Number(order.subtotal) || 0) * 0.03);
    const emailData = {
      order: {
        number: orderNumber,
        date: new Date(order.created_at || Date.now()).toLocaleDateString(),
        items: items.map((item: any) => {
          const image =
            item.product?.images?.find((img: any) => img.type === 'model')
              ?.url ||
            item.product?.images?.[0]?.url ||
            'https://ruhvi.in/placeholder.png';
          return {
            product: {
              name: item.product?.name || 'Product',
              image,
              variant: item.product?.variant || '',
              quantity: item.quantity,
              unit_price: `₹${Number(item.price_at_purchase).toLocaleString('en-IN')}`,
              total_price: `₹${(
                Number(item.price_at_purchase) * item.quantity
              ).toLocaleString('en-IN')}`,
            },
          };
        }),
      },
      subtotal: `₹${Number(order.subtotal || 0).toLocaleString('en-IN')}`,
      discount: `₹${Number(order.coupon_discount || 0).toLocaleString('en-IN')}`,
      shipping_cost: `₹${Number(order.shipping_charge || 0).toLocaleString('en-IN')}`,
      tax: `₹${gstAmount.toLocaleString('en-IN')}`,
      total: `₹${total.toLocaleString('en-IN')}`,
      shipping: {
        name: customerName,
        address: address?.line1 || '',
        city: address?.city || '',
        state: address?.state || '',
        postal_code: address?.pincode || '',
        country: 'India',
        phone: address?.phone || '',
      },
      payment: {
        method:
          order.payment_method === 'cod'
            ? 'Cash on Delivery'
            : 'Online Payment (PhonePe)',
        status:
          order.payment_method === 'cod' && Number(order.cod_balance) > 0
            ? 'Partially Paid — balance payable on delivery'
            : order.payment_status === 'paid'
              ? 'Paid'
              : 'Pending (COD)',
        transaction_id: order.phonepe_transaction_id || orderNumber,
      },
      order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/orders`,
      support_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/contact`,
    };

    sendOrderConfirmationEmail(user.email, emailData).catch((err) =>
      console.error('Failed to send Email confirmation:', err)
    );
  }
}
