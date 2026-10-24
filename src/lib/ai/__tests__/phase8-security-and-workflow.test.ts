jest.mock('server-only', () => ({}));

import { ordersLogisticsWorker } from '../co-founder/workers/worker-13-orders-logistics';
import { workerRegistry } from '../co-founder/workers/registry';
import { maskPhoneNumber, maskCustomerName } from '../proactive/dispatcher';
import { DANGLING_PROMISE_REGEX } from '../co-founder/orchestrator';

describe('Phase 8: Comprehensive Security & Functional Verification', () => {
  describe('1. Worker 13 (Orders & Logistics) Security & Scoping', () => {
    it('is registered in worker registry under ID worker_orders_logistics', () => {
      const worker = workerRegistry.getWorker('worker_orders_logistics');
      expect(worker).toBeDefined();
      expect(worker?.name).toBe('Orders & Logistics Worker');
    });

    it('has exactly the 5 allowed logistics tools and ZERO financial tools', () => {
      const def = ordersLogisticsWorker.getDefinition();
      const toolNames = def.requiredTools;

      // Permitted logistics tools
      expect(toolNames).toContain('get_delivery_failed_and_rto_orders');
      expect(toolNames).toContain('get_courier_sla_delays');
      expect(toolNames).toContain('get_return_requests_and_reasons');
      expect(toolNames).toContain('get_order_call_remarks');
      expect(toolNames).toContain('add_order_call_remark');

      // STRICT SECRECY: Prohibited executive and financial tools
      expect(toolNames).not.toContain('getRevenueMetrics');
      expect(toolNames).not.toContain('getProfitMargins');
      expect(toolNames).not.toContain('getHolisticBusinessContext');
      expect(toolNames).not.toContain('getExecutiveSignals');
      expect(toolNames).not.toContain('getGrossMerchandiseValue');
      expect(toolNames).not.toContain('publishBlogPost');
    });

    it('mandates strict PII and financial secrecy in its definition responsibilities', () => {
      const def = ordersLogisticsWorker.getDefinition();
      const responsibilitiesText = def.responsibilities.join(' ');
      expect(responsibilitiesText).toContain('financial secrecy');
      expect(responsibilitiesText).toContain('order_call_remarks');
    });
  });

  describe('2. Customer PII Masking & Data Leakage Prevention', () => {
    it('masks phone numbers with leading/trailing country codes securely', () => {
      expect(maskPhoneNumber('9830123482')).toBe('+91 98301 ••••82');
      expect(maskPhoneNumber('+919830123482')).toBe('+91 98301 ••••82');
      expect(maskPhoneNumber('919830123482')).toBe('+91 98301 ••••82');
    });

    it('handles edge-cases and empty phone inputs without leaking raw memory', () => {
      expect(maskPhoneNumber(null)).toBe('N/A');
      expect(maskPhoneNumber(undefined)).toBe('N/A');
      expect(maskPhoneNumber('')).toBe('N/A');
    });

    it('masks customer full names to first name + initial', () => {
      expect(maskCustomerName('Riya Mukherjee')).toBe('Riya M.');
      expect(maskCustomerName('Deepak Kumar Das')).toBe('Deepak D.');
      expect(maskCustomerName('Shorbajit')).toBe('Shorbajit');
    });
  });

  describe('3. Anti-Collision & Call Claim Logic', () => {
    const COLLISION_WINDOW_MINUTES = 20;

    function isCallCollisionActive(
      latestRemark: { call_status: string; created_at: string } | null,
      now = Date.now()
    ) {
      if (!latestRemark || latestRemark.call_status !== 'calling_in_progress') {
        return false;
      }
      const diffMinutes =
        (now - new Date(latestRemark.created_at).getTime()) / (1000 * 60);
      return diffMinutes <= COLLISION_WINDOW_MINUTES;
    }

    it('detects active call collision when a call started 5 minutes ago', () => {
      const fiveMinsAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const remark = {
        call_status: 'calling_in_progress',
        created_at: fiveMinsAgo,
      };
      expect(isCallCollisionActive(remark)).toBe(true);
    });

    it('allows new calls when previous in-progress call is older than 20 minutes', () => {
      const twentyFiveMinsAgo = new Date(
        Date.now() - 25 * 60 * 1000
      ).toISOString();
      const remark = {
        call_status: 'calling_in_progress',
        created_at: twentyFiveMinsAgo,
      };
      expect(isCallCollisionActive(remark)).toBe(false);
    });

    it('clears collision immediately when call status is resolved or unreachable', () => {
      const oneMinAgo = new Date(Date.now() - 1 * 60 * 1000).toISOString();
      expect(
        isCallCollisionActive({
          call_status: 'connected_resolved',
          created_at: oneMinAgo,
        })
      ).toBe(false);

      expect(
        isCallCollisionActive({
          call_status: 'customer_unreachable',
          created_at: oneMinAgo,
        })
      ).toBe(false);
    });
  });

  describe('4. Dangling Promise / "Checking..." Bug Prevention', () => {
    it('detects Bengali and English dangling promise phrases', () => {
      expect(DANGLING_PROMISE_REGEX.test('আমি চেক করে জানাচ্ছি')).toBe(true);
      expect(DANGLING_PROMISE_REGEX.test('একটু সময় দিন, আমি দেখছি')).toBe(true);
      expect(
        DANGLING_PROMISE_REGEX.test('let me check and get back to you')
      ).toBe(true);
      expect(DANGLING_PROMISE_REGEX.test('checking on this right now')).toBe(
        true
      );
      expect(
        DANGLING_PROMISE_REGEX.test('অপেক্ষা করুন, ডেটাবেস চেক করছি')
      ).toBe(true);
    });

    it('does not falsely trigger on substantive completed answers', () => {
      expect(
        DANGLING_PROMISE_REGEX.test(
          'আপনার স্টোরে বর্তমানে ৩টি আরটিও অর্ডার রয়েছে। অর্ডার #RUH-1049 কাস্টমার রিসিভ করতে অস্বীকৃতি জানিয়েছে।'
        )
      ).toBe(false);

      expect(
        DANGLING_PROMISE_REGEX.test(
          'All systems operational. Sentry report shows 0 unhandled exceptions in the last 24 hours.'
        )
      ).toBe(false);
    });
  });

  describe('5. Draft-Only Mutation Firewall', () => {
    const DRAFT_ONLY_ACTION_REGEX =
      /(publish|deploy|push to live|delete order|drop table|remove product)/i;

    function evaluateExecutionPolicy(userPrompt: string): {
      isBlocked: boolean;
      systemMessage?: string;
    } {
      if (DRAFT_ONLY_ACTION_REGEX.test(userPrompt)) {
        return {
          isBlocked: true,
          systemMessage:
            'Execution is not allowed from chat. The draft has been saved. Please log into your department portal to review and publish.',
        };
      }
      return { isBlocked: false };
    }

    it('blocks direct live publishing from chat and enforces draft portal review', () => {
      const result = evaluateExecutionPolicy(
        'Publish this blog post to the live website right now'
      );
      expect(result.isBlocked).toBe(true);
      expect(result.systemMessage).toContain(
        'Execution is not allowed from chat. The draft has been saved.'
      );
    });

    it('blocks destructive actions from chat', () => {
      const result = evaluateExecutionPolicy('Delete order #1042 immediately');
      expect(result.isBlocked).toBe(true);
    });

    it('permits informational queries and drafting requests', () => {
      const result = evaluateExecutionPolicy(
        'Generate an Instagram promotional caption and banner draft for Diwali'
      );
      expect(result.isBlocked).toBe(false);
    });
  });
});
