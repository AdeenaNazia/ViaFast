// ─────────────────────────────────────────────────────────────────────────────
// Zod parse helper — rejects malformed input BEFORE business logic (Section 9),
// converting failures into the contract's VALIDATION_FAILED envelope (§1.4).
// ─────────────────────────────────────────────────────────────────────────────
import type { z } from "zod";
import { AppError, type ErrorDetail } from "../errors/app-error";

export function parseWith<Schema extends z.ZodTypeAny>(schema: Schema, data: unknown): z.infer<Schema> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const details: ErrorDetail[] = result.error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join(".") : "(root)",
      issue: issue.message,
    }));
    throw AppError.validation(details);
  }
  return result.data;
}
