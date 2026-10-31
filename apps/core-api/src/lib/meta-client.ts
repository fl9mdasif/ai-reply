// Messenger Send API and Graph API wrapper.
import { env } from '../config/env.js';
import { UpstreamError, ValidationError } from './errors.js';
import { logger } from './logger.js';

const GRAPH_BASE = 'https://graph.facebook.com';
const GRAPH_TIMEOUT_MS = 8000;

async function graphFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GRAPH_TIMEOUT_MS);

  const url = new URL(`${GRAPH_BASE}/${env.META_GRAPH_VERSION}${path}`);
  url.searchParams.set('access_token', accessToken);

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

// SEL-2: validates a Page access token by calling GET /{pageId}?fields=name.
export async function getGraphPageName(pageId: string, accessToken: string): Promise<string> {
  let response: Response;
  try {
    response = await graphFetch(`/${pageId}?fields=name`, accessToken);
  } catch {
    throw new UpstreamError('Could not reach Facebook to verify the Page token');
  }

  if (!response.ok) {
    throw new ValidationError('Invalid Facebook Page access token');
  }

  const body = (await response.json()) as { name?: string };
  if (!body.name) {
    throw new ValidationError('Invalid Facebook Page access token');
  }
  return body.name;
}

// SEL-4: subscribes the app to the Page's messages field. Best-effort — a
// failure here must not fail the connect-facebook call itself.
export async function subscribePageToApp(pageId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await graphFetch(`/${pageId}/subscribed_apps`, accessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'subscribed_fields=messages',
    });
    return response.ok;
  } catch {
    return false;
  }
}

// SEL-5: best-effort unsubscribe when a seller disconnects their Page.
export async function unsubscribePageFromApp(pageId: string, accessToken: string): Promise<boolean> {
  try {
    const response = await graphFetch(`/${pageId}/subscribed_apps`, accessToken, {
      method: 'DELETE',
    });
    return response.ok;
  } catch {
    return false;
  }
}

export interface FacebookPage {
  id: string;
  name: string;
  access_token: string;
}

// Facebook OAuth: exchange short-lived code for a user access token.
export async function exchangeCodeForUserToken(
  code: string,
  redirectUri: string,
): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/${env.META_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set('client_id', env.META_APP_ID ?? '');
  url.searchParams.set('client_secret', env.META_APP_SECRET);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);

  const res = await fetch(url.toString());
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: { message?: string } };
    throw new UpstreamError(body.error?.message ?? 'Facebook code exchange failed');
  }
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new UpstreamError('Facebook did not return an access token');
  return body.access_token;
}

// Exchange a short-lived user token for a 60-day long-lived token.
export async function getLongLivedUserToken(shortLivedToken: string): Promise<string> {
  const url = new URL(`${GRAPH_BASE}/${env.META_GRAPH_VERSION}/oauth/access_token`);
  url.searchParams.set('grant_type', 'fb_exchange_token');
  url.searchParams.set('client_id', env.META_APP_ID ?? '');
  url.searchParams.set('client_secret', env.META_APP_SECRET);
  url.searchParams.set('fb_exchange_token', shortLivedToken);

  const res = await fetch(url.toString());
  if (!res.ok) throw new UpstreamError('Failed to extend Facebook token');
  const body = (await res.json()) as { access_token?: string };
  if (!body.access_token) throw new UpstreamError('Facebook did not return a long-lived token');
  return body.access_token;
}

// Get all Facebook Pages the user manages (with their page access tokens).
export async function getPageAccounts(userAccessToken: string): Promise<FacebookPage[]> {
  const url = new URL(`${GRAPH_BASE}/${env.META_GRAPH_VERSION}/me/accounts`);
  url.searchParams.set('access_token', userAccessToken);
  url.searchParams.set('fields', 'id,name,access_token');

  const res = await fetch(url.toString());
  if (!res.ok) throw new UpstreamError('Failed to retrieve Facebook pages for this account');
  const body = (await res.json()) as { data?: FacebookPage[] };
  return body.data ?? [];
}

interface MetaErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

// WH-7: Send API, messaging_type RESPONSE. A failure is logged with status
// and Meta's error code, never thrown — the webhook always responds 200
// regardless (WH-5).
export async function sendText(pageAccessToken: string, psid: string, text: string): Promise<void> {
  try {
    const response = await graphFetch('/me/messages', pageAccessToken, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: psid },
        message: { text },
        messaging_type: 'RESPONSE',
      }),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => ({}))) as MetaErrorBody;
      logger.error(
        { status: response.status, metaError: errorBody.error },
        'Meta Send API returned an error',
      );
    }
  } catch (err) {
    logger.error({ err }, 'Meta Send API request failed');
  }
}
