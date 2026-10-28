import { ObjectId } from 'mongodb';
import { ordersCollection, type OrderDoc } from '../../lib/db.js';

export type NewOrder = Omit<OrderDoc, '_id'>;

export async function insertOrder(doc: NewOrder): Promise<OrderDoc> {
  const fullDoc: OrderDoc = { _id: new ObjectId(), ...doc };
  await ordersCollection().insertOne(fullDoc);
  return fullDoc;
}

// ORD-4: every lookup takes sellerId as a required filter, never _id alone.
export async function findOrderById(sellerId: string, orderId: string): Promise<OrderDoc | null> {
  if (!ObjectId.isValid(orderId)) return null;
  return ordersCollection().findOne({ _id: new ObjectId(orderId), sellerId });
}

export interface ListOrdersResult {
  orders: OrderDoc[];
  nextCursor?: string;
}

// ORD-4: paginated (default 50, max 100 enforced by the schema), filterable by status.
export async function listOrders(
  sellerId: string,
  limit: number,
  status?: OrderDoc['status'],
  cursor?: string,
): Promise<ListOrdersResult> {
  const filter: Record<string, unknown> = { sellerId };
  if (status) filter.status = status;
  if (cursor && ObjectId.isValid(cursor)) filter._id = { $lt: new ObjectId(cursor) };

  const docs = await ordersCollection().find(filter).sort({ _id: -1 }).limit(limit + 1).toArray();
  const hasMore = docs.length > limit;
  const orders = hasMore ? docs.slice(0, limit) : docs;
  const last = orders[orders.length - 1];

  return { orders, nextCursor: hasMore && last ? last._id.toString() : undefined };
}

// ORD-6: only a pending order can move to confirmed or cancelled.
export async function updateOrderStatus(
  sellerId: string,
  orderId: string,
  status: 'confirmed' | 'cancelled',
): Promise<OrderDoc | null> {
  if (!ObjectId.isValid(orderId)) return null;
  return ordersCollection().findOneAndUpdate(
    { _id: new ObjectId(orderId), sellerId, status: 'pending' },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function markSheetWritten(orderId: ObjectId): Promise<void> {
  await ordersCollection().updateOne(
    { _id: orderId },
    { $set: { sheetRowWritten: true, updatedAt: new Date() }, $unset: { sheetLastError: '' } },
  );
}

export async function markSheetWriteFailed(orderId: ObjectId, error: string): Promise<void> {
  await ordersCollection().updateOne(
    { _id: orderId },
    { $inc: { sheetWriteAttempts: 1 }, $set: { sheetLastError: error.slice(0, 300), updatedAt: new Date() } },
  );
}

const MAX_RETRY_ATTEMPTS = 5;

// ORD-8: candidates for the background retry job, across all sellers, via
// the partial index on { sheetRowWritten: false }.
export async function findOrdersNeedingRetry(limit: number): Promise<OrderDoc[]> {
  return ordersCollection()
    .find({ sheetRowWritten: false, sheetWriteAttempts: { $lt: MAX_RETRY_ATTEMPTS } })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}

// ORD-7 (bulk): the authenticated seller's own unwritten orders only.
export async function findSellerUnwrittenOrders(sellerId: string, limit: number): Promise<OrderDoc[]> {
  return ordersCollection()
    .find({ sellerId, sheetRowWritten: false })
    .sort({ createdAt: 1 })
    .limit(limit)
    .toArray();
}
