// Messenger Send API and Graph API wrapper. Page validation/subscription
// (SEL-2, SEL-4) land here now; the Send API itself is wired in M5.
import { env } from '../config/env.js';
import { UpstreamError, ValidationError } from './errors.js';

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
