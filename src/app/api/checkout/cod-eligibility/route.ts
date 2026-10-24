import { NextResponse } from 'next/server';
import { getServerUser } from '@/lib/auth/server';
import { OrderService } from '@/services/order.service';

// ---------------------------------------------------------------------------
// Lightweight COD eligibility check for the checkout page.
//
// Security: the caller's identity is verified server-side from the signed
// `__session` cookie (getServerUser) and the eligibility record is looked up
// for that exact user — the `customerId` is NOT taken from the query string,
// so an anonymous caller cannot read another customer's COD state.
//
// Only `cod_disabled` is returned. Refusal counters are staff-internal and are
// never exposed to the checkout page.
//
// Fails OPEN (COD allowed) if the record is absent or the lookup errors, so an
// uninitialized/edge state never blocks a legitimate COD customer.
// ---------------------------------------------------------------------------
export async function GET() {
  try {
    const { user } = await getServerUser();
    if (!user?.id) {
      return NextResponse.json({ cod_disabled: false });
    }

    const { cod_disabled } = await OrderService.getCodEligibility(user.id);
    return NextResponse.json({ cod_disabled });
  } catch (error) {
    console.error('COD eligibility check error:', error);
    return NextResponse.json({ cod_disabled: false });
  }
}
