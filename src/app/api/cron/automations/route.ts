import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendAbandonedCartEmail, sendWinBackEmail, sendCelebrationEmail } from '@/lib/brevo';

export async function GET(request: Request) {
  try {
    // Vercel Cron secures the route via Authorization header matching CRON_SECRET
    const authHeader = request.headers.get('authorization');
    if (
      process.env.CRON_SECRET &&
      authHeader !== `Bearer ${process.env.CRON_SECRET}`
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // We need service role to query all users and bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const results = {
      abandonedCarts: 0,
      winBacks: 0,
      birthdays: 0,
      anniversaries: 0,
    };

    // 1. Abandoned Carts
    // Find carts that were updated more than 24 hours ago, have items, but haven't triggered a reminder recently
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    // We fetch users whose cart updated_at < yesterday AND last_cart_reminder_sent < updated_at or is null
    const { data: abandonedUsers } = await supabase
      .from('users')
      .select('id, email, full_name, carts!inner(updated_at)')
      .lt('carts.updated_at', yesterday)
      .is('email', 'not.null')
      .not('email', 'eq', '')
      .or(`last_cart_reminder_sent.is.null,last_cart_reminder_sent.lt.${yesterday}`);

    if (abandonedUsers && abandonedUsers.length > 0) {
      for (const user of abandonedUsers) {
        await sendAbandonedCartEmail(user.email, user.full_name || 'Valued Customer');
        await supabase.from('users').update({ last_cart_reminder_sent: new Date().toISOString() }).eq('id', user.id);
        results.abandonedCarts++;
      }
    }

    // 2. Win-Back Campaigns
    // Find users whose last order was > 60 days ago
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    const { data: winBackUsers } = await supabase
      .from('users')
      .select('id, email, full_name')
      .is('email', 'not.null')
      .or(`last_winback_sent.is.null,last_winback_sent.lt.${sixtyDaysAgo}`);
      // NOTE: We'd ideally join with orders or keep a `last_order_date` on the users table.
      // For brevity, we'll assume we can fetch the latest order.
    
    if (winBackUsers) {
      for (const user of winBackUsers) {
        const { data: latestOrder } = await supabase
          .from('orders')
          .select('created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();
        
        if (latestOrder && new Date(latestOrder.created_at) < new Date(sixtyDaysAgo)) {
          await sendWinBackEmail(user.email, user.full_name || 'Valued Customer', 'MISSYOU20');
          await supabase.from('users').update({ last_winback_sent: new Date().toISOString() }).eq('id', user.id);
          results.winBacks++;
        }
      }
    }

    // 3. Birthdays and Anniversaries
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentDay = today.getDate();

    const { data: usersToCelebrate } = await supabase
      .from('users')
      .select('id, email, full_name, dob, anniversary_date, last_birthday_sent, last_anniversary_sent')
      .is('email', 'not.null');

    if (usersToCelebrate) {
      for (const user of usersToCelebrate) {
        const currentYear = today.getFullYear();
        
        if (user.dob) {
          const dobDate = new Date(user.dob);
          const hasNotBeenSentThisYear = !user.last_birthday_sent || new Date(user.last_birthday_sent).getFullYear() < currentYear;
          if (dobDate.getMonth() + 1 === currentMonth && dobDate.getDate() === currentDay && hasNotBeenSentThisYear) {
            await sendCelebrationEmail(user.email, user.full_name || 'Valued Customer', 'birthday', 'BDAY30');
            await supabase.from('users').update({ last_birthday_sent: new Date().toISOString() }).eq('id', user.id);
            results.birthdays++;
          }
        }

        if (user.anniversary_date) {
          const annDate = new Date(user.anniversary_date);
          const hasNotBeenSentThisYear = !user.last_anniversary_sent || new Date(user.last_anniversary_sent).getFullYear() < currentYear;
          if (annDate.getMonth() + 1 === currentMonth && annDate.getDate() === currentDay && hasNotBeenSentThisYear) {
            await sendCelebrationEmail(user.email, user.full_name || 'Valued Customer', 'anniversary', 'ANNIV30');
            await supabase.from('users').update({ last_anniversary_sent: new Date().toISOString() }).eq('id', user.id);
            results.anniversaries++;
          }
        }
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Cron job error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
