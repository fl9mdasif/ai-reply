import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

// Own file/process so this is the only test exercising registerLimiter's
// actual 5-per-hour cap — sharing an app/limiter with other AUTH tests would
// make them 429 unpredictably depending on run order (see auth.test.ts).
describe('AUTH-6 register rate limit', () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_auth_rate_limit_test';
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

  it('allows 5 registrations per hour per IP, then 429s on the 6th (PRD 8.5)', async () => {
    for (let i = 0; i < 5; i += 1) {
      const res = await request(app).post('/auth/register').send({
        businessName: 'Rate Limit Shop',
        email: `rate-limit-${i}@example.com`,
        password: 'password-five',
      });
      expect(res.status).toBe(201);
    }

    const sixth = await request(app).post('/auth/register').send({
      businessName: 'Rate Limit Shop',
      email: 'rate-limit-6@example.com',
      password: 'password-five',
    });

    expect(sixth.status).toBe(429);
    expect(sixth.body.error.code).toBe('RATE_LIMITED');
  });

  it('allows 10 logins per 15 minutes per IP+email, then 429s on the 11th (PRD 8.5)', async () => {
    const email = 'login-rate-limit@example.com';
    for (let i = 0; i < 10; i += 1) {
      const res = await request(app).post('/auth/login').send({ email, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const eleventh = await request(app).post('/auth/login').send({ email, password: 'wrong' });
    expect(eleventh.status).toBe(429);
    expect(eleventh.body.error.code).toBe('RATE_LIMITED');
  });
});
