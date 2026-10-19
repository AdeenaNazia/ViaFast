// ─────────────────────────────────────────────────────────────────────────────
// Prisma client as a Fastify decoration (Prisma 7 requires a driver adapter).
// Registered via fastify-plugin so `app.prisma` is visible across encapsulated
// route contexts. The pool connects lazily, so the process can boot even if the
// database is momentarily unreachable — /health reports readiness separately.
// ─────────────────────────────────────────────────────────────────────────────
import { PrismaPg } from "@prisma/adapter-pg";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "../../generated/prisma/client";
import { env } from "../config/env";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export const prismaPlugin = fp(
  async (app: FastifyInstance) => {
    const adapter = new PrismaPg({ connectionString: env.databaseUrl });
    const prisma = new PrismaClient({ adapter });
    app.decorate("prisma", prisma);
    app.addHook("onClose", async (instance) => {
      await instance.prisma.$disconnect();
    });
  },
  { name: "prisma" },
);
