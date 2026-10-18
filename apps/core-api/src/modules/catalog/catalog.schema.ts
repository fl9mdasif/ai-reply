import { z } from 'zod';

const faqEntrySchema = z.object({
  question: z.string().trim().min(1).max(300),
  answer: z.string().trim().min(1).max(1000),
});

// CAT-2
export const createProductSchema = z.object({
  name: z.string().trim().min(1).max(120),
  price: z.number().int().min(0).max(10_000_000),
  description: z.string().trim().max(2000).optional(),
  faqEntries: z.array(faqEntrySchema).max(20).optional(),
});
export type CreateProductInput = z.infer<typeof createProductSchema>;

export const updateProductSchema = createProductSchema;
export type UpdateProductInput = CreateProductInput;

// CAT-8
export const listCatalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  cursor: z.string().optional(),
});
export type ListCatalogQuery = z.infer<typeof listCatalogQuerySchema>;

// CAT-7
export const importProductsSchema = z.array(createProductSchema).max(200);
export type ImportProductsInput = z.infer<typeof importProductsSchema>;
