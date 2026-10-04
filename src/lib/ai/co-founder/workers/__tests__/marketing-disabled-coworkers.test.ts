jest.mock('server-only', () => ({}));

import {
  socialMediaCoWorker,
  emailMarketingCoWorker,
  influencerMarketingCoWorker,
  setCoWorkerStatus,
  isCoWorkerEnabled,
  getAllCoWorkerStatuses,
} from '../marketing';

describe('Production-Only Disabled Marketing Co-Workers', () => {
  beforeEach(() => {
    // Reset to initial status
    setCoWorkerStatus('marketing_social_media', 'DISABLED');
    setCoWorkerStatus('marketing_email', 'DISABLED');
    setCoWorkerStatus('marketing_influencer', 'DISABLED');
  });

  it('declares all 3 production-only co-workers as DISABLED by default', () => {
    expect(isCoWorkerEnabled('marketing_social_media')).toBe(false);
    expect(isCoWorkerEnabled('marketing_email')).toBe(false);
    expect(isCoWorkerEnabled('marketing_influencer')).toBe(false);

    const statuses = getAllCoWorkerStatuses();
    expect(statuses.find((s) => s.id === 'marketing_social_media')?.status).toBe('DISABLED');
    expect(statuses.find((s) => s.id === 'marketing_email')?.status).toBe('DISABLED');
    expect(statuses.find((s) => s.id === 'marketing_influencer')?.status).toBe('DISABLED');
  });

  it('rejects execution gracefully when Social Media Co-Worker is disabled', async () => {
    const output = await socialMediaCoWorker.execute({
      task: 'Schedule Instagram reels for festive collection',
    });

    expect(output.status).toBe('DISABLED');
    expect(output.success).toBe(false);
    expect(output.executionStatus).toBe('disabled');
    expect(output.findings[0]).toContain('PRODUCTION-ONLY');
    expect(output.executiveVoiceSummary).toContain('currently disabled in development mode');
  });

  it('rejects execution gracefully when Email Marketing Co-Worker is disabled', async () => {
    const output = await emailMarketingCoWorker.execute({
      task: 'Send promotional email broadcast to all subscribers',
    });

    expect(output.status).toBe('DISABLED');
    expect(output.success).toBe(false);
    expect(output.executionStatus).toBe('disabled');
    expect(output.findings[0]).toContain('PRODUCTION-ONLY');
    expect(output.executiveVoiceSummary).toContain('currently disabled in development mode');
  });

  it('rejects execution gracefully when Influencer Marketing Co-Worker is disabled', async () => {
    const output = await influencerMarketingCoWorker.execute({
      task: 'Find luxury jewellery influencers for gifting',
    });

    expect(output.status).toBe('DISABLED');
    expect(output.success).toBe(false);
    expect(output.executionStatus).toBe('disabled');
    expect(output.findings[0]).toContain('PRODUCTION-ONLY');
    expect(output.executiveVoiceSummary).toContain('currently disabled in development mode');
  });

  it('allows dynamic enable and execution without code rewrites', async () => {
    setCoWorkerStatus('marketing_social_media', 'ENABLED');
    expect(isCoWorkerEnabled('marketing_social_media')).toBe(true);

    const output = await socialMediaCoWorker.execute({
      task: 'Schedule Instagram reels for festive collection',
    });

    expect(output.status).toBe('ENABLED');
    expect(output.success).toBe(true);
  });
});
