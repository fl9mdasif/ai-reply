import { describe, expect, it } from 'vitest';
import { maskPhone } from '../src/lib/logger.js';

describe('FND-3 lib/logger.ts phone masking', () => {
  it('masks all but the last 4 digits', () => {
    expect(maskPhone('01712345678')).toBe('*******5678');
  });

  it('masks short numbers entirely', () => {
    expect(maskPhone('123')).toBe('***');
  });

  it('ignores non-digit characters when counting', () => {
    expect(maskPhone('+880 1712-345678')).toBe('*********5678');
  });
});
