import { decrypt, encrypt } from '../../lib/crypto.js';
import { ForbiddenError, NotFoundError } from '../../lib/errors.js';
import {
  appendOrderRow as appendOrderRowToSheet,
  createOrdersSpreadsheet,
  exchangeCodeForTokens,
  getAccessTokenFromRefreshToken,
  orderIdExistsInSheet,
  SheetsAuthError,
} from '../../lib/google-client.js';
import { verifyOAuthState } from '../../lib/jwt.js';
import { clearGoogleConnection, findSellerById, saveGoogleConnection } from './sheets-integration.repo.js';

export { SheetsAuthError };

export interface OAuthCallbackResult {
  sellerId: string;
  googleSheetUrl: string;
}

// SHT-2, SHT-3
export async function handleOAuthCallback(state: string, code: string): Promise<OAuthCallbackResult> {
  let sellerId: string;
  try {
    ({ sellerId } = verifyOAuthState(state));
  } catch {
    throw new ForbiddenError('Invalid or expired Google authorization link');
  }

  const seller = await findSellerById(sellerId);
  if (!seller) throw new NotFoundError('Seller not found');

  const { refreshToken, accessToken } = await exchangeCodeForTokens(code);

  // Reuse the sheet already linked, if any, rather than creating a new one
  // every time the seller re-authorizes.
  let googleSheetId = seller.googleSheetId;
  let googleSheetUrl = seller.googleSheetUrl;
  if (!googleSheetId) {
    const created = await createOrdersSpreadsheet(accessToken);
    googleSheetId = created.spreadsheetId;
    googleSheetUrl = created.spreadsheetUrl;
  }

  await saveGoogleConnection(sellerId, {
    googleOAuthRefreshToken: encrypt(refreshToken),
    googleSheetId,
    googleSheetUrl: googleSheetUrl ?? '',
  });

  return { sellerId, googleSheetUrl: googleSheetUrl ?? '' };
}

export interface OrderRowInput {
  orderId: string;
  date: string;
  product: string;
  quantity: number;
  total?: number;
  customerName: string;
  phone: string;
  address: string;
  riskScore?: number | null;
  riskFlags: string;
  status: string;
}

function toRow(input: OrderRowInput): string[] {
  return [
    input.date,
    input.orderId,
    input.product,
    String(input.quantity),
    input.total !== undefined ? String(input.total) : '',
    input.customerName,
    input.phone,
    input.address,
    input.riskScore !== undefined && input.riskScore !== null ? String(input.riskScore) : '',
    input.riskFlags,
    input.status,
  ];
}

// SHT-4, SHT-5, SHT-6: appends a row idempotently, using a fresh access
// token from the stored refresh token. Returns false — not an error — when
// the seller has no Sheet connected, so order.service (M8) can leave
// sheetRowWritten false without treating the seller's absent Sheet as a
// failure. A SheetsAuthError propagates to the caller untouched (SHT-5:
// typed, never a crash) for order.service to record and retry later.
export async function appendOrderRow(sellerId: string, input: OrderRowInput): Promise<boolean> {
  const seller = await findSellerById(sellerId);
  if (!seller?.googleSheetId || !seller.googleOAuthRefreshToken) return false;

  const accessToken = await getAccessTokenFromRefreshToken(decrypt(seller.googleOAuthRefreshToken));

  const alreadyWritten = await orderIdExistsInSheet(accessToken, seller.googleSheetId, input.orderId);
  if (alreadyWritten) return true;

  await appendOrderRowToSheet(accessToken, seller.googleSheetId, toRow(input));
  return true;
}

// SHT-8
export async function disconnectGoogle(sellerId: string): Promise<{ success: true }> {
  await clearGoogleConnection(sellerId);
  return { success: true };
}
