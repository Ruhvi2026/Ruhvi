import { createClient as createJSClient } from '@supabase/supabase-js';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { debitWalletForOrder } from '@/lib/wallet/debit';
import { PostHogClient } from '@/lib/posthog';
import { createAndSendNotification } from '@/lib/notifications/service';

export interface FinalizePaytmResult {
  status: 'paid' | 'failed' | 'pending' | 'not_found';
  order?: any;
  error?: string;
}

export interface FinalizePaytmDetails {
  paytmTransactionId?: string;
  paytmPaymentState?: string;
  bankTxnId?: string;
  rawResponse?: any;
}

export async function finalizePaytmOrder(
  orderIdentifier: string,
  details: FinalizePaytmDetails = {}
): Promise<FinalizePaytmResult> {
  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Match by id or order_number or phonepe/paytm transaction ref
  let query = supabase.from('orders').select('*');
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderIdentifier
    )
  ) {
    query = query.eq('id', orderIdentifier);
  } else {
    query = query.or(
      `order_number.eq.${orderIdentifier},phonepe_merchant_transaction_id.eq.${orderIdentifier}`
    );
  }

  const { data: order, error: lookupError } = await query.maybeSingle();

  if (lookupError) {
    console.error('Failed to look up Paytm order:', lookupError);
    return { status: 'pending', error: 'Failed to look up order' };
  }

  if (!order) {
    return { status: 'not_found' };
  }

  // Idempotency guard — do not double-process an already finalized order
  if (order.payment_status === 'paid') {
    return { status: 'paid', order };
  }

  const paymentState = (
    details.paytmPaymentState || 'TXN_SUCCESS'
  ).toUpperCase();

  if (paymentState === 'TXN_SUCCESS' || paymentState === 'COMPLETED') {
    const update: Record<string, any> = {
      status: 'confirmed',
      payment_status: 'paid',
      updated_at: new Date().toISOString(),
    };

    if (details.paytmTransactionId) {
      update.phonepe_transaction_id = details.paytmTransactionId;
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update(update)
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to mark Paytm order as paid:', updateError);
      return { status: 'pending', error: 'Failed to update order' };
    }

    // PostHog server-side purchase tracking
    try {
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product:products(name)')
        .eq('order_id', order.id);

      PostHogClient()?.capture({
        distinctId: order.user_id || 'anonymous_checkout',
        event: 'purchase_completed',
        properties: {
          order_id: order.id,
          order_number: order.orderNumber || order.order_number,
          total: order.total,
          payment_method: 'paytm',
          is_partial_cod: Boolean(order.cod_balance && order.cod_balance > 0),
          prepaid_amount: order.prepaid_amount || order.total,
          items_count: orderItems?.length || 0,
          product_names: (orderItems || [])
            .map((i: any) => i.product?.name)
            .filter(Boolean),
        },
      });
    } catch (phErr) {
      console.warn('PostHog purchase_completed failed silently:', phErr);
    }

    // Debit wallet if used
    if (order.wallet_used && Number(order.wallet_used) > 0) {
      debitWalletForOrder(
        order.user_id,
        Number(order.wallet_used),
        order.id
      ).catch((err) =>
        console.error('Failed to debit wallet for Paytm order:', err)
      );
    }

    // Lookup shipping address and customer user for notifications
    const { data: address } = order.shipping_address_id
      ? await supabase
          .from('addresses')
          .select('phone, full_name, line1, line2, city, state, pincode')
          .eq('id', order.shipping_address_id)
          .maybeSingle()
      : { data: null };

    const { data: userProfile } = order.user_id
      ? await supabase
          .from('users')
          .select('email, full_name')
          .eq('id', order.user_id)
          .maybeSingle()
      : { data: null };

    const customerPhone = address?.phone;
    const customerName =
      address?.full_name || userProfile?.full_name || 'Valued Customer';
    const customerEmail = userProfile?.email;

    // Send WhatsApp Order Confirmation asynchronously
    if (customerPhone) {
      sendOrderConfirmation(
        order.order_number,
        customerPhone,
        customerName,
        order.total
      ).catch((err) =>
        console.error('Failed to dispatch WhatsApp confirmation:', err)
      );
    }

    // Send Resend confirmation email asynchronously
    if (customerEmail) {
      const { data: items } = await supabase
        .from('order_items')
        .select('quantity, price_at_purchase, product:products(name, images)')
        .eq('order_id', order.id);

      const emailItems = (items || []).map((item: any) => ({
        product: {
          name: item.product?.name || 'Product',
          image:
            item.product?.images?.[0] || 'https://ruhvi.in/placeholder.png',
          unit_price: `₹${Number(item.price_at_purchase).toLocaleString('en-IN')}`,
          total_price: `₹${(Number(item.price_at_purchase) * item.quantity).toLocaleString('en-IN')}`,
        },
        quantity: item.quantity,
      }));

      sendOrderConfirmationEmail(customerEmail, {
        order: {
          number: order.order_number,
          date: new Date(order.created_at).toLocaleDateString(),
          items: emailItems,
        },
        subtotal: `₹${Number(order.subtotal || 0).toLocaleString('en-IN')}`,
        discount: `₹${Number(order.coupon_discount || 0).toLocaleString('en-IN')}`,
        shipping_cost: `₹${Number(order.shipping_charge || 0).toLocaleString('en-IN')}`,
        total: `₹${Number(order.total || 0).toLocaleString('en-IN')}`,
        shipping_address: address
          ? {
              full_name: address.full_name,
              address_line1: address.line1,
              address_line2: address.line2 || '',
              city: address.city,
              state: address.state,
              pincode: address.pincode,
            }
          : undefined,
      }).catch((err) =>
        console.error('Failed to dispatch order confirmation email:', err)
      );
    }

    // In-app Notification
    if (order.user_id) {
      createAndSendNotification({
        userId: order.user_id,
        title: 'Order Confirmed! 🎉',
        message: `Your order #${order.order_number} has been placed successfully via Paytm.`,
        category: 'ORDERS',
        link: `/account/orders/${order.id}`,
      }).catch((err) =>
        console.error('Failed to dispatch in-app notification:', err)
      );
    }

    return { status: 'paid', order };
  } else {
    // Payment failed or cancelled
    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        payment_status: 'failed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', order.id);

    return { status: 'failed', order };
  }
}
