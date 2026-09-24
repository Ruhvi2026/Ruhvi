// src/app/api/internal-chat/staff/route.ts
//
// GET /api/internal-chat/staff  → List all active staff users for @mention, new chat, etc.
//
// Security: Requires authenticated staff session.

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { getServiceClient } from '@/lib/supabase/service';

async function getAuthenticatedStaff() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) return null;
  const supabase = getServiceClient();
  const { data: user } = await supabase
    .from('users')
    .select('id, role, account_status')
    .eq('id', decoded.sub as string)
    .maybeSingle();
  if (!user || user.account_status !== 'active' || user.role === 'customer')
    return null;
  return user;
}

export async function GET(req: Request) {
  try {
    const caller = await getAuthenticatedStaff();
    if (!caller)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const search = url.searchParams.get('q')?.trim();

    const supabase = getServiceClient();

    let query = supabase
      .from('users')
      .select('id, full_name, email, role, department, department_id')
      .neq('role', 'customer')
      .eq('account_status', 'active')
      .neq('id', caller.id) // exclude self
      .order('full_name', { ascending: true })
      .limit(50);

    if (search) {
      query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data: staffList, error } = await query;
    if (error) throw error;

    return NextResponse.json({ staff: staffList || [] });
  } catch (err: any) {
    console.error('[Chat GET /staff]', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
