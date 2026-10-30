import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import request from 'supertest';
import type { Express } from 'express';
import { getSharedMongoUri } from './global-setup.js';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

describe('M7 Sheets integration', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  let signOAuthState: typeof import('../src/lib/jwt.js').signOAuthState;
  let insertSeller: typeof import('../src/modules/auth/auth.repo.js').insertSeller;
  let signSellerToken: typeof import('../src/lib/jwt.js').signSellerToken;
  let sellersCollection: typeof import('../src/lib/db.js').sellersCollection;

  const googleServer = setupServer();

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_sheets_test';
    process.env.REGISTRATION_MODE = 'open';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;
    sellersCollection = dbModule.sellersCollection;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();

    ({ signOAuthState, signSellerToken } = await import('../src/lib/jwt.js'));
    ({ insertSeller } = await import('../src/modules/auth/auth.repo.js'));

    googleServer.listen({ onUnhandledRequest: 'bypass' });
  });

  afterEach(() => googleServer.resetHandlers());
  afterAll(async () => {
    googleServer.close();
    await closeDb();
  });

  async function seedSeller(businessName: string) {
    const now = new Date();
    const seller = await insertSeller({
      businessName,
      email: `${businessName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}@example.com`,
      passwordHash: 'unused',
      status: 'active',
      role: 'seller',
      plan: 'pilot',
      webhookSubscribed: false,
      createdAt: now,
      updatedAt: now,
    });
    return { sellerId: seller._id.toString(), token: signSellerToken(seller._id.toString(), 'seller') };
  }

  it('SHT-2: the callback rejects a tampered or missing state with 403', async () => {
    const missing = await request(app).get('/integrations/google/callback').query({ code: 'abc' });
    expect(missing.status).toBe(400);

    const tampered = await request(app)
      .get('/integrations/google/callback')
      .query({ state: 'not-a-real-token', code: 'abc' });
    expect(tampered.status).toBe(403);
  });

  it('SHT-3: a valid callback exchanges the code, creates the sheet, and stores the encrypted refresh token', async () => {
    const { sellerId } = await seedSeller('Sheets Test Shop');
    const state = signOAuthState(sellerId);

    googleServer.use(
      http.post(TOKEN_URL, () =>
        HttpResponse.json({ access_token: 'fake-access-token', refresh_token: 'fake-refresh-token', expires_in: 3600 }),
      ),
      http.post(SHEETS_BASE, async ({ request: req }) => {
        const body = (await req.json()) as { properties: { title: string } };
        expect(body.properties.title).toBe('jobabai Orders');
        return HttpResponse.json({
          spreadsheetId: 'sheet-123',
          spreadsheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-123',
        });
      }),
      http.post(`${SHEETS_BASE}/sheet-123/values/A1:append`, async ({ request: req }) => {
        const body = (await req.json()) as { values: string[][] };
        expect(body.values[0]).toEqual([
          'Date',
          'Order ID',
          'Product',
          'Quantity',
          'Total',
          'Customer',
          'Phone',
          'Address',
          'Risk Score',
          'Risk Flags',
          'Status',
        ]);
        return HttpResponse.json({ updates: { updatedRows: 1 } });
      }),
    );

    const res = await request(app).get('/integrations/google/callback').query({ state, code: 'real-code' });

    expect(res.status).toBe(200);
    expect(res.text).toContain('Google Sheets connected');
    expect(res.text).toContain('https://docs.google.com/spreadsheets/d/sheet-123');

    const { ObjectId } = await import('mongodb');
    const stored = await sellersCollection().findOne({ _id: new ObjectId(sellerId) });
    expect(stored?.googleSheetId).toBe('sheet-123');
    expect(stored?.googleOAuthRefreshToken).toBeDefined();
    expect(stored?.googleOAuthRefreshToken).not.toContain('fake-refresh-token');
  });

  it('SHT-4, SHT-6: appendOrderRow writes the agreed columns, and skips a row already present (idempotent retry)', async () => {
    const { sellerId } = await seedSeller('Append Row Shop');
    const { ObjectId } = await import('mongodb');
    const { encrypt } = await import('../src/lib/crypto.js');

    await sellersCollection().updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          googleSheetId: 'sheet-append-456',
          googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-append-456',
          googleOAuthRefreshToken: encrypt('fake-refresh-token'),
        },
      },
    );

    googleServer.use(
      http.post(TOKEN_URL, () => HttpResponse.json({ access_token: 'fake-access-token', expires_in: 3600 })),
      http.get(`${SHEETS_BASE}/sheet-append-456/values/B:B`, () => HttpResponse.json({ values: [['Order ID'], ['order-1']] })),
    );

    let appendedRow: string[] | undefined;
    googleServer.use(
      http.post(`${SHEETS_BASE}/sheet-append-456/values/A1:append`, async ({ request: req }) => {
        const body = (await req.json()) as { values: string[][] };
        appendedRow = body.values[0];
        return HttpResponse.json({ updates: { updatedRows: 1 } });
      }),
    );

    const { appendOrderRow } = await import('../src/modules/sheets-integration/sheets-integration.service.js');
    const writtenNew = await appendOrderRow(sellerId, {
      orderId: 'order-2',
      date: '2026-10-18',
      product: 'Red Saree',
      quantity: 2,
      total: 5000,
      customerName: 'Rahim',
      phone: '01712345678',
      riskScore: 0.1,
      riskFlags: 'none',
      status: 'pending',
      address: 'Dhaka',
    });
    expect(writtenNew).toBe(true);
    expect(appendedRow).toEqual([
      '2026-10-18',
      'order-2',
      'Red Saree',
      '2',
      '5000',
      'Rahim',
      '01712345678',
      'Dhaka',
      '0.1',
      'none',
      'pending',
    ]);

    // SHT-6: order-1 is already in column B — a retried append must be skipped.
    appendedRow = undefined;
    const writtenAgain = await appendOrderRow(sellerId, {
      orderId: 'order-1',
      date: '2026-10-18',
      product: 'Blue Saree',
      quantity: 1,
      customerName: 'Karim',
      phone: '01812345678',
      riskFlags: 'none',
      status: 'pending',
      address: 'Chittagong',
    });
    expect(writtenAgain).toBe(true);
    expect(appendedRow).toBeUndefined();
  });

  it('returns false (not an error) when the seller has no Sheet connected', async () => {
    const { sellerId } = await seedSeller('No Sheet Shop');
    const { appendOrderRow } = await import('../src/modules/sheets-integration/sheets-integration.service.js');

    const written = await appendOrderRow(sellerId, {
      orderId: 'order-no-sheet',
      date: '2026-10-18',
      product: 'Saree',
      quantity: 1,
      customerName: 'Nobody',
      phone: '01712345678',
      riskFlags: 'none',
      status: 'pending',
      address: 'Dhaka',
    });
    expect(written).toBe(false);
  });

  it('SHT-5: a revoked grant produces a typed SheetsAuthError, not a crash', async () => {
    const { sellerId } = await seedSeller('Revoked Shop');
    const { ObjectId } = await import('mongodb');
    const { encrypt } = await import('../src/lib/crypto.js');

    await sellersCollection().updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          googleSheetId: 'sheet-revoked',
          googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-revoked',
          googleOAuthRefreshToken: encrypt('revoked-refresh-token'),
        },
      },
    );

    googleServer.use(
      http.post(TOKEN_URL, () => HttpResponse.json({ error: 'invalid_grant' }, { status: 400 })),
    );

    const { appendOrderRow, SheetsAuthError } = await import('../src/modules/sheets-integration/sheets-integration.service.js');

    await expect(
      appendOrderRow(sellerId, {
        orderId: 'order-revoked',
        date: '2026-10-18',
        product: 'Saree',
        quantity: 1,
        customerName: 'Someone',
        phone: '01712345678',
        riskFlags: 'none',
        status: 'pending',
        address: 'Dhaka',
      }),
    ).rejects.toBeInstanceOf(SheetsAuthError);
  });

  it('SHT-8: disconnecting Google clears the token and Sheet fields', async () => {
    const { sellerId, token } = await seedSeller('Disconnect Shop');
    const { ObjectId } = await import('mongodb');
    const { encrypt } = await import('../src/lib/crypto.js');

    await sellersCollection().updateOne(
      { _id: new ObjectId(sellerId) },
      {
        $set: {
          googleSheetId: 'sheet-disconnect',
          googleSheetUrl: 'https://docs.google.com/spreadsheets/d/sheet-disconnect',
          googleOAuthRefreshToken: encrypt('refresh-token'),
        },
      },
    );

    const res = await request(app).delete('/seller/connect-sheets').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    const stored = await sellersCollection().findOne({ _id: new ObjectId(sellerId) });
    expect(stored?.googleSheetId).toBeUndefined();
    expect(stored?.googleOAuthRefreshToken).toBeUndefined();
  });
});
