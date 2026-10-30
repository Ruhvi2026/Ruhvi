jest.mock('server-only', () => ({}));

import {
  BUSINESS_TIMEZONE,
  IST_OFFSET_MS,
  getZonedDateParts,
  getStartOfDayIST,
  getEndOfDayIST,
  getStartOfMonthIST,
  getEndOfMonthIST,
  resolveTimeRange,
} from '../lib/ai/co-founder/analytics';

describe('Analytics Timezone Correctness (Asia/Kolkata UTC+5:30) (Finding C3)', () => {
  it('defines the canonical business timezone as Asia/Kolkata with 5.5h offset', () => {
    expect(BUSINESS_TIMEZONE).toBe('Asia/Kolkata');
    expect(IST_OFFSET_MS).toBe(19800000); // 5.5 * 3600 * 1000
  });

  describe('Midnight & Early Morning Boundary Handling', () => {
    it('correctly maps 00:30 AM IST (19:00 UTC previous day) to current IST calendar day', () => {
      // 00:30 AM IST on Oct 31, 2026 is 19:00 UTC on Oct 30, 2026
      const earlyMorningIST = new Date('2026-10-30T19:00:00.000Z');
      const parts = getZonedDateParts(earlyMorningIST);

      expect(parts.year).toBe(2026);
      expect(parts.month).toBe(10);
      expect(parts.day).toBe(31);
      expect(parts.hour).toBe(0);
      expect(parts.minute).toBe(30);

      // Start of day in IST should be 18:30 UTC on Oct 30 (00:00 IST Oct 31)
      const startOfDay = getStartOfDayIST(earlyMorningIST);
      expect(startOfDay.toISOString()).toBe('2026-10-30T18:30:00.000Z');
    });

    it('consistently produces the same start of day whether queried at 01:00 AM IST or 06:00 PM IST', () => {
      const at0100IST = new Date('2026-10-30T19:30:00.000Z'); // 01:00 AM IST Oct 31
      const at1800IST = new Date('2026-10-31T12:30:00.000Z'); // 06:00 PM IST Oct 31

      const start1 = getStartOfDayIST(at0100IST);
      const start2 = getStartOfDayIST(at1800IST);

      expect(start1.toISOString()).toBe('2026-10-30T18:30:00.000Z');
      expect(start2.toISOString()).toBe('2026-10-30T18:30:00.000Z');
      expect(start1.getTime()).toBe(start2.getTime());
    });

    it('correctly marks end of day at 23:59:59.999 IST', () => {
      const midDay = new Date('2026-10-31T08:00:00.000Z'); // 13:30 IST Oct 31
      const endOfDay = getEndOfDayIST(midDay);

      // 23:59:59.999 IST is 18:29:59.999 UTC
      expect(endOfDay.toISOString()).toBe('2026-10-31T18:29:59.999Z');
    });
  });

  describe('Month & Year Boundary Transitions', () => {
    it('handles year transition cleanly (Dec 31 23:59 IST to Jan 1 00:01 IST)', () => {
      const dec31Night = new Date('2026-12-31T18:29:00.000Z'); // 23:59 IST Dec 31
      const jan1Morning = new Date('2026-12-31T18:31:00.000Z'); // 00:01 IST Jan 1

      const decParts = getZonedDateParts(dec31Night);
      expect(decParts.year).toBe(2026);
      expect(decParts.month).toBe(12);
      expect(decParts.day).toBe(31);

      const janParts = getZonedDateParts(jan1Morning);
      expect(janParts.year).toBe(2027);
      expect(janParts.month).toBe(1);
      expect(janParts.day).toBe(1);

      const startOfJan = getStartOfMonthIST(2027, 1);
      expect(startOfJan.toISOString()).toBe('2026-12-31T18:30:00.000Z'); // 00:00 IST Jan 1, 2027
    });

    it('correctly computes start and end of months in IST', () => {
      const startOfOct = getStartOfMonthIST(2026, 10);
      expect(startOfOct.toISOString()).toBe('2026-09-30T18:30:00.000Z'); // 00:00 IST Oct 1

      const endOfOct = getEndOfMonthIST(2026, 10);
      expect(endOfOct.toISOString()).toBe('2026-10-31T18:29:59.999Z'); // 23:59:59.999 IST Oct 31
    });
  });

  describe('resolveTimeRange() with baseDate injection', () => {
    it('resolves today and yesterday with strict IST calendar boundaries', () => {
      // Test at 02:00 AM IST on Oct 31 (20:30 UTC Oct 30)
      const baseDate = new Date('2026-10-30T20:30:00.000Z');
      const { current, baseline } = resolveTimeRange(
        'today',
        undefined,
        undefined,
        baseDate
      );

      expect(current.label).toBe('Today');
      expect(current.from).toBe('2026-10-30T18:30:00.000Z'); // 00:00 IST Oct 31
      expect(current.to).toBe(baseDate.toISOString());

      expect(baseline.label).toBe('Yesterday');
      expect(baseline.from).toBe('2026-10-29T18:30:00.000Z'); // 00:00 IST Oct 30
      expect(baseline.to).toBe('2026-10-30T18:30:00.000Z');
    });

    it('resolves this_month and last_month with strict IST calendar boundaries', () => {
      const baseDate = new Date('2026-10-15T10:00:00.000Z');
      const { current, baseline } = resolveTimeRange(
        'this_month',
        undefined,
        undefined,
        baseDate
      );

      expect(current.label).toBe('This Month');
      expect(current.from).toBe('2026-09-30T18:30:00.000Z'); // 00:00 IST Oct 1

      expect(baseline.label).toBe('Last Month');
      expect(baseline.from).toBe('2026-08-31T18:30:00.000Z'); // 00:00 IST Sep 1
      expect(baseline.to).toBe('2026-09-30T18:29:59.999Z'); // 23:59:59.999 IST Sep 30
    });
  });
});
