// ─────────────────────────────────────────────────────────────────────────────
// DEVELOPMENT-ONLY user provisioning CLI (Phase 4, Sections 5 & 12).
//
// This is the authorized-operator path for creating the FIRST login account —
// there is deliberately NO public registration endpoint and NO seeded/default
// credentials. It:
//   • REFUSES to run when NODE_ENV=production, or when DATABASE_URL does not name
//     a dev/test/local database (so it cannot be pointed at production data).
//   • Requires explicit interactive input (email, role, password + confirmation).
//   • Hashes the password with Argon2id (same params as the API) and stores ONLY
//     the hash. The password is read with a MASKED prompt and is never printed,
//     logged, or accepted as a CLI argument (avoids shell-history leakage).
//   • Never overwrites an existing account (aborts if the email already exists).
//   • Never grants ADMIN silently — ADMIN must be chosen AND re-confirmed.
//   • Sets status = ACTIVE so the account can actually log in (this is the
//     account-activation step; the schema already models it via UserStatus).
//
// Usage:  npm run provision:dev-user
// ─────────────────────────────────────────────────────────────────────────────
import "dotenv/config";
import { createInterface } from "node:readline";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, UserRole, UserStatus } from "../generated/prisma/client";
import { hashPassword, MAX_PASSWORD_LENGTH } from "../src/security/password";

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLE_CHOICES: ReadonlyArray<{ key: string; role: UserRole; label: string }> = [
  { key: "1", role: UserRole.STUDENT, label: "STUDENT" },
  { key: "2", role: UserRole.PARENT, label: "PARENT" },
  { key: "3", role: UserRole.DRIVER, label: "DRIVER" },
  { key: "4", role: UserRole.STAFF, label: "STAFF" },
  { key: "5", role: UserRole.ADMIN, label: "ADMIN" },
];

function fail(message: string): never {
  process.stderr.write(`\n[provision] ${message}\n`);
  process.exit(1);
}

function databaseNameOf(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, "");
  } catch {
    return "";
  }
}

/** Visible single-line prompt (written to stderr so stdout stays clean). */
function question(query: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/** Masked prompt: echoes '*' per character; never reveals the secret. */
function questionHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const out = process.stderr;
    out.write(query);
    let value = "";
    const restoreRaw = stdin.isTTY && typeof stdin.setRawMode === "function";
    if (restoreRaw) stdin.setRawMode!(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    const onData = (chunk: string): void => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          if (restoreRaw) stdin.setRawMode!(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          out.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl+C
          if (restoreRaw) stdin.setRawMode!(false);
          out.write("\n");
          process.exit(130);
        } else if (ch === "\u007f" || ch === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            out.write("\b \b");
          }
        } else {
          value += ch;
          out.write("*");
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main(): Promise<void> {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stderr.write("Usage: npm run provision:dev-user   (interactive; development only)\n");
    process.exit(0);
  }

  if (process.env.NODE_ENV === "production") {
    fail("Refusing to run: NODE_ENV=production. This tool is for development only.");
  }
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    fail("DATABASE_URL is not set. Copy .env.example to .env and configure a DEV database.");
  }
  const databaseName = databaseNameOf(databaseUrl);
  if (!/dev|test|local/i.test(databaseName)) {
    fail(
      `Refusing to provision: DATABASE_URL points at "${databaseName || "<unknown>"}", which does not ` +
        `look like a dev/test/local database. Point DATABASE_URL at your development database.`,
    );
  }

  process.stderr.write(`\nViaFast — development user provisioning\nTarget database: ${databaseName}\n\n`);

  const email = (await question("Email: ")).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(`"${email}" is not a valid email address.`);

  process.stderr.write("Roles:\n");
  for (const choice of ROLE_CHOICES) process.stderr.write(`  ${choice.key}) ${choice.label}\n`);
  const roleKey = await question("Primary role [1-5]: ");
  const chosen = ROLE_CHOICES.find((c) => c.key === roleKey);
  if (!chosen) fail(`"${roleKey}" is not a valid role choice.`);
  const role = chosen!.role;

  if (role === UserRole.ADMIN) {
    const confirm = await question("You are creating an ADMIN account. Type 'yes' to confirm: ");
    if (confirm.toLowerCase() !== "yes") fail("Admin creation not confirmed. Aborting.");
  }

  const password = await questionHidden("Password: ");
  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD_LENGTH) {
    fail(`Password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD_LENGTH} characters.`);
  }
  const confirm = await questionHidden("Confirm password: ");
  if (password !== confirm) fail("Passwords do not match.");

  const adapter = new PrismaPg({ connectionString: databaseUrl });
  const prisma = new PrismaClient({ adapter });
  try {
    const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      fail(`An account with email "${email}" already exists. This tool never overwrites accounts.`);
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, primaryRole: role, status: UserStatus.ACTIVE },
      select: { id: true, email: true, primaryRole: true, status: true },
    });

    // Prints NO password and NO hash — only non-sensitive identifiers.
    process.stderr.write(
      `\nCreated user ${user.id}\n  email:  ${user.email}\n  role:   ${user.primaryRole}\n` +
        `  status: ${user.status}\n\nYou can now log in via POST /api/v1/auth/login.\n`,
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2002") fail(`An account with email "${email}" already exists (unique constraint).`);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  process.stderr.write(`\n[provision] Unexpected error: ${(error as Error).message}\n`);
  process.exit(1);
});
