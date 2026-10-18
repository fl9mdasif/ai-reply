import { describe, expect, it } from 'vitest';
import express from 'express';
import request from 'supertest';
import rateLimit from 'express-rate-limit';
import { handler } from '../src/middleware/rate-limiters.js';
import { errorHandler } from '../src/middleware/error-handler.js';

describe('FND-6 rate limiting', () => {
  it('allows requests under the limit, then returns RATE_LIMITED past it', async () => {
    const app = express();
    app.use((req, _res, next) => {
      (req as unknown as { id: string }).id = 'test-request-id';
      next();
    });
    app.use(
      rateLimit({
        windowMs: 60 * 1000,
        limit: 3,
        standardHeaders: true,
        legacyHeaders: false,
        handler,
      }),
    );
    app.get('/ping', (_req, res) => res.status(200).json({ ok: true }));
    app.use(errorHandler);

    for (let i = 0; i < 3; i += 1) {
      const ok = await request(app).get('/ping');
      expect(ok.status).toBe(200);
    }

    const limited = await request(app).get('/ping');
    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ error: { code: 'RATE_LIMITED', message: 'Too many requests' } });
  });
});
