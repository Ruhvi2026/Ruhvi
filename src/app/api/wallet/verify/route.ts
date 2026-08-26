import { NextResponse } from 'next/server';
import { createClient as createJSClient } from '@supabase/supabase-js';
import { getSiteUrl } from '@/lib/utils/url';
import {
  PAYED_STATES,
  FAILED_STATES,
} from '@/lib/orders/finalize-phonepe-order';
import {
  creditWalletTopUp,
  markWalletTopUpFailed,
  checkWalletPhonePeStatus,
  getPhonePeConfig,
} from '@/lib/wallet/topup';

// ---------------------------------------------------------------------------
// GET — browser return redirect from the PhonePe gateway for a wallet top-up
// (redirectUrl configured in /api/wallet/topup). Confirms the payment against
// the PhonePe status API, credits the wallet and forwards the customer back to
// the wallet page with an outcome.
// ---------------------------------------------------------------------------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const merchantTransactionId = searchParams.get('merchantTransactionId');
  const siteUrl = getSiteUrl();

  if (!merchantTransactionId) {
    return renderWalletRedirect(`${siteUrl}/account/wallet?topup=pending`);
  }

  const walletUrl = (status: string, amount?: number) =>
    `${siteUrl}/account/wallet?topup=${status}${
      amount ? `&amount=${amount}` : ''
    }`;

  const supabase = createJSClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: topup, error: lookupError } = await supabase
    .from('wallet_topups')
    .select('*')
    .eq('merchant_transaction_id', merchantTransactionId)
    .maybeSingle();

  if (lookupError || !topup) {
    console.error('Wallet top-up lookup failed on verify:', lookupError);
    return renderWalletRedirect(`${siteUrl}/account/wallet?topup=failed`);
  }

  const amount = Number(topup.amount) || 0;

  // Simulated mode (no real PhonePe keys configured) — credit directly.
  // Matches the create-order convention: simulated is on by default when the
  // salt key is absent, unless explicitly disabled via PHONEPE_SIMULATED=false.
  if (
    !process.env.PHONEPE_SALT_KEY &&
    process.env.PHONEPE_SIMULATED !== 'false'
  ) {
    await creditWalletTopUp(merchantTransactionId, {
      phonepeTransactionId: `T_SIM_${Date.now()}`,
      phonepePaymentState: 'COMPLETED',
    });
    return renderWalletRedirect(walletUrl('success', amount));
  }

  const { saltKey } = getPhonePeConfig();

  // Real keys configured — verify the transaction with the PhonePe status API.
  if (saltKey) {
    try {
      const status = await checkWalletPhonePeStatus(merchantTransactionId);

      if (PAYED_STATES.includes(status.state)) {
        await creditWalletTopUp(merchantTransactionId, {
          phonepeTransactionId: status.transactionId,
          phonepePaymentState: status.state,
        });
        return renderWalletRedirect(walletUrl('success', amount));
      }

      if (FAILED_STATES.includes(status.state)) {
        await markWalletTopUpFailed(merchantTransactionId, {
          phonepeTransactionId: status.transactionId,
          phonepePaymentState: status.state,
        });
        return renderWalletRedirect(walletUrl('failed', amount));
      }

      // PENDING — the webhook may have already credited the wallet; re-check.
      const { data: fresh } = await supabase
        .from('wallet_topups')
        .select('status, amount')
        .eq('merchant_transaction_id', merchantTransactionId)
        .maybeSingle();
      if (fresh?.status === 'paid') {
        return renderWalletRedirect(
          walletUrl('success', Number(fresh.amount) || amount)
        );
      }
      return renderWalletRedirect(walletUrl('pending', amount));
    } catch (err) {
      console.error('Wallet PhonePe status check failed:', err);
      // Fall through to DB state so a completed webhook still lands correctly.
    }
  }

  // No keys or status check failed — rely on the record state in the DB.
  if (topup.status === 'paid') {
    return renderWalletRedirect(walletUrl('success', amount));
  }
  if (topup.status === 'failed') {
    return renderWalletRedirect(walletUrl('failed', amount));
  }
  return renderWalletRedirect(walletUrl('pending', amount));
}

function renderWalletRedirect(targetUrl: string) {
  const safeUrl = targetUrl
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0; url=${safeUrl}" />
  <title>Redirecting...</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #faf6ed; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; color: #1c1b1a; }
    .box { text-align: center; }
    .spinner { width: 40px; height: 40px; border: 4px solid #e8dfc6; border-top-color: #c29831; border-radius: 50%; margin: 0 auto 16px; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="box">
    <div class="spinner"></div>
    <p>Finalizing your wallet top-up...</p>
    <noscript><a href="${safeUrl}">Click here to continue</a></noscript>
  </div>
  <script>window.location.replace("${safeUrl}");</script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
