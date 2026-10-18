import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { UnauthenticatedError } from '../lib/errors.js';

// WH-2: signature verified over the raw body before any JSON parsing. The
// route mounts express.raw() ahead of this middleware (see webhook.routes.ts)
// so req.body is still the raw Buffer here, exactly as Meta signed it.
export function verifyMetaSignature(req: Request, _res: Response, next: NextFunction): void {
  const signatureHeader = req.headers['x-hub-signature-256'];
  const rawBody = req.body;

  if (typeof signatureHeader !== 'string' || !Buffer.isBuffer(rawBody)) {
    next(new UnauthenticatedError('Missing webhook signature'));
    return;
  }

  const expectedSignature =
    'sha256=' + createHmac('sha256', env.META_APP_SECRET).update(rawBody).digest('hex');

  const expected = Buffer.from(expectedSignature);
  const provided = Buffer.from(signatureHeader);

  if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
    next(new UnauthenticatedError('Invalid webhook signature'));
    return;
  }

  next();
}
