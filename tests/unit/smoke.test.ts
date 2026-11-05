import { describe, expect, it } from 'vitest';
import * as core from '../../src/core';

describe('core', () => {
  it('loads without a DOM', () => {
    expect(typeof core).toBe('object');
    expect(typeof globalThis.document).toBe('undefined');
  });
});
