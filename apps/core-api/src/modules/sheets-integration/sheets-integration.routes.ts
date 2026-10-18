import { Router } from 'express';
import { getGoogleCallback } from './sheets-integration.controller.js';

export const sheetsIntegrationRouter = Router();

// Auth: signed `state` param (sellerId inside it), not a JWT — the browser
// redirect from Google's consent screen carries no Authorization header.
sheetsIntegrationRouter.get('/integrations/google/callback', getGoogleCallback);
