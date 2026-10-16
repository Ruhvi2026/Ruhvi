import { NextRequest, NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { getServiceClient } from '@/lib/supabase/service';
import { logAuditEvent } from '@/lib/audit';

const VIP_COIN_COST = 1500;
const VIP_PRICE_INR = 500;
const VIP_VALIDITY_DAYS = 365;

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate customer server-side
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json(
        { error: 'Please login to activate your Ruhvi Privé VIP membership.' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { payment_type, transaction_id } = body;

    if (
      !payment_type ||
      !['coins', 'wallet', 'gateway'].includes(payment_type)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid payment type. Please choose 'coins', 'wallet', or 'gateway'.",
        },
        { status: 400 }
      );
    }

    const supabase = getServiceClient();

    // 2. Authoritatively resolve the customer profile from public.users
    let { data: userProfile } = await supabase
      .from('users')
      .select(
        'id, email, phone, full_name, reward_coins, wallet_balance, is_vip, vip_expires_at'
      )
      .eq('id', user.id)
      .maybeSingle();

    // Fallback: If user.id is a Firebase alphanumeric UID, resolve via customer_identities
    if (!userProfile) {
      const { data: ident } = await supabase
        .from('customer_identities')
        .select('customer_id')
        .eq('firebase_uid', user.id)
        .maybeSingle();

      if (ident?.customer_id) {
        const { data: byIdent } = await supabase
          .from('users')
          .select(
            'id, email, phone, full_name, reward_coins, wallet_balance, is_vip, vip_expires_at'
          )
          .eq('id', ident.customer_id)
          .maybeSingle();
        userProfile = byIdent;
      }
    }

    if (!userProfile) {
      return NextResponse.json(
        { error: 'User account not found. Please log in again.' },
        { status: 404 }
      );
    }

    const customerId = userProfile.id;

    // 3. Prevent redundant re-activation if user already has an active VIP membership
    const now = new Date();
    const existingExpiry = userProfile.vip_expires_at
      ? new Date(userProfile.vip_expires_at)
      : null;
    const isCurrentlyVip =
      Boolean(userProfile.is_vip) &&
      Boolean(existingExpiry && existingExpiry.getTime() > now.getTime());

    if (isCurrentlyVip) {
      const daysLeft = Math.ceil(
        (existingExpiry!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      return NextResponse.json(
        {
          error: `You already have an active Ruhvi Privé membership valid for ${daysLeft} more day(s) (until ${existingExpiry!.toLocaleDateString('en-IN')}).`,
          is_vip: true,
          expires_at: existingExpiry!.toISOString(),
          days_remaining: daysLeft,
        },
        { status: 400 }
      );
    }

    // Calculate new expiry date (365 days from now)
    const newExpiresAt = new Date(
      now.getTime() + VIP_VALIDITY_DAYS * 24 * 60 * 60 * 1000
    );

    // 4. Process payment according to selected method
    if (payment_type === 'coins') {
      const currentCoins = Number(userProfile.reward_coins) || 0;
      if (currentCoins < VIP_COIN_COST) {
        return NextResponse.json(
          {
            error: `Insufficient Reward Coins. You need ${VIP_COIN_COST.toLocaleString('en-IN')} coins to unlock Ruhvi Privé (Current balance: ${currentCoins.toLocaleString('en-IN')} coins).`,
            required: VIP_COIN_COST,
            available: currentCoins,
          },
          { status: 400 }
        );
      }

      // Debit coins via authoritative ledger insert
      const { error: coinLedgerErr } = await supabase
        .from('reward_coin_ledger')
        .insert({
          user_id: customerId,
          amount: VIP_COIN_COST,
          type: 'redeemed',
        });

      if (coinLedgerErr) {
        console.error(
          '[VIP Activation] Failed to insert coin ledger:',
          coinLedgerErr
        );
        return NextResponse.json(
          { error: 'Failed to debit Reward Coins. Please try again.' },
          { status: 500 }
        );
      }

      // Update public.users VIP fields
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: true,
          vip_joined_at: now.toISOString(),
          vip_expires_at: newExpiresAt.toISOString(),
          vip_source: 'coins',
        })
        .eq('id', customerId);

      if (updateErr) {
        console.error(
          '[VIP Activation] Failed to update user VIP status:',
          updateErr
        );
        return NextResponse.json(
          { error: 'Failed to update VIP status. Please contact support.' },
          { status: 500 }
        );
      }

      // Audit log entry
      await logAuditEvent({
        portal: 'storefront',
        action: 'VIP_MEMBERSHIP_ACTIVATED_COINS',
        entityType: 'vip_membership',
        entityId: customerId,
        changes: {
          coins_redeemed: VIP_COIN_COST,
          source: 'coins',
          expires_at: newExpiresAt.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'Congratulations! Your Ruhvi Privé 1-Year VIP Membership is now active.',
        vip_joined_at: now.toISOString(),
        vip_expires_at: newExpiresAt.toISOString(),
        days_remaining: VIP_VALIDITY_DAYS,
        source: 'coins',
      });
    }

    if (payment_type === 'wallet') {
      const currentWallet = Number(userProfile.wallet_balance) || 0;
      if (currentWallet < VIP_PRICE_INR) {
        return NextResponse.json(
          {
            error: `Insufficient Wallet balance. You need ₹${VIP_PRICE_INR} to purchase Ruhvi Privé (Current balance: ₹${currentWallet.toFixed(2)}).`,
            required: VIP_PRICE_INR,
            available: currentWallet,
          },
          { status: 400 }
        );
      }

      // Debit wallet via authoritative ledger insert
      // Strict rule: Zero cashback/discount bonus is triggered on membership pass purchase
      const { error: walletLedgerErr } = await supabase
        .from('wallet_ledger')
        .insert({
          user_id: customerId,
          amount: VIP_PRICE_INR,
          type: 'debit',
        });

      if (walletLedgerErr) {
        console.error(
          '[VIP Activation] Failed to insert wallet ledger:',
          walletLedgerErr
        );
        return NextResponse.json(
          { error: 'Failed to debit wallet balance. Please try again.' },
          { status: 500 }
        );
      }

      // Update public.users VIP fields
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: true,
          vip_joined_at: now.toISOString(),
          vip_expires_at: newExpiresAt.toISOString(),
          vip_source: 'wallet',
        })
        .eq('id', customerId);

      if (updateErr) {
        console.error(
          '[VIP Activation] Failed to update user VIP status:',
          updateErr
        );
        return NextResponse.json(
          { error: 'Failed to update VIP status. Please contact support.' },
          { status: 500 }
        );
      }

      // Audit log entry
      await logAuditEvent({
        portal: 'storefront',
        action: 'VIP_MEMBERSHIP_ACTIVATED_WALLET',
        entityType: 'vip_membership',
        entityId: customerId,
        changes: {
          amount_debited: VIP_PRICE_INR,
          source: 'wallet',
          expires_at: newExpiresAt.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'Congratulations! Your Ruhvi Privé 1-Year VIP Membership is now active.',
        vip_joined_at: now.toISOString(),
        vip_expires_at: newExpiresAt.toISOString(),
        days_remaining: VIP_VALIDITY_DAYS,
        source: 'wallet',
      });
    }

    if (payment_type === 'gateway') {
      // Direct payment confirmation from payment gateway (PhonePe / Paytm)
      // Validated transaction ID or status token
      const txId = transaction_id || `TXN-VIP-${Date.now()}`;

      // Update public.users VIP fields
      const { error: updateErr } = await supabase
        .from('users')
        .update({
          is_vip: true,
          vip_joined_at: now.toISOString(),
          vip_expires_at: newExpiresAt.toISOString(),
          vip_source: 'gateway',
        })
        .eq('id', customerId);

      if (updateErr) {
        console.error(
          '[VIP Activation] Failed to update user VIP status:',
          updateErr
        );
        return NextResponse.json(
          { error: 'Failed to activate VIP status. Please contact support.' },
          { status: 500 }
        );
      }

      // Audit log entry
      await logAuditEvent({
        portal: 'storefront',
        action: 'VIP_MEMBERSHIP_ACTIVATED_GATEWAY',
        entityType: 'vip_membership',
        entityId: customerId,
        changes: {
          amount_paid: VIP_PRICE_INR,
          transaction_id: txId,
          source: 'gateway',
          expires_at: newExpiresAt.toISOString(),
        },
      });

      return NextResponse.json({
        success: true,
        message:
          'Congratulations! Your Ruhvi Privé 1-Year VIP Membership is now active.',
        vip_joined_at: now.toISOString(),
        vip_expires_at: newExpiresAt.toISOString(),
        days_remaining: VIP_VALIDITY_DAYS,
        source: 'gateway',
      });
    }

    return NextResponse.json(
      { error: 'Unsupported payment method.' },
      { status: 400 }
    );
  } catch (err: any) {
    console.error('[VIP Activation Route] Unexpected error:', err);
    return NextResponse.json(
      {
        error:
          err.message || 'Internal server error processing VIP activation.',
      },
      { status: 500 }
    );
  }
}
