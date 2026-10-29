import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/service';
import { EmailCategory, EmailProviderId } from '@/types/email-orchestrator';

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      category,
      primaryProvider,
      fallbackProvider,
      enabled,
      fallbackEnabled,
      priority,
    } = body;

    if (!category || !primaryProvider) {
      return NextResponse.json(
        { error: 'Category and primary provider are required.' },
        { status: 400 }
      );
    }

    if (fallbackProvider && fallbackProvider === primaryProvider) {
      return NextResponse.json(
        { error: 'Primary and fallback providers must be different.' },
        { status: 400 }
      );
    }

    const supabase = await getSupabaseAdmin();
    const { data, error } = await supabase
      .from('email_routing_policies')
      .upsert(
        {
          category,
          primary_provider: primaryProvider,
          fallback_provider: fallbackProvider || null,
          enabled: enabled !== undefined ? enabled : true,
          fallback_enabled:
            fallbackEnabled !== undefined ? fallbackEnabled : true,
          priority: priority || 50,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'category' }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, policy: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
