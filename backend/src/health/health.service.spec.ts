import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HealthService } from './health.service';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthService', () => {
  const buildService = async (
    queryRaw: () => Promise<unknown>,
  ): Promise<HealthService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'nodeEnv' ? 'test' : undefined) },
        },
        { provide: PrismaService, useValue: { $queryRaw: queryRaw } },
      ],
    }).compile();
    return moduleRef.get(HealthService);
  };

  it('reports connected when the database responds to SELECT 1', async () => {
    const service = await buildService(async () => [{ '?column?': 1 }]);

    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.environment).toBe('test');
    expect(health.database).toBe('connected');
    expect(typeof health.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(health.timestamp))).toBe(false);
  });

  it('stays ok and reports unavailable when the database is unreachable', async () => {
    const service = await buildService(async () => {
      throw new Error('ECONNREFUSED');
    });

    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.database).toBe('unavailable');
  });

  it('stays ok and reports unavailable when the database check exceeds the timeout', async () => {
    const service = await buildService(() => new Promise<never>(() => undefined));

    const health = await service.getHealth();

    expect(health.status).toBe('ok');
    expect(health.database).toBe('unavailable');
  });
});
