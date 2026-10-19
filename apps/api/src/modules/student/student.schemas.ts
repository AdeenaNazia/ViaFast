// ─────────────────────────────────────────────────────────────────────────────
// Query-string schemas for the Student self-service endpoints (api-contract §4).
// Parsed with `parseWith` BEFORE any database work, so an out-of-range limit or a
// malformed date becomes a 400 VALIDATION_FAILED envelope (§1.4) rather than an
// unbounded query.
//
// Only the filters the contract defines are accepted: `/me/ride/history` documents
// `?limit=&cursor=&from=&to=`, and list endpoints inherit the §1.5 cursor
// convention. There is deliberately NO term filter — the contract does not define
// one for these endpoints, so none is invented. Unknown query params are ignored.
// ─────────────────────────────────────────────────────────────────────────────
import { z } from "zod";
import { MAX_PAGE_LIMIT } from "../../common/pagination";

const LIMIT_MESSAGE = `limit must be an integer between 1 and ${MAX_PAGE_LIMIT}`;

/** Strict integer strings: rejects "", "abc", "1e3", "0x10" and repeated params. */
const limitSchema = z
  .string()
  .regex(/^\d{1,3}$/, LIMIT_MESSAGE)
  .transform((value) => Number.parseInt(value, 10))
  .refine((value) => value >= 1 && value <= MAX_PAGE_LIMIT, LIMIT_MESSAGE)
  .optional();

const cursorSchema = z
  .string()
  .trim()
  .min(1, "cursor must not be empty")
  .max(512, "cursor is too long")
  .optional();

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isRealCalendarDate(value: string): boolean {
  const [year, month, day] = value.split("-").map(Number) as [number, number, number];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

/** `YYYY-MM-DD` → UTC-midnight Date, matching how `@db.Date` columns are stored. */
const serviceDateSchema = z
  .string()
  .regex(DATE_ONLY_RE, "must be a YYYY-MM-DD date")
  .refine(isRealCalendarDate, "must be a real calendar date")
  .transform((value) => {
    const [year, month, day] = value.split("-").map(Number) as [number, number, number];
    return new Date(Date.UTC(year, month - 1, day));
  });

export const rideHistoryQuerySchema = z
  .object({
    limit: limitSchema,
    cursor: cursorSchema,
    from: serviceDateSchema.optional(),
    to: serviceDateSchema.optional(),
  })
  .refine((query) => query.from === undefined || query.to === undefined || query.from <= query.to, {
    message: "from must not be after to",
    path: ["from"],
  });

export const notificationsQuerySchema = z.object({
  limit: limitSchema,
  cursor: cursorSchema,
});

export type RideHistoryQuery = z.infer<typeof rideHistoryQuerySchema>;
export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;
