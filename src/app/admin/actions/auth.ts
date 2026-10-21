'use server';

import { createClient } from '@supabase/supabase-js';

import { requireAdmin } from '@/lib/auth/require-admin';
import { getSiteUrl } from '@/lib/utils/url';

function getAdminClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    'https://igrkrkxdantrolbldapj.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.'
    );
  }
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Sends a password reset email to the specified user email.
 * This utilizes the Supabase built-in auth email templates.
 */
export async function sendPasswordResetLink(email: string) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return {
        success: false,
        error: 'Unauthorized. Admin privileges are required.',
      };
    }

    const adminClient = getAdminClient();
    const { error } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
    });

    if (error) throw error;

    return { success: true };
  } catch (err: any) {
    console.error('Error sending reset link:', err);
    return {
      success: false,
      error: err.message || 'Failed to send reset link.',
    };
  }
}

/**
 * Directly updates a user's password in the auth.users table.
 * Requires the user's UUID.
 */
export async function getAllUsers() {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return {
        success: false,
        error: 'Unauthorized. Admin privileges are required.',
        users: [],
      };
    }

    const adminClient = getAdminClient();
    const { data, error } = await adminClient
      .from('users')
      .select(
        'id, full_name, email, phone, role, department_id, allowed_portals, wallet_balance, reward_coins, is_vip, vip_joined_at, vip_expires_at, vip_source, date_of_birth, is_dob_locked, created_at'
      )
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, users: data || [] };
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return {
      success: false,
      error: err.message || 'Failed to fetch users.',
      users: [],
    };
  }
}

export async function setAuthPassword(userId: string, newPassword: string) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return {
        success: false,
        error: 'Unauthorized. Admin privileges are required.',
      };
    }

    const adminClient = getAdminClient();

    // 1. Fetch user email from database
    const { data: userRec, error: userFetchError } = await adminClient
      .from('users')
      .select('email, id')
      .eq('id', userId)
      .maybeSingle();

    if (userFetchError || !userRec?.email) {
      return {
        success: false,
        error: 'User not found in system or email is missing.',
      };
    }

    // 2. Synchronize password with Firebase Auth (primary auth provider for login)
    try {
      const { getAdminAuth } = await import('@/lib/firebase-admin');
      const adminAuth = getAdminAuth();
      await adminAuth.updateUserPassword(userRec.email, newPassword);
    } catch (fbErr: any) {
      console.error('Error updating Firebase password:', fbErr);
      return {
        success: false,
        error: fbErr?.message || 'Failed to update password in Firebase Auth.',
      };
    }

    // 3. Synchronize password with Supabase Auth
    try {
      await adminClient.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
    } catch (supaErr) {
      console.warn('Supabase Auth password sync warning:', supaErr);
    }

    // 4. Touch updated_at in users table
    await adminClient
      .from('users')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', userId);

    return { success: true };
  } catch (err: any) {
    console.error('Error updating password:', err);
    return {
      success: false,
      error: err.message || 'Failed to update password.',
    };
  }
}
