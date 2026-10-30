import { z } from 'zod';

export const listSellersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  plan: z.string().optional(),
});

export const patchSellerStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
});

export const patchSellerPlanSchema = z.object({
  plan: z.string().min(1).max(50),
});

export const listAdminOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  cursor: z.string().optional(),
  minRiskScore: z.coerce.number().min(0).max(1).optional(),
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
});

export const createInviteCodeSchema = z.object({
  note: z.string().max(200).optional(),
});

export type ListSellersQuery = z.infer<typeof listSellersQuerySchema>;
export type PatchSellerStatus = z.infer<typeof patchSellerStatusSchema>;
export type PatchSellerPlan = z.infer<typeof patchSellerPlanSchema>;
export type ListAdminOrdersQuery = z.infer<typeof listAdminOrdersQuerySchema>;
export type CreateInviteCode = z.infer<typeof createInviteCodeSchema>;
