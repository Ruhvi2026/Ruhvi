import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import { executeCoFounderTool } from '@/lib/ai/co-founder/tool-bridge';
import { getUserScopes } from '@/lib/auth/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
    }

    const { toolName, args } = await req.json();
    if (!toolName) {
      return NextResponse.json(
        { error: 'toolName is required' },
        { status: 400 }
      );
    }

    const scopes = await getUserScopes(auth.uid);

    const result = await executeCoFounderTool(toolName, args, scopes);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Tool execution failed' },
      { status: 500 }
    );
  }
}
