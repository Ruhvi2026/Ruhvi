'use server';

import { sendTransactionalEmail } from '@/lib/brevo';
import { requireAdmin } from '@/lib/auth/require-admin';

export async function quickSendEmail(
  to: string,
  subject: string,
  htmlContent: string
) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      throw new Error(
        auth.error === 'Unauthorized'
          ? 'Unauthorized. Please sign in.'
          : 'Forbidden. Admin privileges are required.'
      );
    }
    await sendTransactionalEmail(to, subject, htmlContent, 'Ruhvi Marketing');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send email');
  }
}
