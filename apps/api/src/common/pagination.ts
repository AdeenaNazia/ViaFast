// ─────────────────────────────────────────────────────────────────────────────
// Cursor pagination (api-contract §1.5): `?limit=&cursor=<opaque>`, default
// limit 25, max 100, and the response envelope `{ data: [...], page: { nextCursor,
// hasMore } }`.
//
// The cursor is an OPAQUE base64url encoding of the ordering-key values of the
// last row of the previous page (keyset pagination). Clients must never parse or
// construct it. A malformed or stale-shaped cursor is a 400 VALIDATION_FAILED —
// it is untrusted input, so every extracted value is type-checked before it
// reaches a Prisma query.
// ─────────────────────────────────────────────────────────────────────────────
import { AppError } from "../errors/app-error";

export const DEFAULT_PAGE_LIMIT = 25;
export const MAX_PAGE_LIMIT = 100;

/** Primitive ordering-key values carried by a cursor. */
export type CursorValues = Record<string, string | number>;

export interface PageMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface Paginated<T> {
  data: T[];
  page: PageMeta;
}

export function encodeCursor(values: CursorValues): string {
  return Buffer.from(JSON.stringify(values), "utf8").toString("base64url");
}

function invalidCursor(): AppError {
  return AppError.validation([
    { field: "cursor", issue: "Cursor is not a valid pagination token." },
  ]);
}

export function decodeCursor(cursor: string): CursorValues {
  let text: string;
  try {
    text = Buffer.from(cursor, "base64url").toString("utf8");
  } catch {
    throw invalidCursor();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw invalidCursor();
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) throw invalidCursor();

  const values: CursorValues = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string") values[key] = value;
    else if (typeof value === "number" && Number.isFinite(value)) values[key] = value;
    else throw invalidCursor();
  }
  return values;
}

export function cursorString(values: CursorValues, key: string): string {
  const value = values[key];
  if (typeof value !== "string") throw invalidCursor();
  return value;
}

/** Read a numeric cursor field as a Date (cursors carry instants as epoch millis). */
export function cursorDate(values: CursorValues, key: string): Date {
  const value = values[key];
  if (typeof value !== "number") throw invalidCursor();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw invalidCursor();
  return date;
}

/**
 * Split a `take: limit + 1` result set into the page and its successor cursor.
 * `cursorOf` maps the LAST returned row to the ordering-key values of the cursor.
 */
export function buildPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (lastRow: T) => CursorValues,
): { rows: T[]; page: PageMeta } {
  const hasMore = rows.length > limit;
  const data = hasMore ? rows.slice(0, limit) : rows;
  const last = data[data.length - 1];
  const nextCursor = hasMore && last !== undefined ? encodeCursor(cursorOf(last)) : null;
  return { rows: data, page: { nextCursor, hasMore } };
}
