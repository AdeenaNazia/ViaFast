import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { configureApp } from '../src/app.setup';
import { AppModule } from '../src/app.module';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns successfully with the mandated payload', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ status: 'ok' });
    expect(typeof response.body.environment).toBe('string');
    expect(['connected', 'unavailable']).toContain(response.body.database);
    expect(Number.isNaN(Date.parse(response.body.timestamp))).toBe(false);
  });

  it('does not expose the database connection string', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(JSON.stringify(response.body)).not.toContain('postgresql://');
  });
});
