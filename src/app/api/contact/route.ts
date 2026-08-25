import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendEmail } from '@/lib/brevo';

const contactSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(254),
  message: z.string().trim().min(10).max(5000),
});

const rateLimitStore = new Map<string, number[]>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const timestamps = rateLimitStore.get(key) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    rateLimitStore.set(key, recent);
    return false;
  }
  recent.push(now);
  rateLimitStore.set(key, recent);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = contactSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid submission. Please check your details and try again.',
        },
        { status: 400 }
      );
    }

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown';
    if (!checkRateLimit(ip, 3, 60 * 60 * 1000)) {
      return NextResponse.json(
        {
          error: 'Too many messages from this device. Please try again later.',
        },
        { status: 429 }
      );
    }

    const { name, email, message } = parsed.data;

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #121110; background: #FDFAF3; border-radius: 12px; overflow: hidden; border: 1px solid #E8DFC6;">
        <div style="background: #1C1B1A; padding: 24px 32px; text-align: center;">
          <h1 style="color: #C29831; font-size: 20px; margin: 0; letter-spacing: 2px;">RUHVI</h1>
          <p style="color: #A09080; font-size: 11px; margin: 4px 0 0; letter-spacing: 1px;">FINE JEWELLERY</p>
        </div>
        <div style="padding: 32px;">
          <h2 style="color: #1C1B1A; font-size: 18px; margin: 0 0 8px;">New Contact Form Message</h2>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px; width: 100px;">Name</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px; font-weight: 600;">${escapeHtml(name)}</td></tr>
            <tr><td style="padding: 6px 0; color: #8A7E6C; font-size: 13px;">Email</td><td style="padding: 6px 0; color: #1C1B1A; font-size: 13px; font-weight: 600;">${escapeHtml(email)}</td></tr>
          </table>
          <div style="background: #F5F0E6; border-radius: 8px; padding: 16px; margin: 12px 0; color: #4A4540; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(message)}</div>
          <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #E8DFC6;">
            <p style="font-size: 12px; color: #8A7E6C; margin: 0;">Sent from the Contact Concierge form on ruhvi.in</p>
          </div>
        </div>
      </div>
    `;

    const result = await sendEmail({
      to: [
        {
          email: process.env.CONTACT_RECIPIENT_EMAIL || 'support@ruhvi.in',
          name: 'Ruhvi Support',
        },
      ],
      subject: `Contact Form: ${name}`,
      htmlContent,
    });

    if (!result) {
      return NextResponse.json(
        { error: 'Failed to send message. Please try again later.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Contact form error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (ch) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        ch
      ]!
  );
}
