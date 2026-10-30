import { ObjectId } from 'mongodb';
import {
  sellersCollection,
  ordersCollection,
  inviteCodesCollection,
  type SellerDoc,
  type OrderDoc,
  type InviteCodeDoc,
} from '../../lib/db.js';

const SENSITIVE_PROJECTION = {
  passwordHash: 0,
  facebookPageAccessToken: 0,
  googleOAuthRefreshToken: 0,
} as const;

export type PublicSellerDoc = Omit<SellerDoc, 'passwordHash' | 'facebookPageAccessToken' | 'googleOAuthRefreshToken'>;

export async function listAllSellers(
  limit: number,
  cursor?: string,
  status?: 'active' | 'suspended',
  plan?: string,
): Promise<{ sellers: PublicSellerDoc[]; nextCursor?: string }> {
  const filter: Record<string, unknown> = {};
  if (cursor && ObjectId.isValid(cursor)) filter['_id'] = { $lt: new ObjectId(cursor) };
  if (status) filter['status'] = status;
  if (plan) filter['plan'] = plan;

  const docs = await sellersCollection()
    .find(filter, { projection: SENSITIVE_PROJECTION })
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    sellers: page as PublicSellerDoc[],
    nextCursor: hasMore ? page[page.length - 1]!._id.toString() : undefined,
  };
}

export async function findSellerByIdAdmin(id: string): Promise<PublicSellerDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return sellersCollection().findOne(
    { _id: new ObjectId(id) },
    { projection: SENSITIVE_PROJECTION },
  ) as Promise<PublicSellerDoc | null>;
}

export async function updateSellerStatus(
  id: string,
  status: 'active' | 'suspended',
): Promise<PublicSellerDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return sellersCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { status, updatedAt: new Date() } },
    { returnDocument: 'after', projection: SENSITIVE_PROJECTION },
  ) as Promise<PublicSellerDoc | null>;
}

export async function updateSellerPlan(id: string, plan: string): Promise<PublicSellerDoc | null> {
  if (!ObjectId.isValid(id)) return null;
  return sellersCollection().findOneAndUpdate(
    { _id: new ObjectId(id) },
    { $set: { plan, updatedAt: new Date() } },
    { returnDocument: 'after', projection: SENSITIVE_PROJECTION },
  ) as Promise<PublicSellerDoc | null>;
}

export async function listAllOrders(
  limit: number,
  cursor?: string,
  minRiskScore?: number,
  status?: OrderDoc['status'],
): Promise<{ orders: OrderDoc[]; nextCursor?: string }> {
  const filter: Record<string, unknown> = {};
  if (cursor && ObjectId.isValid(cursor)) filter['_id'] = { $lt: new ObjectId(cursor) };
  if (minRiskScore !== undefined) filter['riskScore'] = { $gte: minRiskScore };
  if (status) filter['status'] = status;

  const docs = await ordersCollection()
    .find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    orders: page,
    nextCursor: hasMore ? page[page.length - 1]!._id.toString() : undefined,
  };
}

export interface AdminStats {
  totalSellers: number;
  activeSellers: number;
  totalOrders: number;
  pendingOrders: number;
  avgRiskScore7d: number | null;
  riskScoreSampleSize: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalSellers, activeSellers, totalOrders, pendingOrders, riskAgg] = await Promise.all([
    sellersCollection().countDocuments({}),
    sellersCollection().countDocuments({ status: 'active' }),
    ordersCollection().countDocuments({}),
    ordersCollection().countDocuments({ status: 'pending' }),
    ordersCollection()
      .aggregate<{ avg: number; count: number }>([
        { $match: { createdAt: { $gte: sevenDaysAgo }, riskScore: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$riskScore' }, count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  return {
    totalSellers,
    activeSellers,
    totalOrders,
    pendingOrders,
    avgRiskScore7d: riskAgg[0]?.avg ?? null,
    riskScoreSampleSize: riskAgg[0]?.count ?? 0,
  };
}

export interface OrdersByDay {
  date: string;
  count: number;
}

export async function getOrdersByDay(): Promise<OrdersByDay[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const rows = await ordersCollection()
    .aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ])
    .toArray();

  return rows.map((r) => ({ date: r._id, count: r.count }));
}

export async function insertInviteCode(
  code: string,
  createdBy: string,
  note?: string,
): Promise<InviteCodeDoc> {
  const doc: InviteCodeDoc = {
    _id: new ObjectId(),
    code,
    note,
    createdBy,
    createdAt: new Date(),
  };
  await inviteCodesCollection().insertOne(doc);
  return doc;
}

export async function listInviteCodes(
  limit: number,
  cursor?: string,
): Promise<{ codes: InviteCodeDoc[]; nextCursor?: string }> {
  const filter: Record<string, unknown> = {};
  if (cursor && ObjectId.isValid(cursor)) filter['_id'] = { $lt: new ObjectId(cursor) };

  const docs = await inviteCodesCollection()
    .find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;

  return {
    codes: page,
    nextCursor: hasMore ? page[page.length - 1]!._id.toString() : undefined,
  };
}
