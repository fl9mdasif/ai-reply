import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import { adminGuard } from '../../middleware/admin-guard.js';
import {
  getSellersList,
  getSellerItem,
  patchSellerStatusHandler,
  patchSellerPlanHandler,
  getAdminOrdersList,
  getAdminStatsHandler,
  getOrdersByDayHandler,
  postInviteCode,
  getInviteCodesList,
  getAdminHealth,
} from './admin.controller.js';

export const adminRouter = Router();

adminRouter.use('/admin', authGuard, adminGuard);
adminRouter.get('/admin/sellers', getSellersList);
adminRouter.get('/admin/sellers/:sellerId', getSellerItem);
adminRouter.patch('/admin/sellers/:sellerId/status', patchSellerStatusHandler);
adminRouter.patch('/admin/sellers/:sellerId/plan', patchSellerPlanHandler);
adminRouter.get('/admin/orders', getAdminOrdersList);
adminRouter.get('/admin/stats', getAdminStatsHandler);
adminRouter.get('/admin/stats/orders-by-day', getOrdersByDayHandler);
adminRouter.post('/admin/invite-codes', postInviteCode);
adminRouter.get('/admin/invite-codes', getInviteCodesList);
adminRouter.get('/admin/health', getAdminHealth);
