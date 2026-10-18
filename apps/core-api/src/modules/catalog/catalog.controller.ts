import type { Request, Response } from 'express';
import {
  createProductSchema,
  importProductsSchema,
  listCatalogQuerySchema,
  updateProductSchema,
} from './catalog.schema.js';
import {
  createProduct,
  getProduct,
  importProducts,
  listCatalog,
  reembedProduct,
  removeProduct,
  updateProduct,
} from './catalog.service.js';

export async function postCatalog(req: Request, res: Response): Promise<void> {
  const input = createProductSchema.parse(req.body);
  const product = await createProduct(req.sellerId, input);
  res.status(201).json({ productId: product.productId, embedStatus: product.embedStatus });
}

export async function getCatalogList(req: Request, res: Response): Promise<void> {
  const query = listCatalogQuerySchema.parse(req.query);
  const result = await listCatalog(req.sellerId, query.limit ?? 50, query.cursor);
  res.status(200).json(result);
}

export async function getCatalogItem(req: Request, res: Response): Promise<void> {
  const product = await getProduct(req.sellerId, req.params.productId as string);
  res.status(200).json(product);
}

export async function putCatalogItem(req: Request, res: Response): Promise<void> {
  const input = updateProductSchema.parse(req.body);
  const product = await updateProduct(req.sellerId, req.params.productId as string, input);
  res.status(200).json({ success: true, embedStatus: product.embedStatus });
}

export async function deleteCatalogItem(req: Request, res: Response): Promise<void> {
  const result = await removeProduct(req.sellerId, req.params.productId as string);
  res.status(200).json(result);
}

export async function postReembed(req: Request, res: Response): Promise<void> {
  const result = await reembedProduct(req.sellerId, req.params.productId as string);
  res.status(200).json(result);
}

export async function postImport(req: Request, res: Response): Promise<void> {
  const items = importProductsSchema.parse(req.body);
  const result = await importProducts(req.sellerId, items);
  res.status(200).json(result);
}
