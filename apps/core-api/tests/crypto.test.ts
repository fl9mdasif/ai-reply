import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from '../src/lib/crypto.js';

describe('FND-7 lib/crypto.ts', () => {
  it('round trips plaintext through encrypt and decrypt', () => {
    const plaintext = 'EAAFacebookPageAccessTokenExample123';
    const payload = encrypt(plaintext);

    expect(payload.split('.')).toHaveLength(3);
    expect(decrypt(payload)).toBe(plaintext);
  });

  it('produces a different ciphertext each time (random IV)', () => {
    const a = encrypt('same input');
    const b = encrypt('same input');
    expect(a).not.toBe(b);
  });

  it('throws when the ciphertext has been tampered with', () => {
    const payload = encrypt('sensitive-refresh-token');
    const [iv, tag, ciphertext] = payload.split('.') as [string, string, string];

    const tamperedBytes = Buffer.from(ciphertext, 'base64');
    tamperedBytes[0] = (tamperedBytes[0] ?? 0) ^ 0xff;
    const tampered = [iv, tag, tamperedBytes.toString('base64')].join('.');

    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws when the auth tag has been tampered with', () => {
    const payload = encrypt('sensitive-refresh-token');
    const [iv, tag, ciphertext] = payload.split('.') as [string, string, string];

    const tamperedBytes = Buffer.from(tag, 'base64');
    tamperedBytes[0] = (tamperedBytes[0] ?? 0) ^ 0xff;
    const tampered = [iv, tamperedBytes.toString('base64'), ciphertext].join('.');

    expect(() => decrypt(tampered)).toThrow();
  });

  it('throws on a malformed payload', () => {
    expect(() => decrypt('not-a-valid-payload')).toThrow();
  });
});
