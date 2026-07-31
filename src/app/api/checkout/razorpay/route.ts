import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { amount, currency = 'INR' } = await req.json();

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Invalid order amount' }, { status: 400 });
    }

    const keyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_ruhvi_demo';
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    // If real Razorpay keys exist, call Razorpay API
    if (keySecret && keyId !== 'rzp_test_ruhvi_demo') {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      const response = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: Math.round(amount * 100), // amount in paise
          currency,
          receipt: `rcpt_${Date.now()}`,
        }),
      });

      const orderData = await response.json();
      if (!response.ok) {
        return NextResponse.json({ error: orderData.error?.description || 'Razorpay order creation failed' }, { status: 500 });
      }

      return NextResponse.json({
        id: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        key: keyId,
      });
    }

    // Test / Fallback mode when keys are not configured
    const simulatedOrderId = `order_test_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    return NextResponse.json({
      id: simulatedOrderId,
      amount: Math.round(amount * 100),
      currency: 'INR',
      key: keyId,
      isSimulated: true,
    });
  } catch (error: any) {
    console.error('Razorpay Order API Error:', error);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
