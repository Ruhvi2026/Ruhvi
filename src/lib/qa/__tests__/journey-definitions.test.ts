import {
  CRITICAL_JOURNEYS,
  getJourneyById,
  getJourneysByCategory,
  validateJourneyContract,
  type JourneyDefinition,
} from '../journey-definitions';

describe('Critical Regression Journeys Registry (Track H - Phase 39)', () => {
  it('registers all 14 required critical user and staff journeys', () => {
    expect(CRITICAL_JOURNEYS.length).toBe(14);
  });

  it('guarantees unique and correctly formatted journey IDs', () => {
    const ids = CRITICAL_JOURNEYS.map((j) => j.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(14);

    for (const id of ids) {
      expect(id).toMatch(/^J-(GUEST|CUST|STAFF)-\d{2}$/);
    }
  });

  it('ensures every journey defines valid steps, invariants, and failure thresholds', () => {
    for (const journey of CRITICAL_JOURNEYS) {
      const contract = validateJourneyContract(journey);
      expect(contract.valid).toBe(true);
      expect(contract.errors).toEqual([]);

      expect(journey.steps.length).toBeGreaterThan(0);
      expect(journey.invariants.length).toBeGreaterThan(0);
      expect(journey.primaryRoutes.length).toBeGreaterThan(0);
      expect(journey.failureThresholds.maxResponseTimeMs).toBeGreaterThan(0);
      expect(journey.failureThresholds.allowedErrorCodes).toContain(200);
    }
  });

  it('correctly looks up journeys by ID via getJourneyById()', () => {
    const checkoutJourney = getJourneyById('J-CUST-02');
    expect(checkoutJourney).toBeDefined();
    expect(checkoutJourney?.title).toBe('Checkout, Coupon & Payment');
    expect(checkoutJourney?.category).toBe('customer');

    const nonExistent = getJourneyById('J-UNKNOWN-99');
    expect(nonExistent).toBeUndefined();
  });

  it('correctly filters journeys by category via getJourneysByCategory()', () => {
    const guestJourneys = getJourneysByCategory('guest');
    const customerJourneys = getJourneysByCategory('customer');
    const staffJourneys = getJourneysByCategory('staff');
    const adminJourneys = getJourneysByCategory('admin');

    expect(guestJourneys.length).toBe(2);
    expect(customerJourneys.length).toBe(5);
    expect(staffJourneys.length).toBe(3);
    expect(adminJourneys.length).toBe(4);

    expect(
      guestJourneys.length +
        customerJourneys.length +
        staffJourneys.length +
        adminJourneys.length
    ).toBe(14);
  });

  it('flags contract validation errors for invalid journey objects', () => {
    const invalidJourney: JourneyDefinition = {
      id: 'INVALID_ID' as any,
      title: '',
      category: 'guest',
      actor: 'Guest',
      description: 'Invalid',
      automationType: 'synthetic_probe',
      primaryRoutes: [],
      preconditions: [],
      steps: [],
      invariants: [],
      failureThresholds: {
        maxResponseTimeMs: 0,
        allowedErrorCodes: [],
        disallowedErrorCodes: [],
      },
    };

    const res = validateJourneyContract(invalidJourney);
    expect(res.valid).toBe(false);
    expect(res.errors.length).toBeGreaterThanOrEqual(4);
  });
});
