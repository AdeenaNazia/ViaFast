import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NodeEnv } from '../config/configuration';
import { PrismaService } from '../prisma/prisma.service';
import { withTimeout } from '../common/utils/with-timeout';

export interface HealthStatus {
  status: 'ok';
  environment: NodeEnv;
  database: 'connected' | 'unavailable';
  timestamp: string;
}

const DATABASE_CHECK_TIMEOUT_MS = 2000;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    return {
      status: 'ok',
      environment: this.configService.get<NodeEnv>('nodeEnv') ?? 'development',
      database: await this.checkDatabase(),
      timestamp: new Date().toISOString(),
    };
  }

  private async checkDatabase(): Promise<HealthStatus['database']> {
    try {
      await withTimeout(this.prisma.$queryRaw`SELECT 1`, DATABASE_CHECK_TIMEOUT_MS);
      return 'connected';
    } catch {
      return 'unavailable';
    }
  }
}
