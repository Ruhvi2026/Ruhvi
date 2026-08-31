import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';
import {
  getDailyTraffic,
  getTrafficSources,
  getPurchaseFunnel,
  getMarketingKpis,
} from '@/services/posthog-analytics.service';

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

    const days = 30;
    const revalidate = 600; // 10 mins cache

    // Fetch live data from PostHog
    const [traffic, sources, funnel, kpis] = await Promise.all([
      getDailyTraffic(days, revalidate),
      getTrafficSources(8, days, revalidate),
      getPurchaseFunnel(days, revalidate),
      getMarketingKpis(days, revalidate),
    ]);

    // Calculate total visitors for the period
    const totalVisitors = traffic.reduce((sum, day) => sum + day.visitors, 0);

    const data = {
      kpis: {
        ...kpis,
        totalVisitors,
      },
      traffic,
      sources,
      funnel,
    };

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
