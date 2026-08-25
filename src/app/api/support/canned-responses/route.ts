import { NextResponse, NextRequest } from 'next/server';
import { getCurrentSupportUser } from '@/lib/support/serverAuth';

export interface CannedResponse {
  id: string;
  category: string;
  title: string;
  shortcut: string;
  content: string;
  tags: string[];
}

const DEFAULT_CANNED_RESPONSES: CannedResponse[] = [
  {
    id: 'cr-hallmark',
    category: 'Product & Authenticity',
    title: 'Gold Plating & Materials Guide',
    shortcut: '!hallmark',
    content: `Dear Customer,\n\nThank you for reaching out to Ruhvi Support regarding product materials.\n\nOur products are premium gold-plated jewellery: each piece is crafted on a nickel-free brass base and plated with a thick layer of 22K gold, finished with an anti-tarnish e-coating and backed by a 6-month color guarantee.\n\nPlease note that government BIS hallmarking applies only to solid precious metals (like 14K/18K/22K solid gold). As our pieces are gold-plated rather than solid gold, BIS hallmark certification is not applicable to them.\n\nPlease let us know if you need any assistance with your piece!\n\nWarm regards,\nRuhvi Concierge Team`,
    tags: ['authenticity', 'materials', 'plating', 'gold', 'certificate'],
  },
  {
    id: 'cr-tracking',
    category: 'Shipping & Delivery',
    title: 'Order Dispatched & Tracking Link',
    shortcut: '!tracking',
    content: `Dear Customer,\n\nYour order has been carefully packaged in our tamper-proof luxury box and handed over to our insured courier partner.\n\nYou can track the live movement of your shipment using your AWB Tracking Number on our tracking portal at https://ruhvi.in/tracking.\n\nDelivery typically takes 2-4 business days across India. Please keep your government photo ID handy at the time of delivery for verification.\n\nWarm regards,\nRuhvi Support Team`,
    tags: ['shipping', 'tracking', 'courier', 'awb'],
  },
  {
    id: 'cr-resizing',
    category: 'Product & Sizing',
    title: 'Complimentary Ring Resizing & Size Exchange',
    shortcut: '!resizing',
    content: `Dear Customer,\n\nWe want your Ruhvi ring to fit you perfectly! We offer complimentary 1-time size adjustments within 15 days of delivery.\n\nTo initiate a size exchange:\n1. Ensure the jewellery is unworn, in original condition with security tag intact.\n2. We will arrange a secure insured pickup from your registered address.\n3. Our master artisans will resize or exchange the piece within 3-5 working days.\n\nPlease confirm your preferred ring size and convenient pickup date to proceed.\n\nWarm regards,\nRuhvi Support Team`,
    tags: ['sizing', 'rings', 'exchange', 'fit'],
  },
  {
    id: 'cr-refund',
    category: 'Payments & Refunds',
    title: 'Refund Processed & Timeline',
    shortcut: '!refund',
    content: `Dear Customer,\n\nWe have initiated your refund of the requested amount. The funds will reflect in your original payment method (Bank/UPI/Card) within 3 to 5 business days, depending on your bank's settlement cycle.\n\nIf you chose store credit / Ruhvi Wallet, the amount has been credited instantly to your account with bonus reward coins.\n\nPlease feel free to contact us if you do not see the credit after 5 business days.\n\nWarm regards,\nRuhvi Accounts Team`,
    tags: ['refund', 'payment', 'wallet', 'bank'],
  },
  {
    id: 'cr-return-pickup',
    category: 'Return & Exchange',
    title: 'Insured Return Pickup Scheduled',
    shortcut: '!pickup',
    content: `Dear Customer,\n\nYour return request has been approved! An insured courier pickup has been scheduled for your address within 24-48 hours.\n\nPlease keep the following ready:\n- The jewellery piece in its original velvet box and packaging\n- Authenticity certificate / HUID card\n- Secure tamper-evident seal bag provided by the pickup agent\n\nOnce quality verification is complete at our lab, your exchange/refund will be processed immediately.\n\nWarm regards,\nRuhvi Support Team`,
    tags: ['return', 'pickup', 'exchange'],
  },
  {
    id: 'cr-need-photos',
    category: 'General Support',
    title: 'Request for Photos / Video Evidence',
    shortcut: '!photos',
    content: `Dear Customer,\n\nTo help us investigate your request swiftly, could you please share a clear photograph or short 5-second video showing the item, packaging box, and shipping label?\n\nYou can reply directly to this ticket or attach the media files. Once received, our support team will resolve this with top priority.\n\nWarm regards,\nRuhvi Support Team`,
    tags: ['info_needed', 'photos', 'proof'],
  },
];

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentSupportUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      canned_responses: DEFAULT_CANNED_RESPONSES,
    });
  } catch (err: any) {
    console.error('Canned responses GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
