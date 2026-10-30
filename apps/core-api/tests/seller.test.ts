import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

// Matches env.ts's META_GRAPH_VERSION default, which tests/setup.ts doesn't override.
const GRAPH_BASE = 'https://graph.facebook.com/v21.0';

describe('M2 Seller', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  let token: string;
  let sellerId: string;

  const graphServer = setupServer();

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_seller_test';
    process.env.REGISTRATION_MODE = 'open';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();

    graphServer.listen({ onUnhandledRequest: 'bypass' });
  });

  // Seeds a seller directly via the repo + signs its token with lib/jwt.ts,
  // instead of going through the real, rate-limited POST /auth/register.
  // This file registers a fresh seller before every test (8+ times) — going
  // through the HTTP endpoint would blow past registerLimiter's 5/hour cap
  // partway through (see auth.test.ts's note on the same issue).
  async function seedSeller(businessName: string): Promise<{ sellerId: string; token: string }> {
    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const now = new Date();
    const seller = await authRepo.insertSeller({
      businessName,
      email: `${businessName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: 'unused-in-this-test-file',
      status: 'active',
      role: 'seller',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const id = seller._id.toString();
    return { sellerId: id, token: signSellerToken(id, 'seller') };
  }

  beforeEach(async () => {
    ({ sellerId, token } = await seedSeller('Seller Test Shop'));
  });

  afterEach(() => graphServer.resetHandlers());

  afterAll(async () => {
    graphServer.close();
    await closeDb();
  });

  function authed() {
    return { Authorization: `Bearer ${token}` };
  }

  it('SEL-1: GET /seller/me returns the profile with no secret fields', async () => {
    const res = await request(app).get('/seller/me').set(authed());

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      sellerId,
      businessName: 'Seller Test Shop',
      plan: 'pilot',
      webhookSubscribed: false,
      googleSheetConnected: false,
    });

    const serialized = JSON.stringify(res.body).toLowerCase();
    expect(serialized).not.toContain('passwordhash');
    expect(serialized).not.toContain('facebookpageaccesstoken');
    expect(serialized).not.toContain('googleoauthrefreshtoken');
  });

  it('SEL-2: connect-facebook validates the token against the Graph API and stores it encrypted', async () => {
    graphServer.use(
      http.get(`${GRAPH_BASE}/111222333`, () => HttpResponse.json({ id: '111222333', name: "Asif's Shop" })),
      http.post(`${GRAPH_BASE}/111222333/subscribed_apps`, () => HttpResponse.json({ success: true })),
    );

    const res = await request(app)
      .post('/seller/connect-facebook')
      .set(authed())
      .send({ pageId: '111222333', pageAccessToken: 'EAA-fake-page-token' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, pageName: "Asif's Shop", webhookSubscribed: true });

    const { ObjectId } = await import('mongodb');
    const dbModule = await import('../src/lib/db.js');
    const stored = await dbModule
      .sellersCollection()
      .findOne({ _id: new ObjectId(sellerId) });
    expect(stored?.facebookPageAccessToken).toBeDefined();
    expect(stored?.facebookPageAccessToken).not.toContain('EAA-fake-page-token');
  });

  it('SEL-2: an invalid Page token is rejected with 400', async () => {
    graphServer.use(
      http.get(`${GRAPH_BASE}/999888777`, () => HttpResponse.json({ error: { message: 'bad token' } }, { status: 400 })),
    );

    const res = await request(app)
      .post('/seller/connect-facebook')
      .set(authed())
      .send({ pageId: '999888777', pageAccessToken: 'not-a-real-token' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('SEL-3: a Page already connected to another seller returns 409', async () => {
    graphServer.use(
      http.get(`${GRAPH_BASE}/555666777`, () => HttpResponse.json({ id: '555666777', name: 'Shared Page' })),
      http.post(`${GRAPH_BASE}/555666777/subscribed_apps`, () => HttpResponse.json({ success: true })),
    );

    const first = await request(app)
      .post('/seller/connect-facebook')
      .set(authed())
      .send({ pageId: '555666777', pageAccessToken: 'token-a' });
    expect(first.status).toBe(200);

    const { token: otherToken } = await seedSeller('Other Seller Shop');

    const second = await request(app)
      .post('/seller/connect-facebook')
      .set({ Authorization: `Bearer ${otherToken}` })
      .send({ pageId: '555666777', pageAccessToken: 'token-b' });

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe('CONFLICT');
  });

  it('SEL-4: when Facebook subscription fails, connect still succeeds with webhookSubscribed: false', async () => {
    graphServer.use(
      http.get(`${GRAPH_BASE}/222333444`, () => HttpResponse.json({ id: '222333444', name: 'Flaky Sub Shop' })),
      http.post(`${GRAPH_BASE}/222333444/subscribed_apps`, () => HttpResponse.json({ error: 'nope' }, { status: 500 })),
    );

    const res = await request(app)
      .post('/seller/connect-facebook')
      .set(authed())
      .send({ pageId: '222333444', pageAccessToken: 'token-flaky' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, pageName: 'Flaky Sub Shop', webhookSubscribed: false });
  });

  it('SEL-5: DELETE connect-facebook unsubscribes and clears the Page fields', async () => {
    graphServer.use(
      http.get(`${GRAPH_BASE}/333444555`, () => HttpResponse.json({ id: '333444555', name: 'Disconnect Shop' })),
      http.post(`${GRAPH_BASE}/333444555/subscribed_apps`, () => HttpResponse.json({ success: true })),
      http.delete(`${GRAPH_BASE}/333444555/subscribed_apps`, () => HttpResponse.json({ success: true })),
    );

    await request(app)
      .post('/seller/connect-facebook')
      .set(authed())
      .send({ pageId: '333444555', pageAccessToken: 'token-disconnect' });

    const del = await request(app).delete('/seller/connect-facebook').set(authed());
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ success: true });

    const me = await request(app).get('/seller/me').set(authed());
    expect(me.body.facebookPageId).toBeUndefined();
    expect(me.body.webhookSubscribed).toBe(false);
  });

  it('SEL-6: PATCH /seller/me updates only the whitelisted fields', async () => {
    const res = await request(app)
      .patch('/seller/me')
      .set(authed())
      .send({ businessName: 'Renamed Shop', fallbackMessage: 'We will get back to you soon.', email: 'hacker@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.businessName).toBe('Renamed Shop');
    expect(res.body.fallbackMessage).toBe('We will get back to you soon.');
    expect(res.body.email).not.toBe('hacker@example.com');
  });

  it('SEL-7: GET /seller/connect-sheets/url returns a Google consent URL with a signed state', async () => {
    const res = await request(app).get('/seller/connect-sheets/url').set(authed());

    expect(res.status).toBe(200);
    const url = new URL(res.body.url as string);
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('scope')).toContain('drive.file');
    expect(url.searchParams.get('state')).toBeTruthy();

    const { verifyOAuthState } = await import('../src/lib/jwt.js');
    expect(verifyOAuthState(url.searchParams.get('state') as string)).toEqual({ sellerId });
  });
});
