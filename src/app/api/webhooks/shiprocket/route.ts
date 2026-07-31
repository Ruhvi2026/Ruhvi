import { NextResponse } from 'next/server';

// In a real app with Supabase running:
// import { createClient } from '@supabase/supabase-js';
// const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: Request) {
  try {
    // Verify Shiprocket webhook signature if configured
    // const signature = req.headers.get('x-shiprocket-signature');

    const payload = await req.json();

    // Example Payload from Shiprocket:
    // {
    //   "awb": "123456789",
    //   "current_status": "Out for Delivery",
    //   "current_status_id": 17,
    //   "current_timestamp": "2023-01-01 10:00:00",
    //   "scan_datetime": "2023-01-01 09:30:00",
    //   "scanned_location": "Mumbai Hub"
    // }

    const awb = payload.awb || payload.awb_code;
    const status = payload.current_status || 'Update';
    const location = payload.scanned_location || '';
    const activity = payload.activity || status;
    const timestamp = payload.scan_datetime || new Date().toISOString();

    if (!awb) {
      return NextResponse.json({ error: 'Missing AWB code' }, { status: 400 });
    }

    console.log(`[Shiprocket Webhook] Received update for AWB: ${awb} - Status: ${status}`);

    // In a real app:
    /*
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Find the order with this AWB
    const { data: order } = await supabase
      .from('orders')
      .select('id')
      .eq('awb_code', awb)
      .single();

    if (order) {
      // 2. Insert into tracking_updates
      await supabase.from('tracking_updates').insert({
        order_id: order.id,
        awb_code: awb,
        status: status,
        location: location,
        activity: activity,
        timestamp: timestamp
      });
      
      // 3. (Optional) Insert notification for user
    }
    */

    return NextResponse.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('[Shiprocket Webhook Error]', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
