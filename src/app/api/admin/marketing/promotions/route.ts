import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/auth/server';

function hasPermission(profile: any, reqPerm: string) {
  if (!profile) return false;
  const role = profile.role?.toUpperCase();
  if (role === 'SUPER_ADMIN') return true;
  const perms = profile.permissions || [];
  if (perms.includes('*') || perms.includes(reqPerm)) return true;
  const [module] = reqPerm.split('.');
  if (perms.includes(`${module}.*`)) return true;
  return false;
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (
      !hasPermission(profile, 'promotions.view') &&
      !hasPermission(profile, 'marketing.view')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: promotions, error } = await supabase
      .from('promotions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(promotions);
  } catch (error: any) {
    console.error('Error fetching promotions:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { user } = await getServerUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (
      !hasPermission(profile, 'promotions.create') &&
      !hasPermission(profile, 'marketing.edit')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    if (
      !body.name ||
      !body.discount_type ||
      body.discount_value === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('promotions')
      .insert([
        {
          name: body.name,
          discount_type: body.discount_type,
          discount_value: body.discount_value,
          start_date: body.start_date || null,
          end_date: body.end_date || null,
          active: body.active !== undefined ? body.active : true,
          applicable_to: body.applicable_to || 'all',
        },
      ])
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error creating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
