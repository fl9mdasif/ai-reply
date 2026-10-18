import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

describe('AUTH-5 auth-guard', () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_auth_guard_test';
    process.env.REGISTRATION_MODE = 'open';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('rejects a request with no Authorization header', async () => {
    const res = await request(app).get('/seller/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rejects a malformed or invalid token', async () => {
    const res = await request(app).get('/seller/me').set('Authorization', 'Bearer not-a-real-token');
    expect(res.status).toBe(401);
  });

  it('accepts a valid token, sets req.sellerId, then rejects it once the seller is suspended', async () => {
    const register = await request(app).post('/auth/register').send({
      businessName: 'Suspend Me Shop',
      email: 'suspend-me@example.com',
      password: 'password-four',
    });
    const { token, sellerId } = register.body as { token: string; sellerId: string };

    const beforeSuspend = await request(app).get('/seller/me').set('Authorization', `Bearer ${token}`);
    expect(beforeSuspend.status).toBe(200);
    expect(beforeSuspend.body.sellerId).toBe(sellerId);

    const { ObjectId } = await import('mongodb');
    const dbModule = await import('../src/lib/db.js');
    await dbModule
      .sellersCollection()
      .updateOne({ _id: new ObjectId(sellerId) }, { $set: { status: 'suspended' } });

    const afterSuspend = await request(app).get('/seller/me').set('Authorization', `Bearer ${token}`);
    expect(afterSuspend.status).toBe(401);
  });
});
