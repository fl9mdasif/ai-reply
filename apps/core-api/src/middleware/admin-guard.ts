import type { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../lib/errors.js';

export function adminGuard(req: Request, _res: Response, next: NextFunction): void {
  if (req.sellerRole !== 'admin') {
    next(new ForbiddenError('Admin access required'));
    return;
  }
  next();
}
