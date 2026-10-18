import { ObjectId } from 'mongodb';
import { productsCollection, type FaqEntry, type ProductDoc } from '../../lib/db.js';

export type NewProduct = Omit<ProductDoc, '_id'>;

export async function insertProduct(doc: NewProduct): Promise<ProductDoc> {
  const fullDoc: ProductDoc = { _id: new ObjectId(), ...doc };
  await productsCollection().insertOne(fullDoc);
  return fullDoc;
}

// CAT-1: every lookup takes sellerId as a required filter, never _id alone.
export async function findProductById(sellerId: string, productId: string): Promise<ProductDoc | null> {
  if (!ObjectId.isValid(productId)) return null;
  return productsCollection().findOne({ _id: new ObjectId(productId), sellerId });
}

export interface ProductFieldUpdate {
  name: string;
  nameLower: string;
  price: number;
  description?: string;
  faqEntries?: FaqEntry[];
}

export async function updateProductFields(
  sellerId: string,
  productId: string,
  update: ProductFieldUpdate,
): Promise<ProductDoc | null> {
  if (!ObjectId.isValid(productId)) return null;
  return productsCollection().findOneAndUpdate(
    { _id: new ObjectId(productId), sellerId },
    { $set: { ...update, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
}

export async function deleteProduct(sellerId: string, productId: string): Promise<boolean> {
  if (!ObjectId.isValid(productId)) return false;
  const result = await productsCollection().deleteOne({ _id: new ObjectId(productId), sellerId });
  return result.deletedCount === 1;
}

// CAT-4: embedStatus synced clears any prior embedError; failed records a short reason.
export async function setEmbedStatus(
  productId: string,
  status: 'synced' | 'failed',
  embedError?: string,
): Promise<void> {
  if (status === 'synced') {
    await productsCollection().updateOne(
      { _id: new ObjectId(productId) },
      { $set: { embedStatus: status, updatedAt: new Date() }, $unset: { embedError: '' } },
    );
    return;
  }

  await productsCollection().updateOne(
    { _id: new ObjectId(productId) },
    { $set: { embedStatus: status, embedError, updatedAt: new Date() } },
  );
}

export interface ListProductsResult {
  products: ProductDoc[];
  nextCursor?: string;
}

// CAT-8: paginated by _id descending (roughly chronological), default 50, max 100.
export async function listProducts(
  sellerId: string,
  limit: number,
  cursor?: string,
): Promise<ListProductsResult> {
  const filter: Record<string, unknown> = { sellerId };
  if (cursor && ObjectId.isValid(cursor)) {
    filter._id = { $lt: new ObjectId(cursor) };
  }

  const docs = await productsCollection()
    .find(filter)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray();

  const hasMore = docs.length > limit;
  const products = hasMore ? docs.slice(0, limit) : docs;
  const last = products[products.length - 1];
  const nextCursor = hasMore && last ? last._id.toString() : undefined;

  return { products, nextCursor };
}
