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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
      !hasPermission(profile, 'promotions.edit') &&
      !hasPermission(profile, 'marketing.edit')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;
    const body = await request.json();

    const { data, error } = await supabase
      .from('promotions')
      .update(body)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Error updating promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
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
      !hasPermission(profile, 'promotions.edit') &&
      !hasPermission(profile, 'marketing.edit')
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await context.params;

    const { error } = await supabase.from('promotions').delete().eq('id', id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting promotion:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
