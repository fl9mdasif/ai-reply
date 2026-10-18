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
    // CONV-4 (M6): once other fields are still missing, the deterministic
    // prompt replaces the AI's free-text reply — not the literal AI reply.
    expect(result.reply).toMatch(/quantity/);
    expect(result.reply).not.toBe('Sure, what would you like to order?');

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

describe('M6 conversation.service order flow (CONV-3..9)', () => {
  let closeDb: () => Promise<void>;
  let conversationsCollection: typeof import('../src/lib/db.js').conversationsCollection;
  let handleCustomerMessage: typeof import('../src/modules/conversation/conversation.service.js').handleCustomerMessage;

  const ragServer = setupServer();

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_conversation_m6_test';
    process.env.RAG_ENGINE_URL = 'http://localhost:4000';

    ragServer.listen({ onUnhandledRequest: 'bypass' });

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;
    conversationsCollection = dbModule.conversationsCollection;

    ({ handleCustomerMessage } = await import('../src/modules/conversation/conversation.service.js'));
  });

  afterAll(async () => {
    ragServer.close();
    await closeDb();
  });

  // Queues canned /respond replies in order, so each test can script a
  // short multi-turn exchange without a real rag-engine.
  function queueRespondReplies(replies: { orderIntentDetected: boolean; extractedFields?: Record<string, unknown> }[]) {
    const queue = [...replies];
    ragServer.use(
      http.post('http://localhost:4000/respond', () => {
        const next = queue.shift();
        return HttpResponse.json({ reply: 'ok', ...next });
      }),
    );
  }

  it('CONV-3, CONV-6: all five fields in one message moves straight to awaiting_confirmation (no re-asking)', async () => {
    queueRespondReplies([
      {
        orderIntentDetected: true,
        extractedFields: {
          product: 'Red Saree',
          quantity: 2,
          customerName: 'Rahim',
          phone: '01712345678',
          address: '12 Gulshan Avenue, Dhaka',
        },
      },
    ]);

    const result = await handleCustomerMessage(
      'seller-conv6-all-fields',
      'psid-all-fields',
      'I want to order 2 red sarees, name Rahim, phone 01712345678, address 12 Gulshan Avenue, Dhaka',
    );

    expect(result.reply).toContain('Red Saree');
    expect(result.reply).toContain('Reply YES to confirm');

    const doc = await conversationsCollection().findOne({ sellerId: 'seller-conv6-all-fields', customerPsid: 'psid-all-fields' });
    expect(doc?.state).toBe('awaiting_confirmation');
  });

  it('CONV-4: missing fields get a deterministic prompt, filled fields are never re-asked', async () => {
    const sellerId = 'seller-conv4-missing';
    const psid = 'psid-conv4-missing';

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { product: 'Blue Saree' } }]);
    const first = await handleCustomerMessage(sellerId, psid, 'I want to order a blue saree');
    expect(first.reply).not.toContain('product');
    expect(first.reply).toMatch(/quantity/);
    expect(first.reply).toMatch(/name/);
    expect(first.reply).toMatch(/phone/);
    expect(first.reply).toMatch(/address/);

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { quantity: 1, customerName: 'Karim' } }]);
    const second = await handleCustomerMessage(sellerId, psid, '1, my name is Karim');
    expect(second.reply).not.toMatch(/quantity/);
    expect(second.reply).not.toMatch(/name/i);
    expect(second.reply).toMatch(/phone/);
    expect(second.reply).toMatch(/address/);

    queueRespondReplies([
      { orderIntentDetected: true, extractedFields: { phone: '01812345678', address: '5 Dhanmondi Road, Dhaka' } },
    ]);
    const third = await handleCustomerMessage(sellerId, psid, '01812345678, 5 Dhanmondi Road, Dhaka');
    expect(third.reply).toContain('Reply YES to confirm');
    expect(third.reply).toContain('Blue Saree');
    expect(third.reply).toContain('Karim');
  });

  it('CONV-5: an invalid phone is asked about once, then accepted on the second bad value', async () => {
    const sellerId = 'seller-conv5-phone';
    const psid = 'psid-conv5-phone';

    queueRespondReplies([
      {
        orderIntentDetected: true,
        extractedFields: {
          product: 'Green Saree',
          quantity: 1,
          customerName: 'Fatima',
          phone: '12345',
          address: 'Chittagong',
        },
      },
    ]);
    const first = await handleCustomerMessage(sellerId, psid, 'order 1 green saree, Fatima, 12345, Chittagong');
    expect(first.reply).toMatch(/phone number does not look right/i);

    const afterFirst = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(afterFirst?.orderDraft?.phone).toBeUndefined();
    expect(afterFirst?.orderDraft?.phoneAttempts).toBe(1);
    expect(afterFirst?.state).toBe('collecting_order');

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { phone: 'still-not-a-phone' } }]);
    const second = await handleCustomerMessage(sellerId, psid, 'still-not-a-phone');

    const afterSecond = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(afterSecond?.orderDraft?.phone).toBe('still-not-a-phone');
    expect(afterSecond?.orderDraft?.phoneAttempts).toBe(2);
    expect(second.reply).toContain('Reply YES to confirm'); // every other field was already filled
  });

  it('CONV-7: a confirm keyword creates the order and returns to idle', async () => {
    const sellerId = 'seller-conv7-confirm';
    const psid = 'psid-conv7-confirm';

    queueRespondReplies([
      {
        orderIntentDetected: true,
        extractedFields: {
          product: 'Yellow Saree',
          quantity: 1,
          customerName: 'Nasrin',
          phone: '01912345678',
          address: 'Sylhet',
        },
      },
    ]);
    await handleCustomerMessage(sellerId, psid, 'order 1 yellow saree, Nasrin, 01912345678, Sylhet');

    const result = await handleCustomerMessage(sellerId, psid, 'YES');
    expect(result.reply).toMatch(/order has been received/i);

    const doc = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.state).toBe('idle');
    expect(doc?.orderDraft).toBeUndefined();
  });

  it('CONV-7: anything other than confirm/cancel in awaiting_confirmation is a correction that re-summarizes', async () => {
    const sellerId = 'seller-conv7-correction';
    const psid = 'psid-conv7-correction';

    queueRespondReplies([
      {
        orderIntentDetected: true,
        extractedFields: {
          product: 'Purple Saree',
          quantity: 1,
          customerName: 'Amina',
          phone: '01512345678',
          address: 'Khulna',
        },
      },
    ]);
    const summary = await handleCustomerMessage(sellerId, psid, 'order 1 purple saree, Amina, 01512345678, Khulna');
    expect(summary.reply).toContain('Quantity: 1');

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { quantity: 3 } }]);
    const corrected = await handleCustomerMessage(sellerId, psid, 'actually make it 3');
    expect(corrected.reply).toContain('Quantity: 3');
    expect(corrected.reply).toContain('Purple Saree'); // other fields preserved

    const doc = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.state).toBe('awaiting_confirmation');
  });

  it('CONV-9: a cancel phrase clears the draft at any point in the order flow', async () => {
    const sellerId = 'seller-conv9-cancel';
    const psid = 'psid-conv9-cancel';

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { product: 'Orange Saree' } }]);
    await handleCustomerMessage(sellerId, psid, 'I want to order an orange saree');

    const result = await handleCustomerMessage(sellerId, psid, 'cancel');
    expect(result.reply).toMatch(/cancelled/i);

    const doc = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.state).toBe('idle');
    expect(doc?.orderDraft).toBeUndefined();
  });

  it('CONV-8: a draft untouched for 30 minutes is discarded on the next message', async () => {
    const sellerId = 'seller-conv8-stale';
    const psid = 'psid-conv8-stale';

    queueRespondReplies([{ orderIntentDetected: true, extractedFields: { product: 'Stale Saree' } }]);
    await handleCustomerMessage(sellerId, psid, 'I want to order a saree');

    const staleTime = new Date(Date.now() - 31 * 60 * 1000);
    await conversationsCollection().updateOne(
      { sellerId, customerPsid: psid },
      { $set: { stateUpdatedAt: staleTime } },
    );

    queueRespondReplies([{ orderIntentDetected: false }]);
    const result = await handleCustomerMessage(sellerId, psid, 'hi again');

    expect(result.reply).toBe('ok'); // idle branch just returns the AI's reply text
    const doc = await conversationsCollection().findOne({ sellerId, customerPsid: psid });
    expect(doc?.state).toBe('idle');
    expect(doc?.orderDraft).toBeUndefined();
  });
});
