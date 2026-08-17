import { NextResponse } from 'next/server';
import { sendOrderConfirmation } from '@/lib/whatsapp';
import { sendOrderConfirmationEmail } from '@/lib/resend';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createClient as createJSClient } from '@supabase/supabase-js';
import { getServerUser } from '@/lib/auth/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      items,
      address,
      paymentMethod,
      giftWrap,
      giftMessage,
      subtotal,
      shippingCharge,
      codCharge,
      total,
      wallet_used,
      coins_redeemed,
      coupon_discount,
      phonepe_merchant_transaction_id,
      phonepe_transaction_id,
      phonepe_payment_state,
    } = body;

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });
    }

    if (!address) {
      return NextResponse.json(
        { error: 'Shipping address is required' },
        { status: 400 }
      );
    }

    let supabase = await createServerClient();
    let { user } = await getServerUser();

    // Disable COD for guest accounts
    if (paymentMethod === 'cod' && !user) {
      return NextResponse.json(
        {
          error:
            'Cash on Delivery (COD) is available only for logged-in accounts. Please log in or select an online payment method.',
        },
        { status: 403 }
      );
    }

    // Server-side enforcement of checkout verification (Section 17)
    if (user) {
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('phone_verified, email_verified, email')
        .eq('id', user.id)
        .single();

      if (profileError || !userProfile) {
        return NextResponse.json(
          { error: 'Failed to fetch user profile verification status.' },
          { status: 500 }
        );
      }

      if (!userProfile.phone_verified) {
        return NextResponse.json(
          {
            error:
              'Mobile number verification is required before placing an order.',
          },
          { status: 403 }
        );
      }

      // If they have an email but it's not verified, we block it.
      if (userProfile.email && !userProfile.email_verified) {
        return NextResponse.json(
          { error: 'Email verification is required before placing an order.' },
          { status: 403 }
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
        return NextResponse.json(
          { error: 'Failed to initiate guest checkout.' },
          { status: 500 }
        );
      }

      // We still need to sync this user to our public.users table in Supabase
      // Using Service Role to bypass RLS for user creation
      const adminSupabase = createJSClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: newUser, error: dbError } = await adminSupabase
        .from('users')
        .upsert(
          {
            firebase_uid: fbUser.uid,
            email: fbUser.email,
            full_name: fbUser.displayName,
          },
          { onConflict: 'firebase_uid' }
        )
        .select()
        .single();

      if (dbError || !newUser) {
        console.error('Failed to create guest user in DB:', dbError);
        return NextResponse.json(
          { error: 'Failed to initiate guest checkout.' },
          { status: 500 }
        );
      }

      user = { id: newUser.id, email: newUser.email } as any;
    }

    // Generate unique order number (e.g. RHV-2026-XXXX)
    const orderNumber = `RHV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const orderId = `ord-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;

    // Calculate GST amount (3% included in price for jewellery)
    const gstAmount = Math.round(subtotal * 0.03);

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
        return NextResponse.json(
          { error: 'Failed to save shipping address' },
          { status: 500 }
        );
      }
      shippingAddressId = newAddressData.id;
    }

    const { data: insertedOrder, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: user!.id,
        order_number: orderNumber,
        status: 'confirmed',
        subtotal,
        shipping_charge: shippingCharge,
        cod_charge: codCharge,
        coupon_discount: coupon_discount || 0,
        wallet_used: wallet_used || 0,
        coins_redeemed: coins_redeemed || 0,
        gst_amount: gstAmount,
        total,
        payment_method: paymentMethod || 'phonepe',
        payment_status: paymentMethod === 'phonepe' ? 'paid' : 'pending',
        gift_wrap: giftWrap,
        gift_message: giftMessage,
        shipping_address_id: shippingAddressId,
      })
      .select('id')
      .single();

    if (orderError || !insertedOrder) {
      console.error('Failed to create order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order in database' },
        { status: 500 }
      );
    }

    const orderItemsToInsert = items.map((item: any) => ({
      order_id: insertedOrder.id,
      product_id: item.product?.id || item.product_id,
      sku: item.product?.sku || 'RHV-SKU',
      quantity: item.quantity,
      price_at_purchase: item.product?.price || item.price_at_add,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsToInsert);

    if (itemsError) {
      console.error('Failed to save order items:', itemsError);
      // We don't rollback here for simplicity, but in production we'd use a transaction
    }

    const newOrder = {
      id: insertedOrder.id,
      order_number: orderNumber,
      user_id: user!.id,
      status: 'confirmed',
      subtotal,
      shipping_charge: shippingCharge,
      cod_charge: codCharge,
      coupon_discount: coupon_discount || 0,
      wallet_used: wallet_used || 0,
      coins_redeemed: coins_redeemed || 0,
      gst_amount: gstAmount,
      total,
      payment_method: paymentMethod || 'phonepe',
      payment_status: paymentMethod === 'phonepe' ? 'paid' : 'pending',
      gift_wrap: giftWrap,
      gift_message: giftMessage,
      shipping_address: address,
      created_at: new Date().toISOString(),
      order_items: orderItemsToInsert,
    };

    // Send WhatsApp Order Confirmation asynchronously
    if (address.phone) {
      sendOrderConfirmation(
        orderNumber,
        address.phone,
        `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
          'Valued Customer',
        total
      ).catch((err) =>
        console.error('Failed to send WhatsApp confirmation:', err)
      );
    }

    // Send Resend Email Order Confirmation asynchronously
    if (user?.email) {
      const emailData = {
        order: {
          number: orderNumber,
          date: new Date().toLocaleDateString(),
          items: items.map((item: any) => ({
            product: {
              name: item.product?.title || item.product?.name || 'Product',
              image:
                item.product?.images?.[0] || 'https://ruhvi.in/placeholder.png',
              variant: item.product?.variant || '',
              quantity: item.quantity,
              unit_price: `₹${(item.product?.price || item.price_at_add).toLocaleString('en-IN')}`,
              total_price: `₹${((item.product?.price || item.price_at_add) * item.quantity).toLocaleString('en-IN')}`,
            },
          })),
        },
        subtotal: `₹${subtotal.toLocaleString('en-IN')}`,
        discount: `₹${(coupon_discount || 0).toLocaleString('en-IN')}`,
        shipping_cost: `₹${(shippingCharge || 0).toLocaleString('en-IN')}`,
        tax: `₹${(gstAmount || 0).toLocaleString('en-IN')}`,
        total: `₹${total.toLocaleString('en-IN')}`,
        shipping: {
          name:
            `${address.firstName || ''} ${address.lastName || ''}`.trim() ||
            'Valued Customer',
          address: address.address_line1 || '',
          city: address.city || '',
          state: address.state || '',
          postal_code: address.postal_code || '',
          country: address.country || 'India',
          phone: address.phone || '',
        },
        payment: {
          method:
            paymentMethod === 'cod'
              ? 'Cash on Delivery'
              : 'Online Payment (PhonePe)',
          status: paymentMethod === 'cod' ? 'Pending (COD)' : 'Paid',
          transaction_id: orderNumber, // fallback
        },
        order_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/orders`,
        support_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://ruhvi.in'}/contact`,
      };

      sendOrderConfirmationEmail(user.email, emailData).catch((err) =>
        console.error('Failed to send Email confirmation:', err)
      );
    }

    return NextResponse.json({
      success: true,
      orderId,
      orderNumber,
      order: newOrder,
    });
  } catch (error: any) {
    console.error('Order verification error:', error);
    return NextResponse.json(
      { error: 'Failed to complete order placement' },
      { status: 500 }
    );
  }
}
