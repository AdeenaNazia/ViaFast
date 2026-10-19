// ─────────────────────────────────────────────────────────────────────────────
// Typed application errors mapped 1:1 to the api-contract §1.4 error envelope.
// One stable `code` per HTTP status; 5xx messages are never exposed to clients.
// ─────────────────────────────────────────────────────────────────────────────

export type ErrorCode =
  | "VALIDATION_FAILED" // 400
  | "UNAUTHENTICATED" // 401
  | "FORBIDDEN" // 403
  | "NOT_FOUND" // 404
  | "CONFLICT" // 409
  | "INVARIANT_VIOLATED" // 422
  | "RATE_LIMITED" // 429
  | "INTERNAL"; // 500

export interface ErrorDetail {
  field: string;
  issue: string;
}

export interface AppErrorOptions {
  code: ErrorCode;
  statusCode: number;
  message: string;
  details?: ErrorDetail[];
  headers?: Record<string, string | number>;
  cause?: unknown;
}

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly statusCode: number;
  readonly details: ErrorDetail[] | undefined;
  readonly headers: Record<string, string | number> | undefined;
  /**
   * Safe to return `message` verbatim to the client. False for 5xx, where the
   * handler substitutes a generic message so internals/SQL never leak (§9).
   */
  readonly expose: boolean;

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "AppError";
    this.code = options.code;
    this.statusCode = options.statusCode;
    this.details = options.details;
    this.headers = options.headers;
    this.expose = options.statusCode >= 400 && options.statusCode < 500;
    Error.captureStackTrace?.(this, AppError);
  }

  static validation(details?: ErrorDetail[], message = "One or more fields are invalid."): AppError {
    return new AppError({ code: "VALIDATION_FAILED", statusCode: 400, message, details });
  }

  /** Generic by design: never reveal whether the account exists or which field was wrong (§5). */
  static unauthenticated(message = "Authentication required."): AppError {
    return new AppError({ code: "UNAUTHENTICATED", statusCode: 401, message });
  }

  static forbidden(message = "You do not have access to this resource."): AppError {
    return new AppError({ code: "FORBIDDEN", statusCode: 403, message });
  }

  /** Also used when existence itself is sensitive — do not leak presence (§1.4). */
  static notFound(message = "Resource not found."): AppError {
    return new AppError({ code: "NOT_FOUND", statusCode: 404, message });
  }

  static conflict(message = "The request conflicts with the current state."): AppError {
    return new AppError({ code: "CONFLICT", statusCode: 409, message });
  }

  static invariant(message: string, details?: ErrorDetail[]): AppError {
    return new AppError({ code: "INVARIANT_VIOLATED", statusCode: 422, message, details });
  }

  static rateLimited(retryAfterSeconds?: number, message = "Too many requests. Please retry later."): AppError {
    const headers: Record<string, string | number> = {};
    if (retryAfterSeconds !== undefined) headers["retry-after"] = retryAfterSeconds;
    return new AppError({ code: "RATE_LIMITED", statusCode: 429, message, headers });
  }

  static internal(message = "Internal server error.", cause?: unknown): AppError {
    return new AppError({ code: "INTERNAL", statusCode: 500, message, cause });
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}
