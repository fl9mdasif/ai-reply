import rateLimit, { type Options } from 'express-rate-limit';
import type { NextFunction, Request, Response } from 'express';
import { RateLimitedError } from '../lib/errors.js';

export const handler: Options['handler'] = (_req: Request, _res: Response, next: NextFunction) => {
  next(new RateLimitedError());
};

// PRD 8.5: all other routes, 300 per minute per IP.
export const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// PRD 8.5: POST /auth/login, 10 per 15 minutes per IP plus email. Wired in M2.
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => `${req.ip}:${(req.body as { email?: string } | undefined)?.email ?? ''}`,
  handler,
});

// PRD 8.5: POST /auth/register, 5 per hour per IP. Wired in M2.
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  handler,
});

// NOTE: PRD 8.5's "POST /webhook/messenger, 60 per minute per Page id" is not
// implemented as Express middleware here. A single webhook request can carry
// multiple entries for different Pages, and the Page id only exists inside
// the parsed body — not as a route param or a per-request key express-rate-
// limit can see before the body is read. It's enforced per messaging event
// instead, in modules/webhook/webhook.service.ts.
