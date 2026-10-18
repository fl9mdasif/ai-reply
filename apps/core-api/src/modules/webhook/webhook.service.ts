import { decrypt } from '../../lib/crypto.js';
import { logger } from '../../lib/logger.js';
import { sendText } from '../../lib/meta-client.js';
import { handleCustomerMessage } from '../conversation/conversation.service.js';
import { findActiveSellerByPageId } from '../seller/seller.service.js';
import { recordWebhookEvent } from './webhook.repo.js';
import type { MessagingEvent, WebhookPayload } from './webhook.schema.js';

// WH-9: non-text messages (stickers, images, attachments-only) get this
// canned reply and never reach the AI.
const NON_TEXT_CANNED_REPLY =
  'We can only read text messages right now — please type your question. ' +
  'আমরা এখন শুধু লেখা পড়তে পারি, আপনার প্রশ্নটি লিখে পাঠান।';

// Per-Page rate limit (PRD 8.5: 60/min/Page). Not Express middleware — see
// the note in middleware/rate-limiters.ts for why. A fixed window per Page
// id, held in memory; fine for a single instance (PRD 6.3).
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_WINDOW = 60;
const pageWindows = new Map<string, { count: number; windowStart: number }>();

function isPageOverLimit(pageId: string): boolean {
  const now = Date.now();
  const window = pageWindows.get(pageId);

  if (!window || now - window.windowStart >= RATE_LIMIT_WINDOW_MS) {
    pageWindows.set(pageId, { count: 1, windowStart: now });
    return false;
  }

  window.count += 1;
  return window.count > RATE_LIMIT_MAX_PER_WINDOW;
}

// Exposed for tests only — production never needs to reset this between runs.
export function resetWebhookRateLimitState(): void {
  pageWindows.clear();
}

// WH-5: every event is processed inside its own try/catch so one bad event
// never blocks the others or changes the HTTP status the caller sends.
export async function processWebhookPayload(payload: WebhookPayload): Promise<void> {
  for (const entry of payload.entry) {
    for (const event of entry.messaging ?? []) {
      try {
        await processMessagingEvent(entry.id, event);
      } catch (err) {
        logger.error({ err, pageId: entry.id }, 'Error processing webhook messaging event');
      }
    }
  }
}

async function processMessagingEvent(pageId: string, event: MessagingEvent): Promise<void> {
  // Step 3: ignore echoes, delivery, read, and non-message events.
  if (!event.message || event.message.is_echo) {
    logger.debug({ pageId }, 'Ignoring non-message/echo webhook event');
    return;
  }

  const mid = event.message.mid;
  if (!mid) {
    logger.debug({ pageId }, 'Webhook message event missing mid, skipping');
    return;
  }

  // WH-3: dedupe before anything else runs.
  const isNewEvent = await recordWebhookEvent(mid, pageId);
  if (!isNewEvent) {
    logger.info({ mid, pageId }, 'Duplicate webhook delivery deduped');
    return;
  }

  // Per-Page rate limit.
  if (isPageOverLimit(pageId)) {
    logger.warn({ pageId, mid }, 'Per-Page webhook rate limit exceeded, dropping event');
    return;
  }

  // WH-4: unknown or suspended Page is ignored, not an error.
  const seller = await findActiveSellerByPageId(pageId);
  if (!seller) {
    logger.info({ pageId, mid }, 'Webhook event for unknown or suspended Page, ignoring');
    return;
  }

  const psid = event.sender?.id;
  if (!psid) {
    logger.warn({ pageId, mid }, 'Webhook message event missing sender id, skipping');
    return;
  }

  const startedAt = Date.now();

  // WH-9: non-text messages never reach the AI.
  const text = event.message.text;
  const { reply, usedFallback } = text
    ? await handleCustomerMessage(seller.sellerId, psid, text, seller.fallbackMessage)
    : { reply: NON_TEXT_CANNED_REPLY, usedFallback: false };

  // WH-7: send via the Send API, decrypting the Page token only now, at the
  // moment of use. A send failure is logged inside sendText, never thrown.
  if (seller.facebookPageAccessToken) {
    await sendText(decrypt(seller.facebookPageAccessToken), psid, reply);
  } else {
    logger.warn({ sellerId: seller.sellerId, pageId, mid }, 'No Page access token stored, cannot reply');
  }

  // WH-8: logged for observability against the 15s budget (8s rag-engine
  // timeout + one retry is the dominant cost; see PRD section 11.1).
  logger.info(
    { sellerId: seller.sellerId, pageId, mid, usedFallback, durationMs: Date.now() - startedAt },
    'Webhook message processed',
  );
}
