import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 20000,
    hookTimeout: 20000,
    // Test files mutate process.env.MONGODB_URI per-file (see global-setup.ts).
    // The default "threads" pool runs files as worker threads that SHARE one
    // process's process.env, so parallel files race-overwrite each other's
    // value. "forks" gives each file its own OS process (own process.env),
    // while still running files in parallel.
    pool: 'forks',
  },
});
