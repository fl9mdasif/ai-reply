import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import {
  deleteConnectFacebookHandler,
  deleteSheetsHandler,
  getFacebookAuthUrlHandler,
  getFacebookCallbackHandler,
  getMeHandler,
  getSheetsUrlHandler,
  patchFacebookWebhookHandler,
  patchMeHandler,
  postConnectFacebookHandler,
  postConnectFacebookPageHandler,
} from './seller.controller.js';

export const sellerRouter = Router();

// Public OAuth callback — no authGuard, seller identity from signed state param
sellerRouter.get('/seller/facebook/callback', getFacebookCallbackHandler);

sellerRouter.use('/seller', authGuard);
sellerRouter.get('/seller/me', getMeHandler);
sellerRouter.patch('/seller/me', patchMeHandler);
// OAuth flow (new — preferred)
sellerRouter.get('/seller/facebook/auth-url', getFacebookAuthUrlHandler);
sellerRouter.post('/seller/facebook/connect-page', postConnectFacebookPageHandler);
// Manual token entry (kept for fallback / developer use)
sellerRouter.post('/seller/connect-facebook', postConnectFacebookHandler);
sellerRouter.delete('/seller/connect-facebook', deleteConnectFacebookHandler);
sellerRouter.patch('/seller/facebook/webhook', patchFacebookWebhookHandler);
sellerRouter.get('/seller/connect-sheets/url', getSheetsUrlHandler);
sellerRouter.delete('/seller/connect-sheets', deleteSheetsHandler);
