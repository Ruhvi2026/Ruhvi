import {
  TemplateRenderer,
  htmlToPlainText,
} from '@/lib/email-orchestrator/template-renderer';
import {
  EMAIL_CONFIG,
  INITIAL_ROUTING_POLICIES,
} from '@/lib/email-orchestrator/config';
import { RouterService } from '@/lib/email-orchestrator/router-service';
import { SuppressionService } from '@/lib/email-orchestrator/suppression-service';

describe('Email Orchestrator Infrastructure Unit Tests', () => {
  describe('TemplateRenderer & Plain Text Extraction', () => {
    it('converts basic HTML into readable plain text', () => {
      const html =
        '<h1>Welcome to Ruhvi</h1><p>Thank you for shopping with us!</p><a href="https://ruhvi.in">Visit Store</a>';
      const text = htmlToPlainText(html);
      expect(text).toContain('Welcome to Ruhvi');
      expect(text).toContain('Thank you for shopping with us!');
      expect(text).toContain('Visit Store (https://ruhvi.in)');
    });

    it('renders inline HTML correctly when rawHtml or markup is passed', () => {
      const { html, text } = TemplateRenderer.render(
        '<div class="box"><p>Hello Shreya</p></div>',
        {}
      );
      expect(html).toContain('Hello Shreya');
      expect(text).toContain('Hello Shreya');
    });

    it('renders fallback message if template not found', () => {
      const { html, text } = TemplateRenderer.render(
        'non_existent_template.html',
        {
          message: 'Your order was processed',
        }
      );
      expect(html).toContain('Your order was processed');
      expect(text).toContain('Your order was processed');
    });
  });

  describe('EMAIL_CONFIG & Safe Mode Allowlist', () => {
    it('allows emails on the safe mode allowlist', () => {
      expect(
        EMAIL_CONFIG.isRecipientAllowedInSafeMode('support@ruhvi.in')
      ).toBe(true);
      expect(EMAIL_CONFIG.isRecipientAllowedInSafeMode('admin@ruhvi.in')).toBe(
        true
      );
      expect(
        EMAIL_CONFIG.isRecipientAllowedInSafeMode('ruhvi.main@gmail.com')
      ).toBe(true);
    });

    it('blocks arbitrary external emails in safe mode', () => {
      const isAllowed = EMAIL_CONFIG.isRecipientAllowedInSafeMode(
        'random.unauthorized.user@example.com'
      );
      expect(typeof isAllowed).toBe('boolean');
    });

    it('provides valid provider limits for Resend, Mailjet, and Brevo', () => {
      const resendDefaults = EMAIL_CONFIG.providerDefaults.resend;
      const mailjetDefaults = EMAIL_CONFIG.providerDefaults.mailjet;
      const brevoDefaults = EMAIL_CONFIG.providerDefaults.brevo;

      expect(resendDefaults.dailyLimit).toBe(100);
      expect(resendDefaults.monthlyLimit).toBe(3000);
      expect(mailjetDefaults.dailyLimit).toBe(200);
      expect(mailjetDefaults.monthlyLimit).toBe(6000);
      expect(brevoDefaults.dailyLimit).toBe(300);
      expect(brevoDefaults.monthlyLimit).toBe(9000);
    });
  });

  describe('RouterService & Initial Policies', () => {
    it('returns default primary and fallback providers for each category', async () => {
      const orderPolicy = await RouterService.getPolicy('order_transactional');
      expect(orderPolicy.primaryProvider).toBe('mailjet');
      expect(orderPolicy.fallbackProvider).toBe('resend');
      expect(orderPolicy.enabled).toBe(true);

      const securityPolicy = await RouterService.getPolicy('account_security');
      expect(securityPolicy.primaryProvider).toBe('resend');
      expect(securityPolicy.fallbackProvider).toBe('mailjet');
      expect(securityPolicy.enabled).toBe(true);
    });

    it('correctly maps category aliases via normalizeCategory', async () => {
      const aliasedOrderPolicy = await RouterService.getPolicy('order');
      expect(aliasedOrderPolicy.primaryProvider).toBe('mailjet');

      const aliasedAuthPolicy = await RouterService.getPolicy('auth');
      expect(aliasedAuthPolicy.primaryProvider).toBe('resend');
    });

    it('contains valid static initial policies for all categories', () => {
      expect(INITIAL_ROUTING_POLICIES.account_security.primaryProvider).toBe(
        'resend'
      );
      expect(INITIAL_ROUTING_POLICIES.order_transactional.primaryProvider).toBe(
        'mailjet'
      );
      expect(INITIAL_ROUTING_POLICIES.marketing_campaign.primaryProvider).toBe(
        'mailjet'
      );
      expect(INITIAL_ROUTING_POLICIES.internal_staff.primaryProvider).toBe(
        'brevo'
      );
      expect(INITIAL_ROUTING_POLICIES.internal_staff.fallbackProvider).toBe(
        'mailjet'
      );
    });
  });

  describe('SuppressionService', () => {
    it('computes deterministic SHA-256 hash for email addresses', () => {
      const hash1 = SuppressionService.hashEmail('test@ruhvi.in');
      const hash2 = SuppressionService.hashEmail('  TEST@RUHVI.IN  ');
      expect(hash1).toBe(hash2);
      expect(hash1).toHaveLength(64); // SHA-256 hex string length
    });
  });
});
