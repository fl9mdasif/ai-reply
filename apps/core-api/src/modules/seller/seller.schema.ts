import { z } from 'zod';

// SEL-6: only these fields are ever written by PATCH /seller/me.
export const patchMeSchema = z
  .object({
    businessName: z.string().trim().min(2).max(100).optional(),
    fallbackMessage: z.string().trim().max(500).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field is required',
  });
export type PatchMeInput = z.infer<typeof patchMeSchema>;

export const connectFacebookSchema = z.object({
  pageId: z.string().trim().min(1).max(60),
  pageAccessToken: z.string().trim().min(1).max(1000),
});
export type ConnectFacebookInput = z.infer<typeof connectFacebookSchema>;
