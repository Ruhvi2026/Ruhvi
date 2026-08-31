import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = await getSupabaseAdminClient(cookieStore);

    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (
      !profile ||
      !['super_admin', 'admin', 'manager'].includes(profile.role)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Return mock analytics data
    const data = {
      metrics: {
        totalVisitors: 45231,
        conversionRate: 3.2,
        avgOrderValue: 4500, // INR
        revenue: 1450000,
      },
      chartData: [
        { date: 'Mon', sales: 4000, spend: 2400 },
        { date: 'Tue', sales: 3000, spend: 1398 },
        { date: 'Wed', sales: 2000, spend: 9800 },
        { date: 'Thu', sales: 2780, spend: 3908 },
        { date: 'Fri', sales: 1890, spend: 4800 },
        { date: 'Sat', sales: 2390, spend: 3800 },
        { date: 'Sun', sales: 3490, spend: 4300 },
      ],
      sources: [
        { name: 'Organic Search', value: 45 },
        { name: 'Direct', value: 25 },
        { name: 'Social', value: 20 },
        { name: 'Email', value: 10 },
      ],
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
