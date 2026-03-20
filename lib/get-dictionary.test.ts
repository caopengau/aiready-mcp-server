import { describe, it, expect } from 'vitest';
import { getDictionary } from './get-dictionary';

describe('getDictionary', () => {
  it('returns english dictionary for en', async () => {
    const dict = await getDictionary('en');
    expect(dict).toBeDefined();
    expect(typeof dict).toBe('object');
    expect(dict.hero).toBeDefined();
    expect(dict.common?.startFree).toBe('Start Free');
  });

  it('falls back to english for unknown locale', async () => {
    const dict = await getDictionary('fr');
    expect(dict.common?.startFree).toBe('Start Free');
  });
});
