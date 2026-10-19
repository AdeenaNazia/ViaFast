// Test-environment fallbacks so the suite boots even without a local .env.
process.env.NODE_ENV ||= 'test';
process.env.DATABASE_URL ||=
  'postgresql://viafast:viafast@localhost:5432/viafast?schema=public';
