import type { Request, Response } from 'express';
import { randomBytes } from 'crypto';
import { NotFoundError } from '../../lib/errors.js';
import { pingDb } from '../../lib/db.js';
import { pingRagEngine } from '../../lib/rag-engine-client.js';
import {
  listSellersQuerySchema,
  patchSellerStatusSchema,
  patchSellerPlanSchema,
  listAdminOrdersQuerySchema,
  createInviteCodeSchema,
} from './admin.schema.js';
import {
  listAllSellers,
  findSellerByIdAdmin,
  updateSellerStatus,
  updateSellerPlan,
  listAllOrders,
  getAdminStats,
  getOrdersByDay,
  insertInviteCode,
  listInviteCodes,
} from './admin.repo.js';

export async function getSellersList(req: Request, res: Response): Promise<void> {
  const query = listSellersQuerySchema.parse(req.query);
  const result = await listAllSellers(query.limit, query.cursor, query.status, query.plan);
  res.status(200).json(result);
}

export async function getSellerItem(req: Request, res: Response): Promise<void> {
  const seller = await findSellerByIdAdmin(req.params.sellerId as string);
  if (!seller) throw new NotFoundError('Seller not found');
  res.status(200).json(seller);
}

export async function patchSellerStatusHandler(req: Request, res: Response): Promise<void> {
  const input = patchSellerStatusSchema.parse(req.body);
  const seller = await updateSellerStatus(req.params.sellerId as string, input.status);
  if (!seller) throw new NotFoundError('Seller not found');
  res.status(200).json(seller);
}

export async function patchSellerPlanHandler(req: Request, res: Response): Promise<void> {
  const input = patchSellerPlanSchema.parse(req.body);
  const seller = await updateSellerPlan(req.params.sellerId as string, input.plan);
  if (!seller) throw new NotFoundError('Seller not found');
  res.status(200).json(seller);
}

export async function getAdminOrdersList(req: Request, res: Response): Promise<void> {
  const query = listAdminOrdersQuerySchema.parse(req.query);
  const result = await listAllOrders(query.limit, query.cursor, query.minRiskScore, query.status);
  res.status(200).json(result);
}

export async function getAdminStatsHandler(_req: Request, res: Response): Promise<void> {
  const stats = await getAdminStats();
  res.status(200).json(stats);
}

export async function getOrdersByDayHandler(_req: Request, res: Response): Promise<void> {
  const data = await getOrdersByDay();
  res.status(200).json(data);
}

export async function postInviteCode(req: Request, res: Response): Promise<void> {
  const input = createInviteCodeSchema.parse(req.body);
  const code = randomBytes(8).toString('hex');
  const doc = await insertInviteCode(code, req.sellerId, input.note);
  res.status(201).json(doc);
}

export async function getInviteCodesList(req: Request, res: Response): Promise<void> {
  const limit = Math.min(Number(req.query['limit']) || 50, 100);
  const cursor = typeof req.query['cursor'] === 'string' ? req.query['cursor'] : undefined;
  const result = await listInviteCodes(limit, cursor);
  res.status(200).json(result);
}

export async function getAdminHealth(_req: Request, res: Response): Promise<void> {
  const [dbOk, ragOk] = await Promise.all([
    pingDb().catch(() => false),
    pingRagEngine().catch(() => false),
  ]);
  const status = dbOk && ragOk ? 'ok' : 'degraded';
  res.status(200).json({ status, db: dbOk, rag: ragOk, ts: new Date().toISOString() });
}
