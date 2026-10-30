jest.mock('server-only', () => ({}));

import { GET as getAutomations } from '../automations/route';
import { GET as getPublishBlog } from '../publish-blog/route';
import { GET as getSelfAudit } from '../self-audit/route';
import { GET as getProactive } from '../co-founder/proactive/route';
import { GET as getMorningBriefing } from '../co-founder/morning-briefing/route';
import { GET as getAiHealth } from '../ai-health/route';
import { NextRequest } from 'next/server';

describe('Cron Fail-Closed Authorization Verification', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.CRON_SECRET;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('rejects /api/cron/automations when CRON_SECRET is missing', async () => {
    const req = new Request('http://localhost/api/cron/automations');
    const res = await getAutomations(req);
    expect(res.status).toBe(401);
  });

  it('rejects /api/cron/publish-blog when CRON_SECRET is missing', async () => {
    const req = new Request('http://localhost/api/cron/publish-blog');
    const res = await getPublishBlog(req);
    expect(res.status).toBe(401);
  });

  it('rejects /api/cron/self-audit when CRON_SECRET is missing', async () => {
    const req = new NextRequest('http://localhost/api/cron/self-audit');
    const res = await getSelfAudit(req);
    expect(res.status).toBe(401);
  });

  it('rejects /api/cron/co-founder/proactive when CRON_SECRET is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/co-founder/proactive'
    );
    const res = await getProactive(req);
    expect(res.status).toBe(401);
  });

  it('rejects /api/cron/co-founder/morning-briefing when CRON_SECRET is missing', async () => {
    const req = new NextRequest(
      'http://localhost/api/cron/co-founder/morning-briefing'
    );
    const res = await getMorningBriefing(req);
    expect(res.status).toBe(401);
  });

  it('rejects /api/cron/ai-health when CRON_SECRET is missing', async () => {
    const req = new Request('http://localhost/api/cron/ai-health');
    const res = await getAiHealth(req);
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid Bearer token when CRON_SECRET is set', async () => {
    process.env.CRON_SECRET = 'valid_test_secret_123';
    const req = new Request('http://localhost/api/cron/automations', {
      headers: { authorization: 'Bearer wrong_secret' },
    });
    const res = await getAutomations(req);
    expect(res.status).toBe(401);
  });
});
