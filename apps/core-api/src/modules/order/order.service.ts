import type { ObjectId } from 'mongodb';
import type { OrderDoc, OrderDraft, OrderRiskFlag } from '../../lib/db.js';
import { NotFoundError, ValidationError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { riskScore } from '../../lib/rag-engine-client.js';
import { matchProductByName } from '../catalog/catalog.service.js';
import { appendOrderRow } from '../sheets-integration/sheets-integration.service.js';
import {
  findOrderById,
  findOrdersNeedingRetry,
  findSellerUnwrittenOrders,
  insertOrder,
  listOrders,
  markSheetWriteFailed,
  markSheetWritten,
  updateOrderStatus,
} from './order.repo.js';

// ORD-10
const MIN_QUANTITY = 1;
const MAX_QUANTITY = 100;
const MAX_TEXT_LENGTH = 300;

function clampText(value: string): string {
  return value.trim().slice(0, MAX_TEXT_LENGTH);
}

export interface OrderResponse {
  orderId: string;
  productName: string;
  productId?: string;
  unitPrice?: number;
  total?: number;
  quantity: number;
  customerName: string;
  phone: string;
  address: string;
  riskFlags: OrderRiskFlag[];
  riskScore: number | null;
  status: OrderDoc['status'];
  sheetRowWritten: boolean;
  createdAt: string;
  updatedAt: string;
}

function toResponse(doc: OrderDoc): OrderResponse {
  return {
    orderId: doc._id.toString(),
    productName: doc.productName,
    productId: doc.productId,
    unitPrice: doc.unitPrice,
    total: doc.total,
    quantity: doc.quantity,
    customerName: doc.customerName,
    phone: doc.phone,
    address: doc.address,
    riskFlags: doc.riskFlags,
    riskScore: doc.riskScore,
    status: doc.status,
    sheetRowWritten: doc.sheetRowWritten,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

// SHT-4/ORD-1 step 4: fail-soft Sheets append. A thrown error (including
// SheetsAuthError) is recorded, never propagated — the order itself is
// already safely in Mongo by the time this runs.
async function attemptSheetWrite(order: OrderDoc): Promise<boolean> {
  try {
    const written = await appendOrderRow(order.sellerId, {
      orderId: order._id.toString(),
      date: order.createdAt.toISOString(),
      product: order.productName,
      quantity: order.quantity,
      total: order.total,
      customerName: order.customerName,
      phone: order.phone,
      address: order.address,
      riskScore: order.riskScore,
      riskFlags: order.riskFlags.map((f) => f.code).join('; '),
      status: order.status,
    });

    if (written) await markSheetWritten(order._id);
    return written;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sheet write failed';
    await markSheetWriteFailed(order._id, message);
    logger.error({ err, orderId: order._id.toString() }, 'Sheets append failed, sheetRowWritten stays false');
    return false;
  }
}

export interface CreateOrderInput {
  sellerId: string;
  conversationId?: ObjectId;
  customerPsid: string;
  draft: OrderDraft;
}

// ORD-1..ORD-10: PRD section 10.8's createFromDraft sequence. Steps 2 and 4
// are fail-soft; step 3 (the Mongo insert) is not — it's the source of
// truth and must succeed before anything else is attempted.
export async function createFromDraft(input: CreateOrderInput): Promise<OrderResponse> {
  const { sellerId, conversationId, customerPsid, draft } = input;

  if (!draft.product || !draft.customerName || !draft.phone || !draft.address || !draft.quantity) {
    throw new ValidationError('Order draft is missing required fields');
  }

  const quantity = Math.min(Math.max(Math.round(draft.quantity), MIN_QUANTITY), MAX_QUANTITY);
  const productName = clampText(draft.product);
  const customerName = clampText(draft.customerName);
  const phone = clampText(draft.phone);
  const address = clampText(draft.address);

  // Step 1: match the product name to the catalog.
  const match = await matchProductByName(sellerId, productName);

  // Step 2: risk score, fail-soft.
  const risk = await riskScore({ sellerId, product: productName, quantity, customerName, phone, address });
  if ((draft.phoneAttempts ?? 0) >= 2) {
    risk.riskFlags.push({ code: 'unverified_phone', reason: 'Phone number failed format validation twice' });
  }

  const now = new Date();

  // Step 3: Mongo insert — must succeed.
  const order = await insertOrder({
    sellerId,
    conversationId,
    customerPsid,
    productName,
    productId: match?.productId,
    unitPrice: match?.unitPrice,
    total: match ? match.unitPrice * quantity : undefined,
    quantity,
    customerName,
    phone,
    address,
    riskFlags: risk.riskFlags,
    riskScore: risk.riskScore,
    status: 'pending',
    sheetRowWritten: false,
    sheetWriteAttempts: 0,
    createdAt: now,
    updatedAt: now,
  });

  // Step 4: Sheets append, fail-soft.
  const sheetRowWritten = await attemptSheetWrite(order);

  return toResponse({ ...order, sheetRowWritten });
}

// ORD-4
export async function listSellerOrders(
  sellerId: string,
  limit: number,
  status?: OrderDoc['status'],
  cursor?: string,
): Promise<{ orders: OrderResponse[]; nextCursor?: string }> {
  const { orders, nextCursor } = await listOrders(sellerId, limit, status, cursor);
  return { orders: orders.map(toResponse), nextCursor };
}

export async function getOrder(sellerId: string, orderId: string): Promise<OrderResponse> {
  const order = await findOrderById(sellerId, orderId);
  if (!order) throw new NotFoundError('Order not found');
  return toResponse(order);
}

// ORD-6
export async function updateStatus(
  sellerId: string,
  orderId: string,
  status: 'confirmed' | 'cancelled',
): Promise<OrderResponse> {
  const updated = await updateOrderStatus(sellerId, orderId, status);
  if (!updated) throw new NotFoundError('Order not found, or not in pending status');
  return toResponse(updated);
}

// ORD-7 (single order, authenticated seller only)
export async function retrySheetForOrder(sellerId: string, orderId: string): Promise<{ sheetRowWritten: boolean }> {
  const order = await findOrderById(sellerId, orderId);
  if (!order) throw new NotFoundError('Order not found');
  if (order.sheetRowWritten) return { sheetRowWritten: true };

  const sheetRowWritten = await attemptSheetWrite(order);
  return { sheetRowWritten };
}

// ORD-7 (bulk, authenticated seller only)
export async function retryAllSheetsForSeller(sellerId: string): Promise<{ attempted: number; succeeded: number }> {
  const orders = await findSellerUnwrittenOrders(sellerId, 50);
  let succeeded = 0;
  for (const order of orders) {
    if (await attemptSheetWrite(order)) succeeded += 1;
  }
  return { attempted: orders.length, succeeded };
}

// ORD-8: the background job's single tick. Guarded against overlap here
// (not just in server.ts) so it's safe regardless of caller.
let retryTickRunning = false;

export async function runRetryJobTick(): Promise<{ attempted: number; succeeded: number } | null> {
  if (retryTickRunning) return null;
  retryTickRunning = true;

  try {
    // ORD-9: a seller with no Sheet connected is skipped — attemptSheetWrite
    // returns false without incrementing sheetWriteAttempts, so these
    // orders are retried for free next tick rather than treated as failures.
    const candidates = await findOrdersNeedingRetry(20);
    let succeeded = 0;
    for (const order of candidates) {
      if (await attemptSheetWrite(order)) succeeded += 1;
    }
    logger.info({ attempted: candidates.length, succeeded }, 'Sheet retry job tick complete');
    return { attempted: candidates.length, succeeded };
  } finally {
    retryTickRunning = false;
  }
}
