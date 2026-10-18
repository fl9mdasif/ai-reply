import { Router } from 'express';
import { authGuard } from '../../middleware/auth-guard.js';
import {
  deleteCatalogItem,
  getCatalogItem,
  getCatalogList,
  postCatalog,
  postImport,
  postReembed,
  putCatalogItem,
} from './catalog.controller.js';

export const catalogRouter = Router();

catalogRouter.use('/catalog', authGuard);
catalogRouter.get('/catalog', getCatalogList);
catalogRouter.post('/catalog', postCatalog);
catalogRouter.post('/catalog/import', postImport);
catalogRouter.get('/catalog/:productId', getCatalogItem);
catalogRouter.put('/catalog/:productId', putCatalogItem);
catalogRouter.delete('/catalog/:productId', deleteCatalogItem);
catalogRouter.post('/catalog/:productId/reembed', postReembed);
