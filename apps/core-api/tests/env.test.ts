import { describe, expect, it } from 'vitest';
import { parseEnv } from '../src/config/env.js';

const validBase: NodeJS.ProcessEnv = {
  MONGODB_URI: 'mongodb://localhost:27017',
  MONGODB_DB_NAME: 'jobabai_test',
  JWT_SECRET: 'a'.repeat(32),
  ENCRYPTION_KEY: Buffer.alloc(32, 1).toString('base64'),
  REGISTRATION_MODE: 'open',
  META_APP_SECRET: 'meta-secret',
  META_VERIFY_TOKEN: 'verify-token',
  RAG_ENGINE_URL: 'http://localhost:4000',
  RAG_ENGINE_INTERNAL_TOKEN: 'internal-token',
};

describe('FND-1 config/env.ts', () => {
  it('parses a fully valid environment', () => {
    const result = parseEnv(validBase);
    expect(result.MONGODB_DB_NAME).toBe('jobabai_test');
    expect(result.PORT).toBe(3000);
    expect(result.ENABLE_RETRY_JOB).toBe(false);
  });

  it('refuses to boot when JWT_SECRET is too short', () => {
    expect(() => parseEnv({ ...validBase, JWT_SECRET: 'short' })).toThrow();
  });

  it('refuses to boot when ENCRYPTION_KEY is not a base64 32-byte key', () => {
    expect(() => parseEnv({ ...validBase, ENCRYPTION_KEY: 'not-32-bytes' })).toThrow();
  });

  it('refuses to boot when MONGODB_URI is missing', () => {
    const { MONGODB_URI, ...rest } = validBase;
    void MONGODB_URI;
    expect(() => parseEnv(rest)).toThrow();
  });

  it('requires INVITE_CODE when REGISTRATION_MODE=invite', () => {
    expect(() =>
      parseEnv({ ...validBase, REGISTRATION_MODE: 'invite', INVITE_CODE: undefined }),
    ).toThrow();
  });

  it('accepts REGISTRATION_MODE=invite when INVITE_CODE is set', () => {
    const result = parseEnv({ ...validBase, REGISTRATION_MODE: 'invite', INVITE_CODE: 'pilot1' });
    expect(result.REGISTRATION_MODE).toBe('invite');
  });
});
