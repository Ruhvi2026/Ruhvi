jest.mock('server-only', () => ({}));

import {
  observeTicketLifecycleTransition,
  observeTicketReply,
  fetchTicketLifecycleEvents,
  mapTicketStatusToEventType,
} from '../support-events';
import { getServiceClient } from '@/lib/supabase/service';

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(),
}));

describe('Support & CRM Intelligence Pipeline (Phase 12)', () => {
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSupabase = {
      from: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    (getServiceClient as jest.Mock).mockReturnValue(mockSupabase);
  });

  describe('mapTicketStatusToEventType', () => {
    it('correctly maps statuses and creation flags to canonical event types', () => {
      expect(mapTicketStatusToEventType('new', true)).toBe(
        'SUPPORT_TICKET_CREATED'
      );
      expect(mapTicketStatusToEventType('open', true)).toBe(
        'SUPPORT_TICKET_CREATED'
      );
      expect(mapTicketStatusToEventType('in_progress', false)).toBe(
        'SUPPORT_TICKET_ASSIGNED'
      );
      expect(mapTicketStatusToEventType('resolved', false)).toBe(
        'SUPPORT_TICKET_RESOLVED'
      );
      expect(mapTicketStatusToEventType('closed', false)).toBe(
        'SUPPORT_TICKET_CLOSED'
      );
      expect(mapTicketStatusToEventType('reopened', false)).toBe(
        'SUPPORT_TICKET_REOPENED'
      );
    });
  });

  describe('observeTicketLifecycleTransition', () => {
    it('observes ticket creation with SLA and priority metadata', async () => {
      const result = await observeTicketLifecycleTransition({
        ticketId: 'tkt_001_uuid',
        ticketNumber: 'RUV-2026-000101',
        status: 'new',
        priority: 'high',
        source: 'ai_chat',
        categoryId: 'cat_delivery',
        categoryName: 'Shipping & Delivery',
        slaBreached: false,
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('SUPPORT_TICKET_CREATED');
      expect(result.event.idempotencyKey).toBe(
        'idemp_supp_create_tkt_001_uuid'
      );
      expect(result.event.entity.id).toBe('tkt_001_uuid');
      expect(result.event.entity.code).toBe('RUV-2026-000101');
      expect(result.event.payload.priority).toBe('high');
      expect(result.event.payload.categoryName).toBe('Shipping & Delivery');
      // Verify no message text exists
      expect((result.event.payload as any).message).toBeUndefined();
    });

    it('observes ticket resolution with resolution time and SLA status', async () => {
      const result = await observeTicketLifecycleTransition({
        ticketId: 'tkt_002_uuid',
        ticketNumber: 'RUV-2026-000102',
        status: 'resolved',
        previousStatus: 'in_progress',
        assignedTo: 'usr_agent_77',
        resolutionTimeMs: 14400000, // 4 hours
        slaBreached: false,
        actor: { type: 'staff', id: 'usr_agent_77' },
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('SUPPORT_TICKET_RESOLVED');
      expect(result.event.idempotencyKey).toBe(
        'idemp_supp_status_tkt_002_uuid_resolved'
      );
      expect(result.event.actor.id).toBe('usr_agent_77');
      expect(result.event.payload.resolutionTimeMs).toBe(14400000);
      expect(result.event.payload.slaBreached).toBe(false);
    });

    it('observes ticket reopened event', async () => {
      const result = await observeTicketLifecycleTransition({
        ticketId: 'tkt_003_uuid',
        ticketNumber: 'RUV-2026-000103',
        status: 'reopened',
        previousStatus: 'resolved',
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('SUPPORT_TICKET_REOPENED');
      expect(result.event.idempotencyKey).toBe(
        'idemp_supp_status_tkt_003_uuid_reopened'
      );
    });
  });

  describe('observeTicketReply', () => {
    it('observes reply activity signal strictly without message content', async () => {
      const result = await observeTicketReply({
        ticketId: 'tkt_004_uuid',
        ticketNumber: 'RUV-2026-000104',
        messageId: 'msg_999_uuid',
        senderType: 'ai',
        senderId: 'gia_concierge_bot',
        visibility: 'customer',
        hasAttachments: false,
      });

      expect(result.observed).toBe(true);
      expect(result.event.eventType).toBe('SUPPORT_TICKET_REPLIED');
      expect(result.event.idempotencyKey).toBe('idemp_supp_reply_msg_999_uuid');
      expect(result.event.actor.type).toBe('ai_agent');
      expect(result.event.payload.senderType).toBe('ai');
      expect((result.event.payload as any).message).toBeUndefined();
      expect((result.event.payload as any).text).toBeUndefined();
    });
  });

  describe('fetchTicketLifecycleEvents', () => {
    it('constructs lifecycle events from database record', async () => {
      const mockTicket = {
        id: 'tkt_005_uuid',
        ticket_number: 'RUV-2026-000105',
        priority: 'normal',
        status: 'resolved',
        source: 'ai_chat',
        assigned_to: 'usr_agent_5',
        created_at: '2026-10-26T10:00:00.000Z',
        first_response_at: '2026-10-26T10:15:00.000Z',
        resolved_at: '2026-10-26T12:00:00.000Z',
        closed_at: null,
        sla_breached: false,
      };

      mockSupabase.single.mockResolvedValueOnce({
        data: mockTicket,
        error: null,
      });

      const events = await fetchTicketLifecycleEvents('tkt_005_uuid');

      expect(events).toHaveLength(2);
      expect(events[0].eventType).toBe('SUPPORT_TICKET_CREATED');
      expect(events[0].entity.code).toBe('RUV-2026-000105');
      expect(events[1].eventType).toBe('SUPPORT_TICKET_RESOLVED');
      expect(events[1].actor.id).toBe('usr_agent_5');
    });

    it('returns empty array when ticket does not exist', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: new Error('Ticket not found'),
      });

      const events = await fetchTicketLifecycleEvents('tkt_missing');
      expect(events).toEqual([]);
    });
  });
});
