import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

const mockSubscribers = [
  {
    id: '1',
    email: 'anya.sharma@example.com',
    name: 'Anya Sharma',
    status: 'Subscribed',
    source: 'Checkout',
    date: '2026-08-31',
  },
  {
    id: '2',
    email: 'rahul.verma@example.com',
    name: 'Rahul Verma',
    status: 'Subscribed',
    source: 'Footer Form',
    date: '2026-08-30',
  },
  {
    id: '3',
    email: 'priya.singh@example.com',
    name: 'Priya Singh',
    status: 'Unsubscribed',
    source: 'Popup',
    date: '2026-08-28',
  },
  {
    id: '4',
    email: 'karan.gupta@example.com',
    name: 'Karan Gupta',
    status: 'Subscribed',
    source: 'Checkout',
    date: '2026-08-28',
  },
  {
    id: '5',
    email: 'neha.kapoor@example.com',
    name: 'Neha Kapoor',
    status: 'Subscribed',
    source: 'Facebook Lead',
    date: '2026-08-25',
  },
];

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

    return NextResponse.json({ subscribers: mockSubscribers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
