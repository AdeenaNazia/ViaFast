// ViaFast database seed runner.
//
// Usage:
//   npm run db:seed                  # persist + verify (needs PostgreSQL on DATABASE_URL)
//   npm run db:seed -- --dry-run     # build + print the plan, no database access
//
// Pipeline: load the frontend source (src/data/initialData.ts, untouched) →
// pure deterministic transform → idempotent persistence in one transaction →
// verification of the resulting database state.

import * as fs from 'node:fs';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import { loadSourceData } from './seed/source';
import { SeedPlan, transformSource } from './seed/transform';
import { persistSeedPlan } from './seed/persist';
import { SEED_SERVICE_DATE_ISO } from './seed/time';
import { VerificationResult, verifySeed } from './seed/verify';

/** Loads backend/.env without overriding variables already in the environment. */
function loadLocalEnv(): void {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) {
    return;
  }
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) {
      continue;
    }
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (match === null) {
      continue;
    }
    if (process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, '');
    }
  }
}

function requireDatabaseUrl(): void {
  if (process.env.DATABASE_URL === undefined || process.env.DATABASE_URL === '') {
    console.error(
      'DATABASE_URL is not set. Copy backend/.env.example to backend/.env (or export DATABASE_URL) — see backend/README.md.',
    );
    process.exit(1);
  }
}

function printPlanSummary(plan: SeedPlan): void {
  console.log('ViaFast seed plan (transformed from src/data/initialData.ts):');
  console.log(`  riders (StudentProfile)      ${plan.riders.length}`);
  console.log(`  guardians (ParentProfile)    ${plan.guardians.length}`);
  console.log(`  guardianships                ${plan.guardianships.length}`);
  console.log(`  drivers (DriverProfile)      ${plan.drivers.length}`);
  console.log(`  vehicles                     ${plan.vehicles.length}`);
  console.log(`  stops (deduplicated)         ${plan.stops.length}`);
  console.log(`  routes                       ${plan.routes.length}`);
  console.log(`  route stops                  ${plan.routeStops.length}`);
  console.log(`  schedules                    ${plan.schedules.length}`);
  console.log(`  transport assignments        ${plan.assignments.length}`);
  console.log(`  fixture trips (${SEED_SERVICE_DATE_ISO})  ${plan.trips.length}`);
  console.log(`  fixture trip stops           ${plan.tripStops.length}`);
  console.log(`  fixture trip passengers      ${plan.tripPassengers.length}`);
  console.log(`  fee definitions              1`);
  console.log(`  invoices                     ${plan.invoices.length}`);
  console.log(`  demo payments                ${plan.payments.length}`);
  console.log('');
  console.log('  Intentionally empty: tracking sessions, GPS readings, vehicle');
  console.log('  positions, incidents, notifications (owned by later phases).');
}

function printVerification(result: VerificationResult): void {
  console.log('Count checks:');
  for (const check of result.counts) {
    const ok = check.expected === check.actual ? 'OK      ' : 'MISMATCH';
    console.log(
      `  ${check.model.padEnd(32)} expected ${String(check.expected).padStart(4)}  actual ${String(check.actual).padStart(4)}  ${ok}`,
    );
  }
  console.log('Relationship checks:');
  for (const check of result.relationships) {
    const suffix = check.passed ? '' : ` — ${check.detail ?? 'failed'}`;
    console.log(`  ${check.name.padEnd(56)} ${check.passed ? 'OK' : `FAILED${suffix}`}`);
  }
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes('--dry-run');
  if (!dryRun) {
    loadLocalEnv();
    requireDatabaseUrl();
  }

  const source = loadSourceData();
  const plan = transformSource(source);
  printPlanSummary(plan);

  if (dryRun) {
    console.log('');
    console.log('--dry-run: plan built from the real source data; no database access performed.');
    return;
  }

  const prisma = new PrismaClient();
  try {
    console.log('');
    console.log('Persisting seed plan (single transaction, idempotent writes)…');
    await persistSeedPlan(prisma, plan);
    console.log('Verifying database state…');
    console.log('');
    const result = await verifySeed(prisma, plan);
    printVerification(result);
    if (!result.pass) {
      console.error('');
      console.error('Seed verification FAILED.');
      process.exitCode = 1;
    } else {
      console.log('');
      console.log('Seed verification passed.');
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Seed failed:', error);
  process.exitCode = 1;
});
