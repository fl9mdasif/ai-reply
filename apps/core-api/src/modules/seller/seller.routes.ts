import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import {
  deleteConnectFacebookHandler,
  deleteSheetsHandler,
  getMeHandler,
  getSheetsUrlHandler,
  patchFacebookWebhookHandler,
  patchMeHandler,
  postConnectFacebookHandler,
} from './seller.controller.js';

export const sellerRouter = Router();

sellerRouter.use('/seller', authGuard);
sellerRouter.get('/seller/me', getMeHandler);
sellerRouter.patch('/seller/me', patchMeHandler);
sellerRouter.post('/seller/connect-facebook', postConnectFacebookHandler);
sellerRouter.delete('/seller/connect-facebook', deleteConnectFacebookHandler);
sellerRouter.patch('/seller/facebook/webhook', patchFacebookWebhookHandler);
sellerRouter.get('/seller/connect-sheets/url', getSheetsUrlHandler);
sellerRouter.delete('/seller/connect-sheets', deleteSheetsHandler);
