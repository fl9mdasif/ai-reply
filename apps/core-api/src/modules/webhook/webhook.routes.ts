import express, { Router } from 'express';
import { verifyMetaSignature } from '../../middleware/verify-meta-signature.js';
import { getWebhookHandshake, postWebhook } from './webhook.controller.js';

export const webhookRouter = Router();

webhookRouter.get('/webhook/messenger', getWebhookHandshake);

// Meta's signature is computed over the exact raw bytes, so this route must
// parse as a raw Buffer rather than JSON — mounted here, scoped to just this
// route, ahead of the app-wide express.json() in app.ts (PRD section 8.7).
webhookRouter.post(
  '/webhook/messenger',
  express.raw({ type: 'application/json', limit: '1mb' }),
  verifyMetaSignature,
  postWebhook,
);
