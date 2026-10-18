import { logger } from '../../lib/logger.js';
import { findActiveSellerByPageId } from '../seller/seller.service.js';
import { recordWebhookEvent } from './webhook.repo.js';
import type { MessagingEvent, WebhookPayload } from './webhook.schema.js';

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

  // M4 stops here: the reply loop (rag-engine /respond, Send API, fallback
  // message) is WH-6..WH-10, built in M5 against conversation.service.
  logger.info(
    { sellerId: seller.sellerId, pageId, mid, hasText: Boolean(event.message.text) },
    'Webhook message received',
  );
}
