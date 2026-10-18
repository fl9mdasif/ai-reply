import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

describe('M5 conversation.service (CONV-1, CONV-2, CONV-10, CONV-11)', () => {
  let closeDb: () => Promise<void>;
  let handleCustomerMessage: typeof import('../src/modules/conversation/conversation.service.js').handleCustomerMessage;

  const ragServer = setupServer();

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_conversation_test';
    process.env.RAG_ENGINE_URL = 'http://localhost:4000';

    ragServer.listen({ onUnhandledRequest: 'bypass' });

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    ({ handleCustomerMessage } = await import('../src/modules/conversation/conversation.service.js'));
  });

  afterAll(async () => {
    ragServer.close();
    await closeDb();
  });

  it('CONV-1: upserts the conversation and keeps a rolling window', async () => {
    ragServer.use(
      http.post('http://localhost:4000/respond', () =>
        HttpResponse.json({ reply: 'Hi there!', orderIntentDetected: false }),
      ),
    );

    const sellerId = 'seller-conv-1';
    const psid = 'psid-conv-1';

    const first = await handleCustomerMessage(sellerId, psid, 'Hello');
    expect(first.reply).toBe('Hi there!');

    const dbModule = await import('../src/lib/db.js');
    const doc = await dbModule.conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.messages).toHaveLength(2);
    expect(doc?.messages[0]).toMatchObject({ role: 'customer', text: 'Hello' });
    expect(doc?.messages[1]).toMatchObject({ role: 'assistant', text: 'Hi there!' });
  });

  it('CONV-1: the window never exceeds 12 messages', async () => {
    ragServer.use(
      http.post('http://localhost:4000/respond', () =>
        HttpResponse.json({ reply: 'ok', orderIntentDetected: false }),
      ),
    );

    const sellerId = 'seller-conv-window';
    const psid = 'psid-conv-window';

    for (let i = 0; i < 8; i += 1) {
      await handleCustomerMessage(sellerId, psid, `message ${i}`);
    }

    const dbModule = await import('../src/lib/db.js');
    const doc = await dbModule.conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.messages.length).toBeLessThanOrEqual(12);
    expect(doc?.messages).toHaveLength(12);
  });

  it('CONV-11: history sent to rag-engine is exactly the stored window, never more', async () => {
    let capturedHistory: unknown;
    ragServer.use(
      http.post('http://localhost:4000/respond', async ({ request }) => {
        const body = (await request.json()) as { history: unknown };
        capturedHistory = body.history;
        return HttpResponse.json({ reply: 'got it', orderIntentDetected: false });
      }),
    );

    const sellerId = 'seller-conv-history';
    const psid = 'psid-conv-history';

    await handleCustomerMessage(sellerId, psid, 'first message');
    expect(capturedHistory).toEqual([]);

    await handleCustomerMessage(sellerId, psid, 'second message');
    expect(capturedHistory).toEqual([
      { role: 'customer', text: 'first message' },
      { role: 'assistant', text: 'got it' },
    ]);
  });

  it('CONV-2: order intent detected in idle moves the conversation to collecting_order and merges extracted fields', async () => {
    ragServer.use(
      http.post('http://localhost:4000/respond', () =>
        HttpResponse.json({
          reply: 'Sure, what would you like to order?',
          orderIntentDetected: true,
          extractedFields: { product: 'Red Saree' },
        }),
      ),
    );

    const sellerId = 'seller-conv-intent';
    const psid = 'psid-conv-intent';

    const result = await handleCustomerMessage(sellerId, psid, 'I want to order');
    expect(result.reply).toBe('Sure, what would you like to order?');

    const dbModule = await import('../src/lib/db.js');
    const doc = await dbModule.conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.state).toBe('collecting_order');
    expect(doc?.orderDraft).toMatchObject({ product: 'Red Saree' });
  });

  it('falls back to the seller fallbackMessage (or the default) when rag-engine fails, and still records the turn', async () => {
    ragServer.use(http.post('http://localhost:4000/respond', () => HttpResponse.error()));

    const sellerId = 'seller-conv-fallback';
    const psid = 'psid-conv-fallback';

    const result = await handleCustomerMessage(sellerId, psid, 'hello?', 'Custom fallback reply');
    expect(result.usedFallback).toBe(true);
    expect(result.reply).toBe('Custom fallback reply');

    const dbModule = await import('../src/lib/db.js');
    const doc = await dbModule.conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.messages).toHaveLength(2);
    expect(doc?.messages[1]).toMatchObject({ role: 'assistant', text: 'Custom fallback reply' });
  });

  it('uses the built-in default fallback message when the seller has none configured', async () => {
    ragServer.use(http.post('http://localhost:4000/respond', () => HttpResponse.error()));

    const result = await handleCustomerMessage('seller-conv-default-fallback', 'psid-default-fallback', 'hello?');
    expect(result.usedFallback).toBe(true);
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
