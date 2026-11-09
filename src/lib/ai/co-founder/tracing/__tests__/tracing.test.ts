jest.mock('server-only', () => ({}));

import {
  sanitizeTraceAttributes,
  withCoFounderSpan,
  traceBuffer,
  CoFounderSpanType,
} from '../index';

describe('AI Co-Founder Distributed Tracing & Observability (Phase 11)', () => {
  beforeEach(() => {
    traceBuffer.clear();
  });

  describe('sanitizeTraceAttributes (Zero-PII & Secret Redaction)', () => {
    it('redacts sensitive keys such as passwords, tokens, cookies, and api keys', () => {
      const raw = {
        apiKey: 'secret_12345',
        authHeader: 'Bearer abcxyz',
        userPassword: 'plaintextpassword123',
        sessionCookie: 'sessionid=999888',
        jwtToken: 'token123',
        privateKey: 'pk_live_123456',
        cardCvv: '999',
        normalKey: 'safe_value',
      };

      const sanitized = sanitizeTraceAttributes(raw);
      expect(sanitized.apiKey).toBe('[REDACTED]');
      expect(sanitized.authHeader).toBe('[REDACTED]');
      expect(sanitized.userPassword).toBe('[REDACTED]');
      expect(sanitized.sessionCookie).toBe('[REDACTED]');
      expect(sanitized.jwtToken).toBe('[REDACTED]');
      expect(sanitized.privateKey).toBe('[REDACTED]');
      expect(sanitized.cardCvv).toBe('[REDACTED]');
      expect(sanitized.normalKey).toBe('safe_value');
    });

    it('redacts customer PII (emails, phone numbers, and JWTs) embedded in text values', () => {
      const raw = {
        message:
          'Customer email is priya.sharma@example.com and phone is +91 9876543210',
        rawResponse:
          'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.doNotLeakThisSignature',
        debugOutput: 'Found hash 4a8b1c3d5e7f9024a8b1c3d5e7f9024a in response',
      };

      const sanitized = sanitizeTraceAttributes(raw);
      expect(sanitized.message).toContain('[REDACTED_EMAIL]');
      expect(sanitized.message).toContain('[REDACTED_PHONE]');
      expect(sanitized.message).not.toContain('priya.sharma@example.com');
      expect(sanitized.message).not.toContain('9876543210');

      expect(sanitized.rawResponse).toContain('[REDACTED_JWT]');
      expect(sanitized.debugOutput).toContain('[REDACTED_SECRET]');
    });

    it('truncates oversized string attributes over 500 characters', () => {
      const longString = 'A'.repeat(600);
      const sanitized = sanitizeTraceAttributes({ longField: longString });
      expect(typeof sanitized.longField).toBe('string');
      expect((sanitized.longField as string).length).toBe(500);
      expect((sanitized.longField as string).endsWith('...')).toBe(true);
    });

    it('preserves primitive numbers and booleans', () => {
      const sanitized = sanitizeTraceAttributes({
        latencyMs: 142,
        tokens: 350,
        cacheHit: true,
        dryRun: false,
      });

      expect(sanitized.latencyMs).toBe(142);
      expect(sanitized.tokens).toBe(350);
      expect(sanitized.cacheHit).toBe(true);
      expect(sanitized.dryRun).toBe(false);
    });

    it('safely serializes and redacts nested JSON objects', () => {
      const raw = {
        metadata: {
          customer: 'rahul@test.org',
          orderId: 'ORD_99182',
        },
      };

      const sanitized = sanitizeTraceAttributes(raw);
      expect(typeof sanitized.metadata).toBe('string');
      expect(sanitized.metadata).toContain('[REDACTED_EMAIL]');
      expect(sanitized.metadata).toContain('ORD_99182');
    });
  });

  describe('withCoFounderSpan execution', () => {
    it('records a successful span and inserts into traceBuffer', async () => {
      const result = await withCoFounderSpan(
        'worker.run',
        {
          workerId: 'worker_monitoring_verification',
          goalId: 'goal_7781',
        },
        async (ctx) => {
          ctx.setAttribute('resultState', 'completed');
          return { status: 'success', score: 98 };
        }
      );

      expect(result).toEqual({ status: 'success', score: 98 });

      const recent = traceBuffer.getRecent(10);
      expect(recent.length).toBeGreaterThanOrEqual(1);

      const span = recent[0];
      expect(span.name).toBe('worker.run');
      expect(span.status).toBe('ok');
      expect(span.workerId).toBe('worker_monitoring_verification');
      expect(span.resultState).toBe('completed');
      expect(span.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('records span error and rethrows exception when operation fails', async () => {
      await expect(
        withCoFounderSpan(
          'action.execute',
          {
            workerId: 'worker_sales_conversion',
            toolName: 'execute_checkout_diagnostic',
          },
          async (ctx) => {
            ctx.setAttribute('stepId', 'step_404');
            throw new Error('Upstream database unreachable');
          }
        )
      ).rejects.toThrow('Upstream database unreachable');

      const recent = traceBuffer.getRecent(10);
      const span = recent[0];
      expect(span.name).toBe('action.execute');
      expect(span.status).toBe('error');
      expect(span.errorMessage).toContain('Upstream database unreachable');
      expect(span.resultState).toBe('failed');
    });

    it('supports all 11 required CoFounderSpanType values', async () => {
      const allSpanTypes: CoFounderSpanType[] = [
        'cofounder.request',
        'model.call',
        'tool.call',
        'worker.run',
        'worker.delegate',
        'research.search',
        'research.fetch',
        'source.verify',
        'approval.request',
        'action.execute',
        'action.verify',
      ];

      for (const spanType of allSpanTypes) {
        await withCoFounderSpan(spanType, { test: true }, async () => 'ok');
      }

      const recent = traceBuffer.getRecent(20);
      expect(recent.length).toBe(11);
    });
  });

  describe('traceBuffer ring buffer management', () => {
    it('filters traces by workerId, span name, and status', async () => {
      await withCoFounderSpan(
        'worker.run',
        { workerId: 'worker_1' },
        async () => 'ok'
      );
      await withCoFounderSpan(
        'model.call',
        { workerId: 'worker_2' },
        async () => 'ok'
      );
      try {
        await withCoFounderSpan(
          'tool.call',
          { workerId: 'worker_1' },
          async () => {
            throw new Error('tool failed');
          }
        );
      } catch {}

      const worker1Traces = traceBuffer.getRecent(10, { workerId: 'worker_1' });
      expect(worker1Traces.length).toBe(2);

      const modelTraces = traceBuffer.getRecent(10, { name: 'model.call' });
      expect(modelTraces.length).toBe(1);

      const errorTraces = traceBuffer.getRecent(10, { status: 'error' });
      expect(errorTraces.length).toBe(1);
      expect(errorTraces[0].name).toBe('tool.call');
    });

    it('bounds buffer to max 500 items and drops oldest', () => {
      for (let i = 0; i < 550; i++) {
        traceBuffer.add({
          id: `t_${i}`,
          traceId: `tr_${i}`,
          spanId: `sp_${i}`,
          name: 'worker.run',
          startTime: Date.now(),
          durationMs: 10,
          status: 'ok',
          attributes: { index: i },
        });
      }

      const all = traceBuffer.getRecent(600);
      expect(all.length).toBe(500);
      // Newest items are at the beginning
      expect(all[0].id).toBe('t_549');
    });

    it('clears all items on clear()', () => {
      traceBuffer.add({
        id: 't_test',
        traceId: 'tr_test',
        spanId: 'sp_test',
        name: 'worker.run',
        startTime: Date.now(),
        durationMs: 10,
        status: 'ok',
        attributes: {},
      });

      expect(traceBuffer.getRecent().length).toBe(1);
      traceBuffer.clear();
      expect(traceBuffer.getRecent().length).toBe(0);
    });
  });
});
