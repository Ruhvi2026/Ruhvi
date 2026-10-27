import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getCustomer360Profile,
  Customer360ForbiddenError,
  Customer360NotFoundError,
} from '@/lib/intelligence/customer-360-service';

/**
 * ============================================================================
 * GET /api/customer-360/[id] (TRACK F - PHASE 32)
 * ============================================================================
 * Server-side read endpoint for the authorized Customer 360 summary.
 *
 * Guarantees:
 * 1. Strict Server-Side Authentication & Authorization:
 *    - Authenticated via requireAdmin() session token.
 *    - Frontline staff receive masked contact PII with commercial spend totals hidden.
 *    - Administrators receive unmasked profiles with full audit logging.
 * 2. Input Validation:
 *    - Target customer ID must be a non-empty string.
 * 3. Safe Error Handling:
 *    - 401 Unauthorized / 403 Forbidden / 404 Not Found / 500 Internal Error.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id: customerId } = await context.params;

    if (!customerId || typeof customerId !== 'string') {
      return NextResponse.json(
        { error: 'Customer ID parameter is required' },
        { status: 400 }
      );
    }

    const profile = await getCustomer360Profile({
      targetCustomerId: customerId,
      requestedByActor: {
        actorId: auth.uid,
        role: auth.role || 'staff',
      },
    });

    return NextResponse.json({
      success: true,
      customer360: profile,
    });
  } catch (err: any) {
    if (err instanceof Customer360ForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }

    if (err instanceof Customer360NotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }

    console.error('[Customer360 API] Error assembling profile:', err);
    return NextResponse.json(
      { error: 'Failed to assemble customer 360 profile' },
      { status: 500 }
    );
  }
}
