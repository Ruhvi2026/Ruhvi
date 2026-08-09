import { AITool } from './index';

export const brevoTools: AITool[] = [
  {
    name: 'send_transactional_email',
    description:
      'Send a transactional email to a specific user using Brevo SMTP. Use this when the user asks to send an email.',
    parameters: {
      type: 'object',
      properties: {
        to: {
          type: 'string',
          description: 'The email address of the recipient.',
        },
        subject: {
          type: 'string',
          description: 'The subject line of the email.',
        },
        htmlContent: {
          type: 'string',
          description: 'The HTML content of the email body.',
        },
        senderName: {
          type: 'string',
          description:
            'Optional. The name of the sender. Defaults to the system sender name.',
        },
      },
      required: ['to', 'subject', 'htmlContent'],
    },
    execute: async (args: Record<string, any>) => {
      // We will implement the actual call in src/lib/brevo.ts and import it
      const { sendTransactionalEmail } = await import('@/lib/brevo');
      return await sendTransactionalEmail(
        args.to,
        args.subject,
        args.htmlContent,
        args.senderName
      );
    },
  },
  {
    name: 'create_or_update_contact',
    description:
      'Create or update a contact in Brevo. Use this to add a user to the mailing list or update their details.',
    parameters: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'The email address of the contact.',
        },
        attributes: {
          type: 'object',
          description:
            'Optional attributes for the contact (e.g., FIRSTNAME, LASTNAME).',
          additionalProperties: true,
        },
        listIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'Optional array of list IDs to add the contact to.',
        },
      },
      required: ['email'],
    },
    execute: async (args: Record<string, any>) => {
      const { createOrUpdateContact } = await import('@/lib/brevo');
      return await createOrUpdateContact(
        args.email,
        args.attributes,
        args.listIds
      );
    },
  },
  {
    name: 'get_campaign_stats',
    description: 'Retrieve statistics for email campaigns from Brevo.',
    parameters: {
      type: 'object',
      properties: {
        startDate: {
          type: 'string',
          description: 'Optional. Start date in YYYY-MM-DD format.',
        },
        endDate: {
          type: 'string',
          description: 'Optional. End date in YYYY-MM-DD format.',
        },
      },
      required: [],
    },
    execute: async (args: Record<string, any>) => {
      const { getCampaignStats } = await import('@/lib/brevo');
      return await getCampaignStats(args.startDate, args.endDate);
    },
  },
];
