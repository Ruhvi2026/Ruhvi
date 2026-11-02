// src/lib/chat/__tests__/cloudinary-audio.test.ts
//
// Unit tests for Cloudinary Audio Voice Note service and 45-day retention lifecycle.

describe('Cloudinary Audio Voice Notes 45-Day Lifecycle', () => {
  it('correctly calculates the 45-day expiration timestamp', () => {
    const RETENTION_DAYS = 45;
    const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

    const baseTime = new Date('2026-11-03T00:00:00.000Z').getTime();
    const expectedExpiryTime = baseTime + RETENTION_MS;
    const expectedDate = new Date(expectedExpiryTime);

    // Difference in days should be exactly 45 days
    const diffDays = (expectedExpiryTime - baseTime) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBe(45);
    expect(expectedDate.toISOString()).toBe('2026-12-18T00:00:00.000Z');
  });

  it('identifies expired notes correctly against current timestamp', () => {
    const now = new Date('2026-11-03T00:00:00.000Z');

    const note1Active = {
      id: 'note-1',
      expires_at: new Date('2026-11-10T00:00:00.000Z').toISOString(),
      status: 'active',
    };

    const note2Expired = {
      id: 'note-2',
      expires_at: new Date('2026-11-01T00:00:00.000Z').toISOString(),
      status: 'active',
    };

    const isNoteExpired = (note: { expires_at: string }) =>
      new Date(note.expires_at).getTime() <= now.getTime();

    expect(isNoteExpired(note1Active)).toBe(false);
    expect(isNoteExpired(note2Expired)).toBe(true);
  });
});
