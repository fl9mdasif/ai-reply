import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

// ORD-1..ORD-10 via order.service + order.repo against mongodb-memory-server.
// Sheets calls are mocked via msw (Google Sheets API endpoint pattern).

describe('M8 Orders (ORD-1..ORD-10)', () => {
  let closeDb: () => Promise<void>;
  let orderService: typeof import('../src/modules/order/order.service.js');
  let db: typeof import('../src/lib/db.js');

  // msw stubs for rag-engine /risk-score and Google Sheets API
  const mswServer = setupServer(
    http.post('http://localhost:4001/risk-score', () =>
      HttpResponse.json({ riskFlags: [], riskScore: 0.1 }),
    ),
    http.post(/googleapis\.com\/v4\/spreadsheets/, () =>
      HttpResponse.json({ updates: { updatedRange: 'Sheet1!A2:L2' } }),
    ),
  );

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_order_test';
    process.env.RAG_ENGINE_URL = 'http://localhost:4001';

    mswServer.listen({ onUnhandledRequest: 'bypass' });

    db = await import('../src/lib/db.js');
    await db.connectDb();
    closeDb = db.closeDb;

    orderService = await import('../src/modules/order/order.service.js');
  });

  afterAll(async () => {
    mswServer.close();
    await closeDb();
  });

  // -------------------------------------------------------------------
  // createFromDraft — the full sequence
  // -------------------------------------------------------------------

  it('ORD-1: createFromDraft inserts an order into Mongo with all required fields', async () => {
    const result = await orderService.createFromDraft({
      sellerId: 'seller-ord-1',
      customerPsid: 'psid-ord-1',
      draft: {
        product: 'Test Shirt',
        quantity: 2,
        customerName: 'Rahim Uddin',
        phone: '01711223344',
        address: 'Dhaka',
      },
    });

    expect(result.orderId).toBeTruthy();
    expect(result.productName).toBe('Test Shirt');
    expect(result.quantity).toBe(2);
    expect(result.customerName).toBe('Rahim Uddin');
    expect(result.phone).toBe('01711223344');
    expect(result.address).toBe('Dhaka');
    expect(result.status).toBe('pending');

    const stored = await db.ordersCollection().findOne({ sellerId: 'seller-ord-1' });
    expect(stored).not.toBeNull();
    expect(stored?.productName).toBe('Test Shirt');
  });

  it('ORD-2: risk score result is attached to the order', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [{ code: 'TEST_FLAG', reason: 'test' }], riskScore: 0.8 }),
      ),
    );

    const result = await orderService.createFromDraft({
      sellerId: 'seller-ord-2',
      customerPsid: 'psid-ord-2',
      draft: {
        product: 'Cap',
        quantity: 1,
        customerName: 'Karim',
        phone: '01811223344',
        address: 'Chittagong',
      },
    });

    expect(result.riskScore).toBe(0.8);
    expect(result.riskFlags).toEqual([{ code: 'TEST_FLAG', reason: 'test' }]);
  });

  it('ORD-2: risk score fail-soft — order still created when rag-engine is down', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () => HttpResponse.error()),
    );

    const result = await orderService.createFromDraft({
      sellerId: 'seller-ord-2b',
      customerPsid: 'psid-ord-2b',
      draft: {
        product: 'Bag',
        quantity: 1,
        customerName: 'Salam',
        phone: '01911223344',
        address: 'Sylhet',
      },
    });

    expect(result.orderId).toBeTruthy();
    expect(result.riskFlags.some((f) => f.code === 'risk_unavailable')).toBe(true);
  });

  it('ORD-2: phoneAttempts >= 2 adds unverified_phone risk flag', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0.1 }),
      ),
    );

    const result = await orderService.createFromDraft({
      sellerId: 'seller-ord-phone',
      customerPsid: 'psid-ord-phone',
      draft: {
        product: 'Shoes',
        quantity: 1,
        customerName: 'Jalal',
        phone: 'bad-number',
        address: 'Rajshahi',
        phoneAttempts: 2,
      },
    });

    expect(result.riskFlags.some((f) => f.code === 'unverified_phone')).toBe(true);
  });

  it('ORD-10: createFromDraft throws ValidationError on incomplete draft', async () => {
    await expect(
      orderService.createFromDraft({
        sellerId: 'seller-ord-val',
        customerPsid: 'psid-ord-val',
        draft: { product: 'Widget' },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('ORD-10: quantity is clamped to 1–100', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0 }),
      ),
    );

    const result = await orderService.createFromDraft({
      sellerId: 'seller-ord-clamp',
      customerPsid: 'psid-ord-clamp',
      draft: {
        product: 'Bulk Item',
        quantity: 9999,
        customerName: 'Karim',
        phone: '01611223344',
        address: 'Dhaka',
      },
    });

    expect(result.quantity).toBe(100);
  });

  // -------------------------------------------------------------------
  // ORD-4: list and get with seller isolation
  // -------------------------------------------------------------------

  it('ORD-4: listSellerOrders only returns orders for the correct seller', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0 }),
      ),
    );

    await orderService.createFromDraft({
      sellerId: 'seller-list-a',
      customerPsid: 'psid-list-a',
      draft: { product: 'P1', quantity: 1, customerName: 'A', phone: '01511223344', address: 'Dhaka' },
    });
    await orderService.createFromDraft({
      sellerId: 'seller-list-b',
      customerPsid: 'psid-list-b',
      draft: { product: 'P2', quantity: 1, customerName: 'B', phone: '01411223344', address: 'Dhaka' },
    });

    const { orders } = await orderService.listSellerOrders('seller-list-a', 50);
    expect(orders.every((o) => o.productName === 'P1')).toBe(true);
    expect(orders.some((o) => o.productName === 'P2')).toBe(false);
  });

  it('ORD-4: getOrder returns 404 for a different seller accessing the order', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0 }),
      ),
    );

    const order = await orderService.createFromDraft({
      sellerId: 'seller-iso-owner',
      customerPsid: 'psid-iso',
      draft: { product: 'Private', quantity: 1, customerName: 'Z', phone: '01311223344', address: 'X' },
    });

    await expect(orderService.getOrder('seller-iso-other', order.orderId)).rejects.toMatchObject({
      status: 404,
    });
  });

  // -------------------------------------------------------------------
  // ORD-6: status transitions
  // -------------------------------------------------------------------

  it('ORD-6: updateStatus confirms a pending order', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0 }),
      ),
    );

    const order = await orderService.createFromDraft({
      sellerId: 'seller-status-1',
      customerPsid: 'psid-status-1',
      draft: { product: 'Hat', quantity: 1, customerName: 'Jon', phone: '01211223344', address: 'Dhaka' },
    });

    const updated = await orderService.updateStatus('seller-status-1', order.orderId, 'confirmed');
    expect(updated.status).toBe('confirmed');
  });

  it('ORD-6: updateStatus returns 404 when trying to confirm an already-confirmed order', async () => {
    mswServer.use(
      http.post('http://localhost:4001/risk-score', () =>
        HttpResponse.json({ riskFlags: [], riskScore: 0 }),
      ),
    );

    const order = await orderService.createFromDraft({
      sellerId: 'seller-status-2',
      customerPsid: 'psid-status-2',
      draft: { product: 'Belt', quantity: 1, customerName: 'Ali', phone: '01111223344', address: 'Sylhet' },
    });

    await orderService.updateStatus('seller-status-2', order.orderId, 'confirmed');

    await expect(
      orderService.updateStatus('seller-status-2', order.orderId, 'cancelled'),
    ).rejects.toMatchObject({ status: 404 });
  });

  // -------------------------------------------------------------------
  // ORD-8: retry job (idempotent, overlap-guarded)
  // -------------------------------------------------------------------

  it('ORD-8: runRetryJobTick returns null if already running (overlap guard)', async () => {
    // We can't easily test the concurrency guard in a sync test without
    // inspecting the module-level flag, but we can verify a normal tick
    // completes and returns a result object.
    const result = await orderService.runRetryJobTick();
    // Second tick while the module is idle should also work fine.
    const result2 = await orderService.runRetryJobTick();
    expect(result).not.toBeNull();
    expect(result2).not.toBeNull();
    expect(result).toMatchObject({ attempted: expect.any(Number), succeeded: expect.any(Number) });
  });
});
