import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

// PRD section 8.1 (the non-negotiable): seeds two sellers and asserts that
// seller A's token cannot read, update or delete seller B's data, for every
// seller-scoped route. This file grows as each milestone adds scoped routes
// (M3 catalog, M8 orders, ...). The full route-list meta test ("a new
// scoped route added without being added here fails a meta test") is M9
// scope, tracked there.
describe('Seller isolation', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_isolation_test';
    process.env.REGISTRATION_MODE = 'open';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();

    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const now = new Date();

    const sellerA = await authRepo.insertSeller({
      businessName: 'Seller A Shop',
      email: `seller-a-${Date.now()}@example.com`,
      passwordHash: 'unused-in-this-test-file',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const sellerB = await authRepo.insertSeller({
      businessName: 'Seller B Shop',
      email: `seller-b-${Date.now()}@example.com`,
      passwordHash: 'unused-in-this-test-file',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });

    tokenA = signSellerToken(sellerA._id.toString());
    tokenB = signSellerToken(sellerB._id.toString());
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /seller/me returns only the authenticated seller\'s own profile', async () => {
    const resA = await request(app).get('/seller/me').set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app).get('/seller/me').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    expect(resA.body.businessName).toBe('Seller A Shop');
    expect(resB.body.businessName).toBe('Seller B Shop');
    expect(resA.body.sellerId).not.toBe(resB.body.sellerId);
  });

  it("PATCH /seller/me updates only the authenticated seller's own profile", async () => {
    const res = await request(app)
      .patch('/seller/me')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ businessName: 'Seller A Renamed' });
    expect(res.status).toBe(200);
    expect(res.body.businessName).toBe('Seller A Renamed');

    const resB = await request(app).get('/seller/me').set('Authorization', `Bearer ${tokenB}`);
    expect(resB.body.businessName).toBe('Seller B Shop');
  });

  it("GET /catalog only lists the authenticated seller's own products", async () => {
    const createdByA = await request(app)
      .post('/catalog')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: "Seller A's Product", price: 100 });
    expect(createdByA.status).toBe(201);

    const listA = await request(app).get('/catalog').set('Authorization', `Bearer ${tokenA}`);
    const listB = await request(app).get('/catalog').set('Authorization', `Bearer ${tokenB}`);

    const idsA = listA.body.products.map((p: { productId: string }) => p.productId);
    const idsB = listB.body.products.map((p: { productId: string }) => p.productId);

    expect(idsA).toContain(createdByA.body.productId);
    expect(idsB).not.toContain(createdByA.body.productId);
  });

  it('GET /catalog/:id returns 404 (not 403) when seller B guesses seller A product id', async () => {
    const created = await request(app)
      .post('/catalog')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ name: 'Secret Product', price: 500 });
    expect(created.status).toBe(201);

    const res = await request(app)
      .get(`/catalog/${created.body.productId}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(res.status).toBe(404);
  });

  // M9: orders isolation
  it("GET /orders only lists the authenticated seller's own orders", async () => {
    const { insertOrder } = await import('../src/modules/order/order.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const now = new Date();

    const sellerC = await authRepo.insertSeller({
      businessName: 'Seller C Orders',
      email: `seller-c-orders-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const sellerD = await authRepo.insertSeller({
      businessName: 'Seller D Orders',
      email: `seller-d-orders-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const tokenC = signSellerToken(sellerC._id.toString());
    const tokenD = signSellerToken(sellerD._id.toString());

    const orderC = await insertOrder({
      sellerId: sellerC._id.toString(),
      customerPsid: 'psid-c',
      productName: 'C Product',
      quantity: 1,
      customerName: 'C Customer',
      phone: '01711000001',
      address: 'Dhaka',
      riskFlags: [],
      riskScore: null,
      status: 'pending',
      sheetRowWritten: false,
      sheetWriteAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });

    const listC = await request(app).get('/orders').set('Authorization', `Bearer ${tokenC}`);
    const listD = await request(app).get('/orders').set('Authorization', `Bearer ${tokenD}`);

    expect(listC.status).toBe(200);
    const orderIds = listC.body.orders.map((o: { orderId: string }) => o.orderId);
    expect(orderIds).toContain(orderC._id.toString());

    expect(listD.status).toBe(200);
    const orderIdsD = listD.body.orders.map((o: { orderId: string }) => o.orderId);
    expect(orderIdsD).not.toContain(orderC._id.toString());
  });

  it('GET /orders/:id returns 404 (not 403) when seller B guesses seller A order id', async () => {
    const { insertOrder } = await import('../src/modules/order/order.repo.js');
    const authRepo = await import('../src/modules/auth/auth.repo.js');
    const { signSellerToken } = await import('../src/lib/jwt.js');
    const now = new Date();

    const sellerE = await authRepo.insertSeller({
      businessName: 'Seller E',
      email: `seller-e-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const sellerF = await authRepo.insertSeller({
      businessName: 'Seller F',
      email: `seller-f-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    const tokenF = signSellerToken(sellerF._id.toString());

    const orderE = await insertOrder({
      sellerId: sellerE._id.toString(),
      customerPsid: 'psid-e',
      productName: 'E Product',
      quantity: 1,
      customerName: 'E Customer',
      phone: '01711000002',
      address: 'Sylhet',
      riskFlags: [],
      riskScore: null,
      status: 'pending',
      sheetRowWritten: false,
      sheetWriteAttempts: 0,
      createdAt: now,
      updatedAt: now,
    });

    const res = await request(app)
      .get(`/orders/${orderE._id.toString()}`)
      .set('Authorization', `Bearer ${tokenF}`);
    expect(res.status).toBe(404);
  });
});
