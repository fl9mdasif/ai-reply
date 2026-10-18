import type { FaqEntry, ProductDoc } from '../../lib/db.js';
import { NotFoundError } from '../../lib/errors.js';
import { logger } from '../../lib/logger.js';
import { embed, removeEmbedding } from '../../lib/rag-engine-client.js';
import {
  deleteProduct,
  findProductById,
  insertProduct,
  listProducts,
  setEmbedStatus,
  updateProductFields,
} from './catalog.repo.js';
import type { CreateProductInput, ImportProductsInput, UpdateProductInput } from './catalog.schema.js';

export interface ProductResponse {
  productId: string;
  name: string;
  price: number;
  description?: string;
  faqEntries?: FaqEntry[];
  embedStatus: 'pending' | 'synced' | 'failed';
  embedError?: string;
  createdAt: string;
  updatedAt: string;
}

function toResponse(doc: ProductDoc): ProductResponse {
  return {
    productId: doc._id.toString(),
    name: doc.name,
    price: doc.price,
    description: doc.description,
    faqEntries: doc.faqEntries,
    embedStatus: doc.embedStatus,
    embedError: doc.embedError,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

interface EmbeddableFields {
  name: string;
  description?: string;
  faqEntries?: FaqEntry[];
}

// CAT-3, CAT-4: the Mongo write already happened before this runs and is
// never rolled back here — this only ever updates embedStatus/embedError.
async function syncEmbedding(
  sellerId: string,
  productId: string,
  input: EmbeddableFields,
): Promise<'synced' | 'failed'> {
  try {
    await embed({
      sellerId,
      productId,
      name: input.name,
      description: input.description,
      faqEntries: input.faqEntries,
    });
    await setEmbedStatus(productId, 'synced');
    return 'synced';
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Embed failed';
    await setEmbedStatus(productId, 'failed', message.slice(0, 200));
    return 'failed';
  }
}

// CAT-1, CAT-2, CAT-3, CAT-4, CAT-9
export async function createProduct(sellerId: string, input: CreateProductInput): Promise<ProductResponse> {
  const now = new Date();
  const product = await insertProduct({
    sellerId,
    name: input.name,
    nameLower: input.name.toLowerCase(),
    price: input.price,
    description: input.description,
    faqEntries: input.faqEntries,
    embedStatus: 'pending',
    createdAt: now,
    updatedAt: now,
  });

  const embedStatus = await syncEmbedding(sellerId, product._id.toString(), input);
  return { ...toResponse(product), embedStatus };
}

export async function getProduct(sellerId: string, productId: string): Promise<ProductResponse> {
  const product = await findProductById(sellerId, productId);
  if (!product) throw new NotFoundError('Product not found');
  return toResponse(product);
}

// CAT-8
export async function listCatalog(
  sellerId: string,
  limit: number,
  cursor?: string,
): Promise<{ products: ProductResponse[]; nextCursor?: string }> {
  const { products, nextCursor } = await listProducts(sellerId, limit, cursor);
  return { products: products.map(toResponse), nextCursor };
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  input: UpdateProductInput,
): Promise<ProductResponse> {
  const updated = await updateProductFields(sellerId, productId, {
    name: input.name,
    nameLower: input.name.toLowerCase(),
    price: input.price,
    description: input.description,
    faqEntries: input.faqEntries,
  });
  if (!updated) throw new NotFoundError('Product not found');

  const embedStatus = await syncEmbedding(sellerId, productId, input);
  return { ...toResponse(updated), embedStatus };
}

// CAT-5
export async function removeProduct(sellerId: string, productId: string): Promise<{ success: true }> {
  const deleted = await deleteProduct(sellerId, productId);
  if (!deleted) throw new NotFoundError('Product not found');

  try {
    await removeEmbedding(sellerId, productId);
  } catch (err) {
    logger.error(
      { err, sellerId, productId },
      'Failed to remove embedding after product delete; an orphan vector may remain in Qdrant',
    );
  }

  return { success: true };
}

// CAT-6
export async function reembedProduct(
  sellerId: string,
  productId: string,
): Promise<{ embedStatus: 'synced' | 'failed' }> {
  const product = await findProductById(sellerId, productId);
  if (!product) throw new NotFoundError('Product not found');

  const embedStatus = await syncEmbedding(sellerId, productId, product);
  return { embedStatus };
}

// CAT-7: bounded concurrency so a 200-item import doesn't fire 200 parallel embeds.
const IMPORT_CONCURRENCY = 3;

export interface ImportFailure {
  index: number;
  name?: string;
  reason: string;
}

export async function importProducts(
  sellerId: string,
  items: ImportProductsInput,
): Promise<{ created: number; failed: ImportFailure[] }> {
  let created = 0;
  const failed: ImportFailure[] = [];
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      const item = items[index];
      if (!item) continue;

      try {
        await createProduct(sellerId, item);
        created += 1;
      } catch (err) {
        failed.push({
          index,
          name: item.name,
          reason: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }
  }

  const workerCount = Math.min(IMPORT_CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { created, failed };
}
