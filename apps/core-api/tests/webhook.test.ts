import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { createHmac } from 'node:crypto';
import type { Express } from 'express';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { getSharedMongoUri } from './global-setup.js';

function sign(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
}

describe('M4 Webhook pipe', () => {
  let app: Express;
  let closeDb: () => Promise<void>;
  const APP_SECRET = 'test-meta-app-secret'; // matches tests/setup.ts default

  beforeAll(async () => {
    process.env.MONGODB_URI = getSharedMongoUri();
    process.env.MONGODB_DB_NAME = 'jobabai_webhook_test';
    process.env.REGISTRATION_MODE = 'open';

    const dbModule = await import('../src/lib/db.js');
    await dbModule.connectDb();
    closeDb = dbModule.closeDb;

    const appModule = await import('../src/app.js');
    app = appModule.buildApp();
  });

  beforeEach(async () => {
    const { resetWebhookRateLimitState } = await import('../src/modules/webhook/webhook.service.js');
    resetWebhookRateLimitState();
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('WH-1 handshake', () => {
    it('echoes hub.challenge with 200 when the mode and verify token match', async () => {
      const res = await request(app)
        .get('/webhook/messenger')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': '1234' });

      expect(res.status).toBe(200);
      expect(res.text).toBe('1234');
    });

    it('returns 403 when the verify token is wrong', async () => {
      const res = await request(app)
        .get('/webhook/messenger')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': '1234' });

      expect(res.status).toBe(403);
    });

    it('returns 403 when hub.mode is not subscribe', async () => {
      const res = await request(app)
        .get('/webhook/messenger')
        .query({ 'hub.mode': 'unsubscribe', 'hub.verify_token': 'test-verify-token', 'hub.challenge': '1234' });

      expect(res.status).toBe(403);
    });
  });

  describe('WH-2 signature verification', () => {
    it('rejects a request with a bad signature with 401', async () => {
      const body = JSON.stringify({ object: 'page', entry: [] });
      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', 'sha256=0000000000000000000000000000000000000000000000000000000000000000')
        .send(body);

      expect(res.status).toBe(401);
    });

    it('rejects a request with no signature header with 401', async () => {
      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ object: 'page', entry: [] }));

      expect(res.status).toBe(401);
    });

    it('accepts a request with a valid signature and always returns 200', async () => {
      const body = JSON.stringify({ object: 'page', entry: [] });
      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });
  });

  describe('WH-3, WH-4, WH-5: dedup, seller resolution, always-200', () => {
    async function seedActiveSeller(pageId: string): Promise<void> {
      const authRepo = await import('../src/modules/auth/auth.repo.js');
      const now = new Date();
      await authRepo.insertSeller({
        businessName: 'Webhook Test Shop',
        email: `webhook-${pageId}-${Date.now()}@example.com`,
        passwordHash: 'unused-in-this-test-file',
        status: 'active',
        plan: 'pilot',
        facebookPageId: pageId,
        webhookSubscribed: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    function textMessageEvent(pageId: string, mid: string, text: string) {
      return JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid, text } }],
          },
        ],
      });
    }

    it('WH-5: a valid signature always gets 200, even for an unknown Page', async () => {
      const body = textMessageEvent('unknown-page-id', 'mid-unknown-page', 'hello');
      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });

    it('WH-4: a message from a suspended seller is ignored (still 200)', async () => {
      const pageId = `suspended-page-${Date.now()}`;
      await seedActiveSeller(pageId);

      const authModule = await import('../src/lib/db.js');
      await authModule.sellersCollection().updateOne({ facebookPageId: pageId }, { $set: { status: 'suspended' } });

      const body = textMessageEvent(pageId, `mid-suspended-${Date.now()}`, 'hello');
      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
    });

    it('WH-3: a duplicate mid is processed once', async () => {
      const pageId = `dedup-page-${Date.now()}`;
      await seedActiveSeller(pageId);
      const mid = `mid-dedup-${Date.now()}`;

      const body = textMessageEvent(pageId, mid, 'first delivery');
      const signature = sign(APP_SECRET, body);

      const first = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(body);
      const second = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', signature)
        .send(body);

      expect(first.status).toBe(200);
      expect(second.status).toBe(200);

      const webhookEventsModule = await import('../src/lib/db.js');
      const count = await webhookEventsModule.webhookEventsCollection().countDocuments({ mid });
      expect(count).toBe(1);
    });

    it('ignores echoes, delivery and read events without recording them', async () => {
      const pageId = `ignore-page-${Date.now()}`;
      await seedActiveSeller(pageId);

      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [
              { sender: { id: 'psid-1' }, message: { mid: 'echo-mid', text: 'echoed', is_echo: true } },
              { sender: { id: 'psid-1' }, delivery: { mids: ['x'] } },
              { sender: { id: 'psid-1' }, read: { watermark: 123 } },
            ],
          },
        ],
      });

      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);

      const webhookEventsModule = await import('../src/lib/db.js');
      const count = await webhookEventsModule.webhookEventsCollection().countDocuments({ mid: 'echo-mid' });
      expect(count).toBe(0);
    });
  });

  describe('Per-Page rate limit', () => {
    it('drops events past 60 per minute for a Page without failing the request', async () => {
      const authRepo = await import('../src/modules/auth/auth.repo.js');
      const pageId = `rate-limit-page-${Date.now()}`;
      const now = new Date();
      await authRepo.insertSeller({
        businessName: 'Rate Limit Webhook Shop',
        email: `rate-limit-webhook-${Date.now()}@example.com`,
        passwordHash: 'unused',
        status: 'active',
        plan: 'pilot',
        facebookPageId: pageId,
        webhookSubscribed: true,
        createdAt: now,
        updatedAt: now,
      });

      for (let i = 0; i < 60; i += 1) {
        const body = JSON.stringify({
          object: 'page',
          entry: [
            {
              id: pageId,
              messaging: [{ sender: { id: 'psid-1' }, message: { mid: `mid-rl-${i}`, text: 'hi' } }],
            },
          ],
        });
        const res = await request(app)
          .post('/webhook/messenger')
          .set('Content-Type', 'application/json')
          .set('X-Hub-Signature-256', sign(APP_SECRET, body))
          .send(body);
        expect(res.status).toBe(200);
      }

      const overLimitBody = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid: 'mid-rl-over', text: 'hi' } }],
          },
        ],
      });
      const overLimit = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, overLimitBody))
        .send(overLimitBody);

      // Still 200 (WH-5) — the event is just dropped, not surfaced as an error.
      expect(overLimit.status).toBe(200);

      const webhookEventsModule = await import('../src/lib/db.js');
      const count = await webhookEventsModule.webhookEventsCollection().countDocuments({ mid: 'mid-rl-over' });
      expect(count).toBe(1); // dedup record is still written; only the seller lookup/log is skipped
    });
  });

  describe('M5 reply loop (end to end)', () => {
    const SEND_API_URL = 'https://graph.facebook.com/v21.0/me/messages';
    const externalServer = setupServer();

    beforeAll(() => externalServer.listen({ onUnhandledRequest: 'bypass' }));
    afterEach(() => externalServer.resetHandlers());
    afterAll(() => externalServer.close());

    async function seedSellerWithPageToken(pageId: string, fallbackMessage?: string): Promise<void> {
      const authRepo = await import('../src/modules/auth/auth.repo.js');
      const { encrypt } = await import('../src/lib/crypto.js');
      const now = new Date();
      await authRepo.insertSeller({
        businessName: 'Reply Loop Shop',
        email: `reply-loop-${pageId}@example.com`,
        passwordHash: 'unused',
        status: 'active',
        plan: 'pilot',
        facebookPageId: pageId,
        facebookPageAccessToken: encrypt('fake-page-access-token'),
        webhookSubscribed: true,
        fallbackMessage,
        createdAt: now,
        updatedAt: now,
      });
    }

    it('sends the rag-engine reply back to the customer via the Send API', async () => {
      const pageId = `reply-loop-page-${Date.now()}`;
      await seedSellerWithPageToken(pageId);

      let sentMessage: { recipient: { id: string }; message: { text: string }; messaging_type: string } | undefined;
      externalServer.use(
        http.post('http://localhost:4000/respond', () =>
          HttpResponse.json({ reply: 'Yes, that saree is in stock.', orderIntentDetected: false }),
        ),
        http.post(SEND_API_URL, async ({ request: req }) => {
          sentMessage = (await req.json()) as typeof sentMessage;
          return HttpResponse.json({ recipient_id: 'psid-1', message_id: 'mid-out-1' });
        }),
      );

      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid: `mid-reply-${Date.now()}`, text: 'Is the red saree in stock?' } }],
          },
        ],
      });

      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(sentMessage).toEqual({
        recipient: { id: 'psid-1' },
        message: { text: 'Yes, that saree is in stock.' },
        messaging_type: 'RESPONSE',
      });
    });

    it('WH-6: sends the fallback message via the Send API when rag-engine fails', async () => {
      const pageId = `reply-loop-fallback-page-${Date.now()}`;
      await seedSellerWithPageToken(pageId, 'We will reply as soon as possible.');

      let sentText: string | undefined;
      externalServer.use(
        http.post('http://localhost:4000/respond', () => HttpResponse.error()),
        http.post(SEND_API_URL, async ({ request: req }) => {
          const payload = (await req.json()) as { message: { text: string } };
          sentText = payload.message.text;
          return HttpResponse.json({ recipient_id: 'psid-1', message_id: 'mid-out-2' });
        }),
      );

      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid: `mid-fallback-${Date.now()}`, text: 'hello?' } }],
          },
        ],
      });

      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(sentText).toBe('We will reply as soon as possible.');
    });

    it('WH-9: a non-text message gets the canned reply and never reaches the AI', async () => {
      const pageId = `reply-loop-nontext-page-${Date.now()}`;
      await seedSellerWithPageToken(pageId);

      let respondCalled = false;
      let sentText: string | undefined;
      externalServer.use(
        http.post('http://localhost:4000/respond', () => {
          respondCalled = true;
          return HttpResponse.json({ reply: 'should not be used', orderIntentDetected: false });
        }),
        http.post(SEND_API_URL, async ({ request: req }) => {
          const payload = (await req.json()) as { message: { text: string } };
          sentText = payload.message.text;
          return HttpResponse.json({ recipient_id: 'psid-1', message_id: 'mid-out-3' });
        }),
      );

      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid: `mid-sticker-${Date.now()}`, attachments: [{ type: 'image' }] } }],
          },
        ],
      });

      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(respondCalled).toBe(false);
      expect(sentText).toContain('text messages');

      const dbModule = await import('../src/lib/db.js');
      const seller = await dbModule.sellersCollection().findOne({ facebookPageId: pageId });
      const conversation = await dbModule
        .conversationsCollection()
        .findOne({ sellerId: seller?._id.toString(), customerPsid: 'psid-1' });
      expect(conversation).toBeNull();
    });

    it('a Meta Send API error is logged, never thrown — the webhook still returns 200', async () => {
      const pageId = `reply-loop-send-error-page-${Date.now()}`;
      await seedSellerWithPageToken(pageId);

      externalServer.use(
        http.post('http://localhost:4000/respond', () =>
          HttpResponse.json({ reply: 'hello back', orderIntentDetected: false }),
        ),
        http.post(SEND_API_URL, () =>
          HttpResponse.json({ error: { message: 'Invalid OAuth access token', code: 190 } }, { status: 400 }),
        ),
      );

      const body = JSON.stringify({
        object: 'page',
        entry: [
          {
            id: pageId,
            messaging: [{ sender: { id: 'psid-1' }, message: { mid: `mid-senderror-${Date.now()}`, text: 'hi' } }],
          },
        ],
      });

      const res = await request(app)
        .post('/webhook/messenger')
        .set('Content-Type', 'application/json')
        .set('X-Hub-Signature-256', sign(APP_SECRET, body))
        .send(body);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ received: true });
    });
  });
});
