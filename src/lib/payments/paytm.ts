import PaytmChecksum from 'paytmchecksum';
import { getSiteUrl } from '@/lib/utils/url';

export interface InitiatePaytmParams {
  orderId: string;
  amount: number;
  customerId?: string;
  mobileNumber?: string;
  callbackUrl?: string;
}

export interface InitiatePaytmResult {
  success: boolean;
  txnToken: string;
  orderId: string;
  isSimulated: boolean;
  gatewayUrl?: string;
  error?: string;
}

export interface PaytmStatusResult {
  success: boolean;
  status: 'TXN_SUCCESS' | 'TXN_FAILURE' | 'PENDING';
  txnId?: string;
  bankTxnId?: string;
  orderId: string;
  txnAmount?: string;
  rawResponse?: any;
  error?: string;
}

export function isPaytmConfigured(): boolean {
  return Boolean(
    process.env.PAYTM_MID &&
    process.env.PAYTM_MERCHANT_KEY &&
    process.env.PAYTM_MID.trim().length > 0 &&
    process.env.PAYTM_MERCHANT_KEY.trim().length > 0
  );
}

export function getPaytmHost(): string {
  const env = (process.env.PAYTM_ENV || 'staging').toLowerCase();
  return env === 'production'
    ? 'https://securegw.paytm.in'
    : 'https://securegw-stage.paytm.in';
}

export function getPaytmWebsite(): string {
  if (process.env.PAYTM_WEBSITE) {
    return process.env.PAYTM_WEBSITE;
  }
  const env = (process.env.PAYTM_ENV || 'staging').toLowerCase();
  return env === 'production' ? 'DEFAULT' : 'WEBSTAGING';
}

/**
 * Initiates a transaction with Paytm Payment Gateway (API v2).
 * If real Paytm credentials are not set, fails gracefully into safe simulated mode.
 */
export async function initiatePaytmTransaction(
  params: InitiatePaytmParams
): Promise<InitiatePaytmResult> {
  const { orderId, amount, customerId, mobileNumber } = params;

  if (!amount || amount <= 0) {
    return {
      success: false,
      txnToken: '',
      orderId,
      isSimulated: false,
      error: 'Invalid order amount',
    };
  }

  const siteUrl = getSiteUrl();
  const callbackUrl =
    params.callbackUrl ||
    process.env.PAYTM_CALLBACK_URL ||
    `${siteUrl}/api/checkout/paytm/callback`;

  // Safe fallback if Paytm keys are not configured yet
  if (!isPaytmConfigured()) {
    const isExplicitlyDisabled = process.env.PAYTM_SIMULATED === 'false';
    if (isExplicitlyDisabled) {
      return {
        success: false,
        txnToken: '',
        orderId,
        isSimulated: false,
        error:
          'Paytm PG credentials (PAYTM_MID, PAYTM_MERCHANT_KEY) are not configured.',
      };
    }

    return {
      success: true,
      txnToken: `SIM_TOKEN_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      orderId,
      isSimulated: true,
    };
  }

  const mid = process.env.PAYTM_MID!.trim();
  const merchantKey = process.env.PAYTM_MERCHANT_KEY!.trim();
  const host = getPaytmHost();

  const body: Record<string, any> = {
    requestType: 'Payment',
    mid,
    websiteName: getPaytmWebsite(),
    orderId,
    callbackUrl,
    txnAmount: {
      value: amount.toFixed(2),
      currency: 'INR',
    },
    userInfo: {
      custId: customerId || `CUST_${Date.now()}`,
      mobile: mobileNumber || '',
    },
  };

  try {
    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(body),
      merchantKey
    );

    const paytmPayload = {
      head: { signature },
      body,
    };

    const apiUrl = `${host}/theia/api/v1/initiateTransaction?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paytmPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(
        '[Paytm PG] initiateTransaction HTTP error:',
        response.status,
        errText
      );
      return {
        success: false,
        txnToken: '',
        orderId,
        isSimulated: false,
        error: `Paytm server returned HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const resultInfo = data?.body?.resultInfo;

    if (resultInfo?.resultStatus === 'S') {
      const txnToken = data.body.txnToken;
      const gatewayUrl = `${host}/theia/api/v1/showPaymentPage?mid=${encodeURIComponent(mid)}&orderId=${encodeURIComponent(orderId)}&txnToken=${encodeURIComponent(txnToken)}`;

      return {
        success: true,
        txnToken,
        orderId,
        isSimulated: false,
        gatewayUrl,
      };
    }

    console.error(
      '[Paytm PG] initiateTransaction business failure:',
      resultInfo
    );
    return {
      success: false,
      txnToken: '',
      orderId,
      isSimulated: false,
      error:
        resultInfo?.resultMsg || 'Failed to initiate transaction with Paytm',
    };
  } catch (error: any) {
    console.error(
      '[Paytm PG] Unexpected error during initiateTransaction:',
      error
    );
    return {
      success: false,
      txnToken: '',
      orderId,
      isSimulated: false,
      error: error.message || 'Error communicating with Paytm gateway',
    };
  }
}

/**
 * Validates the checksum hash received in Paytm callback / webhook.
 */
export async function verifyPaytmCallbackSignature(
  params: Record<string, string>
): Promise<boolean> {
  if (!isPaytmConfigured()) {
    // In simulated environment without keys, verify passes
    return true;
  }

  const checksum = params.CHECKSUMHASH;
  if (!checksum) {
    return false;
  }

  const merchantKey = process.env.PAYTM_MERCHANT_KEY!.trim();
  const paytmParams = { ...params };
  delete paytmParams.CHECKSUMHASH;

  try {
    return await PaytmChecksum.verifySignature(
      paytmParams,
      merchantKey,
      checksum
    );
  } catch (err) {
    console.error('[Paytm PG] Checksum verification exception:', err);
    return false;
  }
}

/**
 * Authoritatively queries transaction status from Paytm PG server.
 */
export async function queryPaytmOrderStatus(
  orderId: string
): Promise<PaytmStatusResult> {
  if (!isPaytmConfigured()) {
    return {
      success: true,
      status: 'TXN_SUCCESS',
      orderId,
      txnId: `SIM_TXN_${Date.now()}`,
    };
  }

  const mid = process.env.PAYTM_MID!.trim();
  const merchantKey = process.env.PAYTM_MERCHANT_KEY!.trim();
  const host = getPaytmHost();

  const body = {
    mid,
    orderId,
  };

  try {
    const signature = await PaytmChecksum.generateSignature(
      JSON.stringify(body),
      merchantKey
    );

    const payload = {
      head: { signature },
      body,
    };

    const response = await fetch(`${host}/v3/order/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    const resultInfo = data?.body?.resultInfo;
    const resultStatus = resultInfo?.resultStatus;

    if (resultStatus === 'TXN_SUCCESS') {
      return {
        success: true,
        status: 'TXN_SUCCESS',
        txnId: data.body.txnId,
        bankTxnId: data.body.bankTxnId,
        orderId,
        txnAmount: data.body.txnAmount,
        rawResponse: data.body,
      };
    } else if (resultStatus === 'PENDING') {
      return {
        success: false,
        status: 'PENDING',
        orderId,
        rawResponse: data.body,
      };
    } else {
      return {
        success: false,
        status: 'TXN_FAILURE',
        orderId,
        error: resultInfo?.resultMsg || 'Transaction failed',
        rawResponse: data.body,
      };
    }
  } catch (err: any) {
    console.error('[Paytm PG] Status query error:', err);
    return {
      success: false,
      status: 'PENDING',
      orderId,
      error: err.message || 'Status query failed',
    };
  }
}
