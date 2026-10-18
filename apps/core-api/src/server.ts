import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, closeDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { createShutdownHandler } from './lib/shutdown.js';

async function main(): Promise<void> {
  await connectDb();

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'jobabai-core-api listening');
  });

  const shutdown = createShutdownHandler({ server, closeDb });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
