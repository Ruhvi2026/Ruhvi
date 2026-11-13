/**
 * Calculates the exact expiration date and seconds remaining until the next 6:00 AM IST (Indian Standard Time, UTC+5:30).
 * Rule:
 * Internal staff sessions expire every day at 06:00:00 AM IST.
 * When an internal staff member logs in, their session remains active until the immediate next 6:00 AM IST.
 * - If logging in at 1:00 PM today, expires tomorrow at 6:00 AM IST.
 * - If logging in at 2:00 AM today, expires today at 6:00 AM IST.
 * - If logging in at 6:00 AM today, expires tomorrow at 6:00 AM IST.
 */
export function getSecondsUntilNext6AmIst(now: Date = new Date()): number {
  const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
  const istNow = new Date(now.getTime() + IST_OFFSET_MS);

  const istYear = istNow.getUTCFullYear();
  const istMonth = istNow.getUTCMonth();
  const istDate = istNow.getUTCDate();
  const istHours = istNow.getUTCHours();

  let targetIstDate = istDate;
  if (istHours >= 6) {
    targetIstDate += 1;
  }

  const targetUtcMs =
    Date.UTC(istYear, istMonth, targetIstDate, 6, 0, 0, 0) - IST_OFFSET_MS;
  const diffMs = targetUtcMs - now.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  return Math.max(60, diffSeconds);
}

export function getNext6AmIst(now: Date = new Date()): Date {
  const seconds = getSecondsUntilNext6AmIst(now);
  return new Date(now.getTime() + seconds * 1000);
}
