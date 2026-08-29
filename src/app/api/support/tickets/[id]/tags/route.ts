import { NextResponse, NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';

/**
 * /api/support/tickets/[id]/tags
 * GET  — list tags on a ticket (staff only)
 * POST — add a tag: { tag_type: 'person', tagged_staff_id } | { tag_type: 'team', tagged_team }
 *        body also supports { resolve_tag_id } to mark an open tag as responded.
 *
 * Backs spec §4.3 (cross-team tagging / @mentions). The "still owes a response"
 * indicator is powered by resolved_at IS NULL.
 */

const VALID_TEAMS = ['operations', 'marketing', 'orders', 'admin'];

async function getSupabaseAdmin(cookieStore: any) {
  return createServerClient(
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
}

async function getCurrentUser(cookieStore: any) {
  const sessionCookie = cookieStore.get('__session')?.value;
  if (!sessionCookie) return null;
  try {
    const decoded = await verifySessionToken(sessionCookie);
    const uid = decoded?.sub;
    if (!uid) return null;
    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: user } = await supabase
      .from('users')
      .select('id, full_name, email, role')
      .eq('id', uid)
      .maybeSingle();
    return user;
  } catch {
    return null;
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = [
      'admin',
      'manager',
      'staff',
      'super_admin',
      'SUPER_ADMIN',
    ].includes(user.role);
    if (!isStaff)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = await getSupabaseAdmin(cookieStore);
    const { data: tags, error } = await supabase
      .from('support_ticket_tags')
      .select(
        `
        id, ticket_id, tag_type, tagged_team, created_at, resolved_at,
        tagged_staff:tagged_staff_id(id, full_name, email, role),
        tagged_by:tagged_by_staff_id(id, full_name, email)
      `
      )
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (error)
      return NextResponse.json(
        { error: 'Failed to load tags' },
        { status: 500 }
      );
    return NextResponse.json({ tags: tags || [] });
  } catch (err: any) {
    console.error('Tags GET error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const user = await getCurrentUser(cookieStore);
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const isStaff = [
      'admin',
      'manager',
      'staff',
      'super_admin',
      'SUPER_ADMIN',
    ].includes(user.role);
    if (!isStaff)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = await getSupabaseAdmin(cookieStore);
    const body = await req.json();

    // Resolve an open tag (a team/person responded).
    if (body.resolve_tag_id) {
      const { data: resolved, error } = await supabase
        .from('support_ticket_tags')
        .update({ resolved_at: new Date().toISOString() })
        .eq('id', body.resolve_tag_id)
        .eq('ticket_id', id)
        .select('id, tag_type, tagged_team, tagged_staff_id, resolved_at')
        .single();

      if (error) {
        console.error('Resolve tag error:', error);
        return NextResponse.json(
          { error: 'Failed to resolve tag' },
          { status: 500 }
        );
      }

      await supabase.from('support_ticket_audit_log').insert({
        ticket_id: id,
        actor_id: user.id,
        actor_type: 'staff',
        action: 'tag_resolved',
        new_value: {
          tag_id: resolved.id,
          tag_type: resolved.tag_type,
          tagged_team: resolved.tagged_team,
          tagged_staff_id: resolved.tagged_staff_id,
        },
      });

      return NextResponse.json({ tag: resolved });
    }

    // Add a tag.
    const { tag_type, tagged_staff_id, tagged_team } = body;
    if (!['person', 'team'].includes(tag_type)) {
      return NextResponse.json(
        { error: 'tag_type must be person or team' },
        { status: 400 }
      );
    }

    if (tag_type === 'person' && !tagged_staff_id) {
      return NextResponse.json(
        { error: 'tagged_staff_id required for person tag' },
        { status: 400 }
      );
    }
    if (tag_type === 'team' && !VALID_TEAMS.includes(tagged_team)) {
      return NextResponse.json({ error: 'Invalid team' }, { status: 400 });
    }

    // Prevent duplicate open tags (person or team already tagged & unresolved).
    const dupQuery = supabase
      .from('support_ticket_tags')
      .select('id')
      .eq('ticket_id', id)
      .is('resolved_at', null);
    if (tag_type === 'person') {
      dupQuery.eq('tagged_staff_id', tagged_staff_id);
    } else {
      dupQuery.eq('tagged_team', tagged_team);
    }
    const { data: existing } = await dupQuery.limit(1);
    if (existing && existing.length > 0) {
      return NextResponse.json(
        {
          error: 'This person/team is already tagged and awaiting a response.',
        },
        { status: 409 }
      );
    }

    const { data: tag, error } = await supabase
      .from('support_ticket_tags')
      .insert({
        ticket_id: id,
        tag_type,
        tagged_staff_id: tag_type === 'person' ? tagged_staff_id : null,
        tagged_team: tag_type === 'team' ? tagged_team : null,
        tagged_by_staff_id: user.id,
      })
      .select(
        `
        id, ticket_id, tag_type, tagged_team, created_at, resolved_at,
        tagged_staff:tagged_staff_id(id, full_name, email, role)
      `
      )
      .single();

    if (error) {
      console.error('Add tag error:', error);
      return NextResponse.json({ error: 'Failed to add tag' }, { status: 500 });
    }

    await supabase.from('support_ticket_audit_log').insert({
      ticket_id: id,
      actor_id: user.id,
      actor_type: 'staff',
      action: 'tag_added',
      new_value: {
        tag_type,
        tagged_staff_id: tagged_staff_id || null,
        tagged_team: tagged_team || null,
      },
    });

    return NextResponse.json({ tag }, { status: 201 });
  } catch (err: any) {
    console.error('Tags POST error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
