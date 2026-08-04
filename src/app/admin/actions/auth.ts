'use server';

import { createClient } from '@supabase/supabase-js';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://igrkrkxdantrolbldapj.supabase.co';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is missing from environment variables.');
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
    const adminClient = getAdminClient();
    const { error } = await adminClient.auth.resetPasswordForEmail(email);
    
    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error('Error sending reset link:', err);
    return { success: false, error: err.message || 'Failed to send reset link.' };
  }
}

/**
 * Directly updates a user's password in the auth.users table.
 * Requires the user's UUID.
 */
export async function setAuthPassword(userId: string, newPassword: string) {
  try {
    const adminClient = getAdminClient();
    const { error } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    
    if (error) throw error;
    
    return { success: true };
  } catch (err: any) {
    console.error('Error updating password:', err);
    return { success: false, error: err.message || 'Failed to update password.' };
  }
}
