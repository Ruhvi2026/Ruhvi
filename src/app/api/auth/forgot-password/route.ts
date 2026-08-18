import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth } from '@/lib/firebase-admin';
import { sendPasswordResetEmail } from '@/lib/resend';
import { createClient } from '@supabase/supabase-js';

// Initialize a service-role supabase client to check user profiles
const getSupabase = () => {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const supabaseServiceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy_key';
  return createClient(supabaseUrl, supabaseServiceKey);
};

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();

    // 1. Get user details from Firebase Auth to ensure they exist
    let firebaseUser;
    try {
      firebaseUser = await adminAuth.getUserByEmail(email);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        return NextResponse.json(
          { error: 'No registered user found with this email address.' },
          { status: 404 }
        );
      }
      throw err;
    }

    // 2. Fetch the user's display name from Supabase users table (optional fallback)
    let displayName = 'Customer';
    const supabase = getSupabase();
    const { data: userProfile } = await supabase
      .from('users')
      .select('name')
      .eq('firebase_uid', firebaseUser.uid)
      .maybeSingle();

    if (userProfile?.name) {
      displayName = userProfile.name;
    } else if (firebaseUser.displayName) {
      displayName = firebaseUser.displayName;
    }

    // 3. Generate the standard Firebase password reset link
    const actionCodeSettings = {
      url: 'https://auth.ruhvi.in/login', // Redirect after reset completes
    };
    const defaultResetLink = await adminAuth.generatePasswordResetLink(
      email,
      actionCodeSettings
    );

    // 4. Swap the default Firebase domain with your custom auth domain reset page
    // Default link: https://ruhvi-f707c.firebaseapp.com/__/auth/action?apiKey=...&mode=resetPassword&oobCode=...
    // Custom link: https://auth.ruhvi.in/reset-password?apiKey=...&mode=resetPassword&oobCode=...
    const urlObj = new URL(defaultResetLink);
    const customResetLink = `https://auth.ruhvi.in/reset-password${urlObj.search}`;

    // 5. Send email via Resend
    const emailResult = await sendPasswordResetEmail(
      email,
      customResetLink,
      displayName
    );

    if (!emailResult) {
      return NextResponse.json(
        {
          error:
            'Failed to send reset email via Resend. Please check configuration.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[Forgot Password API Error]', error);

    // Map common Firebase Admin initialization errors to user-friendly messages
    let clientError = error.message || 'An unexpected error occurred.';
    if (
      clientError.includes('Failed to parse private key') ||
      clientError.includes('missing credentials')
    ) {
      clientError = `Firebase Admin configuration error: ${clientError}. Please check your Vercel environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, NEXT_PUBLIC_FIREBASE_PROJECT_ID).`;
    }

    return NextResponse.json(
      { error: clientError },
      { status: 400 } // Use 400 to prevent Vercel from overriding with HTML 500 page
    );
  }
}
