'use server';

import { sendTransactionalEmail } from '@/lib/brevo';

export async function quickSendEmail(
  to: string,
  subject: string,
  htmlContent: string
) {
  try {
    await sendTransactionalEmail(to, subject, htmlContent, 'Ruhvi Marketing');
    return { success: true };
  } catch (error: any) {
    throw new Error(error.message || 'Failed to send email');
  }
}
