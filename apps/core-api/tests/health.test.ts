import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

describe('HLT-1 / HLT-2 health routes', () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  const ragServer = setupServer(
    http.get('http://localhost:4000/health', () => HttpResponse.json({ status: 'ok' })),
  );

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_health_test';
    process.env.RAG_ENGINE_URL = 'http://localhost:4000';

    ragServer.listen({ onUnhandledRequest: 'bypass' });

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();
  });

  afterAll(async () => {
    ragServer.close();
    await closeDb();
  });

  it('HLT-1: GET /health returns 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok' });
  });

  it('HLT-2: GET /health/deps reports ok when Mongo and rag-engine are up', async () => {
    const res = await request(app).get('/health/deps');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', mongo: 'ok', ragEngine: 'ok' });
  });

  it('HLT-2: GET /health/deps reports ragEngine down without failing the whole check', async () => {
    ragServer.use(
      http.get('http://localhost:4000/health', () => HttpResponse.error()),
    );

    const res = await request(app).get('/health/deps');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', mongo: 'ok', ragEngine: 'down' });

    ragServer.resetHandlers();
  });

  it('HLT-2: GET /health/deps returns 503 when Mongo is down', async () => {
    await closeDb();

    const res = await request(app).get('/health/deps');
    expect(res.status).toBe(503);
    expect(res.body.mongo).toBe('down');

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
  });
});
