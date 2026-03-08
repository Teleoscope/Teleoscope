import { describe, expect, it } from 'vitest';
import { applySetOperation } from '@/lib/setOperations';

describe('set operations utility', () => {
  const a = new Set(['1', '2', '3']);
  const b = new Set(['3', '4']);

  it('computes union', () => {
    const result = applySetOperation('union', a, b);
    expect([...result].sort()).toEqual(['1', '2', '3', '4']);
  });

  it('computes intersection', () => {
    const result = applySetOperation('intersection', a, b);
    expect([...result].sort()).toEqual(['3']);
  });

  it('computes difference (A - B)', () => {
    const result = applySetOperation('difference', a, b);
    expect([...result].sort()).toEqual(['1', '2']);
  });

  it('computes exclusion (symmetric difference)', () => {
    const result = applySetOperation('exclusion', a, b);
    expect([...result].sort()).toEqual(['1', '2', '4']);
  });
});
