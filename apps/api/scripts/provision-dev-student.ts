// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT-ONLY CLI: provision the synthetic Student fixture (ADR‑026 risk 6).
//
// `prisma/seed.ts` seeds no credentials and dates its trips 2026‑03‑02, so the
// Student API cannot be exercised by hand. This creates ONE clearly-designated
// synthetic Student that can log in through the real endpoint and has a ride on
// TODAY's campus service date. It is idempotent: re-running re-sets the password
// and adds today's trips without duplicating anything.
//
// PASSWORD. Read from the environment, never from a CLI argument (which would
// land in shell history) and never from a default in source. Set it in
// apps/api/.env — that file is gitignored — or export it for one command:
//
//   VIAFAST_DEV_STUDENT_PASSWORD='...' npm run provision:dev-student
//
// The plaintext is hashed with the same Argon2id parameters the API verifies
// against; only the hash is stored. Neither the password nor the hash is ever
// printed.
//
// SAFETY. Refuses to run when NODE_ENV=production or when DATABASE_URL does not
// name a dev/test/local database. Writes only rows whose ids start with `dev-`;
// it aborts rather than take over an account it does not own. Creates no fee
// invoice, installment or payment (ADR‑018) and no location or ETA rows
// (ADR‑007), so `tracking` stays honestly null.
//
// Usage:  npm run provision:dev-student
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import {
  checkDevTarget,
  DEV_STUDENT_FIXTURE,
  DEV_STUDENT_PASSWORD_ENV_VAR,
  MIN_DEV_PASSWORD_LENGTH,
  provisionDevStudent,
} from "../src/dev/provision-dev-student";
import { MAX_PASSWORD_LENGTH } from "../src/security/password";

function fail(message: string): never {
  process.stderr.write(`\n[provision:dev-student] ${message}\n`);
  process.exit(1);
}

const USAGE = `Usage: npm run provision:dev-student

Provisions the synthetic development Student fixture in the database named by
DATABASE_URL. Development only; refuses to run against production.

Set the local password first (never committed, never printed):
  ${DEV_STUDENT_PASSWORD_ENV_VAR}='your-local-password' npm run provision:dev-student
or put ${DEV_STUDENT_PASSWORD_ENV_VAR} in apps/api/.env (gitignored).

Then log in:
  curl -X POST http://127.0.0.1:8080/api/v1/auth/login \\
    -H 'content-type: application/json' \\
    -d '{"identifier":"${DEV_STUDENT_FIXTURE.email}","password":"<your-local-password>"}'
`;

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stderr.write(USAGE);
    process.exit(0);
  }

  const check = checkDevTarget(process.env.NODE_ENV, process.env.DATABASE_URL);
  if (!check.safe) fail(check.reason);

  const password = process.env[DEV_STUDENT_PASSWORD_ENV_VAR];
  if (!password) {
    fail(
      `${DEV_STUDENT_PASSWORD_ENV_VAR} is not set. Choose any local-only password ` +
        `(${MIN_DEV_PASSWORD_LENGTH}–${MAX_PASSWORD_LENGTH} characters) and supply it via the environment ` +
        `or apps/api/.env — it is never stored in plaintext and never printed.\n\n${USAGE}`,
    );
  }
  if (password.length < MIN_DEV_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    fail(
      `${DEV_STUDENT_PASSWORD_ENV_VAR} must be between ${MIN_DEV_PASSWORD_LENGTH} and ` +
        `${MAX_PASSWORD_LENGTH} characters.`,
    );
  }

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  const prisma = new PrismaClient({ adapter });
  try {
    process.stderr.write(
      `\nViaFast — synthetic development Student fixture\n` +
        `Target database: ${check.databaseName}\n\n`,
    );

    const result = await provisionDevStudent(prisma, { password });

    // Prints NO password and NO hash — only non-sensitive identifiers.
    process.stderr.write(
      `${result.alreadyProvisioned ? "Updated" : "Created"} the development Student fixture.\n` +
        `  user id:      ${result.userId}\n` +
        `  email:        ${result.email}\n` +
        `  role:         ${result.role}\n` +
        `  profile id:   ${result.studentProfileId}\n` +
        `  student no.:  ${result.studentNumber}\n` +
        `  term:         ${result.termId} (${DEV_STUDENT_FIXTURE.termCode})\n` +
        `  route:        ${result.routeId} (${result.routeCode})\n` +
        `  assignment:   ${result.assignmentId} (ACTIVE, open-ended)\n` +
        `  vehicle:      ${result.vehicleId} (${DEV_STUDENT_FIXTURE.plateNumber})\n` +
        `  driver:       ${result.driverProfileId}\n` +
        `  service date: ${result.serviceDate} (Asia/Karachi)\n` +
        `  trips:        ${result.inboundTripId} (IN_PROGRESS)\n` +
        `                ${result.returnTripId} (SCHEDULED)\n` +
        `  notification: ${result.notificationId}\n\n` +
        `No fee, payment, location or ETA rows were created; \`tracking\` stays null.\n` +
        `Log in with POST /api/v1/auth/login using ${result.email} and the password you set.\n`,
    );
  } catch (error) {
    fail((error as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`\n[provision:dev-student] Unexpected error: ${(error as Error).message}\n`);
  process.exit(1);
});
