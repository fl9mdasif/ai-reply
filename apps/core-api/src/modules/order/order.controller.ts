import type { Request, Response } from 'express';
import { listOrdersQuerySchema, updateStatusSchema } from './order.schema.js';
import {
  getOrder,
  listSellerOrders,
  retryAllSheetsForSeller,
  retrySheetForOrder,
  updateStatus,
} from './order.service.js';

export async function getOrdersList(req: Request, res: Response): Promise<void> {
  const query = listOrdersQuerySchema.parse(req.query);
  const result = await listSellerOrders(req.sellerId, query.limit ?? 50, query.status, query.cursor);
  res.status(200).json(result);
}

export async function getOrderItem(req: Request, res: Response): Promise<void> {
  const order = await getOrder(req.sellerId, req.params.orderId as string);
  res.status(200).json(order);
}

export async function patchOrderStatus(req: Request, res: Response): Promise<void> {
  const input = updateStatusSchema.parse(req.body);
  const order = await updateStatus(req.sellerId, req.params.orderId as string, input.status);
  res.status(200).json(order);
}

export async function postRetrySheet(req: Request, res: Response): Promise<void> {
  const result = await retrySheetForOrder(req.sellerId, req.params.orderId as string);
  res.status(200).json(result);
}

export async function postRetrySheets(req: Request, res: Response): Promise<void> {
  const result = await retryAllSheetsForSeller(req.sellerId);
  res.status(200).json(result);
}
