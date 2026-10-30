import {
  getAnomalyLifecycleRegistry,
  resolveAnomaly,
  acknowledgeAnomaly,
  type AnomalyRecord,
} from '../anomaly-lifecycle';

// Mock Supabase service client
const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({
  upsert: mockUpsert,
  select: mockSelect,
}));

jest.mock('@/lib/supabase/service', () => ({
  getServiceClient: jest.fn(() => ({
    from: mockFrom,
  })),
}));

describe('Durable Anomaly Persistence & Resolution Actor Attribution (P1.3)', () => {
  const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'mock_service_key';
    const registry = getAnomalyLifecycleRegistry();
    registry.clear();
  });

  afterAll(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  });

  const baseRecord: AnomalyRecord = {
    id: 'anom_test_1',
    fingerprint: 'fp_test_1',
    ruleId: 'cancellation_rate_spike',
    metric: 'cancellation_rate',
    dimension: 'global',
    state: 'open',
    severity: 'critical',
    title: 'Cancellation rate spike',
    firstDetectedAt: '2026-10-29T10:00:00Z',
    lastObservedAt: '2026-10-29T10:00:00Z',
    occurrenceCount: 1,
    reopenCount: 0,
    latestValue: 18.5,
    thresholdValue: 10,
    cooldownUntil: '2026-10-29T16:00:00Z',
    shouldNotify: true,
    history: [],
    recommendation: {
      id: 'rec_1',
      title: 'Review cancellations',
      description: 'High cancellations detected',
      category: 'operations',
      impact: 'high',
      suggestedAction: 'Inspect orders',
      targetMetric: 'cancellation_rate',
    } as any,
  };

  it('records actor attribution (resolvedBy) when resolving an anomaly', () => {
    const resolved = resolveAnomaly(
      baseRecord,
      'False positive resolved by inventory sync',
      'staff_user_456'
    );
    expect(resolved.state).toBe('resolved');
    expect(resolved.resolutionReason).toBe(
      'False positive resolved by inventory sync'
    );
    expect(resolved.resolvedBy).toBe('staff_user_456');
    expect(resolved.resolvedAt).toBeDefined();
  });

  it('persists resolved and acknowledged records to database table business_anomalies', async () => {
    const registry = getAnomalyLifecycleRegistry();
    registry.seedRecord(baseRecord);

    const acknowledged = registry.acknowledge('anom_test_1', 'admin_123');
    expect(acknowledged.acknowledgedBy).toBe('admin_123');

    // Verify database interaction on acknowledge
    expect(mockFrom).toHaveBeenCalledWith('business_anomalies');
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anom_test_1',
          state: 'acknowledged',
          acknowledged_by: 'admin_123',
        }),
      ]),
      { onConflict: 'fingerprint' }
    );

    const resolved = registry.resolve(
      'anom_test_1',
      'Issue remediated by staff',
      'manager_789'
    );
    expect(resolved.resolvedBy).toBe('manager_789');

    // Verify database interaction on resolve
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'anom_test_1',
          state: 'resolved',
          resolved_by: 'manager_789',
        }),
      ]),
      { onConflict: 'fingerprint' }
    );
  });

  it('restores persisted anomalies from database on cold start via loadPersistedRecords', async () => {
    mockSelect.mockResolvedValue({
      data: [
        {
          id: 'anom_db_1',
          fingerprint: 'fp_db_1',
          rule_id: 'payment_failure_spike',
          metric: 'payment_failure_rate',
          dimension: 'global',
          state: 'open',
          severity: 'warning',
          title: 'Elevated payment failures',
          first_detected_at: '2026-10-29T08:00:00Z',
          last_observed_at: '2026-10-29T08:00:00Z',
          occurrence_count: 2,
          reopen_count: 0,
          latest_value: 12.0,
          threshold_value: 8.0,
          cooldown_until: '2026-10-29T14:00:00Z',
          should_notify: false,
          history: [],
          recommendation: {},
        },
      ],
      error: null,
    });

    const registry = getAnomalyLifecycleRegistry();
    expect(registry.getRecords().length).toBe(0);

    await registry.loadPersistedRecords();
    const records = registry.getRecords();
    expect(records.length).toBe(1);
    expect(records[0].id).toBe('anom_db_1');
    expect(records[0].metric).toBe('payment_failure_rate');
  });
});
