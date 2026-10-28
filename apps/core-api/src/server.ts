import { buildApp } from './app.js';
import { env } from './config/env.js';
import { connectDb, closeDb } from './lib/db.js';
import { logger } from './lib/logger.js';
import { createShutdownHandler } from './lib/shutdown.js';
import { runRetryJobTick } from './modules/order/order.service.js';

const RETRY_JOB_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes per PRD 11.4

async function main(): Promise<void> {
  await connectDb();

  const app = buildApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'jobabai-core-api listening');
  });

  // ORD-8: background Sheet retry job, gated by ENABLE_RETRY_JOB.
  let retryInterval: ReturnType<typeof setInterval> | undefined;
  if (env.ENABLE_RETRY_JOB) {
    retryInterval = setInterval(() => {
      runRetryJobTick().catch((err: unknown) => logger.error({ err }, 'retry job tick threw'));
    }, RETRY_JOB_INTERVAL_MS);
    logger.info('Sheet retry job started');
  }

  const shutdown = createShutdownHandler({
    server,
    closeDb,
    onShutdown: () => {
      if (retryInterval) clearInterval(retryInterval);
    },
  });

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
