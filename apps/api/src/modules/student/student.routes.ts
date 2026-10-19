// ─────────────────────────────────────────────────────────────────────────────
// Student self-service endpoints (api-contract §4). All three are STUDENT-only
// and all three resolve the student identity server-side from the authenticated
// user's `StudentProfile.userId` link — no path/body/query id is ever used to
// pick whose ride, history or notifications to return (api-contract §2, ADR-008).
//
// Guard composition on every route:
//   `authenticate`       → valid bearer JWT AND the user is still ACTIVE (§1.3).
//   `requireRole(STUDENT)`→ coarse role permission (domain-model §1.2: the
//                          Student surface belongs to STUDENT). 403 otherwise.
//   `requireStudentContext`→ resource scope. A STUDENT-role account with no
//                          StudentProfile row gets 403, because there is nothing
//                          to scope a query to.
// There is deliberately NO admin bypass here: the contract routes admin and
// parent access to student data through separate `/admin/*` and
// `/me/children/{studentId}/ride` endpoints, which are out of this phase's scope.
//
// `GET /me/trips` and `GET /me/ride/history` are the SAME handler. The contract
// names the endpoint `/me/ride/history`; `/me/trips` is registered as an alias so
// both the canonical contract path and the short client-facing name work.
// ─────────────────────────────────────────────────────────────────────────────
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { UserRole } from "../../../generated/prisma/client";
import { authenticate, requireRole } from "../../security/guards";
import { parseWith } from "../../validation/validate";
import { notificationsQuerySchema, rideHistoryQuerySchema } from "./student.schemas";
import {
  getStudentRide,
  listStudentNotifications,
  listStudentTripHistory,
  requireStudentContext,
} from "./student.service";

const STUDENT_GUARDS = [authenticate, requireRole(UserRole.STUDENT)];

export async function studentRoutes(app: FastifyInstance): Promise<void> {
  app.get("/me/ride", { preHandler: STUDENT_GUARDS }, async (request, reply) => {
    const context = await requireStudentContext(app.prisma, request.user!);
    const ride = await getStudentRide(app.prisma, context);
    return reply.code(200).send(ride);
  });

  async function handleRideHistory(request: FastifyRequest, reply: FastifyReply) {
    const query = parseWith(rideHistoryQuerySchema, request.query ?? {});
    const context = await requireStudentContext(app.prisma, request.user!);
    const page = await listStudentTripHistory(app.prisma, context.studentProfileId, query);
    return reply.code(200).send(page);
  }

  app.get("/me/ride/history", { preHandler: STUDENT_GUARDS }, handleRideHistory);
  app.get("/me/trips", { preHandler: STUDENT_GUARDS }, handleRideHistory);

  app.get("/me/notifications", { preHandler: STUDENT_GUARDS }, async (request, reply) => {
    const query = parseWith(notificationsQuerySchema, request.query ?? {});
    const context = await requireStudentContext(app.prisma, request.user!);
    const page = await listStudentNotifications(
      app.prisma,
      request.user!,
      context.studentProfileId,
      query,
    );
    return reply.code(200).send(page);
  });
}
