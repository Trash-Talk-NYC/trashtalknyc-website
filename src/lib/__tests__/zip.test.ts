import { describe, expect, it } from 'vitest';
import { boroughForZip, parseZipPlace } from '../zip';

describe('boroughForZip', () => {
  it.each([
    ['10001', 'Manhattan'],
    ['10282', 'Manhattan'],
    ['10044', 'Manhattan'],
    ['10301', 'Staten Island'],
    ['10314', 'Staten Island'],
    ['10451', 'The Bronx'],
    ['10463', 'The Bronx'],
    ['10475', 'The Bronx'],
    ['11004', 'Queens'],
    ['11109', 'Queens'],
    ['11368', 'Queens'],
    ['11430', 'Queens'],
    ['11697', 'Queens'],
    ['11201', 'Brooklyn'],
    ['11211', 'Brooklyn'],
    ['11256', 'Brooklyn'],
  ])('%s is in %s', (zip, borough) => {
    expect(boroughForZip(zip)).toBe(borough);
  });

  it.each([
    '07030', // Hoboken, NJ
    '10550', // Mount Vernon (Westchester)
    '11001', // Floral Park, Nassau side
    '11040', // New Hyde Park, Nassau
    '90210',
  ])('%s is outside NYC', (zip) => {
    expect(boroughForZip(zip)).toBeUndefined();
  });

  it('ignores anything that is not exactly five digits', () => {
    expect(boroughForZip('1121')).toBeUndefined();
    expect(boroughForZip('11211-1234')).toBeUndefined();
    expect(boroughForZip('')).toBeUndefined();
  });
});

describe('parseZipPlace', () => {
  it('reads the first place from a zippopotam.us response', () => {
    const data = {
      'post code': '11211',
      places: [{ 'place name': 'Brooklyn', state: 'New York', 'state abbreviation': 'NY' }],
    };
    expect(parseZipPlace(data)).toEqual({ city: 'Brooklyn', state: 'New York', stateCode: 'NY' });
  });

  it('returns null for an unexpected shape', () => {
    expect(parseZipPlace(null)).toBeNull();
    expect(parseZipPlace({})).toBeNull();
    expect(parseZipPlace({ places: [] })).toBeNull();
    expect(parseZipPlace({ places: [{ 'place name': 'X' }] })).toBeNull();
  });
});
