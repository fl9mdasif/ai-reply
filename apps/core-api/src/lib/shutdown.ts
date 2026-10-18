import type { Server } from 'node:http';
import { logger } from './logger.js';

export interface ShutdownDeps {
  server: Server;
  closeDb: () => Promise<void>;
  exit?: (code: number) => void;
}

// FND-8: graceful shutdown on SIGTERM — stop accepting new connections,
// let in-flight requests finish, close Mongo, then exit.
export function createShutdownHandler({ server, closeDb, exit = process.exit }: ShutdownDeps) {
  let shuttingDown = false;

  return function shutdown(signal: string): void {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down');

    server.close(() => {
      closeDb()
        .then(() => {
          logger.info('Shutdown complete');
          exit(0);
        })
        .catch((err: unknown) => {
          logger.error({ err }, 'Error during shutdown');
          exit(1);
        });
    });
  };
}
