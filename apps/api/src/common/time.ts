// ─────────────────────────────────────────────────────────────────────────────
// Time conventions (ADR-005 / ADR-019).
//   • Instants are UTC `timestamptz` and go on the wire as ISO-8601 UTC — Fastify
//     serializes a JS Date that way already, so instants are passed through.
//   • `Trip.serviceDate` is a pure calendar DAY (`@db.Date`, Prisma anchors it at
//     UTC midnight) interpreted in the campus zone Asia/Karachi. "Today" for the
//     transport day must therefore be computed in that zone, not the server's.
//   • `RouteStop.scheduled*Time` is a wall-clock TIME (`@db.Time`, anchored at the
//     UTC epoch) and is rendered as HH:MM per domain-model §3.3.
// ─────────────────────────────────────────────────────────────────────────────

/** The single canonical campus zone (ADR-019). PKT has no DST, so this is stable. */
export const CAMPUS_TIME_ZONE = "Asia/Karachi";

const CAMPUS_DAY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAMPUS_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The current campus calendar day, as a UTC-midnight Date matching `@db.Date`. */
export function campusServiceDate(now: Date = new Date()): Date {
  // en-CA renders exactly YYYY-MM-DD, so no locale-dependent parsing is needed.
  const [year, month, day] = CAMPUS_DAY_FORMAT.format(now).split("-").map(Number) as [
    number,
    number,
    number,
  ];
  return new Date(Date.UTC(year, month - 1, day));
}

/** `YYYY-MM-DD` for a `@db.Date` column. */
export function toServiceDateIso(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** `HH:MM` for a `@db.Time` column, or null when the stop has no scheduled time. */
export function toClockTime(value: Date | null): string | null {
  if (value === null) return null;
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}
