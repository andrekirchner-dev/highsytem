import { describe, it, expect } from 'vitest';
import { formatCurrency, formatDate, formatDateTime, calcMargin, cn } from '../utils';

describe('formatCurrency', () => {
  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('R$ 0,00');
  });

  it('formats a whole number', () => {
    expect(formatCurrency(100)).toBe('R$ 100,00');
  });

  it('formats with decimal cents', () => {
    expect(formatCurrency(19.9)).toBe('R$ 19,90');
  });

  it('formats thousands with period separator', () => {
    expect(formatCurrency(1000)).toBe('R$ 1.000,00');
  });

  it('formats large values', () => {
    expect(formatCurrency(1234567.89)).toBe('R$ 1.234.567,89');
  });

  it('formats negative values', () => {
    const result = formatCurrency(-50);
    expect(result).toContain('50,00');
  });
});

describe('formatDate', () => {
  it('formats a known date as dd/mm/yyyy', () => {
    const date = new Date(2025, 5, 10); // June 10 2025 local
    const result = formatDate(date);
    expect(result).toBe('10/06/2025');
  });

  it('pads single-digit day and month', () => {
    const date = new Date(2025, 0, 5); // Jan 5 2025 local
    expect(formatDate(date)).toBe('05/01/2025');
  });
});

describe('formatDateTime', () => {
  it('includes date and time portions', () => {
    const date = new Date(2025, 5, 10, 14, 30); // June 10 2025 14:30 local
    const result = formatDateTime(date);
    expect(result).toContain('10/06/2025');
    expect(result).toContain('14:30');
  });
});

describe('calcMargin', () => {
  it('calculates correct margin percentage', () => {
    expect(calcMargin(50, 100)).toBe(50);
  });

  it('returns 0 when sale price is zero (avoids division by zero)', () => {
    expect(calcMargin(50, 0)).toBe(0);
  });

  it('returns 0 when cost equals sale price', () => {
    expect(calcMargin(100, 100)).toBe(0);
  });

  it('returns 100 when cost is zero', () => {
    expect(calcMargin(0, 100)).toBe(100);
  });

  it('returns a negative margin when cost exceeds sale price', () => {
    expect(calcMargin(120, 100)).toBeLessThan(0);
  });

  it('calculates fractional margins correctly', () => {
    expect(calcMargin(30, 100)).toBeCloseTo(70);
  });
});

describe('cn', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('ignores falsy values', () => {
    expect(cn('foo', false && 'bar', null, undefined, 'baz')).toBe('foo baz');
  });

  it('resolves Tailwind conflicts (last wins)', () => {
    const result = cn('px-2', 'px-4');
    expect(result).toBe('px-4');
    expect(result).not.toContain('px-2');
  });

  it('handles conditional objects', () => {
    expect(cn({ 'text-primary': true, 'text-muted': false })).toBe('text-primary');
  });

  it('returns empty string when nothing is passed', () => {
    expect(cn()).toBe('');
  });
});
