import bcrypt from 'bcryptjs';
import { env } from '../../config/env.js';
import { ConflictError, ForbiddenError, UnauthenticatedError } from '../../lib/errors.js';
import { signSellerToken } from '../../lib/jwt.js';
import { findSellerByEmail, insertSeller } from './auth.repo.js';
import type { LoginInput, RegisterInput } from './auth.schema.js';

const BCRYPT_COST = 12;
// Precomputed once so login takes the same time whether the email exists or
// not (AUTH-4: "any failure returns the same 401 message").
const DUMMY_HASH = bcrypt.hashSync('no-such-account-placeholder', BCRYPT_COST);

export interface AuthResult {
  token: string;
  sellerId: string;
}

// AUTH-1, AUTH-2, AUTH-3
export async function register(input: RegisterInput): Promise<AuthResult> {
  if (env.REGISTRATION_MODE === 'invite' && input.inviteCode !== env.INVITE_CODE) {
    throw new ForbiddenError('Invalid or missing invite code');
  }

  const existing = await findSellerByEmail(input.email);
  if (existing) {
    throw new ConflictError('An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  const now = new Date();
  const seller = await insertSeller({
    businessName: input.businessName,
    email: input.email,
    passwordHash,
    status: 'active',
    role: 'seller',
    plan: 'pilot',
    webhookSubscribed: false,
    createdAt: now,
    updatedAt: now,
  });

  const sellerId = seller._id.toString();
  return { token: signSellerToken(sellerId, 'seller'), sellerId };
}

// AUTH-4
export async function login(input: LoginInput): Promise<AuthResult> {
  const seller = await findSellerByEmail(input.email);
  const valid = await bcrypt.compare(input.password, seller?.passwordHash ?? DUMMY_HASH);

  if (!seller || seller.status !== 'active' || !valid) {
    throw new UnauthenticatedError('Invalid email or password');
  }

  const sellerId = seller._id.toString();
  return { token: signSellerToken(sellerId, seller.role ?? 'seller'), sellerId };
}
