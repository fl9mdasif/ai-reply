import pino from 'pino';
import { env } from '../config/env.js';

export const logger = pino({
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      'req.headers.authorization',
      'headers.authorization',
      'password',
      'passwordHash',
      'pageAccessToken',
      'facebookPageAccessToken',
      'refreshToken',
      'googleOAuthRefreshToken',
      '*.password',
      '*.pageAccessToken',
      '*.refreshToken',
    ],
    censor: '[redacted]',
  },
});

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length <= 4) {
    return '*'.repeat(digits.length);
  }
  return '*'.repeat(digits.length - 4) + digits.slice(-4);
}
