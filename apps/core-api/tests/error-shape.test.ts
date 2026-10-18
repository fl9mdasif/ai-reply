import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import express from 'express';
import type { Express } from 'express';
import type { errorHandler as ErrorHandlerType } from '../src/middleware/error-handler.js';
import type { NotFoundError as NotFoundErrorType } from '../src/lib/errors.js';
import { getSharedMongoUri } from './global-setup.js';

// NOTE: errorHandler/NotFoundError are imported dynamically below, not statically
// at the top of this file. A static import here would eagerly load
// config/env.ts (via lib/logger.ts) *before* beforeAll gets a chance to set
// process.env.MONGODB_URI, baking in the wrong (default) Mongo URI and making
// connectDb() hang until it times out. health.test.ts/db.test.ts avoid this
// by only ever importing app.js/db.js dynamically inside beforeAll.
describe('FND-4 uniform error shape', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  let errorHandler: typeof ErrorHandlerType;
  let NotFoundError: typeof NotFoundErrorType;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_error_test';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();

    ({ errorHandler } = await import('../src/middleware/error-handler.js'));
    ({ NotFoundError } = await import('../src/lib/errors.js'));
  });

  afterAll(async () => {
    await closeDb();
  });

  it('404: unknown route returns { error: { code: NOT_FOUND, message } }', async () => {
    const res = await request(app).get('/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: expect.stringContaining('/this-route-does-not-exist') },
    });
  });

  it('400: malformed JSON body returns { error: { code: VALIDATION_ERROR, message } }', async () => {
    const res = await request(app)
      .post('/health')
      .set('Content-Type', 'application/json')
      .send('{ not valid json');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('500: an unexpected thrown error returns { error: { code: INTERNAL_ERROR, message } }', async () => {
    const testApp = express();
    testApp.use((req, _res, next) => {
      (req as unknown as { id: string }).id = 'test-request-id';
      next();
    });
    testApp.get('/boom', () => {
      throw new Error('boom');
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/boom');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });

  it('a typed AppError (e.g. NotFoundError) maps to its own status and code', async () => {
    const testApp = express();
    testApp.use((req, _res, next) => {
      (req as unknown as { id: string }).id = 'test-request-id';
      next();
    });
    testApp.get('/missing', () => {
      throw new NotFoundError('Product not found');
    });
    testApp.use(errorHandler);

    const res = await request(testApp).get('/missing');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: { code: 'NOT_FOUND', message: 'Product not found' } });
  });
});
