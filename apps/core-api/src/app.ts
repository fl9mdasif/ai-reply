import express, { type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { pinoHttp } from 'pino-http';
import { env, corsOrigins } from './config/env.js';
import { logger } from './lib/logger.js';
import { requestId } from './middleware/request-id.js';
import { generalLimiter } from './middleware/rate-limiters.js';
import { errorHandler } from './middleware/error-handler.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { sellerRouter } from './modules/seller/seller.routes.js';
import { catalogRouter } from './modules/catalog/catalog.routes.js';
import { webhookRouter } from './modules/webhook/webhook.routes.js';
import { sheetsIntegrationRouter } from './modules/sheets-integration/sheets-integration.routes.js';

export function buildApp(): Express {
  const app = express();

  // Trust exactly one hop (Railway's edge proxy), not every forwarded-for header,
  // per express-rate-limit's permissive-trust-proxy guidance.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      genReqId: (req) => (req as unknown as { id: string }).id,
    }),
  );
  app.use(helmet());

  const allowlist = corsOrigins(env.CORS_ORIGINS);
  app.use(
    cors({
      origin: allowlist.length > 0 ? allowlist : false,
    }),
  );

  // /webhook/messenger mounts its own express.raw() ahead of the app-wide
  // JSON parser below, since Meta's signature is computed over the raw
  // request body. It also sits outside generalLimiter — it has its own,
  // different rate limit (per-Page, enforced in webhook.service.ts).
  app.use(webhookRouter);

  app.use(express.json({ limit: '100kb' }));

  app.use(generalLimiter);

  app.use(healthRouter);
  app.use(authRouter);
  app.use(sellerRouter);
  app.use(catalogRouter);
  app.use(sheetsIntegrationRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
  });

  app.use(errorHandler);

  return app;
}
