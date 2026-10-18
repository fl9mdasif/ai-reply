import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

// Own file/process so REGISTRATION_MODE=invite doesn't leak into auth.test.ts,
// and so its 3 register calls get a fresh registerLimiter (see auth.test.ts).
describe('AUTH-2 invite mode', () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_auth_invite_test';
    process.env.REGISTRATION_MODE = 'invite';
    process.env.INVITE_CODE = 'pilot-2026';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('rejects a missing invite code with 403 FORBIDDEN', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Invite Shop',
      email: 'invite-missing@example.com',
      password: 'password-three',
    });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a wrong invite code with 403 FORBIDDEN', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Invite Shop',
      email: 'invite-wrong@example.com',
      password: 'password-three',
      inviteCode: 'not-the-code',
    });
    expect(res.status).toBe(403);
  });

  it('accepts the correct invite code', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Invite Shop',
      email: 'invite-right@example.com',
      password: 'password-three',
      inviteCode: 'pilot-2026',
    });
    expect(res.status).toBe(201);
  });
});
