import { NextRequest, NextResponse } from 'next/server';
import { getAdapter } from '@/lib/email-orchestrator/adapters';
import {
  EmailProviderId,
  NormalizedEmailMessage,
} from '@/types/email-orchestrator';
import { EMAIL_CONFIG } from '@/lib/email-orchestrator/config';

export async function POST(request: NextRequest) {
  try {
    const { provider, recipientEmail, subject, message } = await request.json();

    if (!provider || !recipientEmail) {
      return NextResponse.json(
        { error: 'Provider and recipient email are required.' },
        { status: 400 }
      );
    }

    const normalizedEmail = recipientEmail.trim().toLowerCase();

    // Verify safe mode / allowlist
    if (!EMAIL_CONFIG.isRecipientAllowedInSafeMode(normalizedEmail)) {
      return NextResponse.json(
        {
          error: `Safe mode active: cannot send to ${normalizedEmail}. Recipient must be an allowlisted or ruhvi.in address.`,
        },
        { status: 403 }
      );
    }

    const adapter = getAdapter(provider as EmailProviderId);
    const testMessage: NormalizedEmailMessage = {
      deliveryId: crypto.randomUUID(),
      idempotencyKey: `test-${provider}-${Date.now()}`,
      category: 'internal_staff',
      from: {
        email: EMAIL_CONFIG.defaultSenderEmail,
        name: EMAIL_CONFIG.defaultSenderName,
      },
      to: {
        email: normalizedEmail,
        name: 'Ruhvi Admin Tester',
      },
      subject: subject || `[Ruhvi Test Send] Provider: ${provider}`,
      html: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2 style="color: #b8860b;">Ruhvi Email Infrastructure Test</h2>
          <p>This is a live test email dispatched via <strong>${provider.toUpperCase()}</strong>.</p>
          <p style="background: #f4f4f4; padding: 12px; border-radius: 6px;">
            <strong>Message:</strong> ${message || 'System connectivity verified successfully.'}
          </p>
          <p style="color: #666; font-size: 12px;">Timestamp: ${new Date().toISOString()}</p>
        </div>
      `,
      text: `Ruhvi Email Test\nProvider: ${provider}\n${message || 'System connectivity verified successfully.'}`,
    };

    const result = await adapter.sendTransactional(testMessage);

    if (!result.accepted) {
      return NextResponse.json(
        {
          success: false,
          error: result.error?.message || 'Provider rejected test message',
          code: result.error?.code,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      provider: result.provider,
      providerMessageId: result.providerMessageId,
      acceptedAt: result.acceptedAt,
    });
  } catch (error: any) {
    console.error('[Admin Test Send Error]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
