import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { decodeJwt } from 'jose';
import { createServerClient } from '@supabase/ssr';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return false;
  try {
    const decoded = decodeJwt(sessionCookie);
    if (!decoded || !decoded.sub) return false;
    return true;
  } catch (e) {
    return false;
  }
}

export async function GET(req: Request) {
  if (!(await verifyAdmin())) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cookieStore = await cookies();
    const supabaseAdmin = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
        'https://igrkrkxdantrolbldapj.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {},
        },
      }
    );

    // Fetch last 200 logs
    const { data: logs, error } = await supabaseAdmin
      .from('ai_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      console.warn(
        'Failed to fetch ai_logs, possibly migration not run yet.',
        error
      );
      return NextResponse.json({ logs: [] });
    }

    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
