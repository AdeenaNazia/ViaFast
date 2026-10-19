// ─────────────────────────────────────────────────────────────────────────────
// Centralized error handling (Phase 4, Section 9). Every non-2xx becomes the
// contract's envelope: { error: { code, message, requestId, details? } } (§1.4).
// 5xx messages/stacks and Prisma/SQL details are NEVER sent to clients; they are
// logged with the requestId for support instead.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { env } from "../config/env";
import { AppError, isAppError, type ErrorCode, type ErrorDetail } from "../errors/app-error";

interface ErrorEnvelope {
  error: {
    code: ErrorCode;
    message: string;
    requestId: string;
    details?: ErrorDetail[];
  };
}

function envelope(
  code: ErrorCode,
  message: string,
  requestId: string,
  details?: ErrorDetail[],
): ErrorEnvelope {
  return { error: details && details.length > 0 ? { code, message, requestId, details } : { code, message, requestId } };
}

/** Duck-typed Prisma "known request" error code (P2xxx) without importing Prisma internals. */
function prismaCode(error: unknown): string | null {
  if (typeof error === "object" && error !== null) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
  }
  return null;
}

function mapPrismaError(code: string, requestId: string): { statusCode: number; body: ErrorEnvelope } {
  switch (code) {
    case "P2002":
      return { statusCode: 409, body: envelope("CONFLICT", "A record with these unique values already exists.", requestId) };
    case "P2003":
    case "P2014":
      return { statusCode: 409, body: envelope("CONFLICT", "The request conflicts with a related record.", requestId) };
    case "P2025":
      return { statusCode: 404, body: envelope("NOT_FOUND", "Resource not found.", requestId) };
    default:
      return { statusCode: 500, body: envelope("INTERNAL", "Internal server error.", requestId) };
  }
}

export function registerErrorHandling(app: FastifyInstance): void {
  app.setErrorHandler((error, request, reply) => {
    const requestId = request.id;

    if (isAppError(error)) {
      const safeMessage = error.expose ? error.message : "Internal server error.";
      if (!error.expose) {
        request.log.error({ err: error, requestId }, "application error (5xx)");
      }
      if (error.headers) {
        for (const [key, value] of Object.entries(error.headers)) reply.header(key, value);
      }
      reply.code(error.statusCode).send(envelope(error.code, safeMessage, requestId, error.details));
      return;
    }

    if (error instanceof z.ZodError) {
      const details: ErrorDetail[] = error.issues.map((issue) => ({
        field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
        issue: issue.message,
      }));
      reply.code(400).send(envelope("VALIDATION_FAILED", "One or more fields are invalid.", requestId, details));
      return;
    }

    const status = (error as { statusCode?: number }).statusCode;
    const code = (error as { code?: string }).code;

    // Rate limiting (in case a route did not use the plugin's errorResponseBuilder).
    if (status === 429 || code === "FST_RATE_LIMIT") {
      reply.code(429).send(envelope("RATE_LIMITED", "Too many requests. Please retry later.", requestId));
      return;
    }

    const pCode = prismaCode(error);
    if (pCode) {
      request.log.error({ err: error, requestId, prismaCode: pCode }, "prisma error");
      const mapped = mapPrismaError(pCode, requestId);
      reply.code(mapped.statusCode).send(mapped.body);
      return;
    }

    // Fastify framework errors: malformed body / wrong content-type / body too large.
    if (typeof code === "string" && code.startsWith("FST_")) {
      const mappedStatus = status && status >= 400 && status < 500 ? status : 400;
      reply.code(mappedStatus).send(envelope("VALIDATION_FAILED", "Malformed request.", requestId));
      return;
    }

    // Unexpected — log with context, return a generic 500.
    request.log.error({ err: error, requestId }, "unexpected error");
    reply.code(500).send(envelope("INTERNAL", "Internal server error.", requestId));
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send(envelope("NOT_FOUND", "Resource not found.", request.id));
  });

  // Fail closed on uncaught errors inside async handlers that escape Fastify.
  app.addHook("onResponse", (request, reply, done) => {
    if (env.isProduction && reply.statusCode >= 500) {
      request.log.error({ requestId: request.id, statusCode: reply.statusCode }, "5xx response");
    }
    done();
  });
}
