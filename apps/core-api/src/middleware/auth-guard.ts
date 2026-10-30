import type { NextFunction, Request, Response } from 'express';
import { UnauthenticatedError } from '../lib/errors.js';
import { verifySellerToken } from '../lib/jwt.js';
import { findSellerById } from '../modules/seller/seller.repo.js';

declare module 'express-serve-static-core' {
  interface Request {
    sellerId: string;
    sellerRole: 'seller' | 'admin';
  }
}

// AUTH-5: verifies the JWT, loads the seller, rejects suspended sellers,
// sets req.sellerId. Controllers read req.sellerId only — never a sellerId
// from the body, query or path (PRD section 8.1).
export async function authGuard(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    next(new UnauthenticatedError());
    return;
  }

  const token = header.slice('Bearer '.length);

  try {
    const payload = verifySellerToken(token);
    const seller = await findSellerById(payload.sub);
    if (!seller || seller.status !== 'active') {
      next(new UnauthenticatedError());
      return;
    }
    req.sellerId = payload.sub;
    req.sellerRole = payload.role;
    next();
  } catch {
    next(new UnauthenticatedError());
  }
}
