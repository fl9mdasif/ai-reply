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

  // NOTE: /webhook/messenger (built in M4) must mount express.raw() for its own
  // route before this JSON parser, since Meta's signature is computed over the
  // raw request body.
  app.use(express.json({ limit: '100kb' }));

  app.use(generalLimiter);

  app.use(healthRouter);

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}` } });
  });

  app.use(errorHandler);

  return app;
}
