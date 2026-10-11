import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { withTimeout } from '../common/utils/with-timeout';

const DISCONNECT_TIMEOUT_MS = 3000;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  // No eager $connect on module init: the API must boot even when PostgreSQL
  // is down; consumers (e.g. HealthService) connect on demand.
  async onModuleDestroy(): Promise<void> {
    try {
      await withTimeout(this.$disconnect(), DISCONNECT_TIMEOUT_MS, 'Database disconnect');
    } catch {
      // The engine can be in a failed state when it never connected;
      // teardown must not hang or throw because of it.
    }
  }
}
