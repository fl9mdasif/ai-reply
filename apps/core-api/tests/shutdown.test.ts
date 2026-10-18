import { describe, expect, it, vi } from 'vitest';
import type { Server } from 'node:http';
import { createShutdownHandler } from '../src/lib/shutdown.js';

function fakeServer(): Server {
  return {
    close: (cb?: () => void) => {
      cb?.();
    },
  } as unknown as Server;
}

describe('FND-8 graceful shutdown', () => {
  it('stops accepting connections, closes the db, then exits 0', async () => {
    const server = fakeServer();
    const closeDb = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();

    const shutdown = createShutdownHandler({ server, closeDb, exit });
    shutdown('SIGTERM');

    await vi.waitFor(() => expect(closeDb).toHaveBeenCalledTimes(1));
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(0));
  });

  it('exits 1 when closing the db fails', async () => {
    const server = fakeServer();
    const closeDb = vi.fn().mockRejectedValue(new Error('mongo close failed'));
    const exit = vi.fn();

    const shutdown = createShutdownHandler({ server, closeDb, exit });
    shutdown('SIGTERM');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
  });

  it('only runs once even if called twice (duplicate signals)', async () => {
    const server = fakeServer();
    const closeDb = vi.fn().mockResolvedValue(undefined);
    const exit = vi.fn();

    const shutdown = createShutdownHandler({ server, closeDb, exit });
    shutdown('SIGTERM');
    shutdown('SIGINT');

    await vi.waitFor(() => expect(exit).toHaveBeenCalledTimes(1));
    expect(closeDb).toHaveBeenCalledTimes(1);
  });
});
