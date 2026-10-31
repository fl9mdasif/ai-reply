import { env } from '../../config/env.js';
import { decrypt, encrypt } from '../../lib/crypto.js';
import { ConflictError, NotFoundError, UpstreamError } from '../../lib/errors.js';
import { signOAuthState } from '../../lib/jwt.js';
import { getGraphPageName, subscribePageToApp, unsubscribePageFromApp } from '../../lib/meta-client.js';
import type { SellerDoc } from '../../lib/db.js';
import {
  connectFacebookPage,
  disconnectFacebookPage,
  findSellerById,
  findSellerByPageId,
  patchSeller,
  patchWebhookStatus,
} from './seller.repo.js';
import type { ConnectFacebookInput, PatchMeInput } from './seller.schema.js';

export interface SellerProfile {
  sellerId: string;
  businessName: string;
  email: string;
  plan: string;
  facebookPageId?: string;
  facebookPageName?: string;
  webhookSubscribed: boolean;
  googleSheetConnected: boolean;
  googleSheetUrl?: string;
  fallbackMessage?: string;
}

// SEL-1: no secret fields (passwordHash, facebookPageAccessToken,
// googleOAuthRefreshToken) ever leave this function.
function toProfile(seller: SellerDoc): SellerProfile {
  return {
    sellerId: seller._id.toString(),
    businessName: seller.businessName,
    email: seller.email,
    plan: seller.plan,
    facebookPageId: seller.facebookPageId,
    facebookPageName: seller.facebookPageName,
    webhookSubscribed: seller.webhookSubscribed,
    googleSheetConnected: Boolean(seller.googleSheetId),
    googleSheetUrl: seller.googleSheetUrl,
    fallbackMessage: seller.fallbackMessage,
  };
}

export interface ActiveSellerForWebhook {
  sellerId: string;
  fallbackMessage?: string;
  // Still AES-256-GCM encrypted; decrypt with lib/crypto.ts only at the
  // moment of sending (M5's meta-client Send API wiring).
  facebookPageAccessToken?: string;
}

// WH-4: resolves a seller by Page id for the webhook module, treating a
// suspended seller the same as an unknown Page (ignored, not an error).
export async function findActiveSellerByPageId(pageId: string): Promise<ActiveSellerForWebhook | null> {
  const seller = await findSellerByPageId(pageId);
  if (!seller || seller.status !== 'active') return null;

  return {
    sellerId: seller._id.toString(),
    fallbackMessage: seller.fallbackMessage,
    facebookPageAccessToken: seller.facebookPageAccessToken,
  };
}

export async function getMe(sellerId: string): Promise<SellerProfile> {
  const seller = await findSellerById(sellerId);
  if (!seller) throw new NotFoundError('Seller not found');
  return toProfile(seller);
}

// SEL-6
export async function patchMe(sellerId: string, patch: PatchMeInput): Promise<SellerProfile> {
  const updated = await patchSeller(sellerId, patch);
  if (!updated) throw new NotFoundError('Seller not found');
  return toProfile(updated);
}

export interface ConnectFacebookResult {
  success: true;
  pageName: string;
  webhookSubscribed: boolean;
}

// SEL-2, SEL-3, SEL-4
export async function connectFacebook(
  sellerId: string,
  input: ConnectFacebookInput,
): Promise<ConnectFacebookResult> {
  const existingOwner = await findSellerByPageId(input.pageId);
  if (existingOwner && existingOwner._id.toString() !== sellerId) {
    throw new ConflictError('This Page is already connected to another seller');
  }

  const pageName = await getGraphPageName(input.pageId, input.pageAccessToken);
  const webhookSubscribed = await subscribePageToApp(input.pageId, input.pageAccessToken);

  await connectFacebookPage(sellerId, {
    facebookPageId: input.pageId,
    facebookPageName: pageName,
    facebookPageAccessToken: encrypt(input.pageAccessToken),
    webhookSubscribed,
  });

  return { success: true, pageName, webhookSubscribed };
}

export async function toggleWebhookSubscription(
  sellerId: string,
  subscribe: boolean,
): Promise<{ success: true; webhookSubscribed: boolean }> {
  const seller = await findSellerById(sellerId);
  if (!seller) throw new NotFoundError('Seller not found');
  if (!seller.facebookPageId || !seller.facebookPageAccessToken) {
    throw new ConflictError('Facebook Page not connected');
  }
  const token = decrypt(seller.facebookPageAccessToken);
  if (subscribe) {
    await subscribePageToApp(seller.facebookPageId, token);
  } else {
    await unsubscribePageFromApp(seller.facebookPageId, token);
  }
  await patchWebhookStatus(sellerId, subscribe);
  return { success: true, webhookSubscribed: subscribe };
}

// SEL-5
export async function disconnectFacebook(sellerId: string): Promise<{ success: true }> {
  const seller = await findSellerById(sellerId);
  if (seller?.facebookPageId && seller.facebookPageAccessToken) {
    await unsubscribePageFromApp(seller.facebookPageId, decrypt(seller.facebookPageAccessToken));
  }
  await disconnectFacebookPage(sellerId);
  return { success: true };
}

// SEL-7: signed state carrying sellerId, verified by the M7 callback.
export function buildSheetsConsentUrl(sellerId: string): { url: string } {
  if (!env.GOOGLE_OAUTH_CLIENT_ID || !env.GOOGLE_OAUTH_REDIRECT_URI) {
    throw new UpstreamError('Google OAuth is not configured yet');
  }

  const state = signOAuthState(sellerId);
  const params = new URLSearchParams({
    client_id: env.GOOGLE_OAUTH_CLIENT_ID,
    redirect_uri: env.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    // SHT-1: minimum scope that lets the app create/append to its own sheet.
    scope: 'https://www.googleapis.com/auth/drive.file',
    state,
  });

  return { url: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}` };
}
