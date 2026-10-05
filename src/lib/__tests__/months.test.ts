import { describe, expect, it } from 'vitest';
import { LEAD_MONTH_COUNT, isValidPreferredMonth, rollingMonths } from '../months';

const OCT_2026 = new Date(2026, 9, 15);

describe('rollingMonths', () => {
  it('starts at the current month and rolls into the next year', () => {
    const months = rollingMonths(LEAD_MONTH_COUNT, OCT_2026);
    expect(months.map((m) => m.value)).toEqual([
      'October 2026',
      'November 2026',
      'December 2026',
      'January 2027',
      'February 2027',
      'March 2027',
    ]);
  });

  it('carries a Spanish display label', () => {
    const [first] = rollingMonths(1, OCT_2026);
    expect(first.es.toLowerCase()).toContain('octubre');
    expect(first.es).toContain('2026');
  });
});

describe('isValidPreferredMonth', () => {
  it('accepts every option the form offers', () => {
    for (const m of rollingMonths(LEAD_MONTH_COUNT, OCT_2026)) {
      expect(isValidPreferredMonth(m.value, OCT_2026)).toBe(true);
    }
  });

  it('rejects months in the past', () => {
    expect(isValidPreferredMonth('September 2026', OCT_2026)).toBe(false);
    expect(isValidPreferredMonth('October 2025', OCT_2026)).toBe(false);
  });

  it('rejects months beyond the 12-month window', () => {
    expect(isValidPreferredMonth('November 2027', OCT_2026)).toBe(false);
  });

  it('rejects garbage', () => {
    expect(isValidPreferredMonth('', OCT_2026)).toBe(false);
    expect(isValidPreferredMonth('Octember 2026', OCT_2026)).toBe(false);
    expect(isValidPreferredMonth('October', OCT_2026)).toBe(false);
    expect(isValidPreferredMonth('octubre de 2026', OCT_2026)).toBe(false);
  });
});
