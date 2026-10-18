import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

// NOTE: app.js is imported dynamically inside beforeAll, after process.env is
// set, for the same reason documented in error-shape.test.ts — a static
// import would load config/env.ts too early and bake in the wrong Mongo URI.
//
// NOTE: this file makes exactly 5 POST /auth/register calls total (1 + 1 + 2
// + 1 below). registerLimiter (middleware/rate-limiters.ts) is a module-level
// singleton shared by every test in this file/process, capped at 5 per hour
// per IP (PRD 8.5) — going over that here would 429 a later test. The
// dedicated rate-limit check (AUTH-6) lives in its own file/process instead,
// where it gets a limiter with a clean count.
describe('M2 Auth', () => {
  let app: Express;
  let closeDb: () => Promise<void>;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_auth_test';
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

  it('AUTH-1: register validates input, lowercases email, hashes password, creates the seller', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'Dhaka Fashion House',
      email: 'Owner@Example.COM',
      password: 'correct-horse-battery',
    });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ token: expect.any(String), sellerId: expect.any(String) });

    // email was lowercased at write time: login with the lowercase form works
    const login = await request(app)
      .post('/auth/login')
      .send({ email: 'owner@example.com', password: 'correct-horse-battery' });
    expect(login.status).toBe(200);
  });

  it('AUTH-7: the register response never includes the password or its hash', async () => {
    const res = await request(app).post('/auth/register').send({
      businessName: 'No Leak Store',
      email: 'noleak@example.com',
      password: 'super-secret-password',
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain('super-secret-password');
    expect(serialized.toLowerCase()).not.toContain('passwordhash');
  });

  it('AUTH-3: a duplicate email returns 409 CONFLICT', async () => {
    await request(app).post('/auth/register').send({
      businessName: 'First Shop',
      email: 'dupe@example.com',
      password: 'password-one',
    });

    const res = await request(app).post('/auth/register').send({
      businessName: 'Second Shop',
      email: 'dupe@example.com',
      password: 'password-two',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('AUTH-4: login returns a JWT; a wrong password and an unknown email return the same 401', async () => {
    await request(app).post('/auth/register').send({
      businessName: 'Login Test Shop',
      email: 'login-test@example.com',
      password: 'the-real-password',
    });

    const ok = await request(app)
      .post('/auth/login')
      .send({ email: 'login-test@example.com', password: 'the-real-password' });
    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ token: expect.any(String), sellerId: expect.any(String) });

    const wrongPassword = await request(app)
      .post('/auth/login')
      .send({ email: 'login-test@example.com', password: 'nope' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody-here@example.com', password: 'nope' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});
