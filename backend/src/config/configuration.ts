export type NodeEnv = 'development' | 'test' | 'production';

export interface AppConfig {
  nodeEnv: NodeEnv;
  port: number;
  databaseUrl: string;
  corsOrigins: string[] | true;
}

export const DEFAULT_PORT = 3001;

function parseCorsOrigins(raw: string | undefined): string[] | true {
  if (raw === undefined || raw.trim() === '' || raw.trim() === '*') {
    return true;
  }
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
}

export const configuration = (): AppConfig => ({
  nodeEnv: (process.env.NODE_ENV as NodeEnv | undefined) ?? 'development',
  port: Number(process.env.PORT ?? DEFAULT_PORT),
  databaseUrl: process.env.DATABASE_URL ?? '',
  corsOrigins: parseCorsOrigins(process.env.CORS_ORIGINS),
});
