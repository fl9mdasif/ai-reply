import { z } from 'zod';

export const listOrdersQuerySchema = z.object({
  status: z.enum(['pending', 'confirmed', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListOrdersQuery = z.infer<typeof listOrdersQuerySchema>;

// ORD-6
export const updateStatusSchema = z.object({
  status: z.enum(['confirmed', 'cancelled']),
});
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
