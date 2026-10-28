import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

// M9: failure-injection tests — rag-engine timeout/500, embed failure,
// risk failure, Sheets failure, duplicate mid. Every Must path that can
// fail silently is verified here to actually be fail-soft.

describe('M9 Failure injection', () => {
  let closeDb: () => Promise<void>;
  let db: typeof import('../src/lib/db.js');

  const mswServer = setupServer();

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_failure_injection_test';
    process.env.RAG_ENGINE_URL = 'http://localhost:4002';

    mswServer.listen({ onUnhandledRequest: 'bypass' });

    db = await import('../src/lib/db.js');
    await db.connectDb();
    closeDb = db.closeDb;
  });

  afterAll(async () => {
    mswServer.close();
    await closeDb();
  });

  // -------------------------------------------------------------------
  // rag-engine /respond failures
  // -------------------------------------------------------------------

  describe('rag-engine /respond failures', () => {
    it('respond() network error returns null (fail-soft, never throws)', async () => {
      // HttpResponse.error() simulates a network-level failure (ECONNREFUSED /
      // AbortError), which is the same signal that a real timeout produces.
      mswServer.use(
        http.post('http://localhost:4002/respond', () => HttpResponse.error()),
      );

      const { respond } = await import('../src/lib/rag-engine-client.js');
      const result = await respond({
        sellerId: 'seller-network-err',
        customerPsid: 'psid-network-err',
        message: 'hello',
        history: [],
      });

      expect(result).toBeNull();
    });

    it('respond() 500 returns null (fail-soft, never throws)', async () => {
      mswServer.use(
        http.post('http://localhost:4002/respond', () =>
          HttpResponse.json({ error: 'internal' }, { status: 500 }),
        ),
      );

      const { respond } = await import('../src/lib/rag-engine-client.js');
      const result = await respond({
        sellerId: 'seller-500',
        customerPsid: 'psid-500',
        message: 'hello',
        history: [],
      });

      expect(result).toBeNull();
    });

    it('handleCustomerMessage uses fallback reply when rag-engine is down', async () => {
      mswServer.use(
        http.post('http://localhost:4002/respond', () => HttpResponse.error()),
      );

      const { handleCustomerMessage } = await import('../src/modules/conversation/conversation.service.js');
      const result = await handleCustomerMessage(
        'seller-fallback',
        'psid-fallback',
        'hi',
        'Custom fallback message',
      );

      expect(result.usedFallback).toBe(true);
      expect(result.reply).toBe('Custom fallback message');
    });
  });

  // -------------------------------------------------------------------
  // rag-engine /embed failures
  // -------------------------------------------------------------------

  describe('rag-engine /embed failures', () => {
    it('CAT-5: embed failure does not block catalog item creation', async () => {
      mswServer.use(
        http.post('http://localhost:4002/embed', () =>
          HttpResponse.json({ error: 'embed failed' }, { status: 500 }),
        ),
      );

      const { createProduct } = await import('../src/modules/catalog/catalog.service.js');
      // Should not throw even if embed fails
      await expect(
        createProduct('seller-embed-fail', { name: 'Embed Fail Product', price: 100 }),
      ).resolves.toBeDefined();
    });
  });

  // -------------------------------------------------------------------
  // rag-engine /risk-score failures
  // -------------------------------------------------------------------

  describe('rag-engine /risk-score failures', () => {
    it('ORD-2: risk score failure adds risk_unavailable flag, order still created', async () => {
      mswServer.use(
        http.post('http://localhost:4002/risk-score', () => HttpResponse.error()),
      );

      const { createFromDraft } = await import('../src/modules/order/order.service.js');
      const result = await createFromDraft({
        sellerId: 'seller-risk-fail',
        customerPsid: 'psid-risk-fail',
        draft: {
          product: 'Risk Fail Product',
          quantity: 1,
          customerName: 'Test Customer',
          phone: '01711223345',
          address: 'Dhaka',
        },
      });

      expect(result.orderId).toBeTruthy();
      expect(result.riskFlags.some((f) => f.code === 'risk_unavailable')).toBe(true);
    });
  });

  // -------------------------------------------------------------------
  // Sheets failures
  // -------------------------------------------------------------------

  describe('Sheets failures', () => {
    it('ORD-3: Sheets API failure keeps order in Mongo with sheetRowWritten=false', async () => {
      // No Google tokens for this seller — appendOrderRow returns false without
      // throwing (seller has no Sheet connected).
      mswServer.use(
        http.post('http://localhost:4002/risk-score', () =>
          HttpResponse.json({ riskFlags: [], riskScore: 0 }),
        ),
      );

      const { createFromDraft } = await import('../src/modules/order/order.service.js');
      const result = await createFromDraft({
        sellerId: 'seller-no-sheet',
        customerPsid: 'psid-no-sheet',
        draft: {
          product: 'No Sheet Product',
          quantity: 1,
          customerName: 'No Sheet Customer',
          phone: '01711223346',
          address: 'Chittagong',
        },
      });

      expect(result.orderId).toBeTruthy();
      expect(result.sheetRowWritten).toBe(false);

      // Verify the order is actually in Mongo
      const stored = await db.ordersCollection().findOne({ sellerId: 'seller-no-sheet' });
      expect(stored).not.toBeNull();
      expect(stored?.sheetRowWritten).toBe(false);
    });
  });

  // -------------------------------------------------------------------
  // Webhook duplicate mid (WH-3 dedup)
  // -------------------------------------------------------------------

  describe('Webhook duplicate mid (WH-3)', () => {
    it('duplicate mid is recorded exactly once in webhook_events', async () => {
      const { recordWebhookEvent } = await import('../src/modules/webhook/webhook.repo.js');

      const mid = `dedup-mid-${Date.now()}`;
      const pageId = `dedup-page-${Date.now()}`;

      // First delivery: should be treated as new
      const first = await recordWebhookEvent(mid, pageId);
      // Second delivery with the same mid: should be detected as duplicate
      const second = await recordWebhookEvent(mid, pageId);

      expect(first).toBe(true);
      expect(second).toBe(false);

      // Only one record in the collection
      const count = await db.webhookEventsCollection().countDocuments({ mid });
      expect(count).toBe(1);
    });
  });
});
