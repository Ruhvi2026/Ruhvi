import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerUser } from '@/lib/auth/server';
import { getSupabaseAdminClient } from '@/lib/support/serverAuth';

const mockSegments = [
  {
    id: '1',
    name: 'High Value Customers',
    description: 'Customers with LTV > ₹10,000',
    size: 1240,
    lastUpdated: '2026-08-30',
  },
  {
    id: '2',
    name: 'Abandoned Cart',
    description: 'Users who left items in cart within last 24h',
    size: 342,
    lastUpdated: '2026-08-31',
  },
  {
    id: '3',
    name: 'Inactive (>6 months)',
    description: 'Customers who have not purchased in 6 months',
    size: 5430,
    lastUpdated: '2026-08-25',
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

    return NextResponse.json({ segments: mockSegments });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Segment name is required' },
        { status: 400 }
      );
    }

    const newSegment = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      description: description || '',
      size: 0,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    mockSegments.push(newSegment);

    return NextResponse.json({ success: true, segment: newSegment });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
