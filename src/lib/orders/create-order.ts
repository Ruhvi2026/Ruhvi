import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createJSClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/auth/server';
import { assertWalletBalance, debitWalletForOrder } from '@/lib/wallet/debit';

export class OrderError extends Error {
  status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'OrderError';
    this.status = status;
  }
}

export interface OrderPayload {
  items: any[];
  address: any;
  paymentMethod: string;
  giftWrap?: boolean;
  giftMessage?: string;
  subtotal: number;
  shippingCharge: number;
  codCharge: number;
  total: number;
  wallet_used?: number;
  coins_redeemed?: number;
  coupon_discount?: number;
  phonepe_merchant_transaction_id?: string;
  phonepe_transaction_id?: string;
  phonepe_payment_state?: string;
  paytm_order_id?: string;
  paytm_transaction_id?: string;
  paytm_payment_state?: string;
  isPartialCod?: boolean;
  prepaidAmount?: number;
  include_vip_membership?: boolean;
}

export interface CreateOrderOptions {
  status?: string;
  paymentStatus?: string;
}

export interface CreatedOrder {
  orderId: string;
  orderNumber: string;
  gstAmount: number;
  user: any;
  newOrder: any;
}

export async function createOrder(
  payload: OrderPayload,
  options: CreateOrderOptions = {}
): Promise<CreatedOrder> {
  const {
    items,
    address,
    paymentMethod,
    giftWrap,
    giftMessage,
    shippingCharge,
    codCharge,
    wallet_used,
    coins_redeemed,
    coupon_discount,
    phonepe_merchant_transaction_id,
    phonepe_transaction_id,
    phonepe_payment_state,
    isPartialCod,
    prepaidAmount,
  } = payload;

  if (!items || items.length === 0) {
    throw new OrderError('Cart is empty', 400);
  }

  if (!address) {
    throw new OrderError('Shipping address is required', 400);
  }

  let supabase = await createServerClient();
  let { user } = await getServerUser();

  // Disable COD for guest accounts
  if (paymentMethod === 'cod' && !user) {
    throw new OrderError(
      'Cash on Delivery (COD) is available only for logged-in accounts. Please log in or select an online payment method.',
      403
    );
  }

  // Server-side COD eligibility check (idempotent, fails open when no record).
  if (paymentMethod === 'cod' && user) {
    const { getCodEligibility } = await import('@/lib/orders/cod');
    const eligibility = await getCodEligibility(user.id as string);
    if (eligibility.cod_disabled) {
      throw new OrderError(
        'Cash on Delivery is currently unavailable for your account. Please use an online payment method.',
        403
      );
    }
  }

  // Server-side enforcement of checkout verification (Section 17)
  if (user) {
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('phone_verified, email_verified, email')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile) {
      throw new OrderError(
        'Failed to fetch user profile verification status.',
        500
      );
    }

    if (!userProfile.phone_verified) {
      throw new OrderError(
        'Mobile number verification is required before placing an order.',
        403
      );
    }

    if (userProfile.email && !userProfile.email_verified) {
      throw new OrderError(
        'Email verification is required before placing an order.',
        403
      );
    }
  }

  // If no authenticated user (for online payment), create a temporary guest user so the order saves to Supabase
  if (!user) {
    console.log(
      'No authenticated user found. Creating guest session for online order...'
    );
    const guestEmail = `guest_${Date.now()}_${Math.floor(Math.random() * 1000)}@ruhvi.com`;
    const guestPassword = `Guest!${Date.now()}`;

    // We must use a separate JS client to establish the session in memory without touching cookies
    supabase = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { getAdminAuth } = await import('@/lib/firebase-admin');

    let fbUser;
    try {
      const adminAuth = getAdminAuth();
      fbUser = await adminAuth.createUser({
        email: guestEmail,
        password: guestPassword,
        displayName: address.firstName
          ? `${address.firstName} ${address.lastName}`
          : 'Guest User',
      });
    } catch (err: any) {
      console.error('Failed to create guest user in Firebase:', err);
      throw new OrderError('Failed to initiate guest checkout.', 500);
    }

    // Sync guest to public.users + customer_identities via canonical RPC
    const adminSupabase = createJSClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: resolvedId, error: resolveErr } = await adminSupabase.rpc(
      'resolve_customer_identity',
      {
        p_firebase_uid: fbUser.uid,
        p_provider: 'password',
        p_provider_identifier: fbUser.email,
        p_email: fbUser.email,
        p_email_verified: false,
        p_phone: null,
        p_phone_verified: false,
        p_name: fbUser.displayName,
      }
    );

    if (resolveErr || !resolvedId) {
      console.error(
        'Failed to resolve guest identity:',
        resolveErr || 'No ID returned'
      );
      throw new OrderError('Failed to initiate guest checkout.', 500);
    }

    user = { id: resolvedId, email: fbUser.email } as any;
  }

  // -------------------------------------------------------------------------
  // Authoritative Server-Side Product Price & Subtotal Verification
  // -------------------------------------------------------------------------
  const productIds = items
    .map((item: any) => item.product?.id || item.product_id)
    .filter(Boolean);

  if (productIds.length !== items.length) {
    throw new OrderError('Invalid cart item: missing product identifier', 400);
  }

  const adminSupabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://igrkrkxdantrolbldapj.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: dbProducts, error: dbProdError } = await adminSupabase
    .from('products')
    .select('id, name, sku, price, status')
    .in('id', productIds);

  if (dbProdError || !dbProducts || dbProducts.length === 0) {
    console.error(
      'Failed to query products for order validation:',
      dbProdError
    );
    throw new OrderError('Failed to verify products in cart', 500);
  }

  const dbProductMap = new Map(dbProducts.map((p) => [p.id, p]));

  let verifiedSubtotal = 0;
  for (const item of items) {
    const pid = item.product?.id || item.product_id;
    const dbProd = dbProductMap.get(pid);
    if (!dbProd) {
      throw new OrderError(
        'One or more products in your cart are no longer available.',
        400
      );
    }
    const qty = Number(item.quantity);
    if (!qty || qty <= 0 || !Number.isInteger(qty)) {
      throw new OrderError(`Invalid quantity for product ${dbProd.name}`, 400);
    }
    const realPrice = Number(dbProd.price);
    verifiedSubtotal += realPrice * qty;
  }

  // Authoritative server-calculated pricing
  const finalSubtotal = verifiedSubtotal;
  const includeVipMembership = Boolean(payload.include_vip_membership);
  const verifiedPriveMembershipFee = includeVipMembership ? 500 : 0;
  let verifiedShippingCharge = Math.max(0, Number(shippingCharge || 0));
  let verifiedCodCharge = Math.max(0, Number(codCharge || 0));
  let isServerVip = false;

  // Authoritative server-side VIP rule enforcement
  if (user) {
    const { data: vipUser } = await adminSupabase
      .from('users')
      .select('is_vip, vip_expires_at')
      .eq('id', user.id)
      .maybeSingle();

    isServerVip =
      Boolean(vipUser?.is_vip) &&
      Boolean(
        !vipUser?.vip_expires_at ||
        new Date(vipUser.vip_expires_at).getTime() > Date.now()
      );

    if (isServerVip || includeVipMembership) {
      verifiedShippingCharge = 0;
      if (isServerVip) {
        verifiedCodCharge = 0;
      }
    } else if (finalSubtotal >= 1000) {
      verifiedShippingCharge = 0;
    }
  }

  const verifiedCouponDiscount = Math.max(0, Number(coupon_discount || 0));
  const verifiedWalletUsed = Math.max(0, Number(wallet_used || 0));
  const verifiedCoinsRedeemed = Math.max(0, Number(coins_redeemed || 0));

  // Generate unique order number (e.g. RHV-2026-XXXX)
  const orderNumber = `RHV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Server-side wallet validation before anything is created
  if (Number(verifiedWalletUsed || 0) > 0) {
    await assertWalletBalance(user!.id as string, verifiedWalletUsed);
  }

  // Calculate GST amount (3% included in price for jewellery)
  const gstAmount = Math.round(finalSubtotal * 0.03);

  // Authoritative total
  const finalTotal = Math.max(
    0,
    finalSubtotal +
      verifiedShippingCharge +
      verifiedCodCharge +
      verifiedPriveMembershipFee -
      verifiedCouponDiscount -
      verifiedWalletUsed -
      verifiedCoinsRedeemed
  );

  // Handle Address Insertion
  let shippingAddressId = address.id;
  if (!shippingAddressId || shippingAddressId.startsWith('addr-')) {
    const { data: newAddressData, error: addressError } = await supabase
      .from('addresses')
      .insert({
        user_id: user!.id,
        label: address.label || 'Home',
        full_name:
          address.full_name || address.firstName + ' ' + address.lastName,
        phone: address.phone,
        line1: address.line1 || address.address,
        line2: address.line2 || '',
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        is_default: address.is_default || false,
      })
      .select('id')
      .single();

    if (addressError) {
      console.error('Failed to save address:', addressError);
      throw new OrderError('Failed to save shipping address', 500);
    }
    shippingAddressId = newAddressData.id;
  }

  // PhonePe orders are only marked paid from this direct-POST path when the
  // server is running in simulated mode (no PHONEPE_SALT_KEY). When real
  // gateway keys are configured, a phonepe order must stay pending and can
  // only be finalized by the verified status check or webhook.
  const simulatedPhonePe =
    !process.env.PHONEPE_SALT_KEY && process.env.PHONEPE_SIMULATED !== 'false';

  const defaultPaymentStatus =
    simulatedPhonePe &&
    (paymentMethod === 'phonepe' || (paymentMethod === 'cod' && isPartialCod))
      ? 'paid'
      : 'pending';

  const orderPayloadToInsert: any = {
    user_id: user!.id,
    order_number: orderNumber,
    status: options.status || 'confirmed',
    subtotal: finalSubtotal,
    shipping_charge: verifiedShippingCharge,
    cod_charge: verifiedCodCharge,
    coupon_discount: verifiedCouponDiscount,
    wallet_used: verifiedWalletUsed,
    coins_redeemed: verifiedCoinsRedeemed,
    gst_amount: gstAmount,
    total: finalTotal,
    payment_method: paymentMethod || 'phonepe',
    payment_status: options.paymentStatus || defaultPaymentStatus,
    prepaid_amount: isPartialCod
      ? (prepaidAmount ?? finalTotal)
      : paymentMethod === 'phonepe' || paymentMethod === 'paytm'
        ? finalTotal
        : 0,
    cod_balance: isPartialCod
      ? Math.max(0, finalTotal - (prepaidAmount || 0))
      : paymentMethod === 'cod'
        ? finalTotal
        : 0,
    gift_wrap: giftWrap,
    gift_message: giftMessage,
    shipping_address_id: shippingAddressId,
    phonepe_merchant_transaction_id: phonepe_merchant_transaction_id || null,
    phonepe_transaction_id: phonepe_transaction_id || null,
    phonepe_payment_state: phonepe_payment_state || null,
    is_vip: Boolean(isServerVip || includeVipMembership),
  };

  let { data: insertedOrder, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayloadToInsert)
    .select('id')
    .single();

  if (orderError && orderError.code === '42703') {
    // If column is_vip does not exist yet on orders table, fallback cleanly
    delete orderPayloadToInsert.is_vip;
    const retry = await supabase
      .from('orders')
      .insert(orderPayloadToInsert)
      .select('id')
      .single();
    insertedOrder = retry.data;
    orderError = retry.error;
  }

  if (orderError || !insertedOrder) {
    console.error('Failed to create order:', orderError);
    throw new OrderError('Failed to create order in database', 500);
  }

  // Debit wallet if wallet was used and the order is finalized at creation
  const shouldDebitWalletNow =
    Number(verifiedWalletUsed || 0) > 0 &&
    (defaultPaymentStatus === 'paid' ||
      (paymentMethod === 'cod' && !isPartialCod));
  if (shouldDebitWalletNow) {
    try {
      await debitWalletForOrder(
        user!.id as string,
        verifiedWalletUsed,
        insertedOrder.id
      );
    } catch (debitErr) {
      console.error(
        `Failed to redeem wallet for order ${orderNumber}:`,
        debitErr
      );
      // Fail closed: an order that was supposed to use wallet funds must not
      // be silently confirmed without the wallet being debited.
      throw new OrderError(
        'Failed to redeem wallet balance. Please try again.',
        500
      );
    }
  }

  const orderItemsToInsert = items.map((item: any) => {
    const pid = item.product?.id || item.product_id;
    const dbProd = dbProductMap.get(pid)!;
    return {
      order_id: insertedOrder.id,
      product_id: dbProd.id,
      sku: dbProd.sku || item.product?.sku || 'RHV-SKU',
      quantity: Number(item.quantity),
      price_at_purchase: Number(dbProd.price),
    };
  });

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(orderItemsToInsert);

  if (itemsError) {
    console.error('Failed to save order items:', itemsError);
  }

  // Authoritatively activate Ruhvi Privé VIP membership if purchased during checkout
  if (includeVipMembership && user?.id) {
    try {
      const oneYearFromNow = new Date(
        Date.now() + 365 * 24 * 60 * 60 * 1000
      ).toISOString();
      await adminSupabase
        .from('users')
        .update({
          is_vip: true,
          vip_joined_at: new Date().toISOString(),
          vip_expires_at: oneYearFromNow,
          vip_source: 'checkout_upsell',
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);
    } catch (vipErr) {
      console.error(
        'Failed to activate VIP membership on order checkout:',
        vipErr
      );
    }
  }

  const newOrder = {
    id: insertedOrder.id,
    order_number: orderNumber,
    user_id: user!.id,
    status: options.status || 'confirmed',
    subtotal: finalSubtotal,
    shipping_charge: verifiedShippingCharge,
    cod_charge: verifiedCodCharge,
    coupon_discount: verifiedCouponDiscount,
    wallet_used: verifiedWalletUsed,
    coins_redeemed: verifiedCoinsRedeemed,
    gst_amount: gstAmount,
    total: finalTotal,
    payment_method: paymentMethod || 'phonepe',
    payment_status: options.paymentStatus || defaultPaymentStatus,
    gift_wrap: giftWrap,
    gift_message: giftMessage,
    shipping_address: address,
    created_at: new Date().toISOString(),
    order_items: orderItemsToInsert,
  };

  return { orderId: insertedOrder.id, orderNumber, gstAmount, user, newOrder };
}
