import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export interface SellerTokenPayload {
  sub: string;
  role: 'seller' | 'admin';
}

export function signSellerToken(sellerId: string, role: 'seller' | 'admin'): string {
  return jwt.sign({ sub: sellerId, role }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifySellerToken(token: string): SellerTokenPayload {
  const decoded = jwt.verify(token, env.JWT_SECRET);
  if (typeof decoded === 'string' || typeof decoded.sub !== 'string') {
    throw new Error('Malformed token payload');
  }
  const role = decoded.role === 'admin' ? 'admin' : 'seller';
  return { sub: decoded.sub, role };
}

// SEL-7 / SHT-2: a short-lived signed state carrying sellerId, used for the
// Google OAuth consent round trip. The callback that verifies this is built
// in M7; this half just needs to issue and (later) verify the same token.
const OAUTH_STATE_PURPOSE = 'sheets-oauth';

export function signOAuthState(sellerId: string): string {
  return jwt.sign({ sellerId, purpose: OAUTH_STATE_PURPOSE }, env.JWT_SECRET, {
    expiresIn: '10m',
  });
}

export function verifyOAuthState(state: string): { sellerId: string } {
  const decoded = jwt.verify(state, env.JWT_SECRET);
  if (
    typeof decoded === 'string' ||
    decoded.purpose !== OAUTH_STATE_PURPOSE ||
    typeof decoded.sellerId !== 'string'
  ) {
    throw new Error('Malformed OAuth state');
  }
  return { sellerId: decoded.sellerId };
}
