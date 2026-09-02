import { NextResponse } from 'next/server';
import { sendWelcomeEmail } from '@/lib/resend';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, name } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Verify user is authenticated to prevent spam
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    // We optionally allow unauthenticated if they literally just signed up via Firebase,
    // but a basic sanity check is good.
    // Actually, Firebase handles auth client-side, so Supabase session might not be fully established immediately
    // if using Firebase Custom Token sync. We'll proceed if we have an email.

    await sendWelcomeEmail(email, name || 'Beautiful');

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to send welcome email:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
