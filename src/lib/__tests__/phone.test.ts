import { describe, expect, it } from 'vitest';
import { isValidPhone } from '../phone';

describe('isValidPhone', () => {
  it.each([
    '(212) 555-0123',
    '212-555-0123',
    '2125550123',
    '+1 212 555 0123',
  ])('accepts the US number %s', (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    '+44 20 7946 0958', // UK
    '+52 55 1234 5678', // Mexico
    '+81 3-1234-5678', // Japan
  ])('accepts the international number %s', (value) => {
    expect(isValidPhone(value)).toBe(true);
  });

  it.each([
    '',
    '   ',
    '12345',
    'not a phone',
    '(212) 555', // too short
    '+44 12', // too short for the country code
  ])('rejects %j', (value) => {
    expect(isValidPhone(value)).toBe(false);
  });
});
