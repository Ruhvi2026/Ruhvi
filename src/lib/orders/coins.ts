import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

// 10 coins = ₹1 (i.e. 1 coin = ₹0.10)
// Standard customers earn 10% cashback value in coins (10 coins per ₹1 spend)
// VIP customers earn 20% cashback value in coins (20 coins per ₹1 spend = 2X)
const STANDARD_COIN_MULTIPLIER = 10;
const VIP_COIN_MULTIPLIER = 20;

/**
 * Authoritatively award reward coins upon order delivery.
 * Applies 2X accelerated coins (20%) for active Ruhvi Privé VIP members.
 */
export async function awardCoinsForDeliveredOrder(orderId: string): Promise<{
  awarded: boolean;
  coins: number;
  isVip: boolean;
}> {
  try {
    const supabase = getServiceClient();

    // 1. Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, order_number, subtotal')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order || !order.user_id) {
      return { awarded: false, coins: 0, isVip: false };
    }

    // 2. Check if coins were already awarded for this order to prevent duplicate grants
    const { data: existingGrant } = await supabase
      .from('reward_coin_ledger')
      .select('id')
      .eq('user_id', order.user_id)
      .eq('type', 'earned')
      .ilike('description', `%${order.order_number}%`)
      .maybeSingle();

    if (existingGrant) {
      return { awarded: false, coins: 0, isVip: false };
    }

    // 3. Check customer VIP status
    const { data: userProfile } = await supabase
      .from('users')
      .select('id, is_vip, vip_expires_at')
      .eq('id', order.user_id)
      .maybeSingle();

    const isVip =
      Boolean(userProfile?.is_vip) &&
      Boolean(
        !userProfile?.vip_expires_at ||
        new Date(userProfile.vip_expires_at).getTime() > Date.now()
      );

    const multiplier = isVip ? VIP_COIN_MULTIPLIER : STANDARD_COIN_MULTIPLIER;
    const coinsToAward = Math.floor(Number(order.subtotal || 0) * multiplier);

    if (coinsToAward <= 0) {
      return { awarded: false, coins: 0, isVip };
    }

    // Expiry date for earned coins (100 days)
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 100);

    const description = isVip
      ? `2X Reward Coins (Ruhvi Privé) for Order #${order.order_number}`
      : `Reward Coins for Order #${order.order_number}`;

    const { error: insertErr } = await supabase
      .from('reward_coin_ledger')
      .insert({
        user_id: order.user_id,
        amount: coinsToAward,
        type: 'earned',
        expiry_date: expiryDate.toISOString(),
        description,
      });

    if (insertErr) {
      console.error(
        `[Coins] Failed to credit coins for order ${order.order_number}:`,
        insertErr
      );
      return { awarded: false, coins: 0, isVip };
    }

    await logAuditEvent({
      portal: 'storefront',
      action: isVip ? 'REWARD_COINS_2X_AWARDED' : 'REWARD_COINS_AWARDED',
      entityType: 'reward_coin',
      entityId: order.user_id,
      changes: {
        orderId: order.id,
        orderNumber: order.order_number,
        coinsAwarded: coinsToAward,
        isVip,
      },
    });

    return { awarded: true, coins: coinsToAward, isVip };
  } catch (err) {
    console.error(
      `[Coins] Unexpected error awarding coins for order ${orderId}:`,
      err
    );
    return { awarded: false, coins: 0, isVip: false };
  }
}

/**
 * Authoritatively claw back (reverse) reward coins when an order is cancelled or returned.
 * Prevents exploitation where customers place orders, receive 2X coins, and return products.
 */
export async function clawbackCoinsForCancelledOrReturnedOrder(
  orderId: string,
  reason: 'cancelled' | 'returned'
): Promise<{ reversed: boolean; coins: number }> {
  try {
    const supabase = getServiceClient();

    // 1. Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, order_number')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order || !order.user_id) {
      return { reversed: false, coins: 0 };
    }

    // 2. Find any earned coins previously credited for this specific order
    const { data: grants } = await supabase
      .from('reward_coin_ledger')
      .select('id, amount')
      .eq('user_id', order.user_id)
      .eq('type', 'earned')
      .ilike('description', `%${order.order_number}%`);

    if (!grants || grants.length === 0) {
      return { reversed: false, coins: 0 };
    }

    const totalCoinsToReverse = grants.reduce(
      (sum, g) => sum + Number(g.amount || 0),
      0
    );
    if (totalCoinsToReverse <= 0) {
      return { reversed: false, coins: 0 };
    }

    // 3. Check if already reversed
    const { data: existingReversal } = await supabase
      .from('reward_coin_ledger')
      .select('id')
      .eq('user_id', order.user_id)
      .eq('type', 'redeemed')
      .ilike('description', `%Reversal for Order #${order.order_number}%`)
      .maybeSingle();

    if (existingReversal) {
      return { reversed: false, coins: 0 };
    }

    // 4. Insert clawback reversal ledger entry
    const { error: reverseErr } = await supabase
      .from('reward_coin_ledger')
      .insert({
        user_id: order.user_id,
        amount: totalCoinsToReverse,
        type: 'redeemed',
        description: `Reward Coins Clawback Reversal for Order #${order.order_number} (${reason})`,
      });

    if (reverseErr) {
      console.error(
        `[Coins] Failed to clawback coins for order ${order.order_number}:`,
        reverseErr
      );
      return { reversed: false, coins: 0 };
    }

    await logAuditEvent({
      portal: 'storefront',
      action: 'REWARD_COINS_CLAWBACK_REVERSAL',
      entityType: 'reward_coin',
      entityId: order.user_id,
      changes: {
        orderId: order.id,
        orderNumber: order.order_number,
        coinsReversed: totalCoinsToReverse,
        reason,
      },
    });

    return { reversed: true, coins: totalCoinsToReverse };
  } catch (err) {
    console.error(
      `[Coins] Unexpected error reversing coins for order ${orderId}:`,
      err
    );
    return { reversed: false, coins: 0 };
  }
}
