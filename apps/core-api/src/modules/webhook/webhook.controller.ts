import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../../config/env.js';
import { logger } from '../../lib/logger.js';
import { webhookPayloadSchema } from './webhook.schema.js';
import { processWebhookPayload } from './webhook.service.js';

// WH-1: verify token compared in constant time.
export function getWebhookHandshake(req: Request, res: Response): void {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const provided = Buffer.from(typeof token === 'string' ? token : '');
  const expected = Buffer.from(env.META_VERIFY_TOKEN);
  const tokenMatches = provided.length === expected.length && timingSafeEqual(provided, expected);

  if (mode === 'subscribe' && tokenMatches) {
    res.status(200).send(typeof challenge === 'string' ? challenge : '');
    return;
  }

  res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Webhook verification failed' } });
}

// Processing happens synchronously within the request (PRD section 10.5) —
// WH-3's dedup is what makes a slow request and a Meta retry safe, not an
// early response. WH-5: respond 200 regardless of what happened above,
// as long as the signature was valid (verify-meta-signature already ran).
export async function postWebhook(req: Request, res: Response): Promise<void> {
  try {
    const payload = JSON.parse((req.body as Buffer).toString('utf8'));
    const parsed = webhookPayloadSchema.safeParse(payload);

    if (parsed.success) {
      await processWebhookPayload(parsed.data);
    } else {
      logger.warn({ issues: parsed.error.issues }, 'Webhook body did not match the expected shape');
    }
  } catch (err) {
    logger.error({ err }, 'Unexpected error processing webhook payload');
  }

  res.status(200).json({ received: true });
}
