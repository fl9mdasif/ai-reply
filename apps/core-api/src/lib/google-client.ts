// OAuth token exchange/refresh (google-auth-library) and direct REST calls
// to the Sheets API (PRD section 11.3). The only code that talks to Google.
import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.js';
import { UpstreamError } from './errors.js';
import { logger } from './logger.js';

// SHT-5: a revoked or expired grant, surfaced as a typed error rather than
// a crash — callers (sheets-integration.service, later order.service) can
// catch this specifically and keep going.
export class SheetsAuthError extends UpstreamError {
  constructor(message = 'Google Sheets authorization is no longer valid') {
    super(message);
    this.name = 'SheetsAuthError';
  }
}

function buildOAuthClient(): OAuth2Client {
  return new OAuth2Client(env.GOOGLE_OAUTH_CLIENT_ID, env.GOOGLE_OAUTH_CLIENT_SECRET, env.GOOGLE_OAUTH_REDIRECT_URI);
}

export interface ExchangedTokens {
  refreshToken: string;
  accessToken: string;
}

// SHT-3: exchanges the one-time authorization code for tokens.
export async function exchangeCodeForTokens(code: string): Promise<ExchangedTokens> {
  const client = buildOAuthClient();

  let tokens: { refresh_token?: string | null; access_token?: string | null };
  try {
    ({ tokens } = await client.getToken(code));
  } catch (err) {
    logger.error({ err }, 'Google OAuth code exchange failed');
    throw new SheetsAuthError('Could not complete Google authorization');
  }

  if (!tokens.refresh_token || !tokens.access_token) {
    throw new SheetsAuthError('Google did not return a refresh token — reconnect and grant offline access');
  }

  return { refreshToken: tokens.refresh_token, accessToken: tokens.access_token };
}

// SHT-5: obtains a fresh access token from the stored refresh token on
// demand — access tokens are never stored.
export async function getAccessTokenFromRefreshToken(refreshToken: string): Promise<string> {
  const client = buildOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await client.getAccessToken();
    if (!token) throw new Error('No access token returned');
    return token;
  } catch (err) {
    logger.error({ err }, 'Failed to refresh Google access token');
    throw new SheetsAuthError();
  }
}

const SHEETS_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEETS_TIMEOUT_MS = 5000;

async function sheetsFetch(path: string, accessToken: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SHEETS_TIMEOUT_MS);
  try {
    return await fetch(`${SHEETS_BASE}${path}`, {
      ...init,
      headers: { ...init?.headers, Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

// SHT-7: 5s timeout, one retry — on a network failure or a quota/5xx
// response, never on an auth failure (retrying with the same token is
// pointless; that throws SheetsAuthError immediately instead).
async function sheetsRequest(path: string, accessToken: string, init?: RequestInit): Promise<unknown> {
  const attempt = () => sheetsFetch(path, accessToken, init);

  let response: Response;
  try {
    response = await attempt();
  } catch {
    response = await attempt();
  }

  if (response.status === 401 || response.status === 403) {
    throw new SheetsAuthError();
  }

  if (!response.ok && (response.status === 429 || response.status >= 500)) {
    response = await attempt();
    if (response.status === 401 || response.status === 403) throw new SheetsAuthError();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new UpstreamError(`Google Sheets API responded ${response.status}: ${body.slice(0, 200)}`);
  }

  return response.json();
}

// SHT-4's column order.
const HEADER_ROW = [
  'Date',
  'Order ID',
  'Product',
  'Quantity',
  'Total',
  'Customer',
  'Phone',
  'Address',
  'Risk Score',
  'Risk Flags',
  'Status',
];

export interface CreatedSpreadsheet {
  spreadsheetId: string;
  spreadsheetUrl: string;
}

// SHT-3: creates "jobabai Orders" with a header row.
export async function createOrdersSpreadsheet(accessToken: string): Promise<CreatedSpreadsheet> {
  const created = (await sheetsRequest('', accessToken, {
    method: 'POST',
    body: JSON.stringify({ properties: { title: 'jobabai Orders' } }),
  })) as { spreadsheetId: string; spreadsheetUrl: string };

  await sheetsRequest(`/${created.spreadsheetId}/values/A1:append?valueInputOption=RAW`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ values: [HEADER_ROW] }),
  });

  return { spreadsheetId: created.spreadsheetId, spreadsheetUrl: created.spreadsheetUrl };
}

// SHT-4
export async function appendOrderRow(accessToken: string, spreadsheetId: string, row: string[]): Promise<void> {
  await sheetsRequest(`/${spreadsheetId}/values/A1:append?valueInputOption=RAW`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ values: [row] }),
  });
}

// SHT-6: column B holds Order IDs — read it to check idempotency before
// appending a retried order.
export async function orderIdExistsInSheet(
  accessToken: string,
  spreadsheetId: string,
  orderId: string,
): Promise<boolean> {
  const result = (await sheetsRequest(`/${spreadsheetId}/values/B:B`, accessToken)) as { values?: string[][] };
  const values = result.values ?? [];
  return values.some((row) => row[0] === orderId);
}
