import type { Request, Response } from 'express';
import { disconnectGoogle } from '../sheets-integration/sheets-integration.service.js';
import { connectFacebookSchema, patchMeSchema } from './seller.schema.js';
import {
  buildFacebookAuthUrl,
  buildSheetsConsentUrl,
  connectFacebook,
  connectFacebookPageFromOAuth,
  disconnectFacebook,
  getMe,
  handleFacebookOAuthCallback,
  patchMe,
  toggleWebhookSubscription,
} from './seller.service.js';

export async function getMeHandler(req: Request, res: Response): Promise<void> {
  const profile = await getMe(req.sellerId);
  res.status(200).json(profile);
}

export async function patchMeHandler(req: Request, res: Response): Promise<void> {
  const input = patchMeSchema.parse(req.body);
  const profile = await patchMe(req.sellerId, input);
  res.status(200).json(profile);
}

export async function postConnectFacebookHandler(req: Request, res: Response): Promise<void> {
  const input = connectFacebookSchema.parse(req.body);
  const result = await connectFacebook(req.sellerId, input);
  res.status(200).json(result);
}

export async function deleteConnectFacebookHandler(req: Request, res: Response): Promise<void> {
  const result = await disconnectFacebook(req.sellerId);
  res.status(200).json(result);
}

export async function patchFacebookWebhookHandler(req: Request, res: Response): Promise<void> {
  const { subscribe } = req.body as { subscribe?: unknown };
  if (typeof subscribe !== 'boolean') {
    res.status(400).json({ error: { message: '`subscribe` must be a boolean' } });
    return;
  }
  const result = await toggleWebhookSubscription(req.sellerId, subscribe);
  res.status(200).json(result);
}

// Facebook OAuth: generate consent URL (seller is authenticated via authGuard)
export function getFacebookAuthUrlHandler(req: Request, res: Response): void {
  const result = buildFacebookAuthUrl(req.sellerId);
  res.status(200).json(result);
}

// Facebook OAuth callback: called by Facebook after seller grants permission.
// No authGuard — seller identity comes from the signed `state` param.
export async function getFacebookCallbackHandler(req: Request, res: Response): Promise<void> {
  const { code, state, error } = req.query as {
    code?: string;
    state?: string;
    error?: string;
  };

  const dashboardUrl = process.env.DASHBOARD_URL ?? 'http://localhost:3001';

  if (error || !code || !state) {
    res.redirect(`${dashboardUrl}/en/seller/integrations?fb=denied`);
    return;
  }

  try {
    const { result } = await handleFacebookOAuthCallback(code, state);
    if (result.autoConnected) {
      res.redirect(`${dashboardUrl}/en/seller/integrations?fb=connected`);
    } else {
      // Multiple pages: pass page list to dashboard via signed payload
      const pages = encodeURIComponent(JSON.stringify(result.pages));
      res.redirect(`${dashboardUrl}/en/seller/integrations?fb=pick&pages=${pages}`);
    }
  } catch {
    res.redirect(`${dashboardUrl}/en/seller/integrations?fb=error`);
  }
}

// Connect a specific page chosen by the seller from the OAuth page picker
export async function postConnectFacebookPageHandler(req: Request, res: Response): Promise<void> {
  const { pageId, pageAccessToken } = req.body as { pageId?: unknown; pageAccessToken?: unknown };
  if (typeof pageId !== 'string' || typeof pageAccessToken !== 'string') {
    res.status(400).json({ error: { message: '`pageId` and `pageAccessToken` are required strings' } });
    return;
  }
  const result = await connectFacebookPageFromOAuth(req.sellerId, pageId, pageAccessToken);
  res.status(200).json(result);
}

export function getSheetsUrlHandler(req: Request, res: Response): void {
  const result = buildSheetsConsentUrl(req.sellerId);
  res.status(200).json(result);
}

// SHT-8
export async function deleteSheetsHandler(req: Request, res: Response): Promise<void> {
  const result = await disconnectGoogle(req.sellerId);
  res.status(200).json(result);
}
