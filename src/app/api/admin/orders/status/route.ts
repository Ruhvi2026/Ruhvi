import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendShippingUpdateEmail } from '@/lib/brevo';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Verify user is logged in
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify user is an admin or staff
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'staff')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { orderId, newStatus, trackingLink } = await request.json();

    if (!orderId || !newStatus) {
      return NextResponse.json({ error: 'orderId and newStatus are required' }, { status: 400 });
    }

    // Update the database
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', orderId);

    if (updateError) throw updateError;

    // If status is shipped, fetch user email and trigger email
    if (newStatus === 'shipped') {
      const { data: orderDetails } = await supabase
        .from('orders')
        .select(`
          order_number,
          user_id,
          users!orders_user_id_fkey(email, full_name),
          shipping_address:addresses!orders_shipping_address_id_fkey(full_name)
        `)
        .eq('id', orderId)
        .single();

      if (orderDetails && (orderDetails.users as any)?.email) {
        const email = (orderDetails.users as any).email;
        const name = (orderDetails.shipping_address as any)?.full_name || (orderDetails.users as any)?.full_name || 'Valued Customer';
        
        await sendShippingUpdateEmail(email, name, orderDetails.order_number, trackingLink).catch(err => {
          console.error('Failed to send shipping email:', err);
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
