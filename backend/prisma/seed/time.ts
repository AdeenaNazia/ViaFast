// Time helpers for the seed. All datetimes are built in UTC from a fixed
// fixture date so the seed is deterministic across machines and reruns.

// Synthetic fixture date for the current-day trip snapshots
// (INITIAL_ACTIVE_TRIPS / journeyStatus represent "today's" service).
export const SEED_SERVICE_DATE_ISO = '2026-10-12';

const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

/** Parses "7:15 AM" / "3:30 PM" style clock values into minutes since midnight. */
export function parseClockToMinutes(clock: string): number {
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(clock.trim());
  if (match === null) {
    throw new Error(`Unparseable clock value: "${clock}"`);
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const meridiem = match[3].toUpperCase();
  if (hour < 1 || hour > 12 || minute > 59) {
    throw new Error(`Out-of-range clock value: "${clock}"`);
  }
  const hour24 = meridiem === 'AM' ? (hour === 12 ? 0 : hour) : hour === 12 ? 12 : hour + 12;
  return hour24 * 60 + minute;
}

/** Parses "15 Nov 2026" style dates into a UTC Date. */
export function parseDayMonthYear(text: string): Date {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(text.trim());
  if (match === null) {
    throw new Error(`Unparseable date value: "${text}"`);
  }
  const day = Number(match[1]);
  const month = MONTHS[match[2]];
  const year = Number(match[3]);
  if (month === undefined) {
    throw new Error(`Unknown month in date value: "${text}"`);
  }
  return new Date(Date.UTC(year, month, day));
}

/** The fixed fixture service date (UTC midnight, Prisma stores it as a DATE). */
export function seedServiceDate(): Date {
  return new Date(`${SEED_SERVICE_DATE_ISO}T00:00:00.000Z`);
}

/** Fixture service date combined with minutes-since-midnight (UTC). */
export function serviceDateTime(minutesSinceMidnight: number): Date {
  return new Date(seedServiceDate().getTime() + minutesSinceMidnight * 60_000);
}
