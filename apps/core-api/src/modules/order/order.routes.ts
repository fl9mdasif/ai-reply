import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import {
  getOrderItem,
  getOrdersList,
  patchOrderStatus,
  postRetrySheet,
  postRetrySheets,
} from './order.controller.js';

export const orderRouter = Router();

orderRouter.use('/orders', authGuard);
orderRouter.get('/orders', getOrdersList);
orderRouter.post('/orders/retry-sheets', postRetrySheets);
orderRouter.get('/orders/:orderId', getOrderItem);
orderRouter.patch('/orders/:orderId/status', patchOrderStatus);
orderRouter.post('/orders/:orderId/retry-sheet', postRetrySheet);
