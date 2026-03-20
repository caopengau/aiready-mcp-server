import { describe, it, expect } from 'vitest';
import { InnovationPatternSchema } from './harvester';

describe('InnovationPatternSchema', () => {
  it('accepts a valid innovation pattern', () => {
    const valid = {
      title: 'Global EventBridge Error Handling Pattern',
      rationale: 'Standardize DLQ attachment',
      logic: 'export const withDLQ = (bus) => { ... }',
      category: 'reliability',
      filesAffected: ['infrastructure/core/bus.ts'],
    };
    expect(() => InnovationPatternSchema.parse(valid)).not.toThrow();
  });

  it('rejects an invalid pattern missing required fields', () => {
    const invalid = { title: 'incomplete' };
    expect(() => InnovationPatternSchema.parse(invalid)).toThrow();
  });
});
