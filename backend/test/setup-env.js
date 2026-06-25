process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://neihao_test:neihao_test_password@localhost:5433/neihao_records_test?schema=public';
process.env.JWT_ACCESS_SECRET = 'e2e-access-secret-that-is-only-used-for-tests';
process.env.JWT_REFRESH_SECRET = 'e2e-refresh-secret-that-is-only-used-for-tests';
