import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSiteUrl } from '@/lib/utils/url';

export async function POST(req: Request) {
  try {
    const { amount, orderId, userId, mobileNumber } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
    const saltKey = process.env.PHONEPE_SALT_KEY;
    const saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    const env = process.env.PHONEPE_ENV || 'UAT';

    const merchantTransactionId = `MT_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const siteUrl = getSiteUrl();

    // If real PhonePe keys exist, initiate standard PhonePe PG payment flow
    if (saltKey) {
      const payload = {
        merchantId,
        merchantTransactionId,
        merchantUserId: userId || `USR_${Date.now()}`,
        amount: Math.round(amount * 100), // amount in paise
        redirectUrl: `${siteUrl}/api/checkout/verify?merchantTransactionId=${merchantTransactionId}`,
        redirectMode: 'REDIRECT',
        callbackUrl: `${siteUrl}/api/webhooks/phonepe`,
        mobileNumber: mobileNumber || '9999999999',
        paymentInstrument: {
          type: 'PAY_PAGE',
        },
      };

      const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
      const apiEndpoint = '/pg/v1/pay';
      const checksumString = base64Payload + apiEndpoint + saltKey;
      const sha256 = crypto.createHash('sha256').update(checksumString).digest('hex');
      const xVerifyHeader = `${sha256}###${saltIndex}`;

      const baseUrl =
        env === 'PRODUCTION'
          ? 'https://api.phonepe.com/apis/hermes'
          : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

      const response = await fetch(`${baseUrl}${apiEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': xVerifyHeader,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const data = await response.json();

      if (data.success && data.data?.instrumentResponse?.redirectInfo?.url) {
        return NextResponse.json({
          success: true,
          redirectUrl: data.data.instrumentResponse.redirectInfo.url,
          merchantTransactionId,
          merchantId,
        });
      }

      console.error('PhonePe API Error:', data);
    }

    // Test / Fallback mode when keys are pending
    return NextResponse.json({
      success: true,
      merchantTransactionId,
      merchantId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      isSimulated: true,
      redirectUrl: `${siteUrl}/api/checkout/verify?merchantTransactionId=${merchantTransactionId}&isSimulated=true`,
    });
  } catch (error: any) {
    console.error('PhonePe Payment API Error:', error);
    return NextResponse.json({ error: 'Failed to initialize PhonePe payment' }, { status: 500 });
  }
}
