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

  it("accepts the previous month so a browser still in it isn't rejected by a server already past the rollover", () => {
    // 8pm EDT on Sept 30 is already Oct 1 on a UTC server.
    const serverNow = new Date(2026, 9, 1);
    const nycOptions = rollingMonths(LEAD_MONTH_COUNT, new Date(2026, 8, 30));
    for (const m of nycOptions) {
      expect(isValidPreferredMonth(m.value, serverNow)).toBe(true);
    }
  });

  it('rejects months further in the past', () => {
    expect(isValidPreferredMonth('August 2026', OCT_2026)).toBe(false);
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
