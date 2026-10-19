import { NodeEnv } from './configuration';

const ALLOWED_NODE_ENV: readonly NodeEnv[] = ['development', 'test', 'production'];

export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];

  const nodeEnv = (config.NODE_ENV as NodeEnv | undefined) ?? 'development';
  if (!ALLOWED_NODE_ENV.includes(nodeEnv)) {
    errors.push(
      `NODE_ENV must be one of ${ALLOWED_NODE_ENV.join(' | ')} (got "${String(config.NODE_ENV)}")`,
    );
  }

  const portRaw = (config.PORT as string | undefined) ?? '3001';
  const port = Number(portRaw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    errors.push(`PORT must be an integer between 1 and 65535 (got "${portRaw}")`);
  }

  if (typeof config.DATABASE_URL !== 'string' || config.DATABASE_URL.length === 0) {
    errors.push('DATABASE_URL is required');
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment configuration:\n- ${errors.join('\n- ')}`);
  }

  return config;
}
