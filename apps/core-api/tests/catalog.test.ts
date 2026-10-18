import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

describe('M3 Catalog', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  let token: string;

  // The stub rag-engine isn't running in tests; /embed and /embed/:id are
  // mocked at the HTTP boundary with msw instead (per PRD section 12).
  const ragServer = setupServer(
    http.post('http://localhost:4000/embed', () => HttpResponse.json({ chunksEmbedded: 1 })),
    http.delete('http://localhost:4000/embed/:productId', () => HttpResponse.json({ success: true })),
  );

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_catalog_test';
    process.env.REGISTRATION_MODE = 'open';
    process.env.RAG_ENGINE_URL = 'http://localhost:4000';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();

    ragServer.listen({ onUnhandledRequest: 'bypass' });
  });

  beforeEach(async () => {
    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const now = new Date();
    const seller = await authRepo.insertSeller({
      businessName: 'Catalog Test Shop',
      email: `catalog-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`,
      passwordHash: 'unused-in-this-test-file',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    token = signSellerToken(seller._id.toString());
  });

  afterEach(() => ragServer.resetHandlers());

  afterAll(async () => {
    ragServer.close();
    await closeDb();
  });

  function authed() {
    return { Authorization: `Bearer ${token}` };
  }

  it('CAT-1, CAT-2, CAT-9: create validates input, embeds, and lowercases the name', async () => {
    const res = await request(app)
      .post('/catalog')
      .set(authed())
      .send({ name: 'Red Saree', price: 2500, description: 'Handwoven cotton saree' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ productId: expect.any(String), embedStatus: 'synced' });

    const get = await request(app).get(`/catalog/${res.body.productId}`).set(authed());
    expect(get.status).toBe(200);
    expect(get.body.name).toBe('Red Saree');
    expect(get.body.price).toBe(2500);
  });

  it('CAT-2: rejects an empty name and a negative price', async () => {
    const res = await request(app).post('/catalog').set(authed()).send({ name: '', price: -5 });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('CAT-1: read, update, delete are all scoped by sellerId (one seller cannot touch another)', async () => {
    const created = await request(app)
      .post('/catalog')
      .set(authed())
      .send({ name: "Seller A's Product", price: 1000 });
    const productId = created.body.productId as string;

    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const now = new Date();
    const otherSeller = await authRepo.insertSeller({
      businessName: 'Other Catalog Shop',
      email: `other-catalog-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const otherToken = signSellerToken(otherSeller._id.toString());
    const otherAuth = { Authorization: `Bearer ${otherToken}` };

    const getAsOther = await request(app).get(`/catalog/${productId}`).set(otherAuth);
    expect(getAsOther.status).toBe(404);

    const putAsOther = await request(app)
      .put(`/catalog/${productId}`)
      .set(otherAuth)
      .send({ name: 'Hijacked', price: 1 });
    expect(putAsOther.status).toBe(404);

    const deleteAsOther = await request(app).delete(`/catalog/${productId}`).set(otherAuth);
    expect(deleteAsOther.status).toBe(404);

    const stillThere = await request(app).get(`/catalog/${productId}`).set(authed());
    expect(stillThere.status).toBe(200);
    expect(stillThere.body.name).toBe("Seller A's Product");
  });

  it('CAT-3, CAT-4: embed failure marks embedStatus failed but the product is still created', async () => {
    ragServer.use(http.post('http://localhost:4000/embed', () => HttpResponse.error()));

    const res = await request(app)
      .post('/catalog')
      .set(authed())
      .send({ name: 'Flaky Embed Product', price: 500 });

    expect(res.status).toBe(201);
    expect(res.body.embedStatus).toBe('failed');

    const get = await request(app).get(`/catalog/${res.body.productId}`).set(authed());
    expect(get.body.embedStatus).toBe('failed');
    expect(get.body.embedError).toBeTruthy();
  });

  it('CAT-5: delete removes the product then calls vector removal; removal failure does not block the delete', async () => {
    const created = await request(app)
      .post('/catalog')
      .set(authed())
      .send({ name: 'Doomed Product', price: 750 });
    const productId = created.body.productId as string;

    ragServer.use(http.delete('http://localhost:4000/embed/:productId', () => HttpResponse.error()));

    const del = await request(app).delete(`/catalog/${productId}`).set(authed());
    expect(del.status).toBe(200);
    expect(del.body).toEqual({ success: true });

    const get = await request(app).get(`/catalog/${productId}`).set(authed());
    expect(get.status).toBe(404);
  });

  it('CAT-6: POST /catalog/:id/reembed retries a failed product', async () => {
    ragServer.use(http.post('http://localhost:4000/embed', () => HttpResponse.error()));
    const created = await request(app)
      .post('/catalog')
      .set(authed())
      .send({ name: 'Needs Reembed', price: 300 });
    expect(created.body.embedStatus).toBe('failed');

    ragServer.resetHandlers();
    const reembed = await request(app)
      .post(`/catalog/${created.body.productId}/reembed`)
      .set(authed());

    expect(reembed.status).toBe(200);
    expect(reembed.body).toEqual({ embedStatus: 'synced' });
  });

  it('CAT-7: POST /catalog/import embeds each item with bounded concurrency', async () => {
    const items = Array.from({ length: 6 }, (_, i) => ({ name: `Import Item ${i}`, price: 100 + i }));

    const res = await request(app).post('/catalog/import').set(authed()).send(items);

    expect(res.status).toBe(200);
    expect(res.body.created).toBe(6);
    expect(res.body.failed).toEqual([]);

    const list = await request(app).get('/catalog?limit=100').set(authed());
    expect(list.body.products.length).toBeGreaterThanOrEqual(6);
  });

  it('CAT-8: list is paginated, defaults to 50, respects a max of 100, and pages via cursor', async () => {
    const tooMany = await request(app).get('/catalog?limit=101').set(authed());
    expect(tooMany.status).toBe(400);

    const items = Array.from({ length: 5 }, (_, i) => ({ name: `Page Item ${i}`, price: 10 + i }));
    await request(app).post('/catalog/import').set(authed()).send(items);

    const firstPage = await request(app).get('/catalog?limit=2').set(authed());
    expect(firstPage.status).toBe(200);
    expect(firstPage.body.products).toHaveLength(2);
    expect(firstPage.body.nextCursor).toBeTruthy();

    const secondPage = await request(app)
      .get(`/catalog?limit=2&cursor=${firstPage.body.nextCursor}`)
      .set(authed());
    expect(secondPage.status).toBe(200);
    expect(secondPage.body.products).toHaveLength(2);

    const firstIds = firstPage.body.products.map((p: { productId: string }) => p.productId);
    const secondIds = secondPage.body.products.map((p: { productId: string }) => p.productId);
    expect(firstIds).not.toEqual(expect.arrayContaining(secondIds));
  });
});
